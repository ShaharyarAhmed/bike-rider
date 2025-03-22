import * as THREE from 'three';

export class Vehicle {
  constructor(type = 'car', speed = 20) {
    this.type = type;
    this.speed = speed;
    this.originalSpeed = speed; // Store original speed for reference
    this.size = this.getVehicleSize(type);
    this.object = this.createVehicle();
    
    // Note: Rotation will be handled by the Traffic class
    // DO NOT set rotation here to avoid conflicts
    
    this.braking = false; // Whether the vehicle is currently braking
    this.brakingTime = 0; // Time counter for braking duration
    this.maxBrakingTime = 2; // Maximum time to brake before finding alternative
    this.changingLanes = false; // Whether currently changing lanes
    this.targetLaneX = 0; // Target X position for lane change
    this.laneChangeSpeed = 2; // Speed of lane change
    this.roadWidth = 8; // Total width of the road
    this.minLanePosition = -3; // Leftmost lane position
    this.maxLanePosition = 3; // Rightmost lane position
  }
  
  getVehicleSize(type) {
    switch (type) {
      case 'truck':
        return { width: 2.2, height: 2.8, length: 8 };
      case 'car':
      default:
        return { width: 1.8, height: 1.5, length: 4 };
    }
  }
  
  createVehicle() {
    const vehicleGroup = new THREE.Group();
    
    if (this.type === 'truck') {
      // Create semi truck
      this.createTruck(vehicleGroup);
    } else {
      // Create car
      this.createCar(vehicleGroup);
    }
    
    // Add shadow casting
    vehicleGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    
    return vehicleGroup;
  }
  
  createCar(group) {
    // Car dimensions
    const width = this.size.width;
    const height = this.size.height;
    const length = this.size.length;
    
    // Create with a consistent orientation:
    // - Z-axis: Front of vehicle is -Z, back is +Z
    // - X-axis: Left side is -X, right side is +X
    // - Y-axis: Bottom is 0, top is +Y
    
    // Random car color
    const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0x1abc9c];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(width, height * 0.6, length);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = height * 0.3;
    group.add(body);
    
    // Car top
    const topGeometry = new THREE.BoxGeometry(width * 0.8, height * 0.4, length * 0.6);
    const topMaterial = new THREE.MeshStandardMaterial({ color: color });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = height * 0.7;
    group.add(top);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Front-left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.position.set(-width / 2 - 0.1, 0.4, -length / 4);
    group.add(wheelFL);
    
    // Front-right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.position.set(width / 2 + 0.1, 0.4, -length / 4);
    group.add(wheelFR);
    
    // Back-left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.position.set(-width / 2 - 0.1, 0.4, length / 4);
    group.add(wheelBL);
    
    // Back-right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.position.set(width / 2 + 0.1, 0.4, length / 4);
    group.add(wheelBR);
    
    // Headlights (at front = -Z)
    const headlightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffcc,
      emissiveIntensity: 1
    });
    
    // Left headlight - front (-Z)
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-width / 4, height * 0.3, -length / 2 - 0.05);
    group.add(headlightL);
    
    // Right headlight - front (-Z)
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(width / 4, height * 0.3, -length / 2 - 0.05);
    group.add(headlightR);
    
    // Taillights (at back = +Z)
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      name: 'taillight'  // Add name for identification
    });
    
    // Left taillight - back (+Z)
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial.clone());
    taillightL.position.set(-width / 4, height * 0.3, length / 2 + 0.05);
    taillightL.userData.isTaillight = true;  // Add custom property
    group.add(taillightL);
    
    // Right taillight - back (+Z)
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial.clone());
    taillightR.position.set(width / 4, height * 0.3, length / 2 + 0.05);
    taillightR.userData.isTaillight = true;  // Add custom property
    group.add(taillightR);
  }
  
  createTruck(group) {
    // Truck dimensions
    const width = this.size.width;
    const height = this.size.height;
    const length = this.size.length;
    
    // Create with a consistent orientation:
    // - Z-axis: Front of vehicle is -Z, back is +Z
    // - X-axis: Left side is -X, right side is +X
    // - Y-axis: Bottom is 0, top is +Y
    
    // Cab color (random)
    const cabColors = [0xe74c3c, 0x3498db, 0x2c3e50, 0x16a085, 0x8e44ad];
    const cabColor = cabColors[Math.floor(Math.random() * cabColors.length)];
    
    // Trailer color (usually white or gray)
    const trailerColor = 0xecf0f1;
    
    // Create cab (front part, -Z side)
    const cabGeometry = new THREE.BoxGeometry(width, height * 0.8, length * 0.3);
    const cabMaterial = new THREE.MeshStandardMaterial({ color: cabColor });
    const cab = new THREE.Mesh(cabGeometry, cabMaterial);
    cab.position.set(0, height * 0.4, -length * 0.35);
    group.add(cab);
    
    // Create trailer (back part, +Z side)
    const trailerGeometry = new THREE.BoxGeometry(width, height, length * 0.7);
    const trailerMaterial = new THREE.MeshStandardMaterial({ color: trailerColor });
    const trailer = new THREE.Mesh(trailerGeometry, trailerMaterial);
    trailer.position.set(0, height * 0.5, length * 0.15);
    group.add(trailer);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Cab wheels (at front, -Z)
    const wheelFrontLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFrontLeft.position.set(-width / 2 - 0.1, 0.5, -length * 0.35);
    group.add(wheelFrontLeft);
    
    const wheelFrontRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFrontRight.position.set(width / 2 + 0.1, 0.5, -length * 0.35);
    group.add(wheelFrontRight);
    
    // Trailer wheels (at back, +Z)
    const trailerWheelPositions = [
      { x: -width / 2 - 0.1, z: 0 },
      { x: width / 2 + 0.1, z: 0 },
      { x: -width / 2 - 0.1, z: length * 0.3 },
      { x: width / 2 + 0.1, z: length * 0.3 }
    ];
    
    trailerWheelPositions.forEach(position => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(position.x, 0.5, position.z);
      group.add(wheel);
    });
    
    // Headlights (at front, -Z)
    const headlightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffcc,
      emissiveIntensity: 1
    });
    
    // Left headlight - front (-Z)
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-width / 3, height * 0.4, -length / 2 - 0.05);
    group.add(headlightL);
    
    // Right headlight - front (-Z)
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(width / 3, height * 0.4, -length / 2 - 0.05);
    group.add(headlightR);
    
    // Taillights (at back, +Z)
    const taillightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      name: 'taillight'  // Add name for identification
    });
    
    // Left taillight - back (+Z)
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial.clone());
    taillightL.position.set(-width / 3, height * 0.4, length / 2 + 0.05);
    taillightL.userData.isTaillight = true;  // Add custom property
    group.add(taillightL);
    
    // Right taillight - back (+Z)
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial.clone());
    taillightR.position.set(width / 3, height * 0.4, length / 2 + 0.05);
    taillightR.userData.isTaillight = true;  // Add custom property
    group.add(taillightR);
  }
  
  update(deltaTime, vehicles = []) {
    // Check for potential collisions with other vehicles
    let needToSlow = false;
    let nearestFrontVehicle = null;
    let minDistance = Infinity;
    
    // Check all other vehicles to see if any are ahead and in our lane
    for (const otherVehicle of vehicles) {
      if (otherVehicle === this) continue; // Skip self
      
      const myPos = this.object.position;
      const otherPos = otherVehicle.object.position;
      
      // Only consider vehicles ahead of us (with smaller Z value since we move in negative Z)
      if (otherPos.z >= myPos.z) continue;
      
      // Check if in same lane (X position within 1.5 units)
      if (Math.abs(myPos.x - otherPos.x) > 1.5) continue;
      
      // Calculate distance to vehicle ahead
      const distance = myPos.z - otherPos.z;
      
      // If vehicle is close ahead, we need to slow down
      // Safe distance is proportional to our speed
      const safeDistance = this.speed * 1.5 + 2;
      
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
      
      // Update braking time counter
      this.brakingTime += deltaTime;
      
      // Consider changing lanes if braking for too long
      if (this.brakingTime > this.maxBrakingTime && !this.changingLanes) {
        this.tryChangeLanes(vehicles);
      }
    } else {
      // No vehicle ahead, resume normal speed
      if (this.speed < this.originalSpeed) {
        this.speed = Math.min(this.originalSpeed, this.speed + 2 * deltaTime);
      }
      this.braking = false;
      this.brakingTime = 0;
    }
    
    // Handle lane changing if in progress
    if (this.changingLanes) {
      const myPos = this.object.position;
      const distanceToTarget = this.targetLaneX - myPos.x;
      const step = Math.sign(distanceToTarget) * 
                  Math.min(Math.abs(distanceToTarget), this.laneChangeSpeed * deltaTime);
      
      myPos.x += step;
      
      // Check if lane change is complete
      if (Math.abs(myPos.x - this.targetLaneX) < 0.1) {
        myPos.x = this.targetLaneX; // Snap to exact lane position
        this.changingLanes = false;
      }
    }
    
    // Move vehicle forward based on its speed
    // The negative sign makes it move in the same direction as the bike
    this.object.position.z -= this.speed * deltaTime;
  }
  
  // Try to change lanes if possible
  tryChangeLanes(vehicles) {
    const currentX = this.object.position.x;
    const currentZ = this.object.position.z;
    
    // Determine which direction to change lanes
    // If at leftmost lane, move right
    // If at rightmost lane, move left
    // Otherwise, randomly choose
    let direction = 0;
    
    if (currentX <= this.minLanePosition + 1) {
      direction = 1; // Move right
    } else if (currentX >= this.maxLanePosition - 1) {
      direction = -1; // Move left
    } else {
      direction = Math.random() > 0.5 ? 1 : -1; // Random direction
    }
    
    // Calculate target lane position
    const targetX = currentX + (direction * 3); // Move one full lane
    
    // Check if the target lane is clear
    for (const otherVehicle of vehicles) {
      if (otherVehicle === this) continue;
      
      const otherX = otherVehicle.object.position.x;
      const otherZ = otherVehicle.object.position.z;
      
      // Skip vehicles not in the target lane
      if (Math.abs(otherX - targetX) > 1.5) continue;
      
      // Check if there's a vehicle in the target lane that's too close
      const zDistance = Math.abs(currentZ - otherZ);
      if (zDistance < 15) {
        return false; // Lane change not safe
      }
    }
    
    // If we get here, lane change is safe
    this.targetLaneX = targetX;
    this.changingLanes = true;
    return true;
  }
} 