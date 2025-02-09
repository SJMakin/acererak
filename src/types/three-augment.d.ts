import * as THREE from 'three';

declare module 'three' {
  interface Scene {
    new(): Scene;
  }
  
  interface AmbientLight {
    new(color?: THREE.ColorRepresentation, intensity?: number): AmbientLight;
  }
  
  interface SpotLight {
    new(color?: THREE.ColorRepresentation, intensity?: number): SpotLight;
  }
  
  interface PlaneGeometry {
    new(width?: number, height?: number, widthSegments?: number, heightSegments?: number): PlaneGeometry;
  }
  
  interface Mesh<
    TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
    TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
  > {
    new(geometry?: TGeometry, material?: TMaterial): Mesh<TGeometry, TMaterial>;
  }
}