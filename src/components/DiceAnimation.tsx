import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DiceManager, DiceD20, DiceD4, DiceD6, DiceD8, DiceD10, DiceD12 } from '../services/dice-lib.js';
import { RollResult, DiceGeometryType } from '../types';

interface DiceAnimationProps {
  roll: RollResult;
  onAnimationComplete?: () => void;
}

const DiceAnimation: React.FC<DiceAnimationProps> = ({ roll, onAnimationComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>(null!);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const rendererRef = useRef<THREE.WebGLRenderer>(null!);
  const worldRef = useRef<CANNON.World>(null!);
  const diceRef = useRef<any[]>([]);
  const frameRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControls>(null!);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera setup - adjusted for better dice visibility
    const camera = new THREE.PerspectiveCamera(
      40, // Reduced FOV for less distortion
      window.innerWidth / window.innerHeight,
      0.01,
      20000
    );
    camera.position.set(0, 35, 25); // Adjusted position for better viewing angle
    camera.lookAt(0, 0, 0);
    scene.add(camera);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Enhanced directional lighting - improved for better dice readability
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5); // Increased intensity
    mainLight.position.set(15, 25, 15); // Adjusted position
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024; // Increased shadow resolution
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased intensity
    fillLight.position.set(-15, 20, -15); // Adjusted position
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
    topLight.position.set(0, 30, 0); // Raised position
    scene.add(topLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Increased intensity
    scene.add(ambientLight);

    // Floor
    // Invisible floor for physics only
    const floorGeometry = new THREE.PlaneGeometry(30, 30, 1, 1);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      transparent: true,
      opacity: 0.1,
      roughness: 0.7,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    scene.add(floor);

    // Physics world setup
    const world = new CANNON.World();
    world.gravity.set(0, -9.82 * 25, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 16;
    worldRef.current = world;

    DiceManager.setWorld(world);

    // Floor physics body
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: DiceManager.floorBodyMaterial
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floorBody);

    // Create and throw dice
    const diceValues = [];
    for (let i = 0; i < roll.results.length; i++) {
      let die;
      switch (roll.roll.type) {
        case 'd4': die = new DiceD4({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 4; break;
        case 'd6': die = new DiceD6({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 6; break;
        case 'd8': die = new DiceD8({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 8; break;
        case 'd10': die = new DiceD10({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 10; break;
        case 'd12': die = new DiceD12({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 12; break;
        default: die = new DiceD20({ size: 2.5, fontColor: '#ffffff', backColor: '#5d0000' }) as any; die.values = 20;
      }

      const diceObject = die.getObject() as THREE.Mesh & { body: CANNON.Body };
      scene.add(diceObject);
      diceRef.current.push(die);

      // Position and throw dice
      die.resetBody();
      diceObject.position.x = -15 - (i % 3) * 1.5;
      diceObject.position.y = 2 + Math.floor(i / 3) * 1.5;
      diceObject.position.z = -15 + (i % 3) * 1.5;
      diceObject.quaternion.x = (Math.random() * 90 - 45) * Math.PI / 180;
      diceObject.quaternion.z = (Math.random() * 90 - 45) * Math.PI / 180;
      die.updateBodyFromMesh();

      const yRand = Math.random() * 20;
      const rand = Math.random() * 5;
      diceObject.body.velocity.set(25 + rand, 40 + yRand, 15 + rand);
      diceObject.body.angularVelocity.set(
        20 * Math.random() - 10,
        20 * Math.random() - 10,
        20 * Math.random() - 10
      );

      diceValues.push({ dice: die, value: roll.results[i] });
    }

    DiceManager.prepareValues(diceValues);

    // Animation loop
    const animate = () => {
      if (worldRef.current) {
        worldRef.current.step(1.0 / 60.0);
        diceRef.current.forEach(die => die.updateMeshFromBody());
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Check if dice have settled
      const allSettled = diceRef.current.every(die => die.isFinished());
      if (allSettled) {
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 3000);  // Increased from 1000ms to 3000ms to give more time to read dice
        return;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      diceRef.current = [];
    };
  }, [roll]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        backgroundColor: 'transparent',
        pointerEvents: 'none'
      }} 
    />
  );
};

// Debug function to test dice rolls from console
export const testRoll = (diceType: DiceGeometryType = 'd20', count: number = 1, predeterminedResults?: number[]) => {
  const roll: RollResult = {
    roll: {
      type: diceType,
      count: count,
      description: `Rolling ${count}${diceType}`,
      modifier: 0
    },
    results: predeterminedResults || Array(count).fill(0).map(() => Math.floor(Math.random() * parseInt(diceType.slice(1))) + 1),
    total: 0,
    formatted: ''
  };
  roll.total = roll.results.reduce((a, b) => a + b, 0);
  roll.formatted = `${roll.roll.description}: [${roll.results.join(', ')}] = ${roll.total}`;
  
  let container = document.getElementById('dice-animation-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dice-animation-container';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.backgroundColor = 'transparent';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(
    <DiceAnimation 
      roll={roll} 
      onAnimationComplete={() => {
        setTimeout(() => {
          root.unmount();
          container?.remove();
        }, 4000);  // Increased from 2000ms to 4000ms to give more time to read dice
      }} 
    />
  );
};

// Make testRoll available globally
declare global {
  interface Window {
    testRoll: typeof testRoll;
  }
}

window.testRoll = testRoll;

export default DiceAnimation;
