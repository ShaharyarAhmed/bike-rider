import * as THREE from 'three';
import { AssetManager } from '../utils/AssetManager.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.assetManager = AssetManager.getInstance();
    
    // Land dimensions
    this.landWidth = 100; // Width on each side of the road
    this.landLength = 100; // Match Road's chunkLength for synchronization
    this.roadWidth = 14; // Match Road's width
    this.landSegments = []; // Array to track land segments

    // Tree settings
    this.treeSpacing = 20; // Reduced spacing for more trees
    this.treeDensity = 0.6; // Increased density for more trees
    this.treeZoneWidth = 40; // Width of the tree zone on each side
    this.treeRows = 4; // Number of rows of trees on each side
    
    // Road-tree buffer (distance from road edge to first tree)
    this.roadBuffer = 6;
    
    // Track which areas have been populated with trees
    this.populatedZones = new Set();
    
    // Collection of trees and terrain objects
    this.trees = [];
    this.landTiles = [];
    
    // The farthest distance we've generated trees and land
    this.farthestZ = 0;
    this.totalLandSegments = 3; // Number of land segments to maintain
    
    // Distance behind player to clean up objects
    this.cleanupDistance = 150;
    
    // Debug
    this.debug = false;
    
    // Tree model configurations
    this.treeConfigs = {
      'tree1.glb': {
        scale: { x: 5.0, y: 5.0, z: 5.0 }, // Increased scale to make trees more visible
        position: { y: 3 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.25,
        enabled: true
      },
      'tree2.glb': {
        scale: { x: 0.03, y: 0.03, z: 0.03 }, // Increased scale
        position: { y: -0.5 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.25,
        enabled: true
      },
      'tree3.glb': {
        scale: { x: 4.0, y: 4.0, z: 4.0 }, // Increased scale
        position: { y: 4 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.25,
        enabled: true
      },
      'tree4.glb': {
        scale: { x: 1.5, y: 1.5, z: 1.5 }, // Increased scale
        position: { y: 4 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.25,
        enabled: true
      },
      'tree_trunk1.glb': {
        scale: { x: 1.5, y: 1.5, z: 1.5 }, // Increased scale
        position: { y: -1 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.1,
        enabled: true
      },
      'tree_trunk2.glb': {
        scale: { x: 2.0, y: 2.0, z: 2.0 }, // Increased scale
        position: { y: -1 },
        rotation: { y: 0 },
        verticalOffset: 0,
        probability: 0.1,
        enabled: true
      }
    };
    
    // Create initial land
    this.createInitialLand();
    
    console.log("Environment system initialized");
  }
  
  // Create the initial set of land segments
  createInitialLand() {
    // Create ground material with a simple green color
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x567d46, // Green color
      roughness: 0.8
    });
    
    // Create initial land segments
    for (let i = 0; i < this.totalLandSegments; i++) {
      const segmentZ = -i * this.landLength;
      this.createLandSegment(segmentZ);
    }
    
    // Generate initial trees
    this.generateTrees(new THREE.Vector3(0, 0, 0), -this.landLength * this.totalLandSegments, 0);
    this.farthestZ = 0; // Reset farthest Z
  }
  
  // Create a single land segment at the specified z position
  createLandSegment(zPosition) {
    // Left side land
    const leftLand = new THREE.Mesh(
      new THREE.PlaneGeometry(this.landWidth, this.landLength),
      this.groundMaterial
    );
    leftLand.rotation.x = -Math.PI / 2;
    leftLand.position.set(
      -this.roadWidth / 2 - this.landWidth / 2, 
      -0.01, 
      zPosition - this.landLength / 2
    );
    leftLand.receiveShadow = true; // Enable shadow receiving for better visuals
    this.scene.add(leftLand);
    
    // Right side land
    const rightLand = new THREE.Mesh(
      new THREE.PlaneGeometry(this.landWidth, this.landLength),
      this.groundMaterial
    );
    rightLand.rotation.x = -Math.PI / 2;
    rightLand.position.set(
      this.roadWidth / 2 + this.landWidth / 2, 
      -0.01, 
      zPosition - this.landLength / 2
    );
    rightLand.receiveShadow = true; // Enable shadow receiving for better visuals
    this.scene.add(rightLand);
    
    // Track the land segments
    this.landSegments.push({
      left: leftLand,
      right: rightLand,
      zPosition: zPosition
    });
    
    // Generate trees for this new segment
    this.generateTrees(new THREE.Vector3(0, 0, zPosition), zPosition - this.landLength, zPosition);
    
    return { left: leftLand, right: rightLand, zPosition: zPosition };
  }
  
  // Get a random tree model based on configuration
  getRandomTreeModel() {
    const enabledConfigs = Object.entries(this.treeConfigs)
      .filter(([_, config]) => config.enabled);
    
    if (enabledConfigs.length === 0) {
      console.warn("No enabled tree models available");
      return null;
    }
    
    // Calculate total probability
    const totalProbability = enabledConfigs.reduce(
      (sum, [_, config]) => sum + config.probability, 0
    );
    
    // Select a model based on probability
    let randomValue = Math.random() * totalProbability;
    
    for (const [modelName, config] of enabledConfigs) {
      randomValue -= config.probability;
      if (randomValue <= 0) {
        return modelName;
      }
    }
    
    // Default to first model if something goes wrong
    return enabledConfigs[0][0];
  }
  
  // Place a tree at the given coordinates
  placeTree(x, z) {
    const modelName = this.getRandomTreeModel();
    if (!modelName) return null;
    
    // Get the configuration for this model
    const config = this.treeConfigs[modelName];
    
    // Add small random variations to scale and rotation
    const scaleVariation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
    const baseScale = config ? config.scale : { x: 1, y: 1, z: 1 };
    const randomRotationY = config && config.rotation && config.rotation.y !== undefined 
      ? config.rotation.y + (Math.random() * Math.PI * 0.5) // Small variation around base rotation
      : Math.random() * Math.PI * 2; // Or completely random if not specified
    
    // Create a container for the tree
    const treeContainer = new THREE.Object3D();
    treeContainer.position.set(x, config.position.y, z);
    treeContainer.rotation.y = randomRotationY;
    treeContainer.userData.type = 'tree';
    treeContainer.userData.modelName = modelName;
    
    // Log tree creation for debugging
    console.log(`Placing tree ${modelName} at position (${x}, 0, ${z})`);
    
    // Load the model
    this.assetManager.loadModel(
      modelName,
      (model) => {
        // Apply scale from configuration with variation
        model.scale.set(
          baseScale.x * scaleVariation,
          baseScale.y * scaleVariation,
          baseScale.z * scaleVariation
        );
        
        // Add model to container
        treeContainer.add(model);
        
        // Enable shadows
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Adjust position based on model center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        // Apply vertical offset from configuration
        const verticalOffset = config && config.verticalOffset ? config.verticalOffset : 0;
        model.position.y = verticalOffset;
        
        console.log(`Tree ${modelName} loaded successfully with scale ${baseScale.x * scaleVariation}`);
        
        if (this.debug) {
          // Add debug wireframe box
          const wireframeGeometry = new THREE.BoxGeometry(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z
          );
          const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
          });
          const wireframeBox = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
          wireframeBox.position.set(center.x, center.y, center.z);
          treeContainer.add(wireframeBox);
          
          // Add size label
          const labelDiv = document.createElement('div');
          labelDiv.className = 'tree-label';
          labelDiv.textContent = `${modelName}: ${Math.round(box.max.x - box.min.x)}x${Math.round(box.max.y - box.min.y)}x${Math.round(box.max.z - box.min.z)}`;
          labelDiv.style.color = 'lime';
          labelDiv.style.fontSize = '0.8em';
          const label = new CSS2DObject(labelDiv);
          label.position.set(0, box.max.y - box.min.y + 1, 0);
          treeContainer.add(label);
        }
      },
      (error) => {
        console.error(`Failed to load tree model ${modelName}:`, error);
        this.scene.remove(treeContainer);
      }
    );
    
    // Add to scene and tracking array
    this.scene.add(treeContainer);
    this.trees.push(treeContainer);
    
    return treeContainer;
  }
  
  // Generate trees for a given road segment
  generateTrees(bikePosition, startZ, endZ) {
    // Define the zones for tree placement
    const leftZoneStart = -this.roadWidth / 2 - this.roadBuffer;
    const leftZoneEnd = leftZoneStart - this.treeZoneWidth;
    
    const rightZoneStart = this.roadWidth / 2 + this.roadBuffer;
    const rightZoneEnd = rightZoneStart + this.treeZoneWidth;
    
    // Place trees only if they're not too far from the player
    const maxGenerationDistance = 800; // Increased to ensure trees are generated
    
    // Calculate distance to player
    const distanceToStart = Math.abs(bikePosition.z - startZ);
    const distanceToEnd = Math.abs(bikePosition.z - endZ);
    
    // Log for debugging
    if (this.debug) {
      console.log(`Tree generation bounds: ${startZ.toFixed(2)} to ${endZ.toFixed(2)}, bike at ${bikePosition.z.toFixed(2)}`);
      console.log(`Distance to segment: start=${distanceToStart.toFixed(2)}, end=${distanceToEnd.toFixed(2)}, max=${maxGenerationDistance}`);
    }
    
    if (distanceToStart > maxGenerationDistance || distanceToEnd > maxGenerationDistance) {
      if (this.debug) {
        console.log(`Skipping tree generation - too far from player (${Math.min(distanceToStart, distanceToEnd).toFixed(2)} > ${maxGenerationDistance})`);
      }
      return;
    }
    
    // Generate a zone key for this segment
    const segmentIndex = Math.floor(startZ / this.landLength);
    const zoneKey = `segment_${segmentIndex}`;
    
    // Check if this zone is already populated
    if (this.populatedZones.has(zoneKey)) {
      if (this.debug) {
        console.log(`Zone ${zoneKey} already populated with trees, skipping`);
      }
      return;
    }
    
    console.log(`Generating trees for zone ${zoneKey} from z=${startZ.toFixed(2)} to ${endZ.toFixed(2)}`);
    
    // Grid-based placement with randomization
    const zStep = this.treeSpacing;
    const xStep = this.treeSpacing;
    
    let treesPlaced = 0;
    
    // Left side trees
    for (let z = startZ; z < endZ; z += zStep) {
      const zOffset = (Math.random() - 0.5) * this.treeSpacing * 0.5;
      const currentZ = z + zOffset;
      
      // Place trees in rows on left side
      for (let row = 0; row < this.treeRows; row++) {
        const rowX = leftZoneStart - (row * xStep) - (Math.random() * xStep * 0.5);
        
        // Only place a tree with certain probability (density)
        if (Math.random() < this.treeDensity) {
          this.placeTree(rowX, currentZ);
          treesPlaced++;
        }
      }
      
      // Place trees in rows on right side
      for (let row = 0; row < this.treeRows; row++) {
        const rowX = rightZoneStart + (row * xStep) + (Math.random() * xStep * 0.5);
        
        // Only place a tree with certain probability (density)
        if (Math.random() < this.treeDensity) {
          this.placeTree(rowX, currentZ);
          treesPlaced++;
        }
      }
    }
    
    // Mark this zone as populated
    this.populatedZones.add(zoneKey);
    
    console.log(`Placed ${treesPlaced} trees in zone ${zoneKey}`);
  }
  
  // Update method called every frame
  update(bikePosition) {
    // Update land segments - check if we need to create new land ahead
    this.updateLandSegments(bikePosition);
    
    // Clean up trees and land that are too far behind the player
    this.cleanupDistantObjects(bikePosition.z);
  }
  
  // Update land segments - creates new segments as player moves forward
  updateLandSegments(bikePosition) {
    // First check if we need to create a new segment ahead
    if (this.landSegments.length === 0) {
      console.log("No land segments found, creating initial segments");
      this.createInitialLand();
      return;
    }
    
    // Sort land segments by z position (from smallest/most negative to largest)
    this.landSegments.sort((a, b) => a.zPosition - b.zPosition);
    
    // Get the frontmost segment (the one with the most negative z-position)
    const frontSegment = this.landSegments[0];
    
    // Calculate the trigger point - when bike passes this z-coordinate, create a new segment
    const triggerPoint = frontSegment.zPosition - this.landLength * 0.3; // Trigger earlier at 30% of length
    
    // Debug log segment positions if debug mode is on
    if (this.debug) {
      console.log(`Bike position: ${bikePosition.z.toFixed(2)}, Trigger: ${triggerPoint.toFixed(2)}, Front segment: ${frontSegment.zPosition.toFixed(2)}`);
    }
    
    // Check if player has moved past the trigger point (remember: negative Z is forward)
    if (bikePosition.z < triggerPoint) {
      // Create a new segment at the front (further in negative Z)
      const newPosition = frontSegment.zPosition - this.landLength;
      console.log(`Creating new land segment at z=${newPosition}, player at z=${bikePosition.z.toFixed(2)}, trigger=${triggerPoint.toFixed(2)}`);
      
      // Create the new segment
      this.createLandSegment(newPosition);
      
      // Remove the last segment if we have more than we need
      if (this.landSegments.length > this.totalLandSegments) {
        // Get the rearmost segment (after sorting, it's the last in the array)
        const lastSegment = this.landSegments.pop();
        if (lastSegment) {
          this.scene.remove(lastSegment.left);
          this.scene.remove(lastSegment.right);
          console.log(`Removing old land segment at z=${lastSegment.zPosition.toFixed(2)}`);
        }
      }
    }
  }
  
  // Remove objects that are too far behind the player
  cleanupDistantObjects(playerZ) {
    // Clean up trees that are too far BEHIND the player (larger Z values)
    // Remember: player moves along negative Z axis, so objects with Z > playerZ are behind the player
    const treesToRemove = [];
    
    for (let i = 0; i < this.trees.length; i++) {
      const tree = this.trees[i];
      // Trees are behind the player if their Z position is greater than player's Z + cleanup distance
      if (tree.position.z > playerZ + this.cleanupDistance) {
        treesToRemove.push(i);
      }
    }
    
    // Remove trees (in reverse order to avoid index issues)
    if (treesToRemove.length > 0) {
      for (let i = treesToRemove.length - 1; i >= 0; i--) {
        const index = treesToRemove[i];
        const tree = this.trees[index];
        this.scene.remove(tree);
        this.trees.splice(index, 1);
      }
      
      console.log(`Cleaned up ${treesToRemove.length} trees behind the player. Current count: ${this.trees.length}`);
    }
    
    // Clear populated zones that are too far behind the player
    // This allows regeneration if player moves back to these areas
    const zonesToRemove = [];
    for (const zoneKey of this.populatedZones) {
      // Extract Z index from zone key (format: "segment_X")
      if (zoneKey.startsWith('segment_')) {
        const segmentIndex = parseInt(zoneKey.split('_')[1]);
        const zoneZ = segmentIndex * this.landLength;
        
        // If zone is too far behind player, mark for removal
        if (zoneZ > playerZ + this.cleanupDistance * 2) {
          zonesToRemove.push(zoneKey);
        }
      }
    }
    
    // Remove old zones
    for (const zoneKey of zonesToRemove) {
      this.populatedZones.delete(zoneKey);
    }
    
    if (zonesToRemove.length > 0 && this.debug) {
      console.log(`Cleared ${zonesToRemove.length} old populated zones`);
    }
  }
  
  // Method to update a tree model configuration
  updateTreeConfig(modelName, config) {
    if (!this.treeConfigs[modelName]) {
      console.warn(`Tree model ${modelName} not found in configurations`);
      return false;
    }
    
    // Update the configuration
    this.treeConfigs[modelName] = {
      ...this.treeConfigs[modelName],
      ...config
    };
    
    console.log(`Updated configuration for ${modelName}:`, this.treeConfigs[modelName]);
    
    // Also update AssetManager settings
    if (typeof config.probability !== 'undefined' || typeof config.enabled !== 'undefined') {
      const event = new CustomEvent('treeModelConfigUpdate', {
        detail: {
          modelName,
          probability: config.probability !== undefined ? config.probability : this.treeConfigs[modelName].probability,
          enabled: config.enabled !== undefined ? config.enabled : this.treeConfigs[modelName].enabled
        }
      });
      document.dispatchEvent(event);
    }
    
    return true;
  }
  
  // Set debug mode
  setDebugMode(enabled) {
    this.debug = enabled;
    console.log(`Environment debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
} 