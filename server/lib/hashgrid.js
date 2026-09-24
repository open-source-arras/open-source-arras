module.exports = class HashGrid {
    static stride = 1 << 16;

    cells = new Map();
    constructor(cellSize, skipBonded = true) {
        this.cellSize = cellSize;
        this.skipBonded = skipBonded;
        this.output = new Set();
        this.clearCount = 0;
    }

    insert(entity, minX, minY, maxX, maxY) {
        const endX = maxX >> this.cellSize;
        const endY = maxY >> this.cellSize;
        for (let x = minX >> this.cellSize; x <= endX; x++) {
            for (let y = minY >> this.cellSize; y <= endY; y++) {
                const key = x + y * HashGrid.stride;
                const cell = this.cells.get(key);
                if (cell === undefined) {
                    this.cells.set(key, [entity]);
                } else {
                    cell.push(entity);
                }
            }
        }
    }

    query(minX, minY, maxX, maxY) {
        const cells = this.cells;
        const cellSize = this.cellSize;
        const stride = HashGrid.stride;
        const skipBonded = this.skipBonded;

        this.output.clear();
        const endX = maxX >> cellSize;
        const endY = maxY >> cellSize;
        for (let x = minX >> cellSize; x <= endX; x++) {
            for (let y = minY >> cellSize; y <= endY; y++) {
                const key = x + y * stride;
                const cell = cells.get(key);
                if (cell !== undefined) {
                    for (const entity of cell) {
                        if (skipBonded && entity.bond) continue;
                        if (entity.minX < maxX && entity.maxX > minX && entity.minY < maxY && entity.maxY > minY) {
                            this.output.add(entity);
                        }
                    }
                }
            }
        }
        return this.output;
    }

    clear() {
        if ((++this.clearCount & 1023) === 0) {
            for (const [key, cell] of this.cells) {
                if (cell.length === 0) this.cells.delete(key);
            }
        }
        for (const cell of this.cells.values()) cell.length = 0;
    }
}