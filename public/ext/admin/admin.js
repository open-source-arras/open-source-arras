/*global DataTable*/
// Permission panel client. Same origin as the panel api, loopback only,
// plus the panel key from .env, kept for the tab lifetime.
let errorBox = document.getElementById("error");
let panelKey = sessionStorage.getItem("panelKey");

function showLogin(message) {
    document.getElementById("login").style.display = "block";
    document.getElementById("panelMain").style.display = "none";
    if (message) showError(message);
}

function hideLogin() {
    document.getElementById("login").style.display = "none";
    document.getElementById("panelMain").style.display = "block";
}

function forgetKey() {
    panelKey = null;
    sessionStorage.removeItem("panelKey");
    showLogin();
}

const FLAG_GROUPS = [
    ["list.players", "perms.restore", "perms.reinstate"],
    ["action.reset", "action.kill", "action.broadcast", "action.kick", "action.ban", "action.restart"],
    ["*"]
];
let extraFlags = [];

function showError(message) {
    errorBox.textContent = message;
}

async function api(method, route, body = null) {
    let headers = body ? { "Content-Type": "application/json" } : {};
    if (panelKey) headers.Authorization = "Bearer " + panelKey;
    let response = await fetch(route, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    if (response.status === 401) {
        let hadKey = !!panelKey;
        forgetKey();
        throw Object.assign(new Error(hadKey ? "wrong panel key, try again" : "panel key required"), { status: 401 });
    }
    let json;
    try {
        json = await response.json();
    } catch {
        throw Object.assign(new Error("control server is stale, restart it"), { status: response.status });
    }
    if (!response.ok || !json.ok) {
        throw Object.assign(new Error((json && (json.detail || json.error)) || ("HTTP " + response.status)), { status: response.status });
    }
    return json;
}

function time(ts) {
    return new Date(ts).toLocaleString();
}

function shortHash(hash) {
    return hash.slice(0, 12) + "…";
}

function flagLabel(flag) {
    if (flag === "*") return "*";
    if (flag.startsWith("action.")) return flag.slice("action.".length);
    if (flag.startsWith("perms.")) return flag.slice("perms.".length);
    if (flag === "list.players") return "player list";
    return flag;
}

function buildFlagEditor() {
    let editor = document.getElementById("flagEditor");
    editor.innerHTML = "<legend>Flags</legend>";
    for (let group of FLAG_GROUPS) {
        let box = document.createElement("div");
        box.className = "flagGroup";
        for (let flag of group) {
            let label = document.createElement("label");
            if (flag === "*") label.className = "danger";
            let check = document.createElement("input");
            check.type = "checkbox";
            check.value = flag;
            label.appendChild(check);
            label.appendChild(document.createTextNode(flagLabel(flag)));
            box.appendChild(label);
        }
        editor.appendChild(box);
    }
    let extra = document.createElement("div");
    extra.id = "extraFlags";
    extra.className = "flagGroup";
    editor.appendChild(extra);
    renderExtraFlags();
}

function renderExtraFlags() {
    let extra = document.getElementById("extraFlags");
    extra.innerHTML = "";
    for (let flag of extraFlags) {
        let pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = flagLabel(flag);
        extra.appendChild(pill);
    }
}

function collectFlags() {
    let flags = [...document.querySelectorAll("#flagEditor input[type=checkbox]:checked")].map((box) => box.value);
    return [...new Set([...flags, ...extraFlags])];
}

function fillFlags(flags) {
    let wanted = new Set(flags || []);
    for (let box of document.querySelectorAll("#flagEditor input[type=checkbox]")) {
        box.checked = wanted.has(box.value);
    }
    extraFlags = (flags || []).filter((flag) => ![...document.querySelectorAll("#flagEditor input[type=checkbox]")].some((box) => box.value === flag));
    renderExtraFlags();
}

function esc(text) {
    return text.toString().replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[char]));
}

let usersTable = null;
let lastUsers = [];

async function loadUsers() {
    let { users } = await api("GET", "/panel/users");
    lastUsers = users;
    let rows = users.map((user) => {
        let flags = user.flags || [];
        return {
            discordId: user.discordId,
            type: user.type,
            flags,
            flagsText: [...flags, ...flags.map(flagLabel)].join(" "),
            state: user.revoked ? "revoked" : "active"
        };
    });
    if (!usersTable) {
        usersTable = new DataTable("#users", {
            data: rows,
            pageLength: 15,
            createdRow(row, data) {
                if (data.state === "revoked") row.classList.add("revoked");
            },
            columns: [
                { data: "discordId", title: "Discord id" },
                { data: "type", title: "Type" },
                {
                    data: "flagsText",
                    title: "Flags",
                    render(data, type, row) {
                        if (type !== "display") return data;
                        if (row.flags.length === 0) return "-";
                        return row.flags.map((flag) => `<span class="pill">${esc(flagLabel(flag))}</span>`).join("");
                    }
                },
                { data: "state", title: "State" },
                {
                    data: "discordId",
                    title: "Actions",
                    orderable: false,
                    searchable: false,
                    render(data, type) {
                        if (type !== "display") return "";
                        return `<button data-command="edit" data-id="${esc(data)}">Edit</button>` +
                            `<button data-command="code" data-id="${esc(data)}" title="Mint a 3 minute $auth code">Code</button>`;
                    }
                }
            ]
        });
        return;
    }
    usersTable.clear();
    usersTable.rows.add(rows);
    usersTable.draw();
}

document.querySelector("#users tbody").addEventListener("click", async(event) => {
    let button = event.target.closest("button[data-command]");
    if (!button) return;
    let user = lastUsers.find((u) => u.discordId === button.dataset.id);
    if (!user) return;
    if (button.dataset.command === "edit") {
        let form = document.getElementById("userForm");
        form.discordId.value = user.discordId;
        form.type.value = user.type;
        fillFlags(user.flags);
        form.discordId.focus();
        return;
    }
    try {
        let minted = await api("POST", "/panel/auth/code", { discordId: user.discordId });
        showError("");
        document.getElementById("codeOut").textContent = `Code ${minted.code} for ${user.discordId}, single use, expires in 3 minutes. Type $auth ${minted.code} in game chat.`;
    } catch(err) {
        showError(err.message);
    }
});

async function loadSecrets() {
    let { secrets } = await api("GET", "/panel/secrets");
    let body = document.querySelector("#secrets tbody");
    body.innerHTML = "";
    for (let secret of secrets) {
        let row = document.createElement("tr");
        let cells = [shortHash(secret.hash), secret.discordId, time(secret.createdAt), secret.lastUsedAt ? time(secret.lastUsedAt) : "never"];
        for (let text of cells) {
            let cell = document.createElement("td");
            cell.textContent = text;
            row.appendChild(cell);
        }
        let actions = document.createElement("td");
        let button = document.createElement("button");
        button.textContent = "Revoke";
        button.addEventListener("click", async() => {
            try {
                await api("POST", "/panel/auth/revoke", { hash: secret.hash });
                showError("");
                await loadSecrets();
            } catch(err) {
                showError(err.message);
            }
        });
        actions.appendChild(button);
        row.appendChild(actions);
        body.appendChild(row);
    }
}

async function loadTypes() {
    let { types } = await api("GET", "/panel/types");
    let body = document.querySelector("#types tbody");
    body.innerHTML = "";
    for (let type of types) {
        let row = document.createElement("tr");
        for (let text of [type.name, type.rank]) {
            let cell = document.createElement("td");
            cell.textContent = text;
            row.appendChild(cell);
        }
        body.appendChild(row);
    }
    let select = document.getElementById("userForm").type;
    let current = select.value;
    select.innerHTML = "";
    for (let type of types) {
        let option = document.createElement("option");
        option.value = type.id;
        option.textContent = `${type.name} (${type.rank})`;
        select.appendChild(option);
    }
    if ([...select.options].some((option) => option.value === current)) select.value = current;
}

async function refresh() {
    await loadUsers();
    await loadTypes();
    await loadSecrets();
}

document.getElementById("userForm").addEventListener("submit", async(event) => {
    event.preventDefault();
    let form = event.target;
    try {
        await api("POST", "/panel/users", {
            discordId: form.discordId.value.trim(),
            type: form.type.value,
            flags: collectFlags()
        });
        showError("");
        form.reset();
        await refresh();
    } catch(err) {
        showError(err.message);
    }
});

document.getElementById("mintForm").addEventListener("submit", async(event) => {
    event.preventDefault();
    let form = event.target;
    try {
        let minted = await api("POST", "/panel/auth/code", { discordId: form.mintId.value.trim() });
        showError("");
        document.getElementById("codeOut").textContent = `Code ${minted.code} for ${form.mintId.value.trim()}, single use, expires in 3 minutes. Type $auth ${minted.code} in game chat.`;
    } catch(err) {
        showError(err.message);
    }
});

async function main() {
    buildFlagEditor();
    document.getElementById("loginForm").addEventListener("submit", async(event) => {
        event.preventDefault();
        panelKey = event.target.key.value;
        sessionStorage.setItem("panelKey", panelKey);
        event.target.key.value = "";
        showError("");
        hideLogin();
        try {
            await refresh();
            document.getElementById("status").textContent = "Connected.";
        } catch(err) {
            showError(err.message);
        }
    });
    document.getElementById("logout").addEventListener("click", () => {
        forgetKey();
        document.getElementById("status").textContent = "Logged out.";
    });
    // Silent first: open instances just work, gated ones bounce to login.
    try {
        await refresh();
        hideLogin();
        document.getElementById("status").textContent = "Connected.";
    } catch(err) {
        document.getElementById("status").textContent = "Unreachable.";
        if (err.status === 401) showLogin(err.message);
        else showError(err.message);
    }
}

main().catch((err) => {
    document.getElementById("status").textContent = "Unreachable.";
    showError(err.message);
});
