let { MockupEntity } = require("./mockupEntity");
let { getDimensions } = require("./mockup_dimentions.js");

function getMockup(e, positionInfo) {
    let turretsAndProps = e.turrets.concat(e.props);
    return {
        index: e.index,
        name: e.label,
        x: util.rounder(e.x),
        y: util.rounder(e.y),
        upgradeName: e.upgradeLabel,
        upgradeTooltip: e.upgradeTooltip,
        color: e.color,
        strokeWidth: e.strokeWidth,
        upgradeColor: e.upgradeColor,
        glow: e.glow,
        borderless: e.borderless,
        drawFill: e.drawFill,
        visibleOnBlackout: e.visibleOnBlackout,
        shape: e.shapeData,
        imageInterpolation: e.imageInterpolation,
        size: util.rounder(e.size),
        realSize: util.rounder(e.realSize),
        mirrorMasterAngle: e.settings.mirrorMasterAngle,
        layer: e.layer,
        statnames: e.settings.skillNames,
        sendAllMockups: e.sendAllMockups,
        position: positionInfo,
        rerootUpgradeTree: e.rerootUpgradeTree,
        className: e.className,
        upgrades: e.upgrades.map(r => ({
            tier: r.tier,
            index: r.index
        })),
        guns: e.guns.map(function(gun) {
            return {
                offset: util.rounder(gun.offset),
                direction: util.rounder(gun.direction),
                length: util.rounder(gun.length),
                width: util.rounder(gun.width),
                aspect: util.rounder(gun.aspect),
                angle: util.rounder(gun.angle),
                color: gun.color,
                strokeWidth: gun.strokeWidth,
                alpha: gun.alpha,
                borderless: gun.borderless,
                drawFill: gun.drawFill,
                drawAbove: gun.drawAbove,
                layer: gun.layer,
            };
        }),
        turrets: turretsAndProps.map(function(t) {
            // Merge turrets and props for the entity images.
            let out = getMockup(t, {});
            out.sizeFactor = util.rounder(t.bound.size);
            out.offset = util.rounder(t.bound.offset);
            out.direction = util.rounder(t.bound.direction);
            out.layer = util.rounder(t.bound.layer);
            out.angle = util.rounder(t.bound.angle);
            out.isProp = t.isProp;
            return out;
        }),
        props: e.props.map(function(p) {
            let out = getMockup(p, {});
            out.sizeFactor = util.rounder(p.bound.size);
            out.offset = util.rounder(p.bound.offset);
            out.direction = util.rounder(p.bound.direction);
            out.layer = util.rounder(p.bound.layer);
            out.angle = util.rounder(p.bound.angle);
            out.forceAngle = p.forceAngle;
            out.isProp = true;
            return out;
        })
    };
}

function buildMockup(className, Manager) {
    try {
        let type = Class[className];
        let mockup = new MockupEntity(Manager);
        mockup.set(className);
        mockup.className = className;
        mockup.name = type.LABEL; // Rename it (for the upgrades menu).
        // Fetch the mockup.
        type.mockup = {
            position: getDimensions(mockup),
        };
        // Add the new data to the thing.
        mockupMap[mockup.index] = mockupData.length;
        mockupData.push(getMockup(mockup, type.mockup.position));
    } catch (error) {
        util.error('[WARNING]: An error has occured during mockup loading:');
        util.error('When attempting to generate mockup "' + className + '":');
        for (let i in Class[className]) util.error("\t" + i + ": " + Class[className][i]);
        throw error;
    }
}

module.exports = {
    buildMockup,
};
