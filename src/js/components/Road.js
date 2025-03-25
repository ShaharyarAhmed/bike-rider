import * as THREE from 'three';

export class Road {
  constructor(sceneOrChunkLength, width) {
    // Check if first parameter is a scene
    if (sceneOrChunkLength && typeof sceneOrChunkLength.add === 'function') {
      // First parameter is a scene
      this.scene = sceneOrChunkLength;
      this.chunkLength = 100; // Match Environment's landLength
      this.width = 14;       // Match Environment's roadWidth
    } else {
      // First parameter is chunk length (old style)
      this.chunkLength = 100;
      this.width = 14; // Match Environment's roadWidth
    }
    
    this.chunks = [];
    this.totalChunks = 25; // Reduced from 40 for better performance while maintaining distance
    this.activeChunkIndex = 0;
    this.shoulderWidth = 1.5;
    this.object = new THREE.Group();
    
    // Lane properties
    this.lanes = [-4, 0, 4];
    this.laneWidth = 4;
    
    // Generation distances - optimized for performance
    this.maxGenerationDistance = 8000; // Reduced from 12000
    this.triggerDistance = 3.0; // Reduced from 4.0
    this.cleanupDistance = 800; // Reduced from 1000
    
    // Cache geometries and materials for reuse
    this.initGeometriesAndMaterials();
    
    // Track total road distance for game progress
    this.totalRoadDistance = 0;
    
    // Create initial chunks
    this.initChunks();
    
    // If a scene was provided, add this object to it
    if (this.scene) {
      this.scene.add(this.object);
    }
  }

  initGeometriesAndMaterials() {
    // Road geometries
    this.roadGeometry = new THREE.PlaneGeometry(this.width, this.chunkLength, 1, 1);
    this.shoulderGeometry = new THREE.PlaneGeometry(this.shoulderWidth, this.chunkLength, 1, 1);
    this.lineGeometry = new THREE.PlaneGeometry(0.2, 5); // Single dash geometry
    this.edgeLineGeometry = new THREE.PlaneGeometry(0.2, this.chunkLength, 1, 1);
    
    // Materials
    this.roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true
    });
    
    this.shoulderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x999999,
      flatShading: true
    });
    
    this.lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Street light geometries and materials
    this.poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 4); // Reduced segments
    this.fixtureGeometry = new THREE.BoxGeometry(0.6, 0.3, 1.5);
    
    this.poleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      flatShading: true
    });
    
    this.fixtureMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      flatShading: true
    });
  }
  
  initChunks() {
    // Create initial chunks
    for (let i = 0; i < this.totalChunks; i++) {
      const chunkPosition = -i * this.chunkLength;
      const chunk = this.createRoadChunk();
      chunk.position.z = chunkPosition;
      this.object.add(chunk);
      this.chunks.push({
        mesh: chunk,
        position: chunkPosition,
        index: i
      });
    }
  }
  
  createRoadChunk() {
    const chunkGroup = new THREE.Group();
    
    // Main road surface
    const roadMesh = new THREE.Mesh(this.roadGeometry, this.roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.z = -this.chunkLength / 2;
    roadMesh.receiveShadow = true;
    chunkGroup.add(roadMesh);
    
    // Add lane lines with optimized geometry
    this.addLaneLines(chunkGroup);
    
    // Left shoulder
    const leftShoulder = new THREE.Mesh(this.shoulderGeometry, this.shoulderMaterial);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.x = -(this.width / 2 + this.shoulderWidth / 2);
    leftShoulder.position.z = -this.chunkLength / 2;
    leftShoulder.receiveShadow = true;
    chunkGroup.add(leftShoulder);
    
    // Right shoulder
    const rightShoulder = new THREE.Mesh(this.shoulderGeometry, this.shoulderMaterial);
    rightShoulder.rotation.x = -Math.PI / 2;
    rightShoulder.position.x = (this.width / 2 + this.shoulderWidth / 2);
    rightShoulder.position.z = -this.chunkLength / 2;
    rightShoulder.receiveShadow = true;
    chunkGroup.add(rightShoulder);
    
    // Add street lights with reduced frequency
    this.addStreetLights(chunkGroup);
    
    return chunkGroup;
  }
  
  addLaneLines(chunkGroup) {
    // Optimized line properties
    const dashLength = 5;
    const gapLength = 15; // Increased gap for fewer dashes
    const combinedLength = dashLength + gapLength;
    const dashesPerChunk = Math.floor(this.chunkLength / combinedLength) / 3; // Reduced by 2/3
    
    // Create lane divider lines (dashed) with fewer segments
    for (let divider = 0; divider < 2; divider++) {
      const xPos = this.lanes[divider] + this.laneWidth / 2;
      
      for (let i = 0; i < dashesPerChunk; i++) {
        const startZ = -i * combinedLength * 3; // Triple the spacing
        const dash = new THREE.Mesh(this.lineGeometry, this.lineMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(xPos, 0.01, startZ - dashLength/2);
        chunkGroup.add(dash);
      }
    }
    
    // Edge lines
    const leftEdgeLine = new THREE.Mesh(this.edgeLineGeometry, this.lineMaterial);
    leftEdgeLine.rotation.x = -Math.PI / 2;
    leftEdgeLine.position.set(-this.width/2, 0.01, -this.chunkLength/2);
    chunkGroup.add(leftEdgeLine);
    
    const rightEdgeLine = new THREE.Mesh(this.edgeLineGeometry, this.lineMaterial);
    rightEdgeLine.rotation.x = -Math.PI / 2;
    rightEdgeLine.position.set(this.width/2, 0.01, -this.chunkLength/2);
    chunkGroup.add(rightEdgeLine);
  }
  
  addStreetLights(chunkGroup) {
    // Increased spacing and reduced lights
    const spacing = 160; // Doubled from 80 to 160
    const poleCount = Math.floor(this.chunkLength / spacing);
    const poleXPosition = this.width / 2 + this.shoulderWidth + 0.5;
    
    // Add poles along the road (fewer poles, only one side per chunk alternating)
    const isLeftSideChunk = Math.random() < 0.5;
    
    for (let i = 0; i < poleCount; i++) {
      const poleZ = -i * spacing - spacing / 2;
      const xPos = isLeftSideChunk ? -poleXPosition : poleXPosition;
      const fixtureOffset = isLeftSideChunk ? 1 : -1;
      
      // Create pole
      const pole = new THREE.Mesh(this.poleGeometry, this.poleMaterial);
      pole.position.set(xPos, 3, poleZ);
      pole.castShadow = true;
      chunkGroup.add(pole);
      
      // Light fixture
      const fixture = new THREE.Mesh(this.fixtureGeometry, this.fixtureMaterial);
      fixture.position.set(xPos + fixtureOffset, 5.8, poleZ);
      fixture.castShadow = true;
      chunkGroup.add(fixture);
      
      // Only add lights to every other pole for performance
      if (i % 2 === 0) {
        const light = new THREE.PointLight(0xffffcc, 1.0, 60);
        light.position.set(xPos + fixtureOffset, 5.5, poleZ);
        chunkGroup.add(light);
      }
    }
  }
  
  update(bikePosition) {
    // Sort chunks by z position (from smallest/most negative to largest)
    this.chunks.sort((a, b) => a.position - b.position);
    
    // Get the frontmost chunk
    const frontChunk = this.chunks[0];
    
    // Calculate the trigger point - when bike passes this z-coordinate, create new chunks
    const triggerPoint = frontChunk.position - this.chunkLength * this.triggerDistance;
    
    // Check if we need to generate new chunks
    if (bikePosition.z < triggerPoint || this.chunks.length < this.totalChunks) {
      // Create multiple chunks ahead if needed - match Environment's aggressive creation
      const chunksToCreate = Math.min(5, Math.max(3, this.totalChunks - this.chunks.length));
      
      for (let i = 0; i < chunksToCreate; i++) {
        // Create a new chunk at the front
        const newPosition = frontChunk.position - (this.chunkLength * (i + 1));
        const newChunk = this.createRoadChunk();
        newChunk.position.z = newPosition;
        this.object.add(newChunk);
        
        // Add to tracking array at the beginning
        this.chunks.unshift({
          mesh: newChunk,
          position: newPosition,
          index: 0
        });
        
        // Track road progress
        this.totalRoadDistance += this.chunkLength;
        
        // Log creation
        console.log(`Created new road chunk at z=${newPosition}, player at z=${bikePosition.z.toFixed(1)}`);
      }
      
      // Remove excess chunks from the back, but keep a buffer
      while (this.chunks.length > this.totalChunks + 2) {
        const lastChunk = this.chunks.pop();
        if (lastChunk) {
          this.object.remove(lastChunk.mesh);
          console.log(`Removed road chunk at z=${lastChunk.position}`);
        }
      }
      
      // Update indices after changes
      this.chunks.forEach((chunk, index) => {
        chunk.index = index;
      });
      
      // Keep the active chunk index at 0
      this.activeChunkIndex = 0;
      
      // Only log every 1000 units for performance
      if (this.totalRoadDistance % 1000 < this.chunkLength) {
        console.log(`Road progress: ${this.totalRoadDistance} units`);
      }
    }
  }
  
  // Helper method to get the lane X position
  getLaneXPosition(laneIndex) {
    if (laneIndex >= 0 && laneIndex < this.lanes.length) {
      return this.lanes[laneIndex];
    }
    
    // Default to center lane if invalid index
    return 0;
  }
  
  // Return the total number of lanes
  getLaneCount() {
    return this.lanes.length;
  }
  
  // Get the current active chunk's position
  getActiveChunkPosition() {
    if (this.chunks.length > 0 && this.activeChunkIndex < this.chunks.length) {
      return this.chunks[this.activeChunkIndex].position;
    }
    return 0;
  }
} 