// Censor a displayed name the way arras does: every ASCII lowercase letter
// becomes '*', everything else is copied through.
export const censorText = (text) => text == null ? text : text.replace(/[a-z]/g, "*");
