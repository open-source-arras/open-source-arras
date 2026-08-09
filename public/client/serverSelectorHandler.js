import { global } from "./global.js";

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
    initializeFilter();

    // Initial server load
    servers.forEach(async (server) => {
        try {
            const tr = document.createElement("tr");
            const td1 = document.createElement("td");
            td1.textContent = `${server.region}`;
            const td2 = document.createElement("td");
            td2.classList.add("tdCenter");
            td2.textContent = `${server.gameMode}`;
            const td3 = document.createElement("td");
            td3.textContent = server.maxPlayers < 1 ? `${server.players}/∞` : td3.textContent = `${server.players}/${server.maxPlayers}`;
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.title = `${server.region} - ${server.location} - #${server.id} (${server.private ? "Private" : server.gameMode})`;
            server.featured && tr.classList.add("featured");
            if (server.unlisted) tr.style.display = 'none';
            if (server.private) {
                td2.textContent = "Private";
                td3.textContent = "?/?";
            };
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
            };
            serversDocs.appendChild(tr);
            serverMap[server.id] = tr;
            global.serverMap[server.ip] = tr;
            if (id === server.id) myServer = tr;
            availableServers.push({ element: tr, region: server.region, gameMode: server.gameMode, id: server.id, hidden: server.hidden, private: server.private });
        } catch (e) {
            console.log(e);
        }
        if (myServer.onclick) myServer.onclick();
    });
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
    serverSelector.style.display = "block";
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
            america: [],
            europe: [],
            asia: [],
            oceania: [],
            other: [],
        },
        gamemodes: {
            all: [],
            sandbox: [],

            ffa: [],
            squads: [],
            tdm: [],
            minigames: [],

            normal: [],
            growth: [],
            armsRace: [],
            other: [],
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

        // USA
        if (s.region.toLowerCase() == "usa" || s.region.toLowerCase() == "us west" || s.region.toLowerCase() == "us central" || s.region.toLowerCase() == "us east") global.filters.regions.america.push(s);

        // Europe
        if (s.region.toLowerCase() == "europe") global.filters.regions.europe.push(s);

        // Asia
        if (s.region.toLowerCase() == "asia") global.filters.regions.asia.push(s);

        // Oceania
        if (s.region.toLowerCase() == "oceania") global.filters.regions.oceania.push(s);

        // Other
        if (
            !global.filters.regions.america.includes(s) &&
            !global.filters.regions.europe.includes(s) &&
            !global.filters.regions.asia.includes(s) &&
            !global.filters.regions.oceania.includes(s)
        ) {
            global.filters.regions.other.push(s);
        }

        // Gamemodes
        global.filters.gamemodes.all.push(s);

        // Sandbox
        if (s.gameMode.includes("Sandbox")) global.filters.gamemodes.sandbox.push(s);

        // FFA
        if (s.gameMode.includes("FFA") || s.gameMode === "Maze") global.filters.gamemodes.ffa.push(s);

        // Squads
        if (s.gameMode.includes("Duos") || s.gameMode.includes("Trios") || s.gameMode.includes("Squads") || s.gameMode.includes("Wars")) global.filters.gamemodes.squads.push(s);

        // TDM
        if (s.gameMode.includes("TDM")) global.filters.gamemodes.tdm.push(s);

        // Minigames
        if (
            !global.filters.gamemodes.ffa.includes(s) &&
            !global.filters.gamemodes.squads.includes(s) &&
            !global.filters.gamemodes.tdm.includes(s) &&
            !global.filters.gamemodes.sandbox.includes(s)
        ) global.filters.gamemodes.minigames.push(s);

        // Normal
        if ((
            !s.gameMode.includes("Arms Race") &&
            !s.gameMode.toLowerCase().includes("growth")
        ) && (
            s.gameMode.includes("FFA") ||
            s.gameMode === "Maze" ||
            s.gameMode.includes("Duos") ||
            s.gameMode.includes("Trios") ||
            s.gameMode.includes("Squads") ||
            s.gameMode.includes("Wars") ||
            s.gameMode.includes("TDM") ||
            s.gameMode.includes("Nexus") ||
            s.gameMode.includes("Labyrinth")
        )) global.filters.gamemodes.normal.push(s);

        // Growth
        if (s.gameMode.toLowerCase().includes("growth") || s.gameMode.includes("Old Dreadnoughts")) global.filters.gamemodes.growth.push(s);

        // Arms Race
        if (s.gameMode.includes("Arms Race")) global.filters.gamemodes.armsRace.push(s);

        // Other
        if (
            !global.filters.gamemodes.normal.includes(s) &&
            !global.filters.gamemodes.growth.includes(s) &&
            !global.filters.gamemodes.armsRace.includes(s) &&
            !global.filters.gamemodes.sandbox.includes(s)
        ) global.filters.gamemodes.other.push(s);

    };
    let l = [];
    let createFilter = (type, data) => {
        let r = l.length;
        l.push(data[0].filter);
        let e = document.getElementsByClassName("serverSelector");
        global.mobile ? global.fixedServerSelectorHeight = "62px" : global.fixedServerSelectorHeight = "100px"
        if (!global.uncappedMenu) e[0].style.height = global.fixedServerSelectorHeight;
        let v = null;
        for (let { name: textContent, filter: y } of data) {
            let Q = document.createElement("span");
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
            });
        }
    };
    let checkFilter = (h, e) => {
        let check = false;
        e.forEach(data => {
            if (data.gameMode == h.gameMode && !h.hidden) {
                check = true;
            }
        })
        return check;
    }
    createFilter(svFilterRegionDoc, [
        { name: "All", filter: (h) => {
            let e = checkFilter(h, global.filters.regions.all);
            return e;
        } },
        { name: "USA", filter: (h) => {
            let e = checkFilter(h, global.filters.regions.america);
            return e;
        } },
        { name: "Europe", filter: (h) => { 
            let e = checkFilter(h, global.filters.regions.europe);
            return e;
        } },
        { name: "Asia", filter: (h) => { 
            let e = checkFilter(h, global.filters.regions.asia);
            return e;
        } },
        { name: "Oceania", filter: (h) => { 
            let e = checkFilter(h, global.filters.regions.oceania);
            return e;
        } },
    ]);
    createFilter(svFilterModeDoc, [
        { name: "All", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.all);
            return e;
        } },
        { name: "FFA", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.ffa);
            return e;
        } },
        { name: "Squads", filter: (h) => { 
            let e = checkFilter(h, global.filters.gamemodes.squads);
            return e;
        } },
        { name: "TDM", filter: (h) => { 
            let e = checkFilter(h, global.filters.gamemodes.tdm);
            return e;
        } },
        { name: "Minigames", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.minigames);
            return e;
        } },/*
        { name: "Normal", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.normal);
            return e;
        } },
        { name: "Growth", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.growth);
            return e;
        } },
        { name: "Arms Race", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.armsRace);
            return e;
        } },
        { name: "Other", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.other);
            return e;
        } },*/
        { name: "Sandbox", filter: (h) => {
            let e = checkFilter(h, global.filters.gamemodes.sandbox);
            return e;
        } },
    ]);
}