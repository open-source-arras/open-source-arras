import { global } from "./global.js";
import { prefetchPacks } from "./mockupPack.js";

let svFilterRegionDoc = document.getElementById("serverFilterRegion"),
svFilterModeDoc = document.getElementById("serverFilterMode");

let servers;

let serverMap = {},
tbody,
serversDocs;

let availableServers = [];

global.loadServerSelector = (serverData, text) => {
    if (!serverData.length) {
        if (text) loadEmptyServerSelector(text)
        return;
    }
    document.getElementById("startButton").disabled = false;
    servers = serverData;
    serverMap = {};
    availableServers = [];
    let id = location.hash.slice(1);
    if (!servers.some(server => server.id === id)) id = localStorage.getItem("lastServer");
    if (!servers.some(server => server.id === id)) id = servers[0].id;
    let serverSelector = document.getElementById("serverSelector");
      tbody = document.createElement("tbody");
      serversDocs = document.createElement("center");
    serverSelector.innerHTML = "";
    serverSelector.appendChild(tbody);
    serversDocs.id = "serverList";
    tbody.appendChild(serversDocs);
    let myServer = {
      classList: {
        contains: () => true,
      },
    };

    // If you dont want have a server filter, just dont run this function.
    let restoreFilters = initializeFilter();

    // Initial server load
    servers.forEach(async (server) => {
        try {
            const tr = document.createElement("tr");
            const td1 = document.createElement("td");
            td1.textContent = `${server.region}`;
            const td2 = document.createElement("td");
            td2.classList.add("tdCenter");
            td2.textContent = server.private ? "Private" : `${server.gameMode}`;
            const td3 = document.createElement("td");
            td3.textContent = server.players + (server.maxPlayers < 1 ? `/∞` : server.private ? `/?` : td3.textContent = `/${server.maxPlayers}`);
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.title = `${server.location} - #${server.id} (${td2.textContent})`;
            server.featured && tr.classList.add("featured");
            if (server.hidden) tr.style.display = "none";
            tr.onclick = () => {
                if (myServer.classList.contains("selected")) {
                    myServer.classList.remove("selected");
                }
                myServer = tr;
                location.hash = "#" + server.id;
                global.locationHash = location.hash;
                localStorage.setItem("lastServer", server.id);
                tr.classList.add("selected"), (global.serverAdd = server.ip);
                if (server.ip == "localhost") global.serverAdd = global.serverAdd + ":" + server.port;
                prefetchPacks();
            };
            serversDocs.appendChild(tr);
            serverMap[server.id] = tr;
            global.serverMap[server.ip] = tr;
            if (id === server.id) myServer = tr;
            availableServers.push({ element: tr, region: server.region, gameMode: server.gameMode, id: server.id });
        } catch (e) {
            console.log(e);
        }
        if (myServer.onclick) myServer.onclick();
    });
    for (let restoreFilter of restoreFilters) restoreFilter();
    window.addEventListener("hashchange", () => {
        let id = location.hash.slice(1);
        if (!serverMap[id]) return;
        serverMap[id].onclick();
    });
}

let loadEmptyServerSelector = (text) => {
    let serverSelector = document.getElementById("serverSelector"),
    tbody = document.createElement("tbody");
    serverSelector.innerHTML = "";
    serverSelector.appendChild(tbody);
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.textContent = ``;
    const td2 = document.createElement("td");
    td2.className = "tdCenter";
    td2.textContent = `${text}`;
    const td3 = document.createElement("td");
    td3.textContent = ``;
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tbody.appendChild(tr);
    document.getElementById("startButton").disabled = true;
}

let initializeFilter = () => {
    global.filters = {
        regions: {
            all: [],
            usa: [],
            europe: [],
            asia: []
        },
        gamemodes: {
            all: [],
            normal: [],
            growth: [],
            armsRace: [],
            other: [],
            sandbox: []
        }
    }
    let nvmText = document.createElement("td");
    nvmText.textContent = "No Server Matches";
    nvmText.classList.add("tdCenter");
    let noServerMatches = document.createElement("tr");
    noServerMatches.classList.add("message");
    noServerMatches.appendChild(nvmText);
    noServerMatches.style.display = "none";
    noServerMatches.style.width = "325px";
    tbody.appendChild(noServerMatches);

    for (let s of servers) {

        // Regions
        global.filters.regions.all.push(s);
        if (s.region.toLowerCase() === "europe") {
            global.filters.regions.europe.push(s);
        } else if (s.region.toLowerCase() === "asia" || s.region.toLowerCase() === "oceania") {
            global.filters.regions.asia.push(s);
        } else global.filters.regions.usa.push(s); // Local goes here too, arras lumps the default Local region localhost:5000 "server" entry with USA

        // Gamemodes
        let normalModes = [
            ["FFA", "loose"],
            ["Duos", "loose"],
            ["Trios", "loose"],
            ["Squads", "loose"],
            ["Wars", "loose"],
            ["TDM", "loose"],
            ["Maze", "exact"],
            ["Forge", "exact"],
            ["Nexus", "exact"],
            ["Labyrinth", "exact"]
        ]

        if (s.gameMode.includes("Sandbox")) {
            global.filters.gamemodes.sandbox.push(s);
        } else {
            global.filters.gamemodes.all.push(s);
            if (s.gameMode.toLowerCase().includes("growth")) {
                global.filters.gamemodes.growth.push(s);
            } else if (s.gameMode.includes("Arms Race")) {
                global.filters.gamemodes.armsRace.push(s);
            } else for (let mode of normalModes) {
                if (mode[1] == "exact" && s.gameMode === mode[0] || mode[1] == "loose" && s.gameMode.includes(mode[0])) {
                    global.filters.gamemodes.normal.push(s);
                }
            }
        };
        if (
            !global.filters.gamemodes.normal.includes(s) &&
            !global.filters.gamemodes.growth.includes(s) &&
            !global.filters.gamemodes.armsRace.includes(s) &&
            !global.filters.gamemodes.sandbox.includes(s)
        ) global.filters.gamemodes.other.push(s);
    };
    let l = [];
    let restoreFilters = [];
    let createFilter = (type, data, storageKey) => {
        let r = l.length;
        l.push(data[0].filter);
        let v = null;
        let spans = [];
        for (let { name: textContent, filter: y } of data) {
            let Q = document.createElement("span");
            spans.push(Q);
            null == v && ((v = Q), v.classList.add("active"));
            Q.textContent = textContent;
            type.appendChild(Q);
            type.style.display = "";
            Q.addEventListener("click", () => {
                Q !== v &&
                  (v.classList.remove("active"),
                  (v = Q),
                  v.classList.add("active"));
                  l[r] = y;
                  let X = true;
                  for (let C of availableServers) {
                    let F = true;
                    for (let N of l) F = F && N(C);
                    C.element.style.display = F ? "" : "none";
                    X = X && !F;
                  }
                  noServerMatches.style.display = X ? "" : "none";
                  if (storageKey) localStorage.setItem(storageKey, textContent);
            });
        }
        let saved = storageKey ? data.findIndex(option => option.name === localStorage.getItem(storageKey)) : -1;
        if (saved >= 0) restoreFilters.push(() => spans[saved].click());
    };
    let checkRegionFilter = (server, array) => {
        return array.some(data => data.region === server.region);
    }
    let checkGamemodeFilter = (server, array) => {
        return array.some(data => data.gameMode === server.gameMode);
    }
    createFilter(svFilterRegionDoc, [
        { name: "All", filter: (h) => checkRegionFilter(h, global.filters.regions.all) },
        { name: "USA", filter: (h) => checkRegionFilter(h, global.filters.regions.usa) },
        { name: "Europe", filter: (h) => checkRegionFilter(h, global.filters.regions.europe) },
        { name: "Asia", filter: (h) => checkRegionFilter(h, global.filters.regions.asia) }
    ], "serverFilterRegion");
    createFilter(svFilterModeDoc, [
        { name: "All", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.all) },
        { name: "Normal", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.normal) },
        { name: "Growth", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.growth) },
        { name: "Arms Race", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.armsRace) },
        { name: "Other", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.other) },
        { name: "Sandbox", filter: (h) => checkGamemodeFilter(h, global.filters.gamemodes.sandbox) }
    ], "serverFilterMode");
    return restoreFilters;
}
