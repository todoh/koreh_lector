// --- editorcreador/editor3d_models.js ---
// (Anteriormente 'editor 3d/models.js')

// --- PRESETS DE DATOS v2.0 ---
// Se usa una nueva estructura: shape + geoParams

// Modelo Ferrari (Cajas)
export const ferrariModelData = {
    "geometries": {
        "chasis": { "shape": "box", "geoParams": { "width": 22, "height": 7, "depth": 44 } },
        "cabina": { "shape": "box", "geoParams": { "width": 16, "height": 6, "depth": 20 } },
        "aleron": { "shape": "box", "geoParams": { "width": 22, "height": 2, "depth": 6 } },
        "rueda_di": { "shape": "box", "geoParams": { "width": 4, "height": 8, "depth": 8 } },
        "rueda_dd": { "shape": "box", "geoParams": { "width": 4, "height": 8, "depth": 8 } },
        "rueda_ti": { "shape": "box", "geoParams": { "width": 4, "height": 8, "depth": 8 } },
        "rueda_td": { "shape": "box", "geoParams": { "width": 4, "height": 8, "depth": 8 } }
    },
    "materials": {
        "chasis": { "color": "#D40000" },
        "cabina": { "color": "#220000" },
        "aleron": { "color": "#D40000" },
        "rueda_di": { "color": "#111111" },
        "rueda_dd": { "color": "#111111" },
        "rueda_ti": { "color": "#111111" },
        "rueda_td": { "color": "#111111" }
    },
    "positions": {
        "chasis": { "x": 0, "y": 9, "z": 0 },
        "cabina": { "x": 0, "y": 15.5, "z": -5 },
        "aleron": { "x": 0, "y": 13.5, "z": -19 },
        "rueda_di": { "x": -11, "y": 4, "z": 12 },
        "rueda_dd": { "x": 11, "y": 4, "z": 12 },
        "rueda_ti": { "x": -11, "y": 4, "z": -12 },
        "rueda_td": { "x": 11, "y": 4, "z": -12 }
    },
    "rotations": {},
    "parenting": {}
};

// Modelo Humanoid (Cajas) - El antiguo "humanoid"
export const humanoidBoxModelData = {
    "geometries": {
        "pelvis": { "shape": "box", "geoParams": { "width": 14, "height": 6, "depth": 8 } },
        "torso": { "shape": "box", "geoParams": { "width": 16, "height": 16, "depth": 10 } },
        "head": { "shape": "box", "geoParams": { "width": 8, "height": 8, "depth": 8 } },
        "upper_arm_l": { "shape": "box", "geoParams": { "width": 4, "height": 12, "depth": 4 } },
        "lower_arm_l": { "shape": "box", "geoParams": { "width": 3, "height": 10, "depth": 3 } },
        "upper_arm_r": { "shape": "box", "geoParams": { "width": 4, "height": 12, "depth": 4 } },
        "lower_arm_r": { "shape": "box", "geoParams": { "width": 3, "height": 10, "depth": 3 } },
        "upper_leg_l": { "shape": "box", "geoParams": { "width": 6, "height": 14, "depth": 6 } },
        "lower_leg_l": { "shape": "box", "geoParams": { "width": 5, "height": 12, "depth": 5 } },
        "upper_leg_r": { "shape": "box", "geoParams": { "width": 6, "height": 14, "depth": 6 } },
        "lower_leg_r": { "shape": "box", "geoParams": { "width": 5, "height": 12, "depth": 5 } }
    },
    "materials": {
        "pelvis": { "color": "#004488" },
        "torso": { "color": "#880000" },
        "head": { "color": "#f0c0a0" },
        "upper_arm_l": { "color": "#880000" },
        "lower_arm_l": { "color": "#f0c0a0" },
        "upper_arm_r": { "color": "#880000" },
        "lower_arm_r": { "color": "#f0c0a0" },
        "upper_leg_l": { "color": "#004488" },
        "lower_leg_l": { "color": "#333333" },
        "upper_leg_r": { "color": "#004488" },
        "lower_leg_r": { "color": "#333333" }
    },
    "positions": {
        "pelvis": { "x": 0, "y": 26, "z": 0 },
        "torso": { "x": 0, "y": 11, "z": 0 },
        "head": { "x": 0, "y": 12, "z": 0 },
        "upper_arm_l": { "x": 10, "y": 6, "z": 0 },
        "lower_arm_l": { "x": 0, "y": -11, "z": 0 },
        "upper_arm_r": { "x": -10, "y": 6, "z": 0 },
        "lower_arm_r": { "x": 0, "y": -11, "z": 0 },
        "upper_leg_l": { "x": 5, "y": 26, "z": 0 },
        "lower_leg_l": { "x": 0, "y": -13, "z": 0 },
        "upper_leg_r": { "x": -5, "y": 26, "z": 0 },
        "lower_leg_r": { "x": 0, "y": -13, "z": 0 }
    },
    "rotations": {},
    "parenting": {
        "pelvis": "SCENE",
        "torso": "pelvis",
        "head": "torso",
        "upper_arm_l": "torso",
        "lower_arm_l": "upper_arm_l",
        "upper_arm_r": "torso",
        "lower_arm_r": "upper_arm_r",
        "upper_leg_l": "SCENE",
        "lower_leg_l": "upper_leg_l",
        "upper_leg_r": "SCENE",
        "lower_leg_r": "upper_leg_r"
    }
};

// Modelo Humanoid (Real) - Basado en player_model.js
export const humanoidRealModelData = {
    "geometries": {
        "pelvis": { "shape": "cylinder", "geoParams": { "radiusTop": 7, "radiusBottom": 8.5, "height": 6, "radialSegments": 16 } },
        "torso_mid": { "shape": "cylinder", "geoParams": { "radiusTop": 10, "radiusBottom": 7, "height": 10, "radialSegments": 16 } },
        "torso_up": { "shape": "cylinder", "geoParams": { "radiusTop": 8.5, "radiusBottom": 10, "height": 16, "radialSegments": 16 } },
        "head": { "shape": "sphere", "geoParams": { "radius": 5, "widthSegments": 16, "heightSegments": 12 } },
        "neck": { "shape": "cylinder", "geoParams": { "radiusTop": 1.8, "radiusBottom": 1.8, "height": 4, "radialSegments": 8 } },
        "upper_arm_l": { "shape": "cylinder", "geoParams": { "radiusTop": 3, "radiusBottom": 2.5, "height": 14, "radialSegments": 8 } },
        "lower_arm_l": { "shape": "cylinder", "geoParams": { "radiusTop": 2.5, "radiusBottom": 2, "height": 13, "radialSegments": 8 } },
        "upper_arm_r": { "shape": "cylinder", "geoParams": { "radiusTop": 3, "radiusBottom": 2.5, "height": 14, "radialSegments": 8 } },
        "lower_arm_r": { "shape": "cylinder", "geoParams": { "radiusTop": 2.5, "radiusBottom": 2, "height": 13, "radialSegments": 8 } },
        "upper_leg_l": { "shape": "cylinder", "geoParams": { "radiusTop": 4.5, "radiusBottom": 3.5, "height": 19, "radialSegments": 8 } },
        "lower_leg_l": { "shape": "cylinder", "geoParams": { "radiusTop": 3.5, "radiusBottom": 2.5, "height": 18, "radialSegments": 8 } },
        "upper_leg_r": { "shape": "cylinder", "geoParams": { "radiusTop": 4.5, "radiusBottom": 3.5, "height": 19, "radialSegments": 8 } },
        "lower_leg_r": { "shape": "cylinder", "geoParams": { "radiusTop": 3.5, "radiusBottom": 2.5, "height": 18, "radialSegments": 8 } },
        "foot_l": { "shape": "box", "geoParams": { "width": 5, "height": 3, "depth": 7 } },
        "foot_r": { "shape": "box", "geoParams": { "width": 5, "height": 3, "depth": 7 } },
        "shoulder_l": { "shape": "sphere", "geoParams": { "radius": 3 } },
        "shoulder_r": { "shape": "sphere", "geoParams": { "radius": 3 } },
        "hand_l": { "shape": "sphere", "geoParams": { "radius": 2.5 } },
        "hand_r": { "shape": "sphere", "geoParams": { "radius": 2.5 } }
    },
    "materials": {
        "pelvis": { "color": "#004488" },
        "torso_mid": { "color": "#880000" },
        "torso_up": { "color": "#880000" },
        "head": { "color": "#f0c0a0" },
        "neck": { "color": "#f0c0a0" },
        "upper_arm_l": { "color": "#880000" },
        "lower_arm_l": { "color": "#f0c0a0" },
        "upper_arm_r": { "color": "#880000" },
        "lower_arm_r": { "color": "#f0c0a0" },
        "upper_leg_l": { "color": "#004488" },
        "lower_leg_l": { "color": "#004488" },
        "upper_leg_r": { "color": "#004488" },
        "lower_leg_r": { "color": "#004488" },
        "foot_l": { "color": "#333333" },
        "foot_r": { "color": "#333333" },
        "shoulder_l": { "color": "#880000" },
        "shoulder_r": { "color": "#880000" },
        "hand_l": { "color": "#f0c0a0" },
        "hand_r": { "color": "#f0c0a0" }
    },
    "positions": {
        "pelvis": { "x": 0, "y": 40, "z": 0 },
        "torso_mid": { "x": 0, "y": 8, "z": 0 },
        "torso_up": { "x": 0, "y": 13, "z": 0 },
        "head": { "x": 0, "y": 15.5, "z": 0 },
        "neck": { "x": 0, "y": 10, "z": 0 },
        "upper_arm_l": { "x": 0, "y": -7, "z": 0 },
        "lower_arm_l": { "x": 0, "y": -13.5, "z": 0 },
        "upper_arm_r": { "x": 0, "y": -7, "z": 0 },
        "lower_arm_r": { "x": 0, "y": -13.5, "z": 0 },
        "upper_leg_l": { "x": 6, "y": 27.5, "z": 0 },
        "lower_leg_l": { "x": 0, "y": -18.5, "z": 0 },
        "upper_leg_r": { "x": -6, "y": 27.5, "z": 0 },
        "lower_leg_r": { "x": 0, "y": -18.5, "z": 0 },
        "foot_l": { "x": 0, "y": -7.5, "z": 2 },
        "foot_r": { "x": 0, "y": -7.5, "z": 2 },
        "shoulder_l": { "x": 11.5, "y": 7, "z": 0 },
        "shoulder_r": { "x": -11.5, "y": 7, "z": 0 },
        "hand_l": { "x": 0, "y": -6.5, "z": 0 },
        "hand_r": { "x": 0, "y": -6.5, "z": 0 }
    },
    "rotations": {
    },
    "parenting": {
        "pelvis": "SCENE",
        "torso_mid": "pelvis",
        "torso_up": "torso_mid",
        "head": "torso_up",
        "neck": "torso_up",
        "upper_arm_l": "shoulder_l",
        "lower_arm_l": "upper_arm_l",
        "upper_arm_r": "shoulder_r",
        "lower_arm_r": "upper_arm_r",
        "upper_leg_l": "SCENE",
        "lower_leg_l": "upper_leg_l",
        "upper_leg_r": "SCENE",
        "lower_leg_r": "upper_leg_r",
        "foot_l": "lower_leg_l",
        "foot_r": "lower_leg_r",
        "shoulder_l": "torso_up",
        "shoulder_r": "torso_up",
        "hand_l": "lower_arm_l",
        "hand_r": "lower_arm_r"
    }
};



// --- CLASE DE DATOS v2.0 ---
export class PartData {
    constructor(name, {
        shape = 'box',
        geoParams = { width: 10, height: 10, depth: 10 },
        x = 0, y = 0, z = 0,
        rx = 0, ry = 0, rz = 0,
        color = '#ffffff',
        texture = '',
        parent = 'SCENE'
    } = {}) {
        this.name = name;
        this.shape = shape;
        this.geoParams = geoParams;
        this.x = x;
        this.y = y;
        this.z = z;
        this.rx = rx;
        this.ry = ry;
        this.rz = rz;
        this.color = color;
        this.texture = texture;
        this.parent = parent;
    }
}