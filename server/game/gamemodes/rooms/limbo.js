import { tileClass } from "../../../loaders/global";

export default Array.from({length: 33}, (_, y) => Array.from({length: 33}, (_, x) => !(x % 32 && y % 32) ? tileClass.normal : (x | y) & 1 ? tileClass.wall : tileClass.base1));
