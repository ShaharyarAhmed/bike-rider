import * as THREE from 'three';
import { GameScene } from './scenes/GameScene.js';
import { Bike } from './components/Bike.js';
import { InputHandler } from './controls/InputHandler.js';
import { createRenderer } from './utils/renderer.js';
import { Road } from './components/Road';
import { Traffic } from './components/Traffic';
import { Vehicle } from './components/Vehicle';
import { AssetManager } from './utils/AssetManager.js';
import { CameraSettings } from './utils/CameraSettings.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Game {
  constructor() {
    // Initialize properties
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer = null;
    this.scene = null;
    this.bike = null;
    this.camera = null;
    this.cameraSettings = new CameraSettings(); // Initialize camera settings
    this.inputHandler = null;
    this.clock = new THREE.Clock();
    this.lastTime = 0;
    this.gameOver = false;
    this.debug = false;
    this.freeCamera = false;
    this.cameraControls = null;
    this.debugPanel = null;
  }

  init() {
    // Initialize the renderer
    this.renderer = createRenderer(this.width, this.height);
    document.getElementById('game-container').appendChild(this.renderer.domElement);

    // Initialize asset manager with debug mode
    this.assetManager = AssetManager.getInstance();
    this.assetManager.setDebugMode(false);
    
    // Test available model paths to find which ones work
    this.assetManager.testFilePaths([
      "truck1.glb", 
      "truck2.glb",
      "car1_grey.glb", 
      "car2_blue.glb", 
      "car3_red.glb",
      "car4_white.glb",
      "police_car1.glb", 
      "bus1.glb"
    ]);
    
    // Create the game scene - this will create road and traffic
    this.scene = new GameScene();
    
    // Create the bike
    this.bike = new Bike();
    this.scene.add(this.bike);
    
    // Set up the camera using camera settings
    const settings = this.cameraSettings.getInitSettings();
    this.camera = new THREE.PerspectiveCamera(
      settings.fov, 
      this.width / this.height, 
      settings.near, 
      settings.far
    );
    
    // Set initial camera position
    const defaultPos = this.cameraSettings.getDefaultPosition();
    this.camera.position.set(defaultPos.x, defaultPos.y, defaultPos.z);
    
    // Set lookAt point
    const lookAtPoint = this.cameraSettings.getLookAtPoint(this.bike.position);
    this.camera.lookAt(new THREE.Vector3(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z));
    
    // Initialize camera controls for debug mode
    this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.cameraControls.enabled = false; // Disabled by default
    this.cameraControls.enableDamping = true;
    this.cameraControls.dampingFactor = 0.25;
    
    // Set up input handling
    this.inputHandler = new InputHandler();
    this.setupKeyboardControls();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Create game over message
    this.createGameOverMessage();
    
    // Create debug panel
    this.createDebugPanel();
  }

  setupKeyboardControls() {
    // Add debug toggle key
    window.addEventListener('keydown', (e) => {
      // Toggle debug mode with the 'D' key
      if (e.key === 'd' || e.key === 'D') {
        this.toggleDebug();
      }
      
      // Toggle free camera mode with 'C' key when in debug mode
      if ((e.key === 'c' || e.key === 'C') && this.debug) {
        this.toggleFreeCamera();
      }
      
      // Toggle traffic model loading with 'T' key
      if (e.key === 't' || e.key === 'T') {
        if (this.scene && this.scene.traffic) {
          const traffic = this.scene.traffic;
          traffic.setModelLoadingEnabled(!traffic.modelLoadingEnabled);
          console.log(`Traffic model loading: ${traffic.modelLoadingEnabled ? 'ON' : 'OFF'}`);
        }
      }
      
      // Toggle collision boxes with 'B' key
      if (e.key === 'b' || e.key === 'B') {
        if (this.scene && this.scene.traffic) {
          const newState = this.scene.traffic.toggleCollisionBoxes();
          console.log(`Collision boxes ${newState ? 'shown' : 'hidden'}`);
          
          // Also toggle the bike's collision box if it exists
          if (this.bike && typeof this.bike.setCollisionBoxVisible === 'function') {
            this.bike.setCollisionBoxVisible(newState);
          }
          
          // Update debug panel immediately if active
          if (this.debug && this.debugPanel) {
            this.updateDebugPanel();
          }
        }
      }
      
      // Adjust loading probability
      if (this.scene && this.scene.traffic) {
        const traffic = this.scene.traffic;
        
        // Increase probability with '=' key
        if (e.key === '=' || e.key === '+') {
          traffic.setLoadingProbability(traffic.loadingProbability + 0.1);
        }
        
        // Decrease probability with '-' key
        if (e.key === '-' || e.key === '_') {
          traffic.setLoadingProbability(traffic.loadingProbability - 0.1);
        }
      }
    });

    // Model probability control keys
    window.addEventListener('keydown', (e) => {
      // Check if shift is pressed for model probability adjustments
      if (e.shiftKey && this.scene && this.scene.traffic) {
        const traffic = this.scene.traffic;
        
        // Number keys 1-8 with shift to adjust specific model probabilities
        if (e.key >= '1' && e.key <= '8') {
          const modelIndex = parseInt(e.key) - 1;
          const modelNames = [
            'truck1.glb',
            'truck2.glb',
            'car1_grey.glb', 
            'car2_blue.glb', 
            'car3_red.glb',
            'car4_white.glb',
            'police_car1.glb', 
            'bus1.glb'
          ];
          
          if (modelIndex < modelNames.length) {
            const modelName = modelNames[modelIndex];
            
            // If ctrl is also pressed, disable the model
            if (e.ctrlKey) {
              traffic.disableVehicleModel(modelName);
              console.log(`Disabled model: ${modelName}`);
            } 
            // If alt is also pressed, enable the model with high probability
            else if (e.altKey) {
              traffic.enableVehicleModel(modelName, 0.8);
              console.log(`Enabled model with high probability: ${modelName}`);
            }
            // Otherwise, increase the probability
            else {
              // Get current settings from AssetManager
              const assetManager = AssetManager.getInstance();
              const currentSettings = assetManager.getModelProbability(modelName);
              const newProb = Math.min(1.0, currentSettings.probability + 0.1);
              
              traffic.setModelProbabilities(modelName, newProb, true);
              console.log(`Increased probability for ${modelName} to ${newProb.toFixed(1)}`);
            }
            
            // Show the current settings in a notification
            this.showModelProbabilityNotification(modelName);
          }
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
  
  createDebugPanel() {
    // Create debug panel container
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.position = 'absolute';
    this.debugPanel.style.top = '10px';
    this.debugPanel.style.right = '10px';
    this.debugPanel.style.background = 'rgba(0, 0, 0, 0.7)';
    this.debugPanel.style.color = 'white';
    this.debugPanel.style.padding = '10px';
    this.debugPanel.style.borderRadius = '5px';
    this.debugPanel.style.fontFamily = 'monospace';
    this.debugPanel.style.fontSize = '14px';
    this.debugPanel.style.maxWidth = '300px';
    this.debugPanel.style.display = 'none';
    
    // Add controls info
    this.debugPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #0f0;">Debug Mode</h3>
      <p><b>D</b> - Toggle debug mode</p>
      <p><b>C</b> - Toggle free camera</p>
      <p><b>T</b> - Toggle traffic spawning</p>
      <p><b>B</b> - Toggle collision boxes</p>
      <p><b>+/-</b> - Adjust traffic density</p>
      <p><b>Shift+[1-8]</b> - Increase model probability</p>
      <p><b>Shift+Ctrl+[1-8]</b> - Disable model</p>
      <p><b>Shift+Alt+[1-8]</b> - Enable model (high prob)</p>
      <p style="margin-bottom: 0;"><small>When free camera is active:</small></p>
      <p><small>- Left mouse: Rotate camera</small></p>
      <p><small>- Right mouse: Pan camera</small></p>
      <p><small>- Mouse wheel: Zoom</small></p>
      <div id="debug-status"></div>
      <div id="model-probabilities" style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px;"></div>
    `;
    
    document.getElementById('game-container').appendChild(this.debugPanel);
  }
  
  updateDebugPanel() {
    // Update debug information
    if (this.debugPanel) {
      // Get a fresh delta time
      const frameTime = this.clock.getDelta();
      
      // Get traffic info
      const traffic = this.scene.traffic;
      const trafficEnabled = traffic ? traffic.modelLoadingEnabled : false;
      const loadProb = traffic ? traffic.loadingProbability.toFixed(2) : 0;
      const collBoxes = traffic ? traffic.showCollisionBoxes : false;
      
      // Get camera position for debugging
      const camPos = this.camera.position;
      
      // Simplified debug panel with fewer stats
      let debugText = `
        FPS: ${Math.round(1 / Math.max(0.016, frameTime))} <br>
        Speed: ${this.bike.speed.toFixed(1)} <br>
        Vehicles: ${this.scene.traffic ? this.scene.traffic.vehicles.length : 0} <br>
        Traffic: ${trafficEnabled ? 'ON' : 'OFF'} (${loadProb}) <br>
        Collision Boxes: ${collBoxes ? 'ON' : 'OFF'} <br>
        Debug: ${this.debug ? 'ON' : 'OFF'} <br>
        Free Cam: ${this.freeCamera ? 'ON' : 'OFF'} <br>
        Camera: (${camPos.x.toFixed(1)}, ${camPos.y.toFixed(1)}, ${camPos.z.toFixed(1)})
      `;
      
      const statusDiv = this.debugPanel.querySelector('#debug-status');
      if (statusDiv) {
        statusDiv.innerHTML = debugText;
      }
      
      // Update model probabilities section (every second to reduce performance impact)
      if (Math.floor(this.clock.getElapsedTime()) % 2 === 0) {
        this.updateModelProbabilitiesDisplay();
      }
    }
  }
  
  // Helper method to update model probabilities display
  updateModelProbabilitiesDisplay() {
    const probDiv = this.debugPanel.querySelector('#model-probabilities');
    if (!probDiv) return;
    
    const assetManager = AssetManager.getInstance();
    const modelNames = [
      'bike1.glb',
      'truck1.glb',
      'truck2.glb',
      'mini_truck1.glb',
      'car1_grey.glb', 
      'car2_blue.glb', 
      'car3_red.glb',
      'car4_white.glb',
      'car5_taxi.glb',
      'police_car1.glb', 
      'bus1.glb'
    ];
    
    let probHTML = '<h4 style="margin-top: 0;">Model Probabilities</h4>';
    
    modelNames.forEach((name, index) => {
      const settings = assetManager.getModelProbability(name);
      const displayName = name.replace('.glb', '');
      const statusColor = settings.enabled ? '#0f0' : '#f00';
      
      probHTML += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>${index + 1}: ${displayName}</span>
          <span style="color: ${statusColor}">${settings.probability.toFixed(2)}</span>
        </div>
      `;
    });
    
    probDiv.innerHTML = probHTML;
  }
  
  toggleFreeCamera() {
    this.freeCamera = !this.freeCamera;
    
    if (this.freeCamera) {
      // Enable orbit controls
      this.cameraControls.enabled = true;
      
      // Set target to bike position
      this.cameraControls.target.copy(this.bike.position);
      
      // Add class to body for cursor styles
      document.body.classList.add('debug-camera-active');
      
      console.log('Free camera mode enabled');
    } else {
      // Disable orbit controls
      this.cameraControls.enabled = false;
      
      // Reset camera position using camera settings
      const position = this.cameraSettings.getPosition(this.bike.position, this.bike.speed, false);
      this.camera.position.copy(position);
      this.camera.lookAt(this.cameraSettings.getLookAtPoint(this.bike.position));
      
      // Remove class from body
      document.body.classList.remove('debug-camera-active');
      
      console.log('Free camera mode disabled');
    }
    
    this.updateDebugPanel();
  }
  
  restartGame() {
    // Hide game over message
    this.gameOverElement.style.display = 'none';
    
    // Reset game state
    this.gameOver = false;
    
    // Reset bike position and speed
    this.bike.position.set(0, 0.5, 0);
    this.bike.speed = 5; // Use initial speed value from Bike class
    this.bike.currentTilt = 0;
    this.bike.rotation.z = 0;
    
    // Reset camera using camera settings
    this.camera.position.copy(this.cameraSettings.getDefaultPosition());
    this.camera.lookAt(this.cameraSettings.getLookAtPoint(this.bike.position));
    
    // Reset traffic system
    if (this.scene.traffic) {
      // Remove all existing vehicles
      while (this.scene.traffic.vehicles.length > 0) {
        const vehicle = this.scene.traffic.vehicles.pop();
        this.scene.remove(vehicle);
      }
      
      // Reset traffic properties
      this.scene.traffic.spawnTimer = 0; // Trigger immediate spawn on next update
      
      console.log("Traffic system reset");
    }
    
    // Reset road tracking
    if (this.scene.road) {
      this.scene.road.totalRoadDistance = 0;
      console.log("Road system reset");
    }
    
    // Reset scene tracking
    if (this.scene.lastUpdatePosition) {
      this.scene.lastUpdatePosition.set(0, 0, 0);
      this.scene.totalDistanceTraveled = 0;
    }
    
    // Ensure keyboard controls are reset
    this.inputHandler.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false
    };
    
    console.log("Game restarted");
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
    
    // Base render/visibility distance for performance optimization
    const renderDistance = 200;
    
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
    
    // Calculate render bounds to ensure we're only rendering what's needed
    const renderBehind = 50; // Reduced from 100 for better performance
    
    // Update scene (this will update road and traffic)
    this.scene.update(deltaTime, this.bike.position);
    
    // Check for collisions with traffic
    if (this.scene.checkCollisions(this.bike.position, this.bike)) {
      console.log('Collision with vehicle!');
      // On collision, either slow down or handle crash based on severity
      if (this.bike.speed > 20) {
        // Major collision at high speed
        this.handleCrash();
      } else {
        // Minor collision, just slow down
        this.bike.speed = Math.max(this.bike.speed - 10, 5);
        
        // Simpler collision feedback without DOM manipulation
        console.log("Minor collision - slowing down");
      }
    }
    
    // Only spawn additional traffic occasionally, not every frame
    if (Math.random() < 0.01) {
      const trafficSystem = this.scene.traffic;
      if (trafficSystem && 
          trafficSystem.vehicles.length < trafficSystem.maxActiveVehicles / 2) {
        trafficSystem.trySpawnVehicle(this.bike.position);
      }
    }
    
    // Update camera position if not in free camera mode
    if (!this.freeCamera) {
      // Get camera position from settings
      const pos = this.cameraSettings.getPosition(this.bike.position, this.bike.speed, this.debug);
      this.camera.position.set(pos.x, pos.y, pos.z);
      
      // Get look at point from settings
      const lookAt = this.cameraSettings.getLookAtPoint(this.bike.position);
      this.camera.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z));
      
      // Update camera far plane based on speed for better performance
      this.camera.far = Math.max(300, renderDistance + this.bike.speed * 10);
      this.camera.updateProjectionMatrix();
    } else {
      // Update orbit controls
      this.cameraControls.update();
    }
    
    // Update debug panel only when debug is active
    if (this.debug && this.debugPanel) {
      // Only update the debug panel every other frame for better performance
      if (Math.floor(this.clock.getElapsedTime() * 10) % 2 === 0) {
        this.updateDebugPanel();
      }
    }
    
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

  toggleDebug() {
    console.log("Toggling debug mode");
    this.debug = !this.debug;
    
    // Toggle debug panel visibility
    if (this.debugPanel) {
      this.debugPanel.style.display = this.debug ? 'block' : 'none';
    }
    
    // If turning off debug, make sure free camera is off too
    if (!this.debug && this.freeCamera) {
      this.toggleFreeCamera();
    }
    
    // Toggle debug in asset manager
    this.assetManager.setDebugMode(this.debug);
    
    // Toggle traffic debug
    if (this.scene.traffic) {
      this.scene.traffic.toggleDebug(this.debug);
    }
    
    // Toggle bike debug
    if (this.bike) {
      this.bike.toggleDebug(this.debug);
    }
    
    // Log debug state
    console.log(`Debug mode: ${this.debug ? 'enabled' : 'disabled'}`);
  }

  // Helper method to show model probability notification
  showModelProbabilityNotification(modelName) {
    // Get current settings from AssetManager
    const assetManager = AssetManager.getInstance();
    const settings = assetManager.getModelProbability(modelName);
    
    // Create or update notification element
    let notificationEl = document.getElementById('model-probability-notification');
    if (!notificationEl) {
      notificationEl = document.createElement('div');
      notificationEl.id = 'model-probability-notification';
      notificationEl.style.position = 'absolute';
      notificationEl.style.bottom = '20px';
      notificationEl.style.left = '20px';
      notificationEl.style.background = 'rgba(0, 0, 0, 0.7)';
      notificationEl.style.color = 'white';
      notificationEl.style.padding = '10px';
      notificationEl.style.borderRadius = '5px';
      notificationEl.style.fontFamily = 'monospace';
      notificationEl.style.zIndex = '1000';
      document.getElementById('game-container').appendChild(notificationEl);
    }
    
    // Update content
    const status = settings.enabled ? 'Enabled' : 'Disabled';
    const statusColor = settings.enabled ? '#00ff00' : '#ff0000';
    
    notificationEl.innerHTML = `
      <h4 style="margin: 0;">Vehicle Model Settings</h4>
      <p style="margin: 5px 0;">${modelName}</p>
      <p style="margin: 5px 0;">Probability: ${settings.probability.toFixed(2)}</p>
      <p style="margin: 5px 0;">Status: <span style="color: ${statusColor}">${status}</span></p>
    `;
    
    // Show notification and hide after 3 seconds
    notificationEl.style.display = 'block';
    
    // Clear any existing timeout
    if (this.modelNotificationTimeout) {
      clearTimeout(this.modelNotificationTimeout);
    }
    
    this.modelNotificationTimeout = setTimeout(() => {
      notificationEl.style.display = 'none';
    }, 3000);
  }
} 