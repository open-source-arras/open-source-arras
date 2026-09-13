let activeGroups = [];
const getID = () => {
    for (let i = 1; i < 1e3; i++) {
        if (!activeGroups.find(e => e.teamID === -i)) return -i;
    }
    return -Number(Math.random().toString().replace("0.", ""));
};

class Group {
    constructor(size) {
        this.members = [];
        this.size = size;
        this.private = false;
        this.teamID = getID();
        activeGroups.push(this);
    }
    setPrivate() {
        if (this.private) this.private = false;
        else this.private = Math.random().toString().replace("0.", "");
    }
    addMember(socket) {
        if (this.members.length === this.size) return false;
        this.members.push(socket);
        socket.rememberedTeam = this.teamID;
        socket.group = this;
        return true;
    }
    removeMember(socket) {
        this.members = this.members.filter(entry => entry !== socket);
        if (this.members.length === 0) this.delete();
    }
    delete() {
        for (let i = 0; i < this.members.length; i++) removeMember(this.members[i]);
        activeGroups = activeGroups.filter(entry => entry !== this);
    }
    getSpawn() {
        let validMembers = this.members.map(entry => entry).filter(a => !!a.player).filter(b => !!b.player.body);
        if (!validMembers.length) return room.random();
        let { x, y } = ran.choose(validMembers).player.body;
        return { x, y };
    }
}

class GroupHandler {
    constructor(theshit) {
        this.gameManager = theshit;
        this.room = theshit.room;
    }
    addMember = (socket, party = -1) => {
        let group = activeGroups.find(entry => entry.members.length < entry.size);
        if (party !== -1) group = activeGroups.find(entry => (entry.teamID === party / this.room.partyHash && entry.members.length < entry.size));
        if (!group) group = new Group(Config.groups || 0);
        group.addMember(socket);
    };
    removeMember = socket => {
        if (!socket.group) return;
        let group = activeGroups.find(entry => entry === socket.group);
        group.removeMember(socket);
        socket.group = null;
    };

    redefine(theshit) {
        this.gameManager = theshit;
        this.room = theshit.room;
    }
}

module.exports = {
    GroupHandler
};