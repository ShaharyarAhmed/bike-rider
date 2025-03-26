import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AssetManager } from '../utils/AssetManager.js';

// GLTFLoader is now handled by AssetManager
// const gltfLoader = new GLTFLoader();
// const modelCache = {};

export class Vehicle extends THREE.Object3D {
  constructor(
    type = 'car',
    size = { width: 2, height: 1.5, length: 4 },
    speed = 0,
    lane = 0,
    color = 0xff0000,
    position = new THREE.Vector3(0, 0, 0)
  ) {
    super();
    
    // Properties
    this.type = type;
    this.size = size;
    this.speed = speed;
    this.originalSpeed = speed; // Store original speed for recovery
    this.lane = lane;
    this.color = color;
    this.maxSpeed = 15;
    this.braking = false;
    this.changingLane = false;
    this.targetLane = lane;
    this.laneChangeSpeed = 2;
    this.hasModel = false;
    this.hasChangedLane = false; // Track if vehicle has already changed lanes
    
    // Materials
    this.normalMaterial = new THREE.MeshPhongMaterial({ color });
    this.brakeMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    
    // Position
    this.position.copy(position);
    
    // Create debug helpers
    this.debugHelpers = [];
    
    // Load model or create simple shape
    this.loadAppropriateModel();
  }
  
  // Check if model is available before loading
  loadAppropriateModel() {
    // Create a placeholder while loading
    this.createSimplePlaceholder();
    
    // Determine model name based on type
    const modelName = this.getModelNameForType();
    this.modelFileName = modelName; // Store the model filename for later reference
    
    console.log(`Loading model: ${modelName} for vehicle type: ${this.type}`);
    
    // Get the AssetManager instance
    const assetManager = AssetManager.getInstance();
    
    if (!assetManager) {
      throw new Error("AssetManager instance not available");
    }
    
    if (typeof assetManager.loadModel !== 'function') {
      throw new Error("AssetManager loadModel method not available");
    }
    
    // Load the model
    assetManager.loadModel(
      modelName,
      (model) => this.onModelLoaded(model),
      (error) => {
        console.error(`Failed to load model ${modelName}:`, error);
        throw new Error(`Failed to load model ${modelName}: ${error.message}`);
      }
    );
  }
  
  // Get the appropriate model name for the vehicle type
  getModelNameForType() {
    // Get AssetManager instance to access model configuration
    const assetManager = AssetManager.getInstance();
    
    if (!assetManager) {
      throw new Error("AssetManager instance not available");
    }
    
    // Get list of enabled models for this type from AssetManager
    const eligibleModelNames = assetManager.getEnabledModels(this.type);
    
    if (!eligibleModelNames || eligibleModelNames.length === 0) {
      throw new Error(`No eligible models found for vehicle type: ${this.type}`);
    }
    
    // Build array of eligible models with their probabilities
    const modelConfigs = [];
    for (const modelName of eligibleModelNames) {
      const config = assetManager.getModelProbability(modelName);
      if (config && config.enabled && config.probability > 0) {
        modelConfigs.push({
          modelName,
          probability: config.probability
        });
      }
    }
    
    // If no valid configs, throw error
    if (modelConfigs.length === 0) {
      throw new Error(`No enabled models with positive probability for vehicle type: ${this.type}`);
    }
    
    // Calculate total probability for normalization
    const totalProbability = modelConfigs.reduce(
      (sum, config) => sum + config.probability, 
      0
    );
    
    // If total probability is zero, throw error
    if (totalProbability <= 0) {
      throw new Error(`Total probability is zero for all models of type: ${this.type}`);
    }
    
    // Select a model based on probability
    const randomValue = Math.random() * totalProbability;
    let cumulativeProbability = 0;
    
    for (const config of modelConfigs) {
      cumulativeProbability += config.probability;
      if (randomValue <= cumulativeProbability) {
        return config.modelName;
      }
    }
    
    // Fallback in case of rounding issues (only reached in very rare cases)
    return modelConfigs[modelConfigs.length - 1].modelName;
  }
  
  // Create a placeholder while the model loads
  createSimplePlaceholder() {
    // Clear any existing children
    while (this.children.length > 0) {
      const child = this.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.remove(child);
    }
    
    // Create a simple box as a placeholder
    const { width, height, length } = this.size;
    const geometry = new THREE.BoxGeometry(width, height, length);
    const mesh = new THREE.Mesh(geometry, this.normalMaterial);
    
    // Center the box
    mesh.position.y = height / 2;
    
    this.add(mesh);
    this.placeholder = mesh;
  }
  
  // Handle model loaded
  onModelLoaded(model) {
    console.log(`Model loaded for ${this.type}`);
    
    // Remove placeholder
    if (this.placeholder) {
      this.remove(this.placeholder);
      this.placeholder = null;
    }
    
    // Clear any existing model
    this.children.forEach(child => {
      if (child.userData && child.userData.isModel) {
        this.remove(child);
      }
    });
    
    // Model configurations for different vehicle types
    const modelConfigs = [
      {
        modelName: 'truck2.glb',
        type: 'truck',
        scale: { x: 1.3, y: 1.3, z: 1.3 },
        rotation: { y: Math.PI / 2 },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.3, // 30% chance for truck2
        enabled: true
      },
      {
        modelName: 'truck1.glb', 
        type: 'truck',
        scale: { x: 1.3, y: 1.3, z: 1.3 },
        rotation: { y: 0 },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.7, // 70% chance for truck1
        enabled: true
      },
      {
        modelName: 'mini_truck1.glb',
        type: 'truck',
        scale: { x: 1.0, y: 1.0, z: 1.0 },
        rotation: { y: Math.PI },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.3, // 30% chance for mini truck
        enabled: true
      },
      {
        modelName: 'bus1.glb',
        type: 'car',
        scale: { x: 0.08, y: 0.08, z: 0.08 },
        rotation: { y: THREE.MathUtils.degToRad(0) },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.1, // 10% chance for bus1
        enabled: true
      },
      {
        modelName: 'bus2.glb',
        type: 'car',
        scale: { x: 1, y: 1, z: 1 },
        rotation: { y: THREE.MathUtils.degToRad(0) },
        position: { x: 0, y: 1, z: 0 },
        probability: 0.1, // 10% chance for bus2
        enabled: true
      },
      {
        modelName: 'car2_blue.glb',
        type: 'car', 
        scale: { x: 0.06, y: 0.06, z: 0.06 },
        rotation: { y: THREE.MathUtils.degToRad(360) },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.2, // 20% chance for blue car
        enabled: true
      },
      {
        modelName: 'car1_grey.glb',
        type: 'car',
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        rotation: { y: 0 },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.2, // 20% chance for grey car
        enabled: true
      },
      {
        modelName: 'car4_white.glb',
        type: 'car',
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        rotation: { y: 0 },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.2, // 20% chance for white car
        enabled: true
      },
      {
        modelName: 'car3_red.glb',
        type: 'car',
        scale: { x: 1, y: 1, z: 1 },
        rotation: { y: THREE.MathUtils.degToRad(0) },
        position: { x: 0, y: 0.6, z: 0 },
        probability: 0.2, // 20% chance for red car
        enabled: true
      },
      {
        modelName: 'car5_taxi.glb',
        type: 'car',
        scale: { x: 1.2, y: 1.2, z: 1.2 },
        rotation: { y: THREE.MathUtils.degToRad(0) },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.2, // 20% chance for taxi
        enabled: true
      },
      {
        modelName: 'police_car1.glb',
        type: 'car',
        scale: { x: 1, y: 1, z: 1 },
        rotation: { y: 0 },
        position: { x: 0, y: 0, z: 0 },
        probability: 0.1, // 10% chance for police car
        enabled: true
      },
      {
        modelName: 'bike1.glb',
        type: 'bike',
        scale: { x: 0.2, y: 0.2, z: 0.2 },
        rotation: { y: Math.PI },
        position: { x: 0, y: 0, z: 0 },
        probability: 1.0, // 100% chance for bike
        enabled: true
      }
    ];

    // Find the config for this model
    const config = modelConfigs.find(c => c.modelName === this.modelFileName) || {
      scale: { x: 1, y: 1, z: 1 },
      rotation: { y: Math.PI },
      position: { x: 0, y: 0, z: 0 }
    };

    // Apply the configuration
    model.scale.set(config.scale.x, config.scale.y, config.scale.z);
    model.rotation.set(
      config.rotation.x || 0,
      config.rotation.y || 0, 
      config.rotation.z || 0
    );
    model.position.set(
      config.position.x || 0,
      config.position.y || 0,
      config.position.z || 0
    );
    
    // Mark this as a model
    model.userData.isModel = true;
    
    // Add to the vehicle
    this.add(model);
    this.model = model;
    this.hasModel = true;
    
    // Calculate the actual model dimensions for the collision box
    this.calculateModelDimensions();
    
    // Set brake lights if relevant
    this.updateBrakeLights();
  }
  
  // Calculate actual model dimensions for collision detection
  calculateModelDimensions() {
    if (this.model) {
      // Create a bounding box for the model
      const bbox = new THREE.Box3().setFromObject(this.model);
      
      // Calculate dimensions
      const size = new THREE.Vector3();
      bbox.getSize(size);
      
      // Update the vehicle size with actual model dimensions
      // Use exact dimensions without adding buffer
      this.size = {
        width: size.x,
        height: size.y,
        length: size.z
      };
      
      console.log(`Model dimensions for ${this.type} (${this.modelFileName}): W:${this.size.width.toFixed(2)}, H:${this.size.height.toFixed(2)}, L:${this.size.length.toFixed(2)}`);
      
      // Update collision box if visible
      if (this.collisionBox) {
        this.setCollisionBoxVisible(true);
      }
    }
  }
  
  // Check if it's safe to change to a target lane
  canChangeLane(targetLane, otherVehicles) {
    const safeDistance = this.speed * 2 + 5; // Safe distance based on speed
    
    for (const other of otherVehicles) {
      if (other === this) continue;
      
      // Only check vehicles in the target lane
      if (Math.abs(other.position.x - targetLane) < 1) {
        // Check distance in Z direction
        const distanceZ = Math.abs(this.position.z - other.position.z);
        if (distanceZ < safeDistance) {
          return false;
        }
      }
    }
    return true;
  }
  
  // Try to change lanes if possible
  tryChangeLane(otherVehicles, availableLanes) {
    // Don't change lanes if already changing or has changed before
    if (this.changingLane || this.hasChangedLane) return;
    
    // Get current lane index based on actual position
    const currentLaneIndex = availableLanes.findIndex(
      laneX => Math.abs(this.position.x - laneX) < 1
    );
    
    if (currentLaneIndex === -1) {
      console.warn('Vehicle not in any valid lane:', this.position.x);
      return;
    }
    
    // Randomly choose direction (left or right)
    const direction = Math.random() < 0.5 ? -1 : 1;
    
    // Get target lane index
    const targetLaneIndex = currentLaneIndex + direction;
    
    // Check if target lane exists
    if (targetLaneIndex >= 0 && targetLaneIndex < availableLanes.length) {
      const targetLane = availableLanes[targetLaneIndex];
      
      // Check if it's safe to change lanes
      if (this.canChangeLane(targetLane, otherVehicles)) {
        this.changingLane = true;
        this.targetLane = targetLane;
        this.hasChangedLane = true; // Mark that this vehicle has changed lanes
        console.log(`Vehicle changing from lane ${currentLaneIndex} to ${targetLaneIndex} (x: ${this.position.x} -> ${targetLane})`);
      }
    }
  }
  
  // Update vehicle state and position
  update(deltaTime, otherVehicles, availableLanes) {
    // Increase lane change probability to 40% chance per 2 seconds
    if (!this.hasChangedLane && Math.random() < 0.4 * deltaTime) {
      this.tryChangeLane(otherVehicles, availableLanes);
    }
    
    // Check for potential collisions with other vehicles
    let needToSlow = false;
    let nearestFrontVehicle = null;
    let minDistance = Infinity;
    
    // Check all other vehicles to see if any are ahead and in our lane
    for (const otherVehicle of otherVehicles) {
      if (otherVehicle === this) continue; // Skip self
      
      const myPos = this.position;
      const otherPos = otherVehicle.position;
      
      // Only consider vehicles ahead of us (with smaller Z value since we move in negative Z)
      if (otherPos.z >= myPos.z) continue;
      
      // Check if in same lane (X position within 2 units)
      if (Math.abs(myPos.x - otherPos.x) > 2) continue;
      
      // Calculate distance to vehicle ahead
      const distance = myPos.z - otherPos.z;
      
      // If vehicle is close ahead, we need to slow down
      // Safe distance is proportional to our speed
      const safeDistance = this.speed * 1.5 + 3;
      
      if (distance < safeDistance && distance < minDistance) {
        needToSlow = true;
        minDistance = distance;
        nearestFrontVehicle = otherVehicle;
      }
    }
    
    // Adjust speed based on vehicles ahead
    if (needToSlow && nearestFrontVehicle) {
      // If too close, brake harder
      if (minDistance < 3) {
        this.speed = Math.max(0, this.speed - 8 * deltaTime);
        this.braking = true;
      } 
      // Otherwise gradually adjust to the speed of the vehicle ahead
      else {
        const targetSpeed = Math.min(this.originalSpeed, nearestFrontVehicle.speed * 0.9);
        this.speed = this.speed > targetSpeed ? 
          Math.max(targetSpeed, this.speed - 3 * deltaTime) : 
          this.speed;
        this.braking = true;
      }
    } else {
      // No vehicle ahead, resume normal speed
      if (this.speed < this.originalSpeed) {
        this.speed = Math.min(this.originalSpeed, this.speed + 2 * deltaTime);
      }
      this.braking = false;
    }
    
    // Handle lane changing if in progress
    if (this.changingLane) {
      const myPos = this.position;
      const distanceToTarget = this.targetLane - myPos.x;
      const step = Math.sign(distanceToTarget) * 
                  Math.min(Math.abs(distanceToTarget), this.laneChangeSpeed * deltaTime);
      
      myPos.x += step;
      
      // Check if lane change is complete
      if (Math.abs(myPos.x - this.targetLane) < 0.1) {
        myPos.x = this.targetLane; // Snap to exact lane position
        this.changingLane = false;
        this.lane = availableLanes.indexOf(this.targetLane); // Update lane index based on actual position
      }
    }
    
    // Move vehicle forward based on its speed
    this.position.z -= this.speed * deltaTime;
    
    // Update brake lights
    this.updateBrakeLights();
  }
  
  // Set braking material on brake lights
  updateBrakeLights() {
    if (!this.model) return;
    
    this.model.traverse(child => {
      if (child.userData && child.userData.isBrakeLight) {
        child.material = this.braking ? this.brakeMaterial : this.normalMaterial;
      }
    });
  }
  
  // Set debug mode for the vehicle
  setDebugMode(enabled) {
    // Clear previous debug helpers
    this.debugHelpers.forEach(helper => {
      if (helper.parent) {
        helper.parent.remove(helper);
      }
    });
    this.debugHelpers = [];
    
    if (enabled) {
      console.log(`Enabling wireframe mode for vehicle ${this.uuid}`);
      
      // Add wireframe to all materials
      this.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.wireframe = true;
            });
          } else {
            child.material.wireframe = true;
          }
        }
      });
      
      // Add bounding box helper
      const bbox = new THREE.Box3().setFromObject(this);
      const bboxHelper = new THREE.Box3Helper(bbox, 0xffff00);
      this.add(bboxHelper);
      this.debugHelpers.push(bboxHelper);
      
      // Add axes helper
      const axesHelper = new THREE.AxesHelper(2);
      axesHelper.position.y = 3;
      this.add(axesHelper);
      this.debugHelpers.push(axesHelper);
    } else {
      console.log(`Disabling wireframe mode for vehicle ${this.uuid}`);
      
      // Remove wireframe from all materials
      this.traverse(child => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.wireframe = false;
            });
          } else {
            child.material.wireframe = false;
          }
        }
      });
    }
  }
  
  // Add a method to create and toggle collision box visibility
  setCollisionBoxVisible(visible) {
    // Remove existing collision box if any
    if (this.collisionBox) {
      this.remove(this.collisionBox);
      this.collisionBox = null;
    }
    
    // Create new collision box if visibility is turned on
    if (visible && this.model) {
      // Get the actual bounding box of the model
      const bbox = new THREE.Box3().setFromObject(this.model);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      
      // Create a wireframe box representing the collision bounds
      const boxGeometry = new THREE.BoxGeometry(
        this.size.width,
        this.size.height,
        this.size.length
      );
      
      // Use wireframe material for better visibility
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Magenta for high visibility
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      
      this.collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
      
      // Position the collision box to match the model's center
      // Make position relative to the vehicle
      this.collisionBox.position.set(
        center.x - this.position.x,
        center.y - this.position.y,
        center.z - this.position.z
      );
      
      this.add(this.collisionBox);
      
      // Add a helper text label
      const div = document.createElement('div');
      div.className = 'collisionBoxLabel';
      div.textContent = `${this.size.width.toFixed(1)} × ${this.size.length.toFixed(1)}`;
      div.style.color = '#ff00ff';
      div.style.padding = '2px';
      div.style.fontSize = '10px';
      div.style.background = 'rgba(0,0,0,0.3)';
      div.style.borderRadius = '3px';
      
      if (typeof CSS2DObject !== 'undefined') {
        const label = new CSS2DObject(div);
        label.position.set(0, this.size.height / 2 + 0.5, 0);
        this.collisionBox.add(label);
      }
    }
    
    return visible;
  }
} 