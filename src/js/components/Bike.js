import * as THREE from 'three';

export class Bike {
  constructor() {
    // Bike properties
    this.speed = 5;
    this.maxSpeed = 40;
    this.acceleration = 25;
    this.deceleration = 10;
    this.brakeDeceleration = 30;
    this.turnSpeed = 3;
    this.lateralSpeed = 5;
    this.maxTilt = 0.3; // Maximum tilt angle in radians
    this.tiltRecoverySpeed = 5; // How fast the bike returns to upright position
    this.currentTilt = 0;
    this.roadBounds = 4; // Half width of road
    
    // Create the bike
    this.object = this.createBike();
    
    // Set initial position
    this.object.position.set(0, 0.5, 0);
  }
  
  createBike() {
    // Create a group for the bike to allow for tilting
    const bikeGroup = new THREE.Group();
    
    // For now, use a simple box as a placeholder for the bike
    const geometry = new THREE.BoxGeometry(1, 1, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const bike = new THREE.Mesh(geometry, material);
    
    // Add bike to the group
    bikeGroup.add(bike);
    
    // Set bike to cast shadow
    bike.castShadow = true;
    
    return bikeGroup;
  }
  
  update(deltaTime, inputHandler) {
    // Get keyboard input from the inputHandler
    const keyboard = inputHandler;
    
    // Handle forward/backward movement (acceleration/deceleration)
    if (keyboard.isKeyPressed('ArrowUp')) {
      // Accelerate forward
      this.speed = Math.min(this.speed + this.acceleration * deltaTime, this.maxSpeed);
    } else if (keyboard.isKeyPressed('ArrowDown')) {
      // Apply brakes
      this.speed = Math.max(this.speed - this.brakeDeceleration * deltaTime, 0);
    } else {
      // Natural deceleration when no keys are pressed
      this.speed = Math.max(this.speed - this.deceleration * deltaTime, 0);
    }
    
    // Move forward based on current speed
    this.object.position.z -= this.speed * deltaTime;
    
    // Reset tilt when no key is pressed
    let tiltTarget = 0;
    
    // Handle left/right movement with tilting
    if (keyboard.isKeyPressed('ArrowLeft')) {
      // Move left, but respect road bounds
      const newX = this.object.position.x - this.lateralSpeed * deltaTime;
      this.object.position.x = Math.max(newX, -this.roadBounds);
      tiltTarget = this.maxTilt; // Tilt right when turning left (leaning into turn)
    } 
    
    if (keyboard.isKeyPressed('ArrowRight')) {
      // Move right, but respect road bounds
      const newX = this.object.position.x + this.lateralSpeed * deltaTime;
      this.object.position.x = Math.min(newX, this.roadBounds);
      tiltTarget = -this.maxTilt; // Tilt left when turning right (leaning into turn)
    }
    
    // Smoothly adjust tilt
    if (this.currentTilt < tiltTarget) {
      this.currentTilt = Math.min(this.currentTilt + this.tiltRecoverySpeed * deltaTime, tiltTarget);
    } else if (this.currentTilt > tiltTarget) {
      this.currentTilt = Math.max(this.currentTilt - this.tiltRecoverySpeed * deltaTime, tiltTarget);
    }
    
    // Apply tilt rotation
    this.object.rotation.z = this.currentTilt;
  }
} 