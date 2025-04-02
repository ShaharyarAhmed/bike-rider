import * as THREE from 'three';

export class Portal extends THREE.Object3D {
  constructor() {
    super();
    
    // Portal properties
    this.size = { width: 3, height: 4 };
    this.lanes = [-4, 0, 4]; // Match road lanes
    this.currentLane = 0;
    this.distanceInterval = 350; // Changed from 1000 to 350 meters
    this.lastSpawnDistance = -1; // Initialize to -1 to ensure first spawn
    this.portalKilometer = 0; // Track which kilometer portal is at
    
    // Create portal mesh
    this.createPortal();
  }
  
  createPortal() {
    // Create a ring geometry for the portal
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.2, 20, 40); // Increased segments for smoother look
    
    // Create glowing material
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3, // Increased intensity
      metalness: 0.9,
      roughness: 0.1
    });
    
    // Create the portal ring
    this.ring = new THREE.Mesh(ringGeometry, portalMaterial);
    this.ring.rotation.z = Math.PI / 2; // Make it vertical facing the road
    this.add(this.ring);
    
    // Add inner portal effect (circular plane)
    const portalDiskGeometry = new THREE.CircleGeometry(1.4, 32);
    const portalDiskMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.portalDisk = new THREE.Mesh(portalDiskGeometry, portalDiskMaterial);
    this.portalDisk.rotation.z = Math.PI / 2; // Make it face the same direction as the ring
    this.add(this.portalDisk);
    
    // Add glow effect using sprite
    const glowTexture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkFFRkZEMUI1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkFFRkZEMUM1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGQUVGRkQxOTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGQUVGRkQxQTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjjUmssAAAA/SURBVHjaYvz//z8DFPyH0wxQzIQmAeKDaJgYXAKbBrBCZAmwQmQJuEJkCRaYQmQJNpgEsjiKBEwzigRAgAEAoaUP5DXfx+UAAAAASUVORK5CYII=');
    const spriteMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.glow = new THREE.Sprite(spriteMaterial);
    this.glow.scale.set(8, 8, 1); // Increased glow size
    this.add(this.glow);
    
    // Add particle system for sparkles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 200; // Increased particle count
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.8; // Increased radius variation
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8; // Increased depth
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.15, // Larger particles
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.add(this.particles);
  }
  
  update(deltaTime, totalDistance) {
    // Keep the portal ring static (removed ring rotation)
    
    // Rotate particles
    this.particles.rotation.z -= deltaTime * 0.5;
    
    // Pulse the glow and disk
    const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
    this.glow.scale.set(8 * pulseScale, 8 * pulseScale, 1);
    
    // Change portal disk color over time
    const hue = (Date.now() % 6000) / 6000;
    const portalColor = new THREE.Color().setHSL(hue, 1, 0.5);
    this.portalDisk.material.color.lerp(portalColor, deltaTime * 2);
    
    // Calculate current kilometer
    const currentKilometer = Math.floor(totalDistance / this.distanceInterval);
    
    // If we've passed the current portal's kilometer, spawn a new one
    if (currentKilometer > this.portalKilometer || this.lastSpawnDistance === -1) {
      this.spawnAtNewLocation(totalDistance);
      console.log(`Spawning new portal at kilometer ${this.portalKilometer + 1}, bike at: ${totalDistance}`);
    }
  }
  
  spawnAtNewLocation(totalDistance) {
    // Pick a random lane
    const randomLaneIndex = Math.floor(Math.random() * this.lanes.length);
    this.currentLane = this.lanes[randomLaneIndex];
    
    // Calculate the current kilometer and the next kilometer milestone
    const currentKilometer = Math.floor(totalDistance / this.distanceInterval);
    this.portalKilometer = currentKilometer + 1; // Next kilometer marker
    
    // Set position - spawn at next kilometer mark, 100 units ahead
    this.position.set(
      this.currentLane,
      2, // Height above ground
      -(this.portalKilometer * this.distanceInterval + 100) // Spawn at next kilometer mark + 100 units
    );
    
    this.lastSpawnDistance = totalDistance;
    console.log(`Portal spawned at distance: ${this.position.z}, next kilometer: ${this.portalKilometer * this.distanceInterval}, bike at: ${totalDistance}`);
  }
  
  checkCollision(bikePosition) {
    const distanceThreshold = 1.4; // Match the portal radius
    const heightThreshold = 3;
    
    // Check if bike is inside the portal
    const isInPortal = (
      Math.abs(bikePosition.x - this.position.x) < distanceThreshold &&
      Math.abs(bikePosition.y - this.position.y) < heightThreshold &&
      Math.abs(bikePosition.z - this.position.z) < distanceThreshold
    );
    
    // If bike enters portal, create a visual effect before redirecting
    if (isInPortal && !this.enteringPortal) {
      this.enteringPortal = true;
      this.enterPortalTime = Date.now();
      
      // Create a flash effect
      const flashGeometry = new THREE.SphereGeometry(5, 32, 32);
      const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      this.flash = new THREE.Mesh(flashGeometry, flashMaterial);
      this.add(this.flash);
      
      // Play sound if available
      if (typeof Audio !== 'undefined') {
        this.portalSound = new Audio();
        this.portalSound.src = 'data:audio/wav;base64,UklGRiSAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSAAAAAAAAAAA'; // Base64 encoded empty sound
        this.portalSound.play().catch(e => console.log('Sound play failed:', e));
      }
      
      // Schedule redirect after effect (750ms)
      setTimeout(() => {
        window.location.href = 'https://portal.pieter.com?ref=shaharyarahmed.github.io/bike-rider';
      }, 750);
    }
    
    // Flash effect animation
    if (this.enteringPortal && this.flash) {
      const elapsedTime = (Date.now() - this.enterPortalTime) / 750; // 0 to 1 over 750ms
      
      // Expand flash and fade out
      this.flash.scale.set(1 + elapsedTime * 3, 1 + elapsedTime * 3, 1 + elapsedTime * 3);
      this.flash.material.opacity = 0.8 * (1 - elapsedTime);
      
      // Increase portal effects during transition
      this.ring.material.emissiveIntensity = 3 + elapsedTime * 5;
      this.glow.scale.set(8 * (1 + elapsedTime), 8 * (1 + elapsedTime), 1);
    }
    
    return isInPortal;
  }
} 