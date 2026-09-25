class Color {
	#base = -1;
	#hueShift = 0;
	#saturationShift = 1;
	#brightnessShift = 0;
	#allowBrightnessInvert = false;

	constructor (color, isTile) {
        this.isTile = isTile;
        this.interpret(color);
	}

	reset () {
        this.#base = -1;
        this.#hueShift = 0;
        this.#saturationShift = 1;
        this.#brightnessShift = 0;
        this.#allowBrightnessInvert = false;
        this.recompile();
	}

	get base () { return this.#base }
	get hueShift () { return this.#hueShift }
	get saturationShift () { return this.#saturationShift }
	get brightnessShift () { return this.#brightnessShift }
	get allowBrightnessInvert () { return this.#allowBrightnessInvert }

	set base (value) { this.#base = value; this.recompile() }
	set hueShift (value) { this.#hueShift = value; this.recompile() }
	set saturationShift (value) { this.#saturationShift = value; this.recompile() }
	set brightnessShift (value) { this.#brightnessShift = value; this.recompile() }
	set allowBrightnessInvert (value) { this.#allowBrightnessInvert = value; this.recompile() }

    //lets just say we have to deal with some kind of color value and we dont know what it is
    interpret (color) {
    	switch (typeof color) {
    		case 'number':
    			this.#base = color;
	            break;
    		case 'object':
	            this.#base = color.BASE ?? color.base ?? this.#base ?? 16;
	            this.#hueShift = color.HUE_SHIFT ?? color.hueShift ?? this.#hueShift ?? 0;
	            this.#saturationShift = color.SATURATION_SHIFT ?? color.saturationShift ?? this.#saturationShift ?? 1;
	            this.#brightnessShift = color.BRIGHTNESS_SHIFT ?? color.brightnessShift ?? this.#brightnessShift ?? 0;
	            this.#allowBrightnessInvert = color.ALLOW_BRIGHTNESS_INVERT ?? color.allowBrightnessInvert ?? this.#allowBrightnessInvert ?? false;
	            break;
    		case 'string':
    			if (!color.includes(" ")) {
	    			this.#base = color;
    				break;
    			}

    			color = color.split(' ');
	            this.#base = color[0] ?? 16;
	            this.#hueShift = parseFloat(color[1]) ?? 0;
	            this.#saturationShift = parseFloat(color[2]) ?? 1;
	            this.#brightnessShift = parseFloat(color[3]) ?? 0;
	            this.#allowBrightnessInvert = color[4] == 'true';
    	}
    	this.recompile();
    }

    recompile () {
        let oldColor = this.compiled;
        this.compiled = this.#base + " " + this.#hueShift + " " + this.#saturationShift + " " + this.#brightnessShift + " " + this.#allowBrightnessInvert;
        if (this.isTile && this.compiled != oldColor) {
            room.sendColorsToClient = true;
        }
        return this.compiled;
    }
}

module.exports = { Color };