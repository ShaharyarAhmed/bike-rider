import * as THREE from 'three';
import { Road } from '../components/Road.js';
import { Traffic } from '../components/Traffic.js';

export class GameScene extends THREE.Scene {
  constructor() {
    super();
    
    // Set up background
    this.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add lighting
    this.setupLights();
    
    // Create the road with chunk length and width
    this.road = new Road(100, 10); // chunkLength, width
    this.add(this.road.object);
    
    // Add traffic system
    this.traffic = new Traffic(10, 100); // roadWidth, roadLength
    this.add(this.traffic.object);
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
  
  // Method to update the scene
  update(deltaTime, bikePosition) {
    // Update the road
    if (this.road) {
      this.road.update(bikePosition);
    }
    
    // Update traffic
    if (this.traffic) {
      this.traffic.update(deltaTime, bikePosition);
    }
  }
  
  // Check for collisions with traffic
  checkCollisions(bikePosition, bikeSize) {
    if (this.traffic) {
      return this.traffic.checkCollision(bikePosition, bikeSize);
    }
    return false;
  }
} 