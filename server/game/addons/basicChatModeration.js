// Very basic spam prevention.
// Adds a simple ratelimit for sending too many messages.
// Allows you to spam if you have the allowSpam flag in your permissions.

let recent = {},
    ratelimit = 3,
    decay = 10_000;

Events.on("chatMessage", ({ message, socket, preventDefault, setMessage }) => {
    let perms = socket.permissions,
        id = socket.player.body.id;

    // Here we block out some very bad and banned word by replacing it with asterisks,
    // then we set the message that others will see to that filtered message.
    setMessage(message.replaceAll("someverybadandbannedword", "somemuchbetternotbannedword"));

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
        socket.talk("m", Config.popup_message_duration, "Too long!")
    }
});
