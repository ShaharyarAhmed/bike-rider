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
    this.gameOver = false;
    this.debugMode = false; // Debug mode flag
  }

  init() {
    // Initialize the renderer
    this.renderer = createRenderer(this.width, this.height);
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Create the game scene - this will create road and traffic
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
    this.setupKeyboardControls();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Create game over message
    this.createGameOverMessage();
  }

  setupKeyboardControls() {
    // Add debug toggle key
    window.addEventListener('keydown', (e) => {
      // Toggle debug mode with the 'D' key
      if (e.key === 'd' || e.key === 'D') {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
        
        // Update debug visualization for traffic
        if (this.scene.traffic) {
          this.scene.traffic.toggleDebug(this.debugMode);
        }
        
        // Update debug visualization for the bike
        if (this.bike && this.bike.toggleDebug) {
          this.bike.toggleDebug(this.debugMode);
        }
      }
    });
  }

  createGameOverMessage() {
    // Create game over container
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.id = 'game-over';
    this.gameOverElement.style.position = 'absolute';
    this.gameOverElement.style.top = '50%';
    this.gameOverElement.style.left = '50%';
    this.gameOverElement.style.transform = 'translate(-50%, -50%)';
    this.gameOverElement.style.color = 'white';
    this.gameOverElement.style.fontSize = '3rem';
    this.gameOverElement.style.textAlign = 'center';
    this.gameOverElement.style.background = 'rgba(0, 0, 0, 0.7)';
    this.gameOverElement.style.padding = '2rem';
    this.gameOverElement.style.borderRadius = '1rem';
    this.gameOverElement.style.display = 'none';
    
    // Add message
    this.gameOverElement.innerHTML = `
      <h1>Game Over</h1>
      <p>You crashed!</p>
      <button id="restart-button" style="padding: 1rem 2rem; font-size: 1.5rem; margin-top: 1rem; cursor: pointer;">
        Play Again
      </button>
    `;
    
    document.getElementById('game-container').appendChild(this.gameOverElement);
    
    // Add event listener to restart button
    document.getElementById('restart-button').addEventListener('click', () => {
      this.restartGame();
    });
  }
  
  restartGame() {
    // Hide game over message
    this.gameOverElement.style.display = 'none';
    
    // Reset game state
    this.gameOver = false;
    
    // Reset bike position and speed
    this.bike.object.position.set(0, 0.5, 0);
    this.bike.speed = 5; // Use initial speed value from Bike class
    this.bike.currentTilt = 0;
    this.bike.object.rotation.z = 0;
    
    // Reset camera
    this.camera.position.set(0, 5, 10);
    
    // Reset scene (recreate traffic)
    this.scene.traffic.vehicles.forEach(vehicle => {
      this.scene.traffic.object.remove(vehicle.object);
    });
    this.scene.traffic.vehicles = [];
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  update(deltaTime) {
    // Don't update if game is over
    if (this.gameOver) {
      return;
    }
    
    // Process input state for the bike
    const input = {
      forward: this.inputHandler.isKeyPressed('ArrowUp'),
      backward: this.inputHandler.isKeyPressed('ArrowDown'),
      left: this.inputHandler.isKeyPressed('ArrowLeft'),
      right: this.inputHandler.isKeyPressed('ArrowRight'),
      brake: this.inputHandler.isKeyPressed('Space')
    };
    
    // Update bike with the processed input
    const bikeStatus = this.bike.update(deltaTime, input);
    
    // Update scene (this will update road and traffic)
    this.scene.update(deltaTime, this.bike.object.position);
    
    // Check for collisions with traffic
    if (this.scene.checkCollisions(this.bike.object.position, 1.2)) {
      console.log('Collision with vehicle!');
      // On collision, either slow down or handle crash based on severity
      if (this.bike.speed > 20) {
        // Major collision at high speed
        this.handleCrash();
      } else {
        // Minor collision, just slow down
        this.bike.speed = Math.min(this.bike.speed, 5);
      }
    }
    
    // Update camera
    const cameraDistance = 10 + (this.bike.speed / 10);
    this.camera.position.set(
      this.bike.object.position.x,
      this.bike.object.position.y + 5,
      this.bike.object.position.z + cameraDistance
    );
    this.camera.lookAt(this.bike.object.position);
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  handleCrash() {
    this.gameOver = true;
    this.gameOverElement.style.display = 'block';
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const currentTime = this.clock.getElapsedTime();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
  }
} 