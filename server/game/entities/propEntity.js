class Prop {
    constructor(position, bond) {
        this.guns = [];
        this.id = entitiesIdLog++;
        this.color = new Color(16);
        this.borderless = false;
        this.drawFill = true;
        this.strokeWidth = 1;

        // Bind prop
        this.bond = bond;
        this.bond.props.set(this.id, this);
        // Get my position.
        if (Array.isArray(position)) {
            position = {
                SIZE: position[0],
                X: position[1],
                Y: position[2],
                ANGLE: position[3],
                LAYER: position[4]
            };
        }
        position.SIZE ??= 10;
        position.X ??= 0;
        position.Y ??= 0;
        position.ANGLE ??= 0;
        position.LAYER ??= 0;
        let _off = new Vector(position.X, position.Y);
        this.bound = {
            size: position.SIZE / 20,
            angle: position.ANGLE * Math.PI / 180,
            direction: _off.direction,
            offset: _off.length / 10,
            layer: position.LAYER
        };
        // Initalize.
        this.facing = 0;
        this.x = 0;
        this.y = 0;
        this.size = 1;
        this.realSize = 1;
        this.settings = {};
        this.settings.mirrorMasterAngle = true;
        this.upgrades = [];
        this.turrets = [];
        this.props = [];
    }
    define(def) {
        let set = ensureIsClass(def);

        if (set.PARENT != null) {
            if (Array.isArray(set.PARENT)) {
                for (let i = 0; i < set.PARENT.length; i++) {
                    this.define(set.PARENT[i], false);
                }
            } else {
                this.define(set.PARENT, false);
            }
        }
        if (set.index != null) this.index = set.index.toString();
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === "number" ? set.SHAPE : 0;
            this.shapeData = set.SHAPE;
        }
        this.imageInterpolation = set.IMAGE_INTERPOLATION != null ? set.IMAGE_INTERPOLATION : "bilinear"
        if (set.COLOR != null) {
            this.color.interpret(set.COLOR);
        }
        if (set.STROKE_WIDTH != null) this.strokeWidth = set.STROKE_WIDTH
        if (set.BORDERLESS != null) this.borderless = set.BORDERLESS;
        if (set.DRAW_FILL != null) this.drawFill = set.DRAW_FILL;
        if (set.GUNS != null) {
            let newGuns = [];
            for (let i = 0; i < set.GUNS.length; i++) {
                newGuns.push(new Gun(this, set.GUNS[i]));
            }
            this.guns = newGuns;
        }
    }
    camera() {
        return {
            type: 0x01,
            id: this.id,
            index: this.index,
            size: this.size,
            realSize: this.realSize,
            facing: this.facing,
            angle: this.bound.angle,
            direction: this.bound.direction,
            offset: this.bound.offset,
            sizeFactor: this.bound.size,
            mirrorMasterAngle: this.settings.mirrorMasterAngle,
            layer: this.bound.layer,
            color: this.color.compiled,
            strokeWidth: this.strokeWidth,
            borderless: this.borderless,
            drawFill: this.drawFill,
            guns: this.guns.map((gun) => gun.getPhotoInfo()),
            turrets: this.turrets
        };
    }
}

module.exports = { Prop };