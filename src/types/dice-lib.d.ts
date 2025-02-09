declare module '../services/dice-lib.js' {
  import * as THREE from 'three';
  import * as CANNON from 'cannon';

  export class DiceManager {
    static setWorld(world: CANNON.World): void;
    static prepareValues(values: Array<{dice: DiceObject, value: number}>): void;
    static floorBodyMaterial: CANNON.Material;
  }

  interface DiceOptions {
    size?: number;
    backColor?: string;
  }

  interface DiceObject {
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD4 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD6 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD8 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD10 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD12 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD20 implements DiceObject {
    constructor(options: DiceOptions);
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }
}