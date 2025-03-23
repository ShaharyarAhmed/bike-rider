import * as THREE from 'three';
import { Vector3, Quaternion, Euler } from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AssetManager } from '../utils/AssetManager.js';

export class Bike extends THREE.Object3D {
  constructor() {
    super(); // Call the parent constructor
    
    // Bike properties
    this.speed = 5; // Initial speed
    this.maxSpeed = 40;
    this.acceleration = 25;
    this.deceleration = 10;
    this.brakeDeceleration = 20;
    this.turnSpeed = 0.15;
    this.lateralSpeed = 20; // Increased from 15 to allow faster lane changes
    this.maxTilt = 0.3;
    this.tiltRecoverySpeed = 0.7;
    this.currentTilt = 0;
    this.roadBounds = { min: -6, max: 6 }; // Increased from ±4 to ±6 for wider lanes
    
    // Create bike mesh and add it to this object
    this.createBike();
    
    // Set initial position (height above ground)
    this.position.y = 0.5;
  }
  
  createBike() {
    // Simple rectangle for the bike
    const geometry = new THREE.BoxGeometry(1, 1, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const bikeMesh = new THREE.Mesh(geometry, material);
    
    // Set bike to cast shadow
    bikeMesh.castShadow = true;
    
    // Add bike mesh to this object
    this.add(bikeMesh);
    
    console.log("Simple bike model created");
  }
  
  // Toggle debug visualization for the bike
  toggleDebug(enabled) {
    if (enabled === undefined) {
      this.debug = !this.debug;
    } else {
      this.debug = enabled;
    }
    
    // Add or remove debug elements based on current state
    if (this.debug) {
      // Add helper axes for orientation
      if (!this.axesHelper) {
        this.axesHelper = new THREE.AxesHelper(2);
        this.add(this.axesHelper);
      }
      
      // Add velocity arrow
      if (!this.velocityArrow) {
        this.velocityArrow = new THREE.ArrowHelper(
          new THREE.Vector3(0, 0, -1),
          new THREE.Vector3(0, 1.5, 0),
          1,
          0x00ff00
        );
        this.add(this.velocityArrow);
      }
    } else {
      // Remove helpers when debug mode is turned off
      if (this.axesHelper) {
        this.remove(this.axesHelper);
        this.axesHelper = null;
      }
      
      if (this.velocityArrow) {
        this.remove(this.velocityArrow);
        this.velocityArrow = null;
      }
    }
  }
  
  // Method to toggle collision box visibility
  setCollisionBoxVisible(visible) {
    // Remove existing collision box if any
    if (this.collisionBox) {
      this.remove(this.collisionBox);
      this.collisionBox = null;
    }
    
    // Create new collision box if visibility is turned on
    if (visible) {
      // Bike collision size - typically smaller than visual model
      const bikeWidth = 1.2;
      const bikeHeight = 1.5;
      const bikeLength = 2.0;
      
      // Create a wireframe box representing the collision bounds
      const boxGeometry = new THREE.BoxGeometry(
        bikeWidth,
        bikeHeight,
        bikeLength
      );
      
      // Use wireframe material with different color from vehicles
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Cyan to distinguish from vehicles
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
      
      this.collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
      this.collisionBox.position.y = bikeHeight / 2; // Center vertically
      this.add(this.collisionBox);
      
      // Add a helper text label if CSS2DObject is available
      if (typeof CSS2DObject !== 'undefined') {
        const div = document.createElement('div');
        div.className = 'collisionBoxLabel';
        div.textContent = `Bike [${bikeWidth.toFixed(1)} × ${bikeLength.toFixed(1)}]`;
        div.style.color = '#00ffff';
        div.style.padding = '2px';
        div.style.fontSize = '10px';
        div.style.background = 'rgba(0,0,0,0.3)';
        div.style.borderRadius = '3px';
        
        const label = new CSS2DObject(div);
        label.position.set(0, bikeHeight + 0.5, 0);
        this.collisionBox.add(label);
      }
    }
    
    return visible;
  }
  
  update(deltaTime, input) {
    // Accelerate/decelerate based on input
    if (input.forward) {
      this.speed += this.acceleration * deltaTime;
      if (this.speed > this.maxSpeed) {
        this.speed = this.maxSpeed;
      }
    } else if (input.backward) {
      this.speed -= input.brake ? this.brakeDeceleration * deltaTime : this.deceleration * deltaTime;
      if (this.speed < 0) {
        this.speed = 0;
      }
    } else {
      // Natural deceleration when no input
      this.speed -= this.deceleration * deltaTime;
      if (this.speed < 0) {
        this.speed = 0;
      }
    }

    // Move forward
    this.position.z -= this.speed * deltaTime;

    // Lateral movement (left/right)
    let lateralMovement = 0;
    if (input.left) {
      lateralMovement = -this.lateralSpeed * deltaTime;
      this.currentTilt = -this.maxTilt; // Tilt left
    } else if (input.right) {
      lateralMovement = this.lateralSpeed * deltaTime;
      this.currentTilt = this.maxTilt; // Tilt right
    } else {
      // Recover from tilt when not turning
      if (this.currentTilt > 0) {
        this.currentTilt -= this.tiltRecoverySpeed * deltaTime;
        if (this.currentTilt < 0) this.currentTilt = 0;
      } else if (this.currentTilt < 0) {
        this.currentTilt += this.tiltRecoverySpeed * deltaTime;
        if (this.currentTilt > 0) this.currentTilt = 0;
      }
    }

    // Apply lateral movement
    this.position.x += lateralMovement;

    // Apply bounds to keep bike on the road
    if (this.position.x < this.roadBounds.min) {
      this.position.x = this.roadBounds.min;
    } else if (this.position.x > this.roadBounds.max) {
      this.position.x = this.roadBounds.max;
    }

    // Apply tilt to the bike model
    this.rotation.z = this.currentTilt;
    
    // Return some status info
    return {
      speed: this.speed,
      position: this.position.clone()
    };
  }
} 