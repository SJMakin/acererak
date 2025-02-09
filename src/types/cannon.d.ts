declare module 'cannon' {
  export class World {
    gravity: Vec3;
    broadphase: any;
    solver: { iterations: number };
    addBody(body: Body): void;
    step(timeStep: number): void;
  }

  export class Body {
    position: Vec3;
    quaternion: Quaternion;
    velocity: Vec3;
    angularVelocity: Vec3;
    mass: number;
    material: Material;
    type: number;
    constructor(options: {
      mass?: number;
      position?: Vec3;
      velocity?: Vec3;
      material?: Material;
      shape?: Shape;
    });
  }

  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): void;
  }

  export class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    setFromAxisAngle(axis: Vec3, angle: number): void;
  }

  export class Shape {}
  export class Plane extends Shape {}
  
  export class Material {
    constructor(options?: any);
  }
  
  export class ContactMaterial {
    constructor(m1: Material, m2: Material, options: any);
  }
  
  export class NaiveBroadphase {}

  export const BODY_TYPES: {
    DYNAMIC: number;
    STATIC: number;
    KINEMATIC: number;
  };
}