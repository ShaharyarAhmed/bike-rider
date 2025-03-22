import * as THREE from 'three';

export class Road {
  constructor(length = 200, width = 10) {
    this.length = length;
    this.width = width;
    this.object = this.createRoad();
  }
  
  createRoad() {
    // Create a road group to hold all road elements
    const roadGroup = new THREE.Group();
    
    // Create the main road surface
    const roadGeometry = new THREE.PlaneGeometry(this.width, this.length);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray for asphalt
      roughness: 0.8,
      metalness: 0.2
    });
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    roadMesh.receiveShadow = true;
    roadGroup.add(roadMesh);
    
    // Add road markings (center line)
    const lineWidth = 0.2;
    const lineGeometry = new THREE.PlaneGeometry(lineWidth, this.length);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.01; // Slightly above road to prevent z-fighting
    roadGroup.add(centerLine);
    
    // Add side shoulders
    const shoulderWidth = 1;
    const shoulderGeometry = new THREE.PlaneGeometry(shoulderWidth, this.length);
    const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    
    // Left shoulder
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.x = -(this.width / 2 + shoulderWidth / 2);
    leftShoulder.receiveShadow = true;
    roadGroup.add(leftShoulder);
    
    // Right shoulder
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.rotation.x = -Math.PI / 2;
    rightShoulder.position.x = (this.width / 2 + shoulderWidth / 2);
    rightShoulder.receiveShadow = true;
    roadGroup.add(rightShoulder);
    
    return roadGroup;
  }
} 