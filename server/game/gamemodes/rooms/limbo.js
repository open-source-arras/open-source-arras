module.exports = Array.from({length: 33}, (a, y) => Array.from({length: 33}, (a, x) => !(x % 32 && y % 32) ? tileClass.normal : (x | y) & 1 ? tileClass.wall : tileClass.base1));
