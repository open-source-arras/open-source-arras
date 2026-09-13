// This module parses .env file data

if (typeof Object.fromEntries !== "function") {
    console.log("\nUpdate your Node.js!\n");
    Object.fromEntries = entries => {
        let result = {};
        for (let [key, value] of entries) result[key] = value;
        return result;
    };
}

module.exports = data => Object.fromEntries(data.split(/\r?\n/g).map(line => {
    if (!line.includes("=") || line.trim().startsWith("#")) return null;
    const key = line.slice(0, line.indexOf("="));
    const value = line.slice(line.indexOf("=") + 1);
    return (key && value) ? [key, value] : null;
}).filter(item => item !== null))
