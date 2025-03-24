import * as THREE from 'three';

export class Road {
  constructor(sceneOrChunkLength, width) {
    // Check if first parameter is a scene
    if (sceneOrChunkLength && typeof sceneOrChunkLength.add === 'function') {
      // First parameter is a scene
      this.scene = sceneOrChunkLength;
      this.chunkLength = 100; // Default chunk length
      this.width = 14;       // Increased from 10 to 14 for wider three-lane road
    } else {
      // First parameter is chunk length (old style)
      this.chunkLength = 100;
      this.width = 14; // Increased default width
    }
    
    this.chunks = [];
    this.totalChunks = 3; // Reduced back to 3 chunks for better performance
    this.activeChunkIndex = 0;
    this.shoulderWidth = 1.5; // Increased shoulder width
    this.object = new THREE.Group();
    
    // Lane properties
    this.lanes = [-4, 0, 4]; // Lane center positions
    this.laneWidth = 4; // Width of each lane
    
    // Track total road distance for game progress
    this.totalRoadDistance = 0;
    
    // Create initial chunks
    this.initChunks();
    
    // If a scene was provided, add this object to it
    if (this.scene) {
      this.scene.add(this.object);
    }
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
    // Create a road chunk group
    const chunkGroup = new THREE.Group();
    
    // Create the main road surface with lower segment count for better performance
    const roadGeometry = new THREE.PlaneGeometry(this.width, this.chunkLength, 1, 4);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray for asphalt
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true // Use flat shading for better performance
    });
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    roadMesh.position.z = -this.chunkLength / 2; // Center the chunk
    roadMesh.receiveShadow = true;
    chunkGroup.add(roadMesh);
    
    // Add lane lines with simplified geometry
    this.addLaneLines(chunkGroup);
    
    // Add side shoulders with simplified geometry
    const shoulderGeometry = new THREE.PlaneGeometry(this.shoulderWidth, this.chunkLength, 1, 1);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x999999,
      flatShading: true
    });
    
    // Left shoulder
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.x = -(this.width / 2 + this.shoulderWidth / 2);
    leftShoulder.position.z = -this.chunkLength / 2;
    leftShoulder.receiveShadow = true;
    chunkGroup.add(leftShoulder);
    
    // Right shoulder
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.rotation.x = -Math.PI / 2;
    rightShoulder.position.x = (this.width / 2 + this.shoulderWidth / 2);
    rightShoulder.position.z = -this.chunkLength / 2;
    rightShoulder.receiveShadow = true;
    chunkGroup.add(rightShoulder);
    
    // Add street light poles with reduced count
    this.addStreetLights(chunkGroup);
    
    return chunkGroup;
  }
  
  addLaneLines(chunkGroup) {
    // Line properties - reduce the number of dashes for better performance
    const lineWidth = 0.2;
    const dashLength = 5; // Increased from 3
    const gapLength = 5;  // Increased from 2
    const combinedLength = dashLength + gapLength;
    const dashesPerChunk = Math.floor(this.chunkLength / combinedLength) / 2; // Reduced by half
    
    // Line material
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Create lane divider lines (dashed) with fewer segments
    for (let divider = 0; divider < 2; divider++) {
      const xPos = this.lanes[divider] + this.laneWidth / 2; // Position between lanes
      
      // Create dashed line segments with wider spacing
      for (let i = 0; i < dashesPerChunk; i++) {
        const startZ = -i * combinedLength * 2; // Double the spacing
        const dashGeometry = new THREE.PlaneGeometry(lineWidth, dashLength);
        const dash = new THREE.Mesh(dashGeometry, lineMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(xPos, 0.01, startZ - dashLength/2);
        chunkGroup.add(dash);
      }
    }
    
    // Add solid edge lines
    const edgeLineGeometry = new THREE.PlaneGeometry(lineWidth, this.chunkLength, 1, 1);
    
    // Left edge line
    const leftEdgeLine = new THREE.Mesh(edgeLineGeometry, lineMaterial);
    leftEdgeLine.rotation.x = -Math.PI / 2;
    leftEdgeLine.position.set(-this.width/2, 0.01, -this.chunkLength/2);
    chunkGroup.add(leftEdgeLine);
    
    // Right edge line
    const rightEdgeLine = new THREE.Mesh(edgeLineGeometry, lineMaterial);
    rightEdgeLine.rotation.x = -Math.PI / 2;
    rightEdgeLine.position.set(this.width/2, 0.01, -this.chunkLength/2);
    chunkGroup.add(rightEdgeLine);
  }
  
  addStreetLights(chunkGroup) {
    // Light pole spacing - further increased for better performance
    const spacing = 80; // Doubled again from 40 to 80
    const poleCount = Math.floor(this.chunkLength / spacing);
    const poleXPosition = this.width / 2 + this.shoulderWidth + 0.5; // Place just outside the shoulder
    
    // Create pole geometry with fewer segments
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 6); // Reduced from 8 segments
    const poleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      flatShading: true
    });
    
    // Create light fixture geometry with fewer segments
    const fixtureGeometry = new THREE.BoxGeometry(0.6, 0.3, 1.5);
    const fixtureMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      flatShading: true
    });
    
    // Add poles along the road (fewer poles, only one side)
    for (let i = 0; i < poleCount; i++) {
      const poleZ = -i * spacing - spacing / 2;
      
      // Alternate poles between left and right sides
      const isLeftSide = i % 2 === 0;
      const xPos = isLeftSide ? -poleXPosition : poleXPosition;
      const fixtureOffset = isLeftSide ? 1 : -1;
      
      // Create pole
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(xPos, 3, poleZ);
      pole.castShadow = true;
      chunkGroup.add(pole);
      
      // Light fixture
      const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      fixture.position.set(xPos + fixtureOffset, 5.8, poleZ);
      fixture.castShadow = true;
      chunkGroup.add(fixture);
      
      // Light point with increased range but fewer lights overall
      const light = new THREE.PointLight(0xffffcc, 0.7, 40);
      light.position.set(xPos + fixtureOffset, 5.5, poleZ);
      chunkGroup.add(light);
    }
  }
  
  update(bikePosition) {
    // Check if we need to generate a new chunk
    // If bike has passed the middle of the current active chunk
    const activeTriggerPoint = this.chunks[this.activeChunkIndex].position - this.chunkLength / 50;
    
    if (bikePosition.z < activeTriggerPoint) {
      // Track road progress
      this.totalRoadDistance += this.chunkLength;
      
      // Recycle the last chunk and move it to the front
      const lastChunk = this.chunks.pop();
      const newPosition = this.chunks[0].position - this.chunkLength;
      
      lastChunk.mesh.position.z = newPosition;
      lastChunk.position = newPosition;
      
      // Add the recycled chunk to the beginning of the array
      this.chunks.unshift(lastChunk);
      
      // Keep the active chunk index at 0
      this.activeChunkIndex = 0;
      
      // Only log every 500 units for performance
      if (this.totalRoadDistance % 500 < this.chunkLength) {
        console.log(`Road progress: ${this.totalRoadDistance} units`);
      }
    }
    
    // Simplified rendering optimization - no need to check visibility each frame
    // for such a small number of chunks
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