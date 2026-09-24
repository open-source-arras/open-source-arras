// Embed builders. Every reply carries the green bar and a Requested by
// footer, errors included. Field order and inline flags match the live bot.
let { EmbedBuilder } = require("discord.js");
let text = require("./text.js");

function base(requestedBy) {
    return new EmbedBuilder().setColor(text.GREEN).setFooter({ text: `Requested by ${requestedBy}` });
}

function errorEmbed(requestedBy, reason, command) {
    return new EmbedBuilder().setColor(text.RED).setFooter({ text: `Requested by ${requestedBy}` })
        .setDescription(text.errorText(reason, command));
}

function helpEmbed(requestedBy, inviteUrl, guildUrl) {
    return base(requestedBy)
        .setTitle("Help")
        .addFields(
            {
                name: "General Commands",
                value: "$ help\n$ modes\n$ uptime\n$ servers\n\n$ [servers] ping\n$ [servers] all\n$ <server> players\n$ <any> verbose\n\n$ view <code>\n$ claim <code>\n$ discard <code>\n$ saves [page]\n$ %",
                inline: true
            },
            {
                name: "Descriptions",
                value: "show this message\nshow information regarding how mode IDs work\nshow the uptime of the bot\ngive the list of servers without any information\nthis is useful when chained to other commands\nping all of the given servers, defaulting to all servers\nget the total player count of the given servers\nlist the players of the given server\ndisplay either the server performance or\nplayer team information\nview the status of a save code\nclaim a save code such that it could only be used by you\ndiscard a save code such that it could never be used again\nlist the save codes you've already claimed\nreturn the result of the last command\nthis is useful when chained to other commands",
                inline: true
            },
            {
                name: "Command Chains",
                value: "You can chain multiple commands together, including filter commands, like in\n\"$ ping mode=f 0 players\". All filter commands requires an input list, such as\na list of servers or players, a key, and sometimes a value to filter for.\nServer filter keys: \"id\", \"mode\", \"uptime\", \"players\", \"mspt\"\nPlayers filter keys: \"id\", \"name\", \"team\", \"class\", \"level\", \"score\" (or alias \"points\")\nYou can also use the first letter or first two letters of the key as a shortcut.",
                inline: false
            },
            {
                name: "Filter Commands",
                value: "_<n>_\n\n_<n>_:_<m>_\n\n_<key>_=_<value>_\n_<key>_~_<value>_\n\n_<key>_/_<regex>_/\n_<key>_!=_<value>_\n\n_<key>_<=_<number>_\n\n_<key>_+\n_<key>_-\n#_<id>_",
                inline: true
            },
            {
                name: "Descriptions",
                value: "get the *n*th element from a list, with *n* starting at 0\nyou can always use \"0\" to get the first element\ntake the elements from a list starting at the *n*th element\nand stopping before the *m*th element\nfilter for elements where the _key_ is the same as the value\nfilter for elements where the _key_ contains the value,\nignoring non-alphanumeric characters and letter casing\nlike \"=\" and \"~\", but with a regular expression\nfilter for elements where the _key_ is not the same as\nthe value; this also works for \"!~\" and \"!/\"\nfilter for elements where the _key_ is less than or equal\nto a number; this also works for \">=\", \"<\", and \">\"\nsort the list according to the _key_ in ascending order\nsort the list according to the _key_ in descending order\nfilter for elements with a given ID, same as \"id=_<id>_\"",
                inline: true
            },
            {
                name: "Note",
                value: "_[argument]_ means an optional argument. _<argument>_ means a required argument.\nYou can put single quotes or backticks to ignore spaces. You can also use double\nquotes, which allows you to use certain escape codes like in \"\\\\\\n\\\"\\t\".\nThere are 4 command shortcuts, which are \"$ s\" for servers, \"$ p\" for ping,\n\"$ a\" for all, \"$ l\" for player list, and \"$ v\" for verbose output.",
                inline: false
            },
            {
                name: "Examples",
                value: "The commands \"$ #wa players name='Player Name'\" and \"$ #wa l n~playername\"\nwould both show the score of a player named \"Player Name\" in the #wa server.\nThe command \"$ servers id/^[cw]/ ping players- 0 players score- 0:10\"\nfinds the US server with the most players and reads its leaderboard.",
                inline: false
            },
            {
                name: "Invites",
                value: `[Add the bot](${inviteUrl}) or [join the Discord](${guildUrl}).`,
                inline: false
            }
        );
}

function modesEmbed(requestedBy) {
    return base(requestedBy)
        .setTitle("Mode ID Information")
        .addFields(
            {
                name: "Modifiers",
                value: "Mode IDs are used in the $ ping command, as well as arras.io itself, displayed on the bottom right above the minimap. Mode IDs have 3 parts: modifiers, team count, and win condition. There can be anywhere from 0 to up to 5 modifiers, always in the order listed below.",
                inline: false
            },
            { name: "Values", value: "`g`\n`a`\n`p`\n`o`\n`m`", inline: true },
            { name: "Descriptions", value: "Growth\nArms Race\nPortal\nOpen\nMaze", inline: true },
            {
                name: "Team Count",
                value: "The team count is required, and can be any one of the below values.",
                inline: false
            },
            { name: "Values", value: "`f`\n`d`\n`s`\n`c`\n`1`, `2`, `3`, `4`", inline: true },
            { name: "Descriptions", value: "FFA\nDuos\nSquads\nClan Wars\nNumber of teams", inline: true },
            {
                name: "Win Condition",
                value: "The win condition is optional, defaulting to no win condition, and cannot repeat.",
                inline: false
            },
            { name: "Values", value: "`d`\n`m`\n`a`\n`s`\n`t`\n`p`\n`b`\n`g`\n`e`\n`c`\n`z`", inline: true },
            {
                name: "Descriptions",
                value: "Domination\nMothership\nAssault\nSiege\nTag\nPandemic\nSoccer\nGrudge Ball\nElimination\nCapture the Flag\nSandbox",
                inline: true
            }
        );
}

function loginEmbed(requestedBy, code, host) {
    return base(requestedBy)
        .setTitle("Login Command")
        .setDescription(`||$ auth ${code}||\nEnter the command above into chat after joining a server at ${host}. Don't share the code with other people! The code will expire in 3 minutes.`);
}

module.exports = { base, errorEmbed, helpEmbed, modesEmbed, loginEmbed };
