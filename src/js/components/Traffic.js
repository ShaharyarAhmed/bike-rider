import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';

export class Traffic {
  constructor(sceneOrWidth, roadLength) {
    this.object = new THREE.Group();
    this.vehicles = [];
    this.spawnDistance = -120; // How far ahead of the bike to spawn vehicles
    this.despawnDistance = 70; // How far behind the bike to despawn vehicles
    this.maxActiveVehicles = 10; // Maximum number of active vehicles
    this.lanes = [-3, 0, 3]; // Lane positions
    this.minVehicleDistance = 30; // Minimum distance between vehicles in the same lane
    this.debug = true; // Enable debug visuals by default to help diagnose orientation issues
    
    // Check if first parameter is a scene (for new usage) or a number (old usage)
    if (sceneOrWidth && typeof sceneOrWidth.add === 'function') {
      // New way: scene is passed directly
      this.scene = sceneOrWidth;
      sceneOrWidth.add(this.object);
    }
    // No need to handle the old way, as we just add the object to the scene externally
    
    // Track last spawn time to avoid clustering
    this.lastSpawnTime = 0;
    this.spawnCooldown = 0.5; // Seconds between potential spawns
  }
  
  // Check if a lane is clear to spawn a new vehicle
  isLaneClear(lane, bikePosition, minDistance = 40) {
    for (const vehicle of this.vehicles) {
      // Check if vehicle is in the same lane
      if (Math.abs(vehicle.object.position.x - lane) < 1.5) {
        // Calculate distance from spawn point
        const spawnZ = this.spawnDistance + bikePosition.z;
        const distance = Math.abs(vehicle.object.position.z - spawnZ);
        
        if (distance < minDistance) {
          return false; // Lane is not clear
        }
      }
    }
    return true; // Lane is clear
  }
  
  // Create a new vehicle
  createVehicle(bikePosition) {
    // Determine vehicle type (20% chance for truck, 80% for car)
    const vehicleType = Math.random() < 0.2 ? 'truck' : 'car';
    
    // Determine vehicle speed
    let speed;
    if (vehicleType === 'truck') {
      speed = 3 + Math.random() * 3; // 3-6 speed for trucks
    } else {
      speed = 5 + Math.random() * 5; // 5-10 speed for cars
    }
    
    // Choose a lane that is clear
    const availableLanes = this.lanes.filter(lane => 
      this.isLaneClear(lane, bikePosition)
    );
    
    // If no lanes are clear, skip spawning
    if (availableLanes.length === 0) {
      return null;
    }
    
    // Choose a random lane from available ones
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    // Create the vehicle
    const vehicle = new Vehicle(vehicleType, speed);
    
    // Position the vehicle
    vehicle.object.position.set(
      lane, // X (lane position)
      0.5, // Y (height above ground)
      this.spawnDistance + bikePosition.z // Z (ahead of the bike)
    );
    
    // Rotate vehicle to face in the direction of travel (negative Z)
    // Because our vehicles are built with their front at -Z and back at +Z
    // And we want them traveling in the -Z direction (same as the bike),
    // we need to rotate them 180 degrees around the Y axis
    // This makes their front point in the -Z direction (the direction they're moving)
    const rotationY = Math.PI; // 180 degrees in radians
    vehicle.object.rotation.set(0, rotationY, 0);
    
    console.log(`Vehicle orientation: front=${-Math.sin(rotationY) < 0 ? '-Z' : '+Z'}, back=${Math.sin(rotationY) < 0 ? '+Z' : '-Z'}`);
    
    // Add debug markers if debug mode is enabled
    if (this.debug) {
      this.addDebugMarkers(vehicle);
    }
    
    // Store reference to taillights for brake effect
    vehicle.taillights = [];
    vehicle.object.traverse(child => {
      // Find tail lights using the userData property we added
      if (child instanceof THREE.Mesh && child.userData.isTaillight) {
        vehicle.taillights.push(child);
      }
    });
    
    // Add to our lists and the scene
    this.vehicles.push(vehicle);
    this.object.add(vehicle.object);
    
    console.log(`Created ${vehicleType} at (${lane.toFixed(1)}, ${(this.spawnDistance + bikePosition.z).toFixed(1)}) with speed ${speed.toFixed(1)}, facing ${vehicle.object.rotation.y.toFixed(2)} radians`);
    return vehicle;
  }
  
  // Add visual debug markers to show the front and back of the vehicle
  addDebugMarkers(vehicle) {
    // Add a blue cone at the front
    const frontGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const frontMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true });
    const frontMarker = new THREE.Mesh(frontGeometry, frontMaterial);
    frontMarker.position.set(0, 2, -vehicle.size.length / 2 - 0.5); // Front (-Z)
    frontMarker.rotation.x = Math.PI / 2; // Point forward
    vehicle.object.add(frontMarker);
    
    // Add a red cone at the back
    const backGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const backMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const backMarker = new THREE.Mesh(backGeometry, backMaterial);
    backMarker.position.set(0, 2, vehicle.size.length / 2 + 0.5); // Back (+Z)
    backMarker.rotation.x = -Math.PI / 2; // Point backward
    vehicle.object.add(backMarker);
    
    // Simple text display using a small mesh instead of CSS2D which requires additional setup
    const vehicleTypeIndicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: vehicle.type === 'truck' ? 0xff8800 : 0x00ff00 })
    );
    vehicleTypeIndicator.position.set(0, 3, 0);
    vehicle.object.add(vehicleTypeIndicator);
  }
  
  // Update traffic
  update(deltaTime, bikePosition) {
    // Update this.lastSpawnTime
    this.lastSpawnTime += deltaTime;
    
    // Update existing vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];
      
      // Update vehicle position with collision avoidance
      vehicle.update(deltaTime, this.vehicles);
      
      // Update brake lights based on braking status
      if (vehicle.taillights && vehicle.taillights.length > 0) {
        vehicle.taillights.forEach(light => {
          // Directly update the emissive intensity based on braking status
          if (vehicle.braking) {
            light.material.emissiveIntensity = 1.0;
          } else {
            light.material.emissiveIntensity = 0.5;
          }
        });
      }
      
      // Remove vehicles that are too far behind the bike
      if (vehicle.object.position.z > bikePosition.z + this.despawnDistance) {
        this.object.remove(vehicle.object);
        this.vehicles.splice(i, 1);
      }
    }
    
    // Sort vehicles by Z position for more efficient collision checking
    this.vehicles.sort((a, b) => a.object.position.z - b.object.position.z);
    
    // Spawn new vehicles with random chance if cooldown has elapsed
    if (this.vehicles.length < this.maxActiveVehicles && 
        this.lastSpawnTime > this.spawnCooldown && 
        Math.random() < 0.1) {
      
      const vehicle = this.createVehicle(bikePosition);
      if (vehicle) {
        // Reset cooldown if vehicle was spawned
        this.lastSpawnTime = 0;
      }
    }
  }
  
  // Check for collision with the bike
  checkCollision(bikePosition, bikeWidth = 1) {
    for (const vehicle of this.vehicles) {
      const vehPos = vehicle.object.position;
      
      // Calculate distance in X and Z
      const dx = Math.abs(vehPos.x - bikePosition.x);
      const dz = Math.abs(vehPos.z - bikePosition.z);
      
      // Use vehicle size for collision detection
      const collisionX = dx < (vehicle.size.width / 2 + bikeWidth / 2);
      const collisionZ = dz < (vehicle.size.length / 2 + bikeWidth / 2);
      
      if (collisionX && collisionZ) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
  
  // Toggle debug mode and update existing vehicles
  toggleDebug() {
    this.debug = !this.debug;
    
    if (this.debug) {
      // Add debug markers to all existing vehicles
      this.vehicles.forEach(vehicle => {
        this.addDebugMarkers(vehicle);
      });
      console.log("Traffic debug mode enabled");
    } else {
      // Remove debug markers from all vehicles
      this.vehicles.forEach(vehicle => {
        vehicle.object.traverse(child => {
          if (child instanceof THREE.Mesh && 
              (child.material.wireframe || 
               child.material.color.r === 1 && child.material.color.g === 0 && child.material.color.b === 0 ||
               child.material.color.r === 0 && child.material.color.g === 0 && child.material.color.b === 1)) {
            vehicle.object.remove(child);
          }
        });
      });
      console.log("Traffic debug mode disabled");
    }
    
    return this.debug;
  }
} 