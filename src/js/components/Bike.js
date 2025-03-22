import * as THREE from 'three';

export class Bike {
  constructor() {
    // Bike properties
    this.speed = 0;
    this.maxSpeed = 40;
    this.acceleration = 10;
    this.deceleration = 15;
    this.brakeDeceleration = 30;
    this.turnSpeed = 3;
    this.lateralSpeed = 5;
    this.roadBounds = 4; // Half width of road
    
    // Create the bike
    this.object = this.createBike();
    
    // Set initial position
    this.object.position.set(0, 0.5, 0);
  }
  
  createBike() {
    // For now, use a simple box as a placeholder for the bike
    const geometry = new THREE.BoxGeometry(1, 1, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const bike = new THREE.Mesh(geometry, material);
    
    // Set bike to cast shadow
    bike.castShadow = true;
    
    return bike;
  }
  
  update(input, deltaTime) {
    // Handle forward/backward movement (acceleration/deceleration)
    if (input.isKeyPressed('ArrowUp')) {
      // Accelerate forward
      this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
    } else if (input.isKeyPressed('ArrowDown')) {
      // Apply brakes
      this.speed = Math.max(this.speed - this.brakeDeceleration * deltaTime, 0);
    } else {
      // Natural deceleration when no keys are pressed
      this.speed = Math.max(this.speed - this.deceleration * deltaTime, 0);
    }
    
    // Move forward based on current speed
    this.object.position.z -= this.speed * deltaTime;
    
    // Handle left/right movement
    if (input.isKeyPressed('ArrowLeft')) {
      // Move left, but respect road bounds
      const newX = this.object.position.x - this.lateralSpeed * deltaTime;
      this.object.position.x = Math.max(newX, -this.roadBounds);
    } 
    
    if (input.isKeyPressed('ArrowRight')) {
      // Move right, but respect road bounds
      const newX = this.object.position.x + this.lateralSpeed * deltaTime;
      this.object.position.x = Math.min(newX, this.roadBounds);
    }
  }
} 