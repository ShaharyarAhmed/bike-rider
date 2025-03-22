import * as THREE from 'three';

export class Road {
  constructor(sceneOrChunkLength, width) {
    // Check if first parameter is a scene
    if (sceneOrChunkLength && typeof sceneOrChunkLength.add === 'function') {
      // First parameter is a scene
      this.scene = sceneOrChunkLength;
      this.chunkLength = 100; // Default chunk length
      this.width = 10;       // Default width
    } else {
      // First parameter is chunk length (old style)
      this.chunkLength = sceneOrChunkLength || 100;
      this.width = width || 10;
    }
    
    this.chunks = [];
    this.totalChunks = 3; // Keep 3 chunks at a time
    this.activeChunkIndex = 0;
    this.shoulderWidth = 1;
    this.object = new THREE.Group();
    
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
    
    // Create the main road surface
    const roadGeometry = new THREE.PlaneGeometry(this.width, this.chunkLength);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray for asphalt
      roughness: 0.8,
      metalness: 0.2
    });
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    roadMesh.position.z = -this.chunkLength / 2; // Center the chunk
    roadMesh.receiveShadow = true;
    chunkGroup.add(roadMesh);
    
    // Add road markings (center line)
    const lineWidth = 0.2;
    const lineGeometry = new THREE.PlaneGeometry(lineWidth, this.chunkLength);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.01; // Slightly above road to prevent z-fighting
    centerLine.position.z = -this.chunkLength / 2; // Center the line
    chunkGroup.add(centerLine);
    
    // Add side shoulders
    const shoulderGeometry = new THREE.PlaneGeometry(this.shoulderWidth, this.chunkLength);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    
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
    
    // Add street light poles
    this.addStreetLights(chunkGroup);
    
    return chunkGroup;
  }
  
  addStreetLights(chunkGroup) {
    // Light pole spacing
    const spacing = 20; // Distance between poles
    const poleCount = Math.floor(this.chunkLength / spacing);
    const poleXPosition = this.width / 2 + this.shoulderWidth + 0.5; // Place just outside the shoulder
    
    // Create pole geometry and materials
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    // Create light fixture geometry
    const fixtureGeometry = new THREE.BoxGeometry(0.6, 0.3, 1.5);
    const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // Add poles along the road
    for (let i = 0; i < poleCount; i++) {
      const poleZ = -i * spacing - spacing / 2;
      
      // Left side pole
      const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
      leftPole.position.set(-poleXPosition, 3, poleZ);
      leftPole.castShadow = true;
      chunkGroup.add(leftPole);
      
      // Left light fixture
      const leftFixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      leftFixture.position.set(-poleXPosition + 1, 5.8, poleZ);
      leftFixture.castShadow = true;
      chunkGroup.add(leftFixture);
      
      // Left light point
      const leftLight = new THREE.PointLight(0xffffcc, 0.5, 20);
      leftLight.position.set(-poleXPosition + 1, 5.5, poleZ);
      chunkGroup.add(leftLight);
      
      // Right side pole
      const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
      rightPole.position.set(poleXPosition, 3, poleZ);
      rightPole.castShadow = true;
      chunkGroup.add(rightPole);
      
      // Right light fixture
      const rightFixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      rightFixture.position.set(poleXPosition - 1, 5.8, poleZ);
      rightFixture.castShadow = true;
      chunkGroup.add(rightFixture);
      
      // Right light point
      const rightLight = new THREE.PointLight(0xffffcc, 0.5, 20);
      rightLight.position.set(poleXPosition - 1, 5.5, poleZ);
      chunkGroup.add(rightLight);
    }
  }
  
  update(bikePosition) {
    // Check if we need to generate a new chunk
    // If bike has passed the middle of the current active chunk
    const activeTriggerPoint = this.chunks[this.activeChunkIndex].position - this.chunkLength / 2;
    
    if (bikePosition.z < activeTriggerPoint) {
      // Recycle the last chunk and move it to the front
      const lastChunk = this.chunks.pop();
      const newPosition = this.chunks[0].position - this.chunkLength;
      
      lastChunk.mesh.position.z = newPosition;
      lastChunk.position = newPosition;
      
      // Add the recycled chunk to the beginning of the array
      this.chunks.unshift(lastChunk);
      
      // Keep the active chunk index at 0
      this.activeChunkIndex = 0;
    }
  }
} 