import * as THREE from 'three';
import { Road } from '../components/Road.js';
import { Traffic } from '../components/Traffic.js';

export class GameScene extends THREE.Scene {
  constructor() {
    super();
    
    // Set up background
    this.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add fog for distance culling and atmospheric effect
    this.fog = new THREE.Fog(0x87CEEB, 50, 200); // Increased fog distance for better visibility
    
    // Add lighting
    this.setupLights();
    
    // Create the road and pass this scene
    this.road = new Road(this);
    
    // Add traffic system - pass 'this' as the scene
    this.traffic = new Traffic(this);
    
    // Store last update position to track player movement
    this.lastUpdatePosition = new THREE.Vector3(0, 0, 0);
    
    // Distance tracking
    this.totalDistanceTraveled = 0;
  }
  
  setupLights() {
    // Ambient light for overall scene illumination - slightly increased to compensate for fewer lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.add(ambientLight);
    
    // Directional light (sunlight) with optimized shadow settings
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Reduced intensity
    directionalLight.position.set(10, 20, 10);
    
    // Enable shadows but with optimized settings
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;  // Reduced from 2048
    directionalLight.shadow.mapSize.height = 1024; // Reduced from 2048
    directionalLight.shadow.camera.near = 1;       // Increased from 0.5
    directionalLight.shadow.camera.far = 40;       // Reduced from 50
    directionalLight.shadow.camera.left = -15;     // Reduced from -20
    directionalLight.shadow.camera.right = 15;     // Reduced from 20
    directionalLight.shadow.camera.top = 15;       // Reduced from 20
    directionalLight.shadow.camera.bottom = -15;   // Reduced from -20
    
    // Optimize shadow bias to reduce artifacts while maintaining quality
    directionalLight.shadow.bias = -0.0005;
    
    this.add(directionalLight);
    
    // Add a helper function to adjust fog based on performance
    this.adjustFogForPerformance = (deltaTime) => {
      // If frames are taking too long (lag), reduce fog distance
      if (deltaTime > 0.05) { // Less than 20 FPS
        this.fog.far = Math.max(150, this.fog.far - 5);
      } 
      // If performance is good, gradually increase fog distance to default
      else if (deltaTime < 0.033 && this.fog.far < 200) {
        this.fog.far = Math.min(200, this.fog.far + 1);
      }
    };
  }
  
  // Method to update the scene
  update(deltaTime, bikePosition) {
    // Calculate distance traveled since last update
    const distanceDelta = Math.abs(bikePosition.z - this.lastUpdatePosition.z);
    this.totalDistanceTraveled += distanceDelta;
    
    // Update the road
    if (this.road) {
      this.road.update(bikePosition);
    }
    
    // Update traffic
    if (this.traffic) {
      this.traffic.update(deltaTime, bikePosition);
    }
    
    // Adjust fog based on current performance
    this.adjustFogForPerformance(deltaTime);
    
    // Log distance milestone every 1000 units instead of 500 for better performance
    if (Math.floor(this.totalDistanceTraveled / 1000) > Math.floor((this.totalDistanceTraveled - distanceDelta) / 1000)) {
      console.log(`Distance milestone: ${Math.floor(this.totalDistanceTraveled)} units traveled`);
      
      // Only force spawn vehicles at milestones if very few are present and traffic is enabled
      if (this.traffic && this.traffic.vehicles.length < 3 && this.traffic.modelLoadingEnabled) {
        this.traffic.trySpawnVehicle(bikePosition);
      }
    }
    
    // Store current position for next update
    this.lastUpdatePosition.copy(bikePosition);
  }
  
  // Check for collisions with traffic
  checkCollisions(bikePosition, bike) {
    if (this.traffic && this.traffic.vehicles) {
      // Get actual bike dimensions if available
      let bikeWidth, bikeLength;
      
      if (bike.modelSize) {
        // Use calculated dimensions from the model
        bikeWidth = bike.modelSize.width;
        bikeLength = bike.modelSize.length;
      } else {
        // Fallback to a default size if modelSize is not available
        bikeWidth = bike.collisionBox ? bike.collisionBox.geometry.parameters.width : 1.2;
        bikeLength = bike.collisionBox ? bike.collisionBox.geometry.parameters.depth : 2.0;
      }
      
      // Get bike model center for more accurate collision checks
      let bikeCenter = new THREE.Vector3();
      if (bike.model) {
        const bikeBBox = new THREE.Box3().setFromObject(bike.model);
        bikeBBox.getCenter(bikeCenter);
      } else {
        bikeCenter.copy(bikePosition);
      }
      
      // Implement collision detection with the new Traffic class structure
      for (const vehicle of this.traffic.vehicles) {
        // Get vehicle model center for more accurate collision checks
        let vehicleCenter = new THREE.Vector3();
        if (vehicle.model) {
          const vehicleBBox = new THREE.Box3().setFromObject(vehicle.model);
          vehicleBBox.getCenter(vehicleCenter);
        } else {
          vehicleCenter.copy(vehicle.position);
        }
        
        // Calculate distance between bike and vehicle centers
        const dx = Math.abs(vehicleCenter.x - bikeCenter.x);
        const dz = Math.abs(vehicleCenter.z - bikeCenter.z);
        
        // Check if the distance is less than the combined size of the bike and vehicle
        if (dx < (vehicle.size.width / 2 + bikeWidth / 2) && 
            dz < (vehicle.size.length / 2 + bikeLength / 2)) {
          console.log(`Collision detected! Bike at (${bikeCenter.x.toFixed(2)}, ${bikeCenter.z.toFixed(2)}), Vehicle at (${vehicleCenter.x.toFixed(2)}, ${vehicleCenter.z.toFixed(2)})`);
          console.log(`Bike size [W:${bikeWidth.toFixed(2)}, L:${bikeLength.toFixed(2)}], Vehicle size [W:${vehicle.size.width.toFixed(2)}, L:${vehicle.size.length.toFixed(2)}]`);
          return true;
        }
      }
    }
    return false;
  }
} 