import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { DiceManager, DiceD20, DiceD4, DiceD6, DiceD8, DiceD10, DiceD12 } from '../services/dice/dice-lib';
import { RollResult, DiceGeometryType } from '../types';

interface DiceAnimationProps {
  roll: RollResult;
  onAnimationComplete?: () => void;
}

// Debug function to test dice rolls from console
export const testRoll = (diceType: DiceGeometryType = 'd20', count: number = 1) => {
  console.log('Starting testRoll with:', diceType, count);
  const roll: RollResult = {
    roll: {
      type: diceType,
      count: count,
      description: `Rolling ${count}${diceType}`,
      modifier: 0
    },
    results: Array(count).fill(0).map(() => Math.floor(Math.random() * parseInt(diceType.slice(1))) + 1),
    total: 0,
    formatted: ''
  };
  roll.total = roll.results.reduce((a, b) => a + b, 0);
  roll.formatted = `${roll.roll.description}: [${roll.results.join(', ')}] = ${roll.total}`;
  
  // Find existing container or create one
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
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
  }

  console.log('Container created:', container);
  const root = createRoot(container);
  console.log('Root created, rendering component...');
  root.render(
    <DiceAnimation 
      roll={roll} 
      onAnimationComplete={() => {
        setTimeout(() => {
          root.unmount();
          container?.remove();
        }, 2000);
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

const createDiceByType = (type: DiceGeometryType) => {
  if (!DiceManager.world) {
    throw new Error('DiceManager world must be initialized before creating dice');
  }
  const options = {
    size: 100,
    fontColor: '#ffffff',
    backColor: '#202020'
  };

  switch (type) {
    case 'd4':
      return new DiceD4(options);
    case 'd6':
      return new DiceD6(options);
    case 'd8':
      return new DiceD8(options);
    case 'd10':
      return new DiceD10(options);
    case 'd12':
      return new DiceD12(options);
    case 'd20':
    default:
      return new DiceD20(options);
  }
};

const DiceAnimation: React.FC<DiceAnimationProps> = ({
  roll,
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const diceRef = useRef<Array<any>>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const initScene = async () => {
      try {
        // Reset state before starting new animation
        DiceManager.resetThrowState();
        if (!containerRef.current) return;

        // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // Position camera to better view the dice
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 2, 0); // Look at the center of the dice area
    console.log('Camera position:', camera.position);
    console.log('Camera looking at:', camera.getWorldDirection(new THREE.Vector3()));
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0.5); // Lighter background
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    console.log('Renderer initialized with size:', window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    // Setup physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Normal earth gravity
world.fixedTimeStep = 1/60; // Fixed time step at 60Hz
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 20;
    world.allowSleep = false; // Prevent bodies from sleeping
    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    worldRef.current = world;
    
    // Initialize DiceManager and wait for it to be properly ready
    await DiceManager.setWorld(world);

    // Add renderer to container
    containerRef.current.appendChild(renderer.domElement);

    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    console.log('Added ambient light');

    // Add directional light for better visibility
    // Add multiple lights for better visibility
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);
    
    // Add fill light from the opposite side
    fillLight.position.set(-10, 15, -10);
    fillLight.castShadow = true;
    scene.add(fillLight);
    
    // Add backlight for depth
    backLight.position.set(0, 10, -15);
    backLight.castShadow = true;
    scene.add(backLight);
    console.log('Added main light at position:', mainLight.position);

    // Create visible floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x404040,
      roughness: 0.7,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Create visible walls
    const wallGeometry = new THREE.BoxGeometry(0.2, 10, 10);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x606060,
      transparent: true,
      opacity: 0.3,
      roughness: 0.3,
      metalness: 0.4
    });

    // Add visible walls
    const leftWallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWallMesh.position.set(-5, 5, 0);
    scene.add(leftWallMesh);

    const rightWallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWallMesh.position.set(5, 5, 0);
    scene.add(rightWallMesh);

    const backWallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    backWallMesh.rotation.y = Math.PI / 2;
    backWallMesh.position.set(0, 5, -5);
    scene.add(backWallMesh);

    const frontWallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWallMesh.rotation.y = Math.PI / 2;
    frontWallMesh.position.set(0, 5, 5);
    scene.add(frontWallMesh);

    // Create physics bodies for floor and walls
    const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
    material: DiceManager.floorBodyMaterial
    });
    // Floor should be horizontal for Y-axis gravity
    floorBody.position.set(0, 0, 0);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), 0);
    world.addBody(floorBody);

    // Add walls to contain the dice
    const wallShape = new CANNON.Box(new CANNON.Vec3(0.1, 5, 5));
    // Create physics materials with proper contact properties
const wallPhysicsMaterial = new CANNON.Material('wall');

// Add contact material between dice and walls
world.addContactMaterial(
  new CANNON.ContactMaterial(DiceManager.diceBodyMaterial, wallPhysicsMaterial, {
    friction: 0.2,      // Some friction against walls
    restitution: 0.6    // Moderate bounce
  })
);

    // Left wall
    const leftWall = new CANNON.Body({ mass: 0, material: wallPhysicsMaterial });
    leftWall.addShape(wallShape);
    leftWall.position.set(-5, 5, 0);
    world.addBody(leftWall);

    // Right wall
    const rightWall = new CANNON.Body({ mass: 0, material: wallPhysicsMaterial });
    rightWall.addShape(wallShape);
    rightWall.position.set(5, 5, 0);
    world.addBody(rightWall);

    // Back wall
    const backWall = new CANNON.Body({ mass: 0, material: wallPhysicsMaterial });
    backWall.addShape(new CANNON.Box(new CANNON.Vec3(5, 5, 0.1)));
    backWall.position.set(0, 5, -5);
    world.addBody(backWall);

    // Front wall
    const frontWall = new CANNON.Body({ mass: 0, material: wallPhysicsMaterial });
    frontWall.addShape(new CANNON.Box(new CANNON.Vec3(5, 5, 0.1)));
    frontWall.position.set(0, 5, 5);
    world.addBody(frontWall);

    // Now create and add dice since world is properly initialized
    
    for (let index = 0; index < roll.results.length; index++) {
      const value = roll.results[index];
      console.log('Creating dice of type:', roll.roll.type);
      const dice = createDiceByType(roll.roll.type);
      console.log('Dice created:', dice);
      const diceObject = dice.getObject();
      console.log('Dice object created:', diceObject);
      
      // Position dice with some offset
      // Set initial position slightly above center
diceObject.position.x = -1 + Math.random() * 2;
diceObject.position.y = 5 + index * 2;
diceObject.position.z = -1 + Math.random() * 2;

// Add initial velocity with upward and random horizontal motion
dice.object.body.velocity.set(
  (-2 + Math.random() * 4), // Horizontal velocity
  3,                        // Upward velocity
  (-2 + Math.random() * 4)  // Horizontal velocity
);

// Add spin around all axes
dice.object.body.angularVelocity.set(
  (-5 + Math.random() * 10),
  (-5 + Math.random() * 10),
  (-5 + Math.random() * 10)
);

// Wake up the body
dice.object.body.wakeUp();

// Reduce damping for more dynamic motion
dice.object.body.linearDamping = 0.1;
dice.object.body.angularDamping = 0.1;
      
      console.log('Adding dice to scene, current scene children:', scene.children.length);
      scene.add(diceObject);
      console.log('Scene children after adding dice:', scene.children.length);
      diceRef.current.push(dice);
      console.log('Total dice in ref:', diceRef.current.length);

      // Prepare the dice to land on the desired value
      DiceManager.prepareValues([{
        dice,
        value: value
      }]);
    }

    // Animation loop
    console.log('Starting animation with', diceRef.current.length, 'dice');
    let lastTime = 0;
    const animate = (time: number) => {
      if (!worldRef.current || !DiceManager.world) {
        console.log('Missing world reference in animation frame');
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      console.log('Animating frame', time);
      // Clamp delta time to prevent large steps
const delta = 1/60; // Use fixed timestep
      lastTime = time;

      if (worldRef.current) {
        console.log('Stepping physics world, delta:', delta);
        // Reset if dice goes out of bounds
        diceRef.current.forEach(dice => {
          const pos = dice.object.body.position;
          if (Math.abs(pos.x) > 100 || Math.abs(pos.y) > 100 || Math.abs(pos.z) > 100) {
            console.log('Dice out of bounds, resetting position');
            dice.object.body.position.set(0, 4, 0);
            dice.object.body.velocity.set(0, 0, 0);
            dice.object.body.angularVelocity.set(0, 0, 0);
          }
        });
        worldRef.current.step(delta);
        
        // Log the first dice's physics state
        if (diceRef.current[0] && diceRef.current[0].object && diceRef.current[0].object.body) {
          const body = diceRef.current[0].object.body;
          console.log('Dice physics state:', {
            position: body.position,
            velocity: body.velocity,
            angularVelocity: body.angularVelocity
          });
        }
      }

      // Update dice meshes
      try {
        diceRef.current.forEach((dice, index) => {
          if (dice.object && dice.object.position) {
            console.log('Dice position:', {
              x: dice.object.position.x,
              y: dice.object.position.y,
              z: dice.object.position.z
            });
          }
          if (dice && typeof dice.updateMeshFromBody === 'function') {
            dice.updateMeshFromBody();
          } else {
            console.warn('Invalid dice object at index', index, dice);
          }
        });
      } catch (error) {
        console.error('Error updating dice meshes:', error);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        console.log('Rendering scene');
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } else {
        console.warn('Missing renderer components:', {
          renderer: !!rendererRef.current,
          scene: !!sceneRef.current,
          camera: !!cameraRef.current
        });
      }

      // Check if all dice have stopped
      const allSettled = diceRef.current.every(dice => dice.isFinished());
      if (allSettled) {
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 1000);
        return;
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Failed to initialize dice scene:', error);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }
    };

    initScene();

    return () => {
      // Reset dice manager state
      DiceManager.resetThrowState();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [roll, onAnimationComplete]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default DiceAnimation;