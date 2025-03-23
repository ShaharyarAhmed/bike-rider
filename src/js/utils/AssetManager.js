import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Singleton class to manage all game assets
export class AssetManager {
  static instance = null;
  
  constructor() {
    if (AssetManager.instance) {
      return AssetManager.instance;
    }
    
    AssetManager.instance = this;
    
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.audioLoader = new THREE.AudioLoader();
    
    this.models = {};
    this.textures = {};
    this.audio = {};
    this.debugMode = false;
    
    // Initialize loadingStatus object to track model loading
    this.loadingStatus = {};
    
    // Vehicle model configuration for probability-based loading
    this.vehicleModels = {
      // 'truck2.glb': { probability: 0.3, enabled: true },
      // 'truck1.glb': { probability: 0.7, enabled: true },
      // 'bus1.glb': { probability: 0.1, enabled: true },
      'bus2.glb': { probability: 0.1, enabled: true },
      // 'car2_blue.glb': { probability: 0.2, enabled: true },
      // 'car1_grey.glb': { probability: 0.2, enabled: true },
      // 'car4_white.glb': { probability: 0.2, enabled: true },
      // 'car3_red.glb': { probability: 0.2, enabled: true },
      // 'police_car1.glb': { probability: 0.1, enabled: true }
    };
    
    // Listen for model config updates from Traffic
    document.addEventListener('vehicleModelConfigUpdate', (event) => {
      this.updateModelProbability(
        event.detail.modelName, 
        event.detail.probability, 
        event.detail.enabled
      );
    });
    
    console.log('AssetManager initialized');
  }
  
  // Get singleton instance
  static getInstance() {
    if (!AssetManager.instance) {
      new AssetManager();
    }
    return AssetManager.instance;
  }
  
  // Set debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`AssetManager debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Get a list of enabled vehicle models for a specific type
  getEnabledModels(type) {
    const truckModels = ['truck1.glb', 'truck2.glb'];
    const carModels = [
      'car1_grey.glb', 
      'car2_blue.glb', 
      'car3_red.glb',
      'car4_white.glb',
      'police_car1.glb', 
      'bus1.glb',
      'bus2.glb'
    ];
    
    const modelList = type === 'truck' ? truckModels : carModels;
    
    return modelList.filter(model => 
      this.vehicleModels[model] && 
      this.vehicleModels[model].enabled && 
      this.vehicleModels[model].probability > 0
    );
  }
  
  // Method to update model probability configuration
  updateModelProbability(modelName, probability, enabled = true) {
    if (this.vehicleModels[modelName]) {
      this.vehicleModels[modelName].probability = Math.max(0, Math.min(1, probability));
      this.vehicleModels[modelName].enabled = enabled;
      
      if (this.debugMode) {
        console.log(`AssetManager: Updated ${modelName} - probability: ${probability}, enabled: ${enabled}`);
      }
      return true;
    }
    return false;
  }
  
  // Method to get model probability settings
  getModelProbability(modelName) {
    if (this.vehicleModels[modelName]) {
      return {
        probability: this.vehicleModels[modelName].probability,
        enabled: this.vehicleModels[modelName].enabled
      };
    }
    return { probability: 0, enabled: false };
  }
  
  // Load a model with multiple path attempts and caching
  loadModel(modelName, onLoaded, onError) {
    if (this.debugMode) {
      console.log(`AssetManager: Loading model ${modelName}`);
    }
    
    // If model is already in cache, use it
    if (this.models[modelName]) {
      if (this.debugMode) {
        console.log(`AssetManager: Using cached model ${modelName}`);
      }
      setTimeout(() => {
        onLoaded(this.models[modelName].clone());
      }, 0);
      return;
    }
    
    // If model is already loading, add to callbacks
    if (this.loadingStatus[modelName]) {
      if (this.debugMode) {
        console.log(`AssetManager: Model ${modelName} already loading, adding to callbacks`);
      }
      this.loadingStatus[modelName].callbacks.push({onLoaded, onError});
      return;
    }
    
    // Start loading the model
    this.loadingStatus[modelName] = {
      loading: true,
      callbacks: [{onLoaded, onError}]
    };
    
    // Try different path formats to ensure file is found
    const possiblePaths = [
      `/assets/models/${modelName}`,    // Most likely path format
      `assets/models/${modelName}`,     // Alternative path format
      `models/${modelName}`,            // From public/assets folder
      `/models/${modelName}`,           // From server root
      `./models/${modelName}`,          // Relative current
      `../models/${modelName}`,         // Up one level
      `src/models/${modelName}`,        // From project root
      `/src/models/${modelName}`,       // Absolute from server root
      `./src/models/${modelName}`       // Relative from current
    ];
    
    // Set a loading timeout
    const timeoutId = setTimeout(() => {
      this.handleModelError(modelName, new Error('Loading timeout'));
    }, 10000); // 10 seconds timeout
    
    // Try loading with the first path
    if (this.debugMode) {
      console.log(`AssetManager: Attempting model load from paths:`, possiblePaths);
    }
    this.tryLoadModelPath(modelName, possiblePaths, 0, timeoutId);
  }
  
  // Try loading with a path, and fall back to other paths if it fails
  tryLoadModelPath(modelName, paths, pathIndex, timeoutId) {
    const currentPath = paths[pathIndex];
    
    if (this.debugMode) {
      console.log(`AssetManager: Trying path ${pathIndex + 1}/${paths.length}: ${currentPath}`);
    }
    
    this.gltfLoader.load(
      currentPath,
      (gltf) => {
        // Success callback
        clearTimeout(timeoutId);
        
        // Check if the scene has any children
        if (!gltf.scene || gltf.scene.children.length === 0) {
          if (this.debugMode) {
            console.warn(`AssetManager: Model ${modelName} loaded but has no children!`);
          }
          this.tryNextPath(modelName, paths, pathIndex, timeoutId);
          return;
        }
        
        if (this.debugMode) {
          console.log(`AssetManager: Model ${modelName} loaded successfully from: ${currentPath}`);
          console.log(`Children count: ${gltf.scene.children.length}`);
        }
        
        // Store in cache
        this.models[modelName] = gltf.scene.clone();
        
        // Notify all callbacks
        this.handleModelSuccess(modelName, gltf.scene);
      },
      (xhr) => {
        // Progress callback
        if (xhr.total > 0 && this.debugMode) {
          const percentage = xhr.loaded / xhr.total * 100;
          console.log(`AssetManager: Loading ${modelName}: ${percentage.toFixed(2)}%`);
        }
      },
      (error) => {
        // Error callback - try the next path
        if (this.debugMode) {
          console.warn(`AssetManager: Error loading from ${currentPath}:`, error.message);
        }
        this.tryNextPath(modelName, paths, pathIndex, timeoutId);
      }
    );
  }
  
  // Try the next path or fail if all paths have been tried
  tryNextPath(modelName, paths, pathIndex, timeoutId) {
    const nextPathIndex = pathIndex + 1;
    if (nextPathIndex < paths.length) {
      this.tryLoadModelPath(modelName, paths, nextPathIndex, timeoutId);
    } else {
      clearTimeout(timeoutId);
      if (this.debugMode) {
        console.error(`AssetManager: All paths failed for model ${modelName}`);
      }
      this.handleModelError(modelName, new Error('All paths failed'));
    }
  }
  
  // Handle successful model load
  handleModelSuccess(modelName, model) {
    if (!this.loadingStatus || !this.loadingStatus[modelName]) {
      console.warn(`No loading status for model ${modelName}`);
      return;
    }
    
    const callbacks = this.loadingStatus[modelName].callbacks || [];
    delete this.loadingStatus[modelName];
    
    callbacks.forEach(callback => {
      try {
        if (callback && typeof callback.onLoaded === 'function') {
          callback.onLoaded(model.clone());
        }
      } catch (err) {
        console.error(`AssetManager: Error in onLoaded callback for ${modelName}:`, err);
      }
    });
  }
  
  // Handle model loading error
  handleModelError(modelName, error) {
    if (!this.loadingStatus || !this.loadingStatus[modelName]) {
      console.warn(`No loading status for model ${modelName}`);
      return;
    }
    
    const callbacks = this.loadingStatus[modelName].callbacks || [];
    delete this.loadingStatus[modelName];
    
    // Log the error with more details to help debugging
    console.error(`AssetManager: Failed to load model ${modelName}:`, error.message);
    
    // Call all error callbacks
    callbacks.forEach(callback => {
      try {
        if (callback && typeof callback.onError === 'function') {
          callback.onError(error);
        }
      } catch (err) {
        console.error(`AssetManager: Error in onError callback for ${modelName}:`, err);
      }
    });
  }
  
  // Test if files exist at various paths - helpful for debugging
  testFilePaths(testFiles) {
    console.log("------- ASSET MANAGER PATH TESTING -------");
    
    // Default to testing truck model if no files provided
    if (!testFiles || testFiles.length === 0) {
      testFiles = [
        "truck1.glb", 
        "truck2.glb",
        "car1_grey.glb", 
        "car2_blue.glb", 
        "car3_red.glb",
        "car4_white.glb",
        "police_car1.glb", 
        "bus1.glb"
      ];
    }
    
    // Generate test paths for each file
    const allTestPaths = [];
    testFiles.forEach(file => {
      const paths = [
        `/assets/models/${file}`,
        `assets/models/${file}`,
        `models/${file}`,
        `/models/${file}`,
        `./models/${file}`,
        `../models/${file}`,
        `src/models/${file}`,
        `/src/models/${file}`,
        `./src/models/${file}`
      ];
      allTestPaths.push(...paths);
    });
    
    // Test each path
    const results = {
      successful: [],
      failed: []
    };
    
    let completedTests = 0;
    
    allTestPaths.forEach(path => {
      console.log(`Testing path: ${path}`);
      
      // Try with fetch to check if file exists
      fetch(path)
        .then(response => {
          completedTests++;
          if (response.ok) {
            console.log(`✅ PATH FOUND: ${path}`);
            results.successful.push(path);
          } else {
            console.log(`❌ Path not found (${response.status}): ${path}`);
            results.failed.push({path, status: response.status});
          }
          this.checkTestCompletion(completedTests, allTestPaths.length, results);
        })
        .catch(error => {
          completedTests++;
          console.log(`❌ Error accessing path: ${path}`, error);
          results.failed.push({path, error: error.message});
          this.checkTestCompletion(completedTests, allTestPaths.length, results);
        });
    });
  }
  
  // Check if all tests are complete and show summary
  checkTestCompletion(completed, total, results) {
    if (completed === total) {
      console.log("------- PATH TEST RESULTS -------");
      console.log(`Total paths tested: ${total}`);
      console.log(`Successful paths: ${results.successful.length}`);
      console.log(`Failed paths: ${results.failed.length}`);
      
      if (results.successful.length > 0) {
        console.log("SUCCESSFUL PATHS:");
        results.successful.forEach(path => console.log(`- ${path}`));
      }
      
      console.log("------- END PATH TESTING -------");
      
      // Return the first successful path as the recommended path
      if (results.successful.length > 0) {
        console.log(`RECOMMENDED PATH FORMAT: ${this.extractPathFormat(results.successful[0])}`);
      } else {
        console.log("NO SUCCESSFUL PATHS FOUND!");
      }
    }
  }
  
  // Extract the path format from a successful path
  extractPathFormat(path) {
    // Remove the filename to get the path format
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      return path.substring(0, lastSlashIndex + 1) + "{filename}";
    }
    return path;
  }
} 