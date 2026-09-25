// Command clienthost serves the browser client for a local game server.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type server struct {
	IP         string `json:"ip"`
	Port       int    `json:"port"`
	ID         string `json:"id"`
	Players    int    `json:"players"`
	MaxPlayers int    `json:"maxPlayers"`
	Featured   bool   `json:"featured"`
	Unlisted   bool   `json:"unlisted"`
	Private    bool   `json:"private"`
	Region     string `json:"region"`
	ServerHost string `json:"serverhost"`
	Location   string `json:"location"`
	GameMode   string `json:"gameMode"`
}

type gameList []server

func (g *gameList) String() string { return fmt.Sprint(*g) }

func (g *gameList) Set(v string) error {
	parts := strings.Split(v, ",")
	addr := strings.TrimSpace(parts[0])
	if addr == "" {
		return fmt.Errorf("empty address")
	}
	host, portStr, ok := strings.Cut(addr, ":")
	if !ok {
		return fmt.Errorf("%q: want host:port", addr)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return fmt.Errorf("%q: bad port: %v", addr, err)
	}

	s := server{
		IP:         addr,
		Port:       port,
		ID:         string(rune('a' + len(*g))),
		MaxPlayers: 0,
		Region:     "Local",
		ServerHost: "Local",
		Location:   host,
		GameMode:   "ffa",
	}
	for _, kv := range parts[1:] {
		key, val, ok := strings.Cut(strings.TrimSpace(kv), "=")
		if !ok {
			return fmt.Errorf("%q: want key=value", kv)
		}
		switch key {
		case "id":
			s.ID = val
		case "mode":
			s.GameMode = val
		case "region":
			s.Region = val
		case "location":
			s.Location = val
		case "cap":
			n, err := strconv.Atoi(val)
			if err != nil {
				return fmt.Errorf("cap: %v", err)
			}
			s.MaxPlayers = n
		case "featured":
			s.Featured = val == "true"
		default:
			return fmt.Errorf("unknown key %q (id, mode, region, location, cap, featured)", key)
		}
	}
	*g = append(*g, s)
	return nil
}

func main() {
	var games gameList
	host := flag.String("host", "localhost", "address to listen on")
	port := flag.Int("port", 3000, "port to listen on")
	root := flag.String("root", filepath.Join("js-src", "public"), "directory holding the client")
	version := flag.String("version", "", "version label for /version (default: read js-src/package.json)")
	flag.Var(&games, "game", "a game server, `host:port[,id=..,mode=..,region=..,location=..,cap=..]`; repeatable")
	flag.Parse()

	if len(games) == 0 {
		if err := games.Set("localhost:3001"); err != nil {
			log.Fatal(err)
		}
	}

	dir, err := filepath.Abs(*root)
	if err != nil {
		log.Fatalf("resolving --root: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "index.html")); err != nil {
		log.Fatalf("no index.html under %s: %v (pass --root)", dir, err)
	}

	ver := *version
	if ver == "" {
		ver = readVersion(filepath.Dir(dir))
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/getServers.json", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, games)
	})
	mux.HandleFunc("/getTotalPlayers", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 0)
	})
	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]any{"ver": ver, "dev_build": false})
	})
	mux.HandleFunc("/isOnline", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, true)
	})
	mux.HandleFunc("/api/getAddonAuthors", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "Forbidden", http.StatusForbidden)
	})
	mux.Handle("/", &static{dir: dir})

	addr := fmt.Sprintf("%s:%d", *host, *port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("client on http://%s (serving %s)", addr, dir)
	for _, g := range games {
		log.Printf("  server list: #%s -> ws://%s (%s)", g.ID, socketAddr(g), g.GameMode)
	}
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func socketAddr(s server) string {
	if s.IP == "localhost" {
		return fmt.Sprintf("localhost:%d", s.Port)
	}
	return s.IP
}

type static struct{ dir string }

func (s *static) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	clean := filepath.Clean("/" + strings.TrimPrefix(r.URL.Path, "/"))
	path := filepath.Join(s.dir, filepath.FromSlash(clean))
	if !strings.HasPrefix(path, s.dir) {
		s.notFound(w, r)
		return
	}
	info, err := os.Stat(path)
	if err == nil && info.IsDir() {
		path = filepath.Join(path, "index.html")
		info, err = os.Stat(path)
	}
	if err != nil || info.IsDir() {
		s.notFound(w, r)
		return
	}
	http.ServeFile(w, r, path)
}

func (s *static) notFound(w http.ResponseWriter, r *http.Request) {
	index := filepath.Join(s.dir, "index.html")
	body, err := os.ReadFile(index)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusNotFound)
	if _, err := w.Write(body); err != nil {
		return
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		return
	}
}

func readVersion(jsRoot string) string {
	body, err := os.ReadFile(filepath.Join(jsRoot, "package.json"))
	if err != nil {
		return "v0.0.0"
	}
	var pkg struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(body, &pkg); err != nil || pkg.Version == "" {
		return "v0.0.0"
	}
	return "v" + pkg.Version
}
