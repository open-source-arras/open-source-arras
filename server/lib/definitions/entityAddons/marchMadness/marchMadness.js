if (Config.march_madness) {
    (function(c, s = Math.floor(Math.random() * 5) + 1, r = 1) {
        const t = [
            "bullet",
            ["bullet", { CONTROLLERS: ["snake"] }],
            "casing",
            "growBullet",
            "speedBullet",
            "trap", 
            "setTrap",
            "unsetTrap",
            "pillbox",
            "missile",
            "launcherMissile",
            "spinmissile",
            "drone",
            "swarm",
            "splitterBullet",
            "boomerang",
            "desmosMinion",
            "undertowBullet",
            "hive",
            "assemblent"
        ];

        for (const e of Object.values(c)) {
            if (e.NECRO) continue;

            const g = e?.GUNS;

            if (g?.length) {
                for (let i = 0; i < r; i++) {
                    const tg = g.slice();
                    for (let j = 0; j < g.length; j++) {
                        const si = (j + s) % g.length;
                        g[j] = { ...tg[si] };
                    }

                    for (let y of g) {
                        const ct = y?.PROPERTIES?.TYPE;

                        if (t.some(type => JSON.stringify(type) === JSON.stringify(ct))) {
                            const ft = t.filter(
                                type => JSON.stringify(type) !== JSON.stringify(ct)
                            );

                            y.PROPERTIES.TYPE = ft[
                                Math.floor(Math.random() * ft.length)
                            ];
                        }

                        if (typeof y?.PROPERTIES?.TYPE === "string") {
                            if (["drone", "minion"].includes(y.PROPERTIES.TYPE)) y.PROPERTIES.MAX_CHILDREN = 6;
                            else if (["missile", "launcherMissile", "spinmissile", "hypermissile", "swarm"].includes(y.PROPERTIES.TYPE)) {
                                y.PROPERTIES.MAX_CHILDREN = 8;
                                y.PROPERTIES.DESTROY_OLDEST_CHILD = true;
                            } else if (["setTrap", "unsetTrap", "pillbox"].includes(y.PROPERTIES.TYPE)) {
                                y.PROPERTIES.MAX_CHILDREN = 4;
                                y.PROPERTIES.DESTROY_OLDEST_CHILD = true;
                            }
                        }
                    }
                }
            }
        }
    })(Class)
}
