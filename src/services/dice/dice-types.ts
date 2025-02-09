import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface DiceOptions {
    size?: number;
    fontColor?: string;
    backColor?: string;
}

export interface DiceVectors {
    position: CANNON.Vec3;
    quaternion: CANNON.Quaternion;
    velocity: CANNON.Vec3;
    angularVelocity: CANNON.Vec3;
}

export interface DiceValue {
    dice: DiceObject;
    value: number;
    vectors?: DiceVectors;
    stableCount?: number;
}

export interface ChamferGeometry {
    vectors: THREE.Vector3[];
    faces: number[][];
}

export interface DiceMaterialOptions {
    specular: number;
    color: number;
    shininess: number;
    flatShading: boolean;
}

export interface DiceEdit {
    old_text: string;
    new_text: string;
}