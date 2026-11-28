import { MockupEntity } from "./mockupEntity";
import { getDimensions } from "./mockupDimensions.js";
import { rounder } from "../lib/util";
import { Class, mockupData, mockupMap } from "../loaders/global.js";

function getMockup(e, positionInfo) {
    const turretsAndProps = e.turrets.concat(e.props);
    return {
        index: e.index,
        name: e.label,
        x: rounder(e.x),
        y: rounder(e.y),
        upgradeName: e.upgradeLabel,
        upgradeTooltip: e.upgradeTooltip,
        color: e.color,
        strokeWidth: e.strokeWidth,
        upgradeColor: e.upgradeColor,
        glow: e.glow,
        borderless: e.borderless,
        drawFill: e.drawFill,
        visibleOnBlackout: e.visibleOnBlackout,
        censor: e.censor,
        shape: e.shapeData,
        imageInterpolation: e.imageInterpolation,
        size: rounder(e.size),
        realSize: rounder(e.realSize),
        mirrorMasterAngle: e.settings.mirrorMasterAngle,
        layer: e.layer,
        statnames: e.settings.skillNames,
        sendAllMockups: e.sendAllMockups,
        position: positionInfo,
        rerootUpgradeTree: e.rerootUpgradeTree,
        className: e.className,
        upgrades: e.upgrades.map((r) => ({
            tier: r.tier,
            index: r.index
        })),
        guns: e.guns.map(function(gun) {
            return {
                offset: rounder(gun.offset),
                direction: rounder(gun.direction),
                length: rounder(gun.length),
                width: rounder(gun.width),
                aspect: rounder(gun.aspect),
                angle: rounder(gun.angle),
                color: gun.color,
                strokeWidth: gun.strokeWidth,
                alpha: gun.alpha,
                borderless: gun.borderless,
                drawFill: gun.drawFill,
                drawAbove: gun.drawAbove,
                layer: gun.layer
            };
        }),
        turrets: turretsAndProps.map(function(t) {
            // Merge turrets and props for the entity images.
            const out = getMockup(t, {});
            out.sizeFactor = rounder(t.bound.size);
            out.offset = rounder(t.bound.offset);
            out.direction = rounder(t.bound.direction);
            out.layer = rounder(t.bound.layer);
            out.angle = rounder(t.bound.angle);
            out.isProp = t.isProp;
            return out;
        }),
        props: e.props.map(function(p) {
            const out = getMockup(p, {});
            out.sizeFactor = rounder(p.bound.size);
            out.offset = rounder(p.bound.offset);
            out.direction = rounder(p.bound.direction);
            out.layer = rounder(p.bound.layer);
            out.angle = rounder(p.bound.angle);
            out.forceAngle = p.forceAngle;
            out.isProp = true;
            return out;
        })
    };
}

export function buildMockup(className, Manager) {
    try {
        const type = Class[className];
        const mockup = new MockupEntity(Manager);
        mockup.set(className);
        mockup.className = className;
        mockup.name = type.LABEL; // Rename it (for the upgrades menu).
        // Fetch the mockup.
        type.mockup = {
            position: getDimensions(mockup)
        };
        // Add the new data to the thing.
        mockupMap[mockup.index] = mockupData.length;
        mockupData.push(getMockup(mockup, type.mockup.position));
    } catch (error) {
        error("[WARNING]: An error has occured during mockup loading:");
        error(`When attempting to generate mockup "${className}":`);
        for (const i in Class[className]) {
            error(`\t${i}: ${Class[className][i]}`);
        }
        throw error;
    }
}
