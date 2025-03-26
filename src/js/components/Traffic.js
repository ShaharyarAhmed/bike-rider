import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AssetManager } from '../utils/AssetManager.js';

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.maxActiveVehicles = 8; // Reduced for better performance
    this.lanes = [-4, 0, 4]; // Match road lane positions
    
    this.spawnDistanceAhead = 120; // Distance ahead of player to spawn vehicles
    this.despawnDistance = 100;    // Distance behind player to despawn vehicles
    
    this.spawnCooldown = 1.0;      // Time between spawn attempts
    this.spawnTimer = 0;           // Current cooldown timer
    
    // Model loading probability controls
    this.modelLoadingEnabled = true;  // Can be toggled to completely disable spawning
    this.loadingProbability = 0.8;    // Chance of actually loading a model when spawn is attempted
    this.performanceAdjustCounter = 0; // Counter to track frame rate impact
    
    // Visualization flags
    this.showCollisionBoxes = false;  // Flag to show collision boxes
    
    // Ensure debug mode is explicitly set to false by default
    this.debug = false;
    
    // Make sure AssetManager debug is set to match our setting
    const assetManager = AssetManager.getInstance();
    assetManager.setDebugMode(this.debug);
    
    // Ensure no debug markers are present on existing vehicles
    this.toggleDebug(false);
    
    // Keep track of last spawn distance to prevent too many vehicles at the same area
    this.lastSpawnPosition = new THREE.Vector3(0, 0, 0);
    this.minimumSpawnInterval = 50; // Increased to reduce vehicle density
    
    console.log("Traffic system initialized");
  }
  
  update(deltaTime, playerPosition) {
    // Don't process anything if model loading is disabled
    if (!this.modelLoadingEnabled) {
      return;
    }
    
    // Performance monitoring - adjust loading probability based on deltaTime
    this.performanceAdjustCounter++;
    if (this.performanceAdjustCounter > 60) { // Check every ~60 frames
      this.performanceAdjustCounter = 0;
      
      // If frame time is too long (low FPS), reduce loading probability
      if (deltaTime > 0.05) { // Less than 20 FPS
        this.loadingProbability = Math.max(0.3, this.loadingProbability - 0.1);
        console.log(`Performance adjustment: Reducing loading probability to ${this.loadingProbability.toFixed(2)}`);
      } else if (deltaTime < 0.033 && this.vehicles.length < 5) { // More than 30 FPS and few vehicles
        this.loadingProbability = Math.min(0.9, this.loadingProbability + 0.05);
        console.log(`Performance adjustment: Increasing loading probability to ${this.loadingProbability.toFixed(2)}`);
      }
    }
    
    // Update all vehicles - limit updates to vehicles near the player
    const vehiclesToRemove = [];
    
    for (let i = 0; i < this.vehicles.length; i++) {
      const vehicle = this.vehicles[i];
      
      // Check if vehicle should be removed (too far behind player)
      const isBehindPlayer = vehicle.position.z > playerPosition.z + this.despawnDistance;
      if (isBehindPlayer) {
        vehiclesToRemove.push(i);
        continue;
      }
      
      // Only update vehicles within 200 units of the player
      const distanceToPlayer = Math.abs(vehicle.position.z - playerPosition.z);
      if (distanceToPlayer < 200) {
        try {
          vehicle.update(deltaTime, this.vehicles, this.lanes);
        } catch (error) {
          console.error(`Error updating vehicle: ${error.message}`);
          vehiclesToRemove.push(i);
        }
      }
    }
    
    // Remove vehicles marked for removal (in reverse order to avoid index issues)
    for (let i = vehiclesToRemove.length - 1; i >= 0; i--) {
      const index = vehiclesToRemove[i];
      const vehicle = this.vehicles[index];
      
      // Remove from scene
      if (vehicle) {
        this.scene.remove(vehicle);
        this.vehicles.splice(index, 1);
      }
    }
    
    // Update spawn timer
    this.spawnTimer -= deltaTime;
    
    // Try to spawn new vehicles if cooldown has passed and we have room
    if (this.spawnTimer <= 0 && this.vehicles.length < this.maxActiveVehicles) {
      this.spawnTimer = this.spawnCooldown;
      
      // Apply loading probability - only attempt to spawn based on current probability
      if (Math.random() > this.loadingProbability) {
        return; // Skip this spawn attempt
      }
      
      // Make sure we're at least minimumSpawnInterval away from the last spawn position
      const distanceFromLastSpawn = Math.abs(playerPosition.z - this.lastSpawnPosition.z);
      if (distanceFromLastSpawn > this.minimumSpawnInterval) {
        // Only make one attempt to spawn to reduce lag
        const spawned = this.trySpawnVehicle(playerPosition);
        
        if (spawned) {
          this.lastSpawnPosition.copy(playerPosition);
        }
      }
    }
    
    // Log vehicle count less frequently
    if (Math.random() < 0.005) {
      console.log(`Current vehicles: ${this.vehicles.length}/${this.maxActiveVehicles} (Load prob: ${this.loadingProbability.toFixed(2)})`);
    }
  }
  
  // Method to enable/disable vehicle spawning
  setModelLoadingEnabled(enabled) {
    this.modelLoadingEnabled = enabled;
    console.log(`Vehicle model loading ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Method to manually set loading probability
  setLoadingProbability(probability) {
    this.loadingProbability = Math.max(0, Math.min(1, probability));
    console.log(`Vehicle loading probability set to ${this.loadingProbability.toFixed(2)}`);
  }
  
  // Method to toggle collision box visibility for all vehicles
  toggleCollisionBoxes(visible) {
    if (visible === undefined) {
      this.showCollisionBoxes = !this.showCollisionBoxes;
    } else {
      this.showCollisionBoxes = visible;
    }
    
    console.log(`Collision boxes ${this.showCollisionBoxes ? 'shown' : 'hidden'}`);
    
    // Update all existing vehicles
    this.vehicles.forEach(vehicle => {
      if (typeof vehicle.setCollisionBoxVisible === 'function') {
        vehicle.setCollisionBoxVisible(this.showCollisionBoxes);
      }
    });
    
    return this.showCollisionBoxes;
  }
  
  trySpawnVehicle(playerPosition) {
    // Calculate spawn point based on player position
    const spawnZ = playerPosition.z - this.spawnDistanceAhead;
    
    // Select a random lane
    const laneIndex = Math.floor(Math.random() * this.lanes.length);
    const laneX = this.lanes[laneIndex];
    
    // Check if the lane is clear for spawning
    if (!this.isLaneClear(laneX, spawnZ, 60)) {
      return false;
    }
    
    // Random vehicle type (more cars than trucks)
    const type = Math.random() < 0.7 ? 'car' : 'truck';
    
    // Random speed based on vehicle type
    const speed = type === 'truck' 
      ? 3 + Math.random() * 3  // Truck: 3-6 speed
      : 5 + Math.random() * 5; // Car: 5-10 speed
    
    // Random color
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Get appropriate size for the vehicle type
    const size = type === 'truck' 
      ? { width: 2.6, height: 3.2, length: 9 }
      : { width: 1.8, height: 1.5, length: 4 };
    
    // Create the vehicle with rotation to face in the positive Z direction (direction of travel)
    const position = new THREE.Vector3(laneX, 0, spawnZ);
    
    try {
      // Create new vehicle - if it fails, it will throw an error
      const vehicle = new Vehicle(type, size, speed, laneIndex, color, position);
      
      // Make sure the vehicle is facing the right direction
      // Note: Individual model rotations are handled in Vehicle.js
      // This is just the initial rotation of the vehicle container
      vehicle.rotation.y = Math.PI;
      
      // Add to scene and tracking array
      this.scene.add(vehicle);
      this.vehicles.push(vehicle);
      
      console.log(`Created ${type} at lane ${laneIndex} (x=${laneX}, z=${spawnZ.toFixed(1)}) with player at z=${playerPosition.z.toFixed(1)}`);
      
      // Add debug markers only if debug mode is explicitly enabled
      if (this.debug === true) {
        this.addDebugMarkers(vehicle);
        vehicle.setDebugMode(true);
      }
      
      // Show collision box if enabled
      if (this.showCollisionBoxes && vehicle.setCollisionBoxVisible) {
        vehicle.setCollisionBoxVisible(true);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to create vehicle: ${error.message}`);
      return false;
    }
  }
  
  isLaneClear(laneX, spawnZ, requiredDistance) {
    for (const vehicle of this.vehicles) {
      // Only check vehicles in the same lane (use 1.5 as lane width threshold)
      if (Math.abs(vehicle.position.x - laneX) < 1.5) {
        // Distance along Z axis
        const distance = Math.abs(vehicle.position.z - spawnZ);
        
        // If too close, the lane is not clear
        if (distance < requiredDistance) {
          console.log(`Lane ${laneX} not clear at z=${spawnZ}, vehicle at z=${vehicle.position.z}`);
          return false;
        }
      }
    }
    
    // No vehicle is too close, lane is clear
    return true;
  }
  
  addDebugMarkers(vehicle) {
    // Blue cone pointing forward
    const frontGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const frontMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const frontMarker = new THREE.Mesh(frontGeometry, frontMaterial);
    frontMarker.position.set(0, 2, -vehicle.size.length / 2 - 0.5);
    frontMarker.rotation.x = Math.PI / 2;
    frontMarker.userData.isDebugMarker = true;
    vehicle.add(frontMarker);
    
    // Red cone pointing backward
    const backGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const backMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const backMarker = new THREE.Mesh(backGeometry, backMaterial);
    backMarker.position.set(0, 2, vehicle.size.length / 2 + 0.5);
    backMarker.rotation.x = -Math.PI / 2;
    backMarker.userData.isDebugMarker = true;
    vehicle.add(backMarker);
    
    // Vehicle type indicator (orange for truck, green for others)
    const typeColor = vehicle.type === 'truck' ? 0xff6600 : 0x00cc00;
    const indicatorGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const indicatorMaterial = new THREE.MeshBasicMaterial({ color: typeColor });
    const vehicleTypeIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    vehicleTypeIndicator.position.set(0, 3, 0);
    vehicleTypeIndicator.userData.isDebugMarker = true;
    vehicle.add(vehicleTypeIndicator);
    
    // Arrow helper for velocity
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),  // Direction
      new THREE.Vector3(0, 2, 0),   // Origin
      vehicle.speed / 2,            // Length
      0x00ffff                      // Color
    );
    arrowHelper.userData.isDebugMarker = true;
    vehicle.add(arrowHelper);
    
    // Add text label with vehicle info
    const div = document.createElement('div');
    div.className = 'vehicleLabel';
    div.textContent = `${vehicle.type} (${vehicle.speed.toFixed(1)})`;
    div.style.color = 'white';
    div.style.padding = '2px';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.borderRadius = '3px';
    
    const label = new CSS2DObject(div);
    label.position.set(0, 4, 0);
    label.userData.isDebugMarker = true;
    vehicle.add(label);
  }
  
  toggleDebug(enabled) {
    if (enabled === undefined) {
      this.debug = !this.debug;
    } else {
      this.debug = enabled;
    }
    
    console.log(`Traffic debug mode ${this.debug ? 'enabled' : 'disabled'}`);
    
    // Apply to existing vehicles
    this.vehicles.forEach(vehicle => {
      if (this.debug) {
        this.addDebugMarkers(vehicle);
        vehicle.setDebugMode(true);
      } else {
        // Remove all debug markers
        const markersToRemove = [];
        vehicle.children.forEach(child => {
          if (child.userData && child.userData.isDebugMarker) {
            markersToRemove.push(child);
          }
        });
        
        // Remove markers in a separate loop to avoid array modification during iteration
        markersToRemove.forEach(marker => {
          vehicle.remove(marker);
        });
        
        vehicle.setDebugMode(false);
      }
    });
  }
  
  // Method to modify model loading probabilities
  setModelProbabilities(modelName, newProbability, enable = true) {
    // Get the current instance of AssetManager to access vehicle configuration
    const assetManager = AssetManager.getInstance();
    
    // If AssetManager has a vehicle model configuration, update it
    if (assetManager.updateModelProbability) {
      assetManager.updateModelProbability(modelName, newProbability, enable);
      console.log(`Updated ${modelName} probability to ${newProbability}, enabled: ${enable}`);
      return true;
    } 
    
    // If no direct access to model configs, we can broadcast an event for the Vehicle class
    const event = new CustomEvent('vehicleModelConfigUpdate', {
      detail: {
        modelName,
        probability: newProbability,
        enabled: enable
      }
    });
    document.dispatchEvent(event);
    console.log(`Broadcast model update for ${modelName}: probability=${newProbability}, enabled=${enable}`);
    
    return true;
  }
  
  // Method to disable a specific vehicle model
  disableVehicleModel(modelName) {
    return this.setModelProbabilities(modelName, 0, false);
  }
  
  // Method to enable a specific vehicle model with default probability
  enableVehicleModel(modelName, probability = 0.2) {
    return this.setModelProbabilities(modelName, probability, true);
  }
} 