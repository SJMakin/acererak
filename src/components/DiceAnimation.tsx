import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RollResult, Dice3DAnimationState, DiceGeometryType } from '../types';

interface DiceAnimationProps {
  roll: RollResult;
  onAnimationComplete?: () => void;
}

// Debug function to test dice rolls from console
export const testRoll = (diceType: DiceGeometryType = 'd20', count: number = 1) => {
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

  const root = createRoot(container);
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

const DiceAnimation: React.FC<DiceAnimationProps> = ({
  roll,
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const diceRef = useRef<Array<{
    mesh: THREE.Group;
    state: Dice3DAnimationState;
  }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera with a more dynamic perspective
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    cameraRef.current = camera;

    // Setup renderer with better quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;

    // Add OrbitControls after renderer is created
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    function setRendererSize(event?: Event) {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      renderer.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    // Initial size setup
    setRendererSize();
    
    // Add renderer to container
    containerRef.current.appendChild(renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', (e) => setRendererSize(e));

    // Setup renderer properties
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const mainLight = new THREE.SpotLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x9090ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Create dice with physics states
    roll.results.forEach((_, index) => {
      const diceGeometry = createDiceGeometry(roll.roll.type);
      const diceMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.5,
        clearcoat: 0.3,
        clearcoatRoughness: 0.25,
      });

      const dice = new THREE.Mesh(diceGeometry, diceMaterial);
      dice.castShadow = true;
      dice.receiveShadow = true;

      const diceGroup = new THREE.Group();
      diceGroup.add(dice);

      // Initial state with random velocities
      const state: Dice3DAnimationState = {
        position: {
          x: -10 + Math.random() * 2,
          y: 5 + Math.random() * 2,
          z: -2 + Math.random() * 4
        },
        rotation: {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI
        },
        velocity: {
          x: 10 + Math.random() * 5,
          y: 2 + Math.random() * 2,
          z: -2 + Math.random() * 4
        },
        angularVelocity: {
          x: Math.random() * 10 - 5,
          y: Math.random() * 10 - 5,
          z: Math.random() * 10 - 5
        }
      };

      diceGroup.position.set(state.position.x, state.position.y, state.position.z);
      diceGroup.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);

      scene.add(diceGroup);
      diceRef.current.push({ mesh: diceGroup, state });
    });

    // Animation variables
    const startTime = Date.now();
    const animationDuration = 2500; // 2.5 seconds

    // Physics constants
    const gravity = -15;
    const airResistance = 0.01;
    const groundRestitution = 0.6;
    const rotationalDamping = 0.98;





    // Handle window resize
    window.addEventListener('resize', (e) => setRendererSize(e));

    // Cleanup function
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      diceRef.current = [];
    };
  }, [roll, onAnimationComplete]);

  const createDiceGeometry = (diceType: string): THREE.BufferGeometry => {
    switch (diceType) {
      case 'd4':
        return new THREE.TetrahedronGeometry(1);
      case 'd6':
        return new THREE.BoxGeometry(1, 1, 1);
      case 'd8':
        return new THREE.OctahedronGeometry(1);
      case 'd10': {
        // Create a more accurate d10 shape
        const geometry = new THREE.CylinderGeometry(0, 1, 1.5, 10);
        geometry.rotateX(Math.PI / 2);
        return geometry;
      }
      case 'd12':
        return new THREE.DodecahedronGeometry(1);
      case 'd20':
        return new THREE.IcosahedronGeometry(1);
      case 'd100': {
        // Similar to d10 but larger
        const geometry = new THREE.CylinderGeometry(0, 1.2, 1.8, 10);
        geometry.rotateX(Math.PI / 2);
        return geometry;
      }
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }} 
    />
  );
};

export default DiceAnimation;