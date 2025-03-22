import * as THREE from 'three';

export class Vehicle {
  constructor(type = 'car', speed = 20) {
    this.type = type;
    this.speed = speed;
    this.size = this.getVehicleSize(type);
    this.object = this.createVehicle();
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
    
    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffcc,
      emissiveIntensity: 1
    });
    
    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-width / 4, height * 0.3, -length / 2 - 0.05);
    group.add(headlightL);
    
    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(width / 4, height * 0.3, -length / 2 - 0.05);
    group.add(headlightR);
    
    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    // Left taillight
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightL.position.set(-width / 4, height * 0.3, length / 2 + 0.05);
    group.add(taillightL);
    
    // Right taillight
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightR.position.set(width / 4, height * 0.3, length / 2 + 0.05);
    group.add(taillightR);
    
    // Rotate to face forward
    group.rotation.y = Math.PI;
  }
  
  createTruck(group) {
    // Truck dimensions
    const width = this.size.width;
    const height = this.size.height;
    const length = this.size.length;
    
    // Cab color (random)
    const cabColors = [0xe74c3c, 0x3498db, 0x2c3e50, 0x16a085, 0x8e44ad];
    const cabColor = cabColors[Math.floor(Math.random() * cabColors.length)];
    
    // Trailer color (usually white or gray)
    const trailerColor = 0xecf0f1;
    
    // Create cab (smaller front part)
    const cabGeometry = new THREE.BoxGeometry(width, height * 0.8, length * 0.3);
    const cabMaterial = new THREE.MeshStandardMaterial({ color: cabColor });
    const cab = new THREE.Mesh(cabGeometry, cabMaterial);
    cab.position.set(0, height * 0.4, -length * 0.35);
    group.add(cab);
    
    // Create trailer (larger back part)
    const trailerGeometry = new THREE.BoxGeometry(width, height, length * 0.7);
    const trailerMaterial = new THREE.MeshStandardMaterial({ color: trailerColor });
    const trailer = new THREE.Mesh(trailerGeometry, trailerMaterial);
    trailer.position.set(0, height * 0.5, length * 0.15);
    group.add(trailer);
    
    // Wheels (more wheels for a truck)
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Cab wheels
    const wheelFrontLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFrontLeft.position.set(-width / 2 - 0.1, 0.5, -length * 0.35);
    group.add(wheelFrontLeft);
    
    const wheelFrontRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFrontRight.position.set(width / 2 + 0.1, 0.5, -length * 0.35);
    group.add(wheelFrontRight);
    
    // Trailer wheels
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
    
    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: 0xffffcc,
      emissiveIntensity: 1
    });
    
    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-width / 3, height * 0.4, -length / 2 - 0.05);
    group.add(headlightL);
    
    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(width / 3, height * 0.4, -length / 2 - 0.05);
    group.add(headlightR);
    
    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    // Left taillight
    const taillightL = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightL.position.set(-width / 3, height * 0.4, length / 2 + 0.05);
    group.add(taillightL);
    
    // Right taillight
    const taillightR = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillightR.position.set(width / 3, height * 0.4, length / 2 + 0.05);
    group.add(taillightR);
    
    // Rotate to face forward
    group.rotation.y = Math.PI;
  }
  
  update(deltaTime) {
    // Move vehicle forward based on its speed
    // The negative sign makes it move in the same direction as the bike
    this.object.position.z -= this.speed * deltaTime;
  }
} 