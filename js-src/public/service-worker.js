// Add install listener
self.addEventListener("install", () => self.skipWaiting());
// And activate one
self.addEventListener("activate", async () => {
    await self.registration.unregister();
    for (var e of await self.clients.matchAll({ type: "window" })) e.navigate(e.url);
});
