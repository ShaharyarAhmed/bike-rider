import * as THREE from 'three';

export class Bike {
  constructor() {
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
    
    // Create bike object
    this.object = new THREE.Group();
    this.createBike();
    
    // Start in the middle lane (0)
    this.object.position.set(0, 0.5, 0);
  }
  
  createBike() {
    // Simple rectangle for the bike
    const geometry = new THREE.BoxGeometry(1, 1, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const bike = new THREE.Mesh(geometry, material);
    
    // Add bike to the main object
    this.object.add(bike);
    
    // Set bike to cast shadow
    bike.castShadow = true;
    
    console.log("Simple bike model created and added to scene");
  }
  
  // Toggle debug visualization for the bike
  toggleDebug(enabled) {
    // Remove any existing debug visualizations
    this.object.children.forEach(child => {
      if (child.userData && child.userData.isDebug) {
        this.object.remove(child);
      }
    });
    
    if (enabled) {
      // Create a wireframe box to show the collision boundary
      const collisionGeometry = new THREE.BoxGeometry(1.2, 1, 2);
      const collisionMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        wireframe: true 
      });
      const collisionBox = new THREE.Mesh(collisionGeometry, collisionMaterial);
      collisionBox.position.y = 0.5; // Align with bike center
      collisionBox.userData.isDebug = true;
      
      this.object.add(collisionBox);
      console.log("Bike debug visualization enabled");
    }
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
    this.object.position.z -= this.speed * deltaTime;

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
    this.object.position.x += lateralMovement;

    // Apply bounds to keep bike on the road
    if (this.object.position.x < this.roadBounds.min) {
      this.object.position.x = this.roadBounds.min;
    } else if (this.object.position.x > this.roadBounds.max) {
      this.object.position.x = this.roadBounds.max;
    }

    // Apply tilt to the bike model
    this.object.rotation.z = this.currentTilt;
    
    // Return some status info
    return {
      speed: this.speed,
      position: this.object.position.clone()
    };
  }
} 