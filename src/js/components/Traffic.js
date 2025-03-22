import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';

export class Traffic {
  constructor(roadWidth = 10, roadLength = 100) {
    this.roadWidth = roadWidth;
    this.roadLength = roadLength;
    this.vehicles = [];
    this.object = new THREE.Group();
    this.spawnDistance = -120; // Reduced to spawn vehicles closer to the bike
    this.minLaneOffset = -3; // Left side of road
    this.maxLaneOffset = 3; // Right side of road
    this.laneCount = 2; // Number of lanes in each direction
    this.lanes = this.generateLanes();
    this.minVehicleDistance = 30; // Minimum distance between vehicles in the same lane
    this.maxActiveVehicles = 10; // Maximum number of active vehicles
    this.despawnDistance = 70; // Distance behind the bike to remove vehicles
  }
  
  generateLanes() {
    const lanes = [];
    const laneWidth = (this.maxLaneOffset - this.minLaneOffset) / this.laneCount;
    
    for (let i = 0; i < this.laneCount; i++) {
      const xPos = this.minLaneOffset + (i * laneWidth) + (laneWidth / 2);
      lanes.push(xPos);
    }
    
    return lanes;
  }
  
  // Create a new vehicle
  createVehicle(bikePosition) {
    // Randomly choose a lane
    const laneIndex = Math.floor(Math.random() * this.lanes.length);
    const lane = this.lanes[laneIndex];
    
    // Check if the lane is clear for spawning
    if (!this.isLaneClear(lane, this.spawnDistance + bikePosition.z)) {
      return null; // Lane not clear, don't spawn
    }
    
    // Choose vehicle type (0 = car, 1 = truck) with 30% chance of truck
    const vehicleType = Math.random() < 0.3 ? 'truck' : 'car';
    
    // Even slower speeds to ensure the bike can catch up
    const speed = vehicleType === 'truck' 
      ? 3 + Math.random() * 3 // 3-6 for trucks (extremely slow)
      : 5 + Math.random() * 5; // 5-10 for cars (very slow)
    
    // Create the vehicle
    const vehicle = new Vehicle(vehicleType, speed);
    
    // Position the vehicle
    vehicle.object.position.set(
      lane, // X (lane position)
      0.5, // Y (height above ground)
      this.spawnDistance + bikePosition.z // Z (ahead of the bike)
    );
    
    // Add to our lists and the scene
    this.vehicles.push(vehicle);
    this.object.add(vehicle.object);
    
    // Debug log - report when a vehicle is created
    console.log(`Created ${vehicleType} at position Z=${vehicle.object.position.z.toFixed(2)}, speed=${speed.toFixed(2)}`);
    
    return vehicle;
  }
  
  // Check if a lane is clear at a specific z position
  isLaneClear(laneX, zPosition) {
    for (const vehicle of this.vehicles) {
      const vehicleZ = vehicle.object.position.z;
      const vehicleX = vehicle.object.position.x;
      
      // Check if vehicle is in the same lane and close to spawn position
      if (Math.abs(vehicleX - laneX) < 1 && 
          Math.abs(vehicleZ - zPosition) < this.minVehicleDistance) {
        return false;
      }
    }
    return true;
  }
  
  // Update traffic
  update(deltaTime, bikePosition) {
    // Update existing vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];
      
      // Update vehicle position
      vehicle.update(deltaTime);
      
      // Remove vehicles that are too far behind the bike
      // Since we're moving in negative Z direction, vehicles behind the bike have LARGER Z values
      if (vehicle.object.position.z > bikePosition.z + this.despawnDistance) {
        this.object.remove(vehicle.object);
        this.vehicles.splice(i, 1);
      }
    }
    
    // Debug - log vehicle positions
    if (this.vehicles.length > 0 && Math.random() < 0.01) {
      console.log(`Bike Z: ${bikePosition.z.toFixed(2)}, Vehicle count: ${this.vehicles.length}`);
      this.vehicles.forEach((v, i) => {
        console.log(`Vehicle ${i}: Z=${v.object.position.z.toFixed(2)}, Type=${v.type}, Speed=${v.speed.toFixed(2)}`);
      });
    }
    
    // Spawn new vehicles with random chance
    if (this.vehicles.length < this.maxActiveVehicles && Math.random() < 0.03) {
      this.createVehicle(bikePosition);
    }
  }
  
  // Check if the bike collides with any vehicle
  checkCollision(bikePosition, bikeSize = { width: 1, length: 2 }) {
    const bikeHalfWidth = bikeSize.width / 2;
    const bikeHalfLength = bikeSize.length / 2;
    
    for (const vehicle of this.vehicles) {
      const vehiclePos = vehicle.object.position;
      const vehicleSize = vehicle.size;
      const vehicleHalfWidth = vehicleSize.width / 2;
      const vehicleHalfLength = vehicleSize.length / 2;
      
      // Simple AABB (Axis-Aligned Bounding Box) collision check
      if (
        Math.abs(bikePosition.x - vehiclePos.x) < (bikeHalfWidth + vehicleHalfWidth) &&
        Math.abs(bikePosition.z - vehiclePos.z) < (bikeHalfLength + vehicleHalfLength)
      ) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
} 