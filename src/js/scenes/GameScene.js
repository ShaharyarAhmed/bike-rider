import * as THREE from 'three';
import { Road } from '../components/Road.js';

export class GameScene extends THREE.Scene {
  constructor() {
    super();
    
    // Set up background
    this.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add lighting
    this.setupLights();
    
    // Create the road
    this.road = new Road(200, 10); // length, width
    this.add(this.road.object);
  }
  
  setupLights() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.add(ambientLight);
    
    // Directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.add(directionalLight);
  }
} 