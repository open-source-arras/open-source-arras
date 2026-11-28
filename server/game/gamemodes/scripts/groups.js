import { choose } from "../../../lib/random";
import { Config } from "../../../loaders/global";

let activeGroups = [];
const getID = () => {
    for (let i = 1; i < 1e3; i++) {
        if (!activeGroups.find((e) => e.teamID === -i)) {
            return -i;
        }
    }
    return -parseInt(Math.random().toString().replace("0.", ""));
};

class Group {
    constructor(size, room) {
        this.members = [];
        this.size = size;
        this.room = room;
        this.private = false;
        this.teamID = getID();
        activeGroups.push(this);
    }
    setPrivate() {
        if (this.private) {
            this.private = false;
        } else {
            this.private = Math.random().toString().replace("0.", "");
        }
    }
    addMember(socket) {
        if (this.members.length === this.size) {
            return false;
        }
        this.members.push(socket);
        socket.rememberedTeam = this.teamID;
        socket.group = this;
        return true;
    }
    removeMember(socket) {
        this.members = this.members.filter((entry) => entry !== socket);
        if (this.members.length === 0) {
            this.delete();
        }
    }
    delete() {
        for (let i = 0; i < this.members.length; i++) {
            this.removeMember(this.members[i]);
        }
        activeGroups = activeGroups.filter((entry) => entry !== this);
    }
    getSpawn() {
        const validMembers = this.members.map((entry) => entry).filter((a) => Boolean(a.player)).filter((b) => Boolean(b.player.body));
        if (!validMembers.length) {
            return this.room.random();
        }
        const { x, y } = choose(validMembers).player.body;
        return { x, y };
    }
}

export class GroupHandler {
    constructor(theshit) {
        this.gameManager = theshit;
    }
    addMember = (socket, party = -1) => {
        let group = activeGroups.find((entry) => entry.members.length < entry.size);
        if (party !== -1) {
            group = activeGroups.find((entry) => (entry.teamID === party / this.gameManager.room.partyHash && entry.members.length < entry.size));
        }
        if (!group) {
            group = new Group(Config.groups || 0, this.gameManager.room);
        }
        group.addMember(socket);
    };
    removeMember = (socket) => {
        if (!socket.group) {
            return;
        }
        const group = activeGroups.find((entry) => entry === socket.group);
        group.removeMember(socket);
        socket.group = null;
    };

    redefine(theshit) {
        this.gameManager = theshit;
    }
}
