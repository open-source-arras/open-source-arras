# Open Source Arras

<img alt="Logo" src="public/img/round.png" width="100"/>

![GitHub Release](https://img.shields.io/github/v/release/open-source-arras/open-source-arras)
![Discord](https://img.shields.io/discord/1004907608018264094)
![GitHub repo size](https://img.shields.io/github/repo-size/open-source-arras/open-source-arras)

> [!WARNING]
> **Open Source Arras is beta software.** This build is **not** representative of the final product. Expect bugs and missing features.
> 
> If you want to stay up to date, create a fork, download a git client (such as GitHub Desktop), and sync the fork whenever there's a major update. **Major updates may introduce breaking changes that alter how certain things work. It is *your responsibility* to keep your private server up-to-date and functioning!**

## Setup Guide (Localhost)

This guide covers setting up your server on your own hardware and only supports devices running up-to-date versions of Windows/macOS/Linux. It may also cover operating systems that `Node.js` supports but have not yet been tested by us, such as BSD and AIX.

You'll first need to install [Node.js](https://nodejs.org). It you're not sure about what version to use, pick the latest.

Once `Node.js` is installed, [download the source code of the latest release](https://github.com/open-source-arras/open-source-arras/releases) and extract it. Open the extracted folder in a terminal window and run the following commands in order:
1. `npm i` (this installs necessary dependencies)
2. `npm run start` (this actually starts the server)

If there aren't any errors, your server will start up. Go to `localhost:3000` in your favourite web browser (keep the terminal window open, closing it will shut down the server) to play.

After the first install, you may use either `run.bat` (if you're on Windows) or `run.sh` (if you're not) to quickly launch the server without opening the terminal.

> [!NOTE]
> If you're having issues launching from `run.sh`, make sure the file is set to be able to run as an executable in its properties. This only needs to be done once.

## Server setup
You can set up in-game servers in `server/config.js`. An example is present in the file.

### Travelling between servers (Nexus)
Copy this code into your server's `properties`:
```
server_travel_properties: {
    loop_interval: 10000, // how often the portal loop executes in seconds
    portals: 1, // amount of portals to spawn
},
server_travel: [
    {
        ip: '<YourIP>', // destination server host, don't add "https://" or any slashes to it
        portal_properties: {
            spawn_chance: 3, // chance for a portal to spawn somewhere in the map each loop iteration (higher = lower chances, lower = higher chance)
            color: 'red', // portal color
        }
    }
]
```

> [!NOTE]
> Make sure to set `allow_server_travel` to true in your destination server's `properties`.

## Other Links
- [Stoat](https://stt.gg/S4tqfeAK)
- [Discord](https://discord.gg/arras)
- [YouTube](https://www.youtube.com/@OpenSourceArras)

*p.s. if something goes terribly wrong it's not our fault*
