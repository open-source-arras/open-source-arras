// Very basic spam prevention.
// Adds a simple ratelimit for sending too many messages.
// Allows you to spam if you have the allowSpam flag in your permissions.

let recent = {},
    ratelimit = 3,
    decay = 10_000,
    badWords = [
        "ez"
    ],
    goodWords = [
        "Behold, the great and powerful, my magnificent and almighty nemesis!",
        "Blue is greener than purple for sure",
        "Can you paint with all the colors of the wind",
        "Doin a bamboozle fren.",
        "Hello everyone! I am an innocent player who loves everything arras.io.",
        "Hey AC, how play game?",
        "I had something to say, then I forgot it.",
        "I like long walks on the beach and playing arras.io",
        "I like pasta, do you prefer nachos?",
        "I like pineapple on my pizza",
        "I need help, teach me how to play!",
        "I sometimes try to say bad things then this happens :(",
        "In my free time I like to watch cat videos on Youtube", // [sic]
        "Lets be friends instead of fighting okay?",
        "Maybe we can have a rematch?",
        "Pineapple doesn't go on pizza!",
        "Plz give me doggo memes!",
        "Sometimes I sing soppy, love songs in the car.",
        "Wait... This isn't what I typed!",
        "What happens if I add chocolate milk to macaroni and cheese?",
        "When nothing is right, go left.",
        "You are very good at the game friend.",
        "You're a great person! Do you want to play some arras.io with me?",
        "Your damage per second is godly.",
        "Your personality shines brighter than the sun."
    ];

Events.on("chatMessage", ({ message, socket, preventDefault, setMessage }) => {
    let perms = socket.permissions,
        id = socket.player.body.id;

    // Here we block out some very bad word by replacing it with a good word,
    // then we set the message that others will see to that filtered message.
    let realMessage = message;
    for (let badWord of badWords) {
        realMessage = realMessage.replaceAll(badWord, () => {
            return goodWords[Math.floor(Math.random() * goodWords.length)];
        });
    };
    setMessage(realMessage);

    // They are allowed to spam ANYTHING they want INFINITELY.
    if (message.startsWith("$") || (perms && perms.allowSpam)) return;

    // If they're talking too much, they can take a break.
    // Fortunately, this returns false if recent[id] is undefined.
    if (recent[id] >= ratelimit) {
        preventDefault(); // Prevents the message from being sent.
        socket.talk("m", Config.popup_message_duration, "Please slow down!");
        return;
    }

    // The more messages they send, the higher this counts up.
    if (!recent[id]) {
        recent[id] = 0;
    }
    recent[id]++;

    // Let it decay so they can talk later.
    setTimeout(() => {
        recent[id]--;

        // memoree leak NOes!
        if (!recent[id]) {
            delete recent[id];
        }
    }, decay);

    // If message above the character limit, lets stop that from getting through
    if (message.length > 56) {
        preventDefault();
        socket.talk("m", Config.popup_message_duration, "Too long!");
    }
});
