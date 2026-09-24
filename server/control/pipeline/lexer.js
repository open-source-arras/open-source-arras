// Tokenizer for the pipeline language: whitespace splits, single quotes
// and backticks group literally, double quotes allow \\ \" \n \t.
function lex(text) {
    if (typeof text !== "string") return { ok: false, error: "bad_query" };
    let tokens = [];
    let current = "";
    let quote = null;
    let inToken = false;

    function push() {
        if (inToken) tokens.push(current);
        current = "";
        inToken = false;
    }

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (quote) {
            if (quote === "\"" && char === "\\" && i + 1 < text.length) {
                let next = text[++i];
                if (next === "n") current += "\n";
                else if (next === "t") current += "\t";
                else current += next;
            } else if (char === quote) {
                quote = null;
            } else {
                current += char;
            }
            continue;
        }
        if (char === "\"" || char === "'" || char === "`") {
            quote = char;
            inToken = true;
        } else if (/\s/.test(char)) {
            push();
        } else {
            current += char;
            inToken = true;
        }
    }
    if (quote) return { ok: false, error: "unterminated_quote" };
    push();
    if (tokens.length === 0) return { ok: false, error: "empty_query" };
    return { ok: true, tokens };
}

module.exports = { lex };
