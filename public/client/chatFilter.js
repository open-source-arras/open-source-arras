const categories = {
    offensive: [
        "nigger", "nigga", "nig", "faggot", "fag", "dyke", "tranny", "trannie",
        "nigge", "niggy", "nigglet", "negga", "negger", "kike", "kikes",
    ],
    inappropriate: [
        "gyat", "edging", "gooning", "gooner", "gooners", "dick", "dicks",
        "cock", "cocks", "slut", "sluts", "slutty", "whore", "whores",
        "whoring", "pussy", "pussies", "cum", "cums", "cumming", "cummed",
        "porn", "porno", "pornography", "pornographic", "pornhub", "sex",
        "sexual", "sexually", "sexy", "rape", "rapes", "raped", "raping",
        "rapist", "rapists", "wank", "wanks", "wanking", "goon", "fuck",
        "ass", "asshole", "arse",
    ],
    profane: [
        "fuck", "shit", "piss", "ass", "asshole", "arse", "bitch", "bastard",
        "damn", "crap", "dickhead", "dickheads", "bollocks", "cunt", "cunts",
        "wanker", "wankers", "pussy", "pussies", "gooner", "gooners", "slut",
        "sluts", "slutty", "whore", "whores", "whoring", "rape", "rapes",
        "raped", "raping", "rapist", "rapists",
    ],
    brainrot: [
        "skibiditoilet", "skibidi", "rizzler", "rizz", "fortnite", "ohio",
        "sigma", "edge", "mewing", "mew", "yapping", "yap", "mogging", "mog",
        "goon", "maxxing", "maxing", "tiktok", "fanumtax", "grimaceshake",
        "babygronk", "edging", "gyat",
    ],
};

const modes = {
    none: [],
    offense: ["offensive"],
    inappropriate: ["offensive", "inappropriate"],
    swear: ["offensive", "inappropriate", "profane"],
    brainrot: ["offensive", "inappropriate", "profane", "brainrot"],
};

export function censorChat(text, mode) {
    const enabled = modes[mode] || [];
    if (!enabled.length) return text;

    const symbols = [];
    const indexes = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        const folded = code | 32;
        if (folded >= 97 && folded <= 122) {
            symbols.push(folded - 96);
            indexes.push(i);
        } else if (code === 32) {
            symbols.push(27);
            indexes.push(i);
        }
    }

    const chars = text.split("");
    for (const name of enabled) {
        for (const word of categories[name]) {
            for (let i = 0; i <= symbols.length - word.length; i++) {
                let j = 0;
                while (j < word.length && symbols[i + j] === (word.charCodeAt(j) & 31)) j++;
                if (j === word.length) {
                    for (let k = 0; k < word.length; k++) chars[indexes[i + k]] = "*";
                }
            }
        }
    }
    return chars.join("");
}
