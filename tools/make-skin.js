"use strict";

import { statSync, readdirSync, mkdirSync, promises } from "fs";
import { join, parse } from "path";
import sharp from "sharp";

const SKINS = join(__dirname, "..", "public", "img", "skins");
const SIZE = 250;
const ALPHA = 128;
const MASK = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}"/></svg>`);

async function makeSkin(input) {
    const {data, info} = await sharp(input)
        .resize(SIZE, SIZE, {fit: "cover"})
        .ensureAlpha()
        .composite([{input: MASK, blend: "dest-in"}])
        .raw()
        .toBuffer({resolveWithObject: true});
    for (let i = 3; i < data.length; i += 4) {
        data[i] = data[i] >= 128 ? ALPHA : 0;
    }
    return sharp(data, {raw: {width: info.width, height: info.height, channels: 4}}).png().toBuffer();
}

async function main() {
    const [input = SKINS, output = SKINS] = process.argv.slice(2);
    const files = statSync(input).isDirectory()
        ? readdirSync(input).filter((name) => name.toLowerCase().endsWith(".png")).map((name) => join(input, name))
        : [input];
    mkdirSync(output, {recursive: true});
    for (const file of files) {
        const target = join(output, `${parse(file).name}.png`);
        await promises.writeFile(target, await makeSkin(file));
        console.log(`wrote ${target}`);
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
