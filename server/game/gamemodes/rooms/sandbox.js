import { tileClass } from "../../../loaders/global";

export default Array(20).fill(() => Array(20).fill(tileClass.normal)).map((x) => x());
