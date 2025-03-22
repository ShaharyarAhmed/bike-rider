import * as THREE from 'three';
import { GameScene } from './scenes/GameScene.js';
import { Bike } from './components/Bike.js';
import { InputHandler } from './controls/InputHandler.js';
import { createRenderer } from './utils/renderer.js';

export class Game {
  constructor() {
    // Initialize properties
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer = null;
    this.scene = null;
    this.bike = null;
    this.camera = null;
    this.inputHandler = null;
    this.clock = new THREE.Clock();
    this.lastTime = 0;
  }

  init() {
    // Initialize the renderer
    this.renderer = createRenderer(this.width, this.height);
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Create the game scene
    this.scene = new GameScene();
    
    // Create the bike
    this.bike = new Bike();
    this.scene.add(this.bike.object);
    
    // Set up the camera
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(this.bike.object.position);
    
    // Set up input handling
    this.inputHandler = new InputHandler();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  update(deltaTime) {
    // Update the bike based on input
    this.bike.update(this.inputHandler, deltaTime);
    
    // Update the road based on bike position
    this.scene.updateRoad(this.bike.object.position);
    
    // Update the camera to follow the bike
    const bikePosition = this.bike.object.position;
    this.camera.position.set(
      bikePosition.x,
      bikePosition.y + 5,
      bikePosition.z + 10
    );
    this.camera.lookAt(bikePosition);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const currentTime = this.clock.getElapsedTime();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }
} 