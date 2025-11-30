declare module '../services/dice-lib.js' {
  import type * as CANNON from 'cannon';
  import type * as THREE from 'three';

  export class DiceManager {
    static setWorld(): void;
    static prepareValues(): void;
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
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD6 implements DiceObject {
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD8 implements DiceObject {
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD10 implements DiceObject {
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD12 implements DiceObject {
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }

  export class DiceD20 implements DiceObject {
    constructor();
    getObject(): THREE.Mesh;
    resetBody(): void;
    updateBodyFromMesh(): void;
    updateMeshFromBody(): void;
    isFinished(): boolean;
  }
}
