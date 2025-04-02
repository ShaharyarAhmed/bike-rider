import * as THREE from 'three';

export class Portal extends THREE.Object3D {
  constructor() {
    super();
    
    // Portal properties
    this.size = { width: 3, height: 4 };
    this.lanes = [-4, 0, 4]; // Match road lanes
    this.currentLane = 0;
    this.distanceInterval = 250; // Changed from 350 to 250 meters
    this.lastSpawnDistance = -1; // Initialize to -1 to ensure first spawn
    this.portalKilometer = 0; // Track which kilometer portal is at
    this.portalType = 'next'; // Start with 'next' portal
    this.enteringPortal = false;
    
    // Check if we came from another portal
    this.checkReferrer();
    
    // Create portal mesh
    this.createPortal();
  }
  
  // Check for referrer in URL query params
  checkReferrer() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      this.hasReferrer = urlParams.get('portal') === 'true';
      this.referrerUrl = urlParams.get('ref') || '';
      
      if (this.hasReferrer) {
        console.log(`Portal detected referrer: ${this.referrerUrl}`);
      }
    }
  }
  
  createPortal() {
    // Create a ring geometry for the portal
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.2, 20, 40); // Increased segments for smoother look
    
    // Create materials for each portal type
    this.nextPortalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // Light blue for next portal
      emissive: 0x00ffff,
      emissiveIntensity: 3,
      metalness: 0.9,
      roughness: 0.1
    });
    
    this.prevPortalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333, // Red for previous portal
      emissive: 0xff3333,
      emissiveIntensity: 3,
      metalness: 0.9,
      roughness: 0.1
    });
    
    // Create the portal ring (initially using the next portal material)
    this.ring = new THREE.Mesh(ringGeometry, this.nextPortalMaterial);
    this.ring.rotation.z = Math.PI / 2; // Make it vertical facing the road
    this.add(this.ring);
    
    // Add inner portal effect (circular plane)
    const portalDiskGeometry = new THREE.CircleGeometry(1.4, 32);
    // Materials for disk
    this.nextDiskMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    this.prevDiskMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    this.portalDisk = new THREE.Mesh(portalDiskGeometry, this.nextDiskMaterial);
    this.portalDisk.rotation.z = Math.PI / 2; // Make it face the same direction as the ring
    this.add(this.portalDisk);
    
    // Add text labels above portal
    this.createPortalLabels();
    
    // Glow materials
    this.nextGlowMaterial = new THREE.SpriteMaterial({
      map: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkFFRkZEMUI1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkFFRkZEMUM1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGQUVGRkQxOTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGQUVGRkQxQTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjjUmssAAAA/SURBVHjaYvz//z8DFPyH0wxQzIQmAeKDaJgYXAKbBrBCZAmwQmQJuEJkCRaYQmQJNpgEsjiKBEwzigRAgAEAoaUP5DXfx+UAAAAASUVORK5CYII='),
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.prevGlowMaterial = new THREE.SpriteMaterial({
      map: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkFFRkZEMUI1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkFFRkZEMUM1QjJFMTFFNDg4RDc4REIyNzZEMDk2QTQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGQUVGRkQxOTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGQUVGRkQxQTVCMkUxMUU0ODhENzhEQjI3NkQwOTZBNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjjUmssAAAA/SURBVHjaYvz//z8DFPyH0wxQzIQmAeKDaJgYXAKbBrBCZAmwQmQJuEJkCRaYQmQJNpgEsjiKBEwzigRAgAEAoaUP5DXfx+UAAAAASUVORK5CYII='),
      color: 0xff3333,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    // Add glow effect using sprite
    this.glow = new THREE.Sprite(this.nextGlowMaterial);
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
    
    // Particle materials
    this.nextParticleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.15,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.prevParticleMaterial = new THREE.PointsMaterial({
      color: 0xff3333,
      size: 0.15,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particleGeometry, this.nextParticleMaterial);
    this.add(this.particles);
  }
  
  // Create text labels for the portals
  createPortalLabels() {
    // Create canvas for next portal text
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = 256;
    nextCanvas.height = 64;
    const nextCtx = nextCanvas.getContext('2d');
    
    // Style and draw next portal text
    nextCtx.fillStyle = '#000000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.font = 'Bold 36px Arial';
    nextCtx.textAlign = 'center';
    nextCtx.textBaseline = 'middle';
    nextCtx.fillStyle = '#00ffff';
    nextCtx.fillText('Next Game', nextCanvas.width/2, nextCanvas.height/2);
    
    // Create texture from canvas
    const nextTexture = new THREE.CanvasTexture(nextCanvas);
    const nextMaterial = new THREE.MeshBasicMaterial({
      map: nextTexture, 
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Create text mesh for next portal
    const nextTextGeometry = new THREE.PlaneGeometry(4, 1);
    this.nextTextMesh = new THREE.Mesh(nextTextGeometry, nextMaterial);
    this.nextTextMesh.position.set(0, 4, 0); // Position above portal
    // Don't set initial rotation - we'll update it dynamically
    this.add(this.nextTextMesh);
    
    // Create canvas for previous portal text
    const prevCanvas = document.createElement('canvas');
    prevCanvas.width = 512;
    prevCanvas.height = 64;
    const prevCtx = prevCanvas.getContext('2d');
    
    // Style and draw previous portal text
    prevCtx.fillStyle = '#000000';
    prevCtx.fillRect(0, 0, prevCanvas.width, prevCanvas.height);
    prevCtx.font = 'Bold 36px Arial';
    prevCtx.textAlign = 'center';
    prevCtx.textBaseline = 'middle';
    prevCtx.fillStyle = '#ff3333';
    prevCtx.fillText('Return to previous game', prevCanvas.width/2, prevCanvas.height/2);
    
    // Create texture from canvas
    const prevTexture = new THREE.CanvasTexture(prevCanvas);
    const prevMaterial = new THREE.MeshBasicMaterial({
      map: prevTexture, 
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Create text mesh for previous portal
    const prevTextGeometry = new THREE.PlaneGeometry(7, 1);
    this.prevTextMesh = new THREE.Mesh(prevTextGeometry, prevMaterial);
    this.prevTextMesh.position.set(0, 4, 0); // Position above portal
    // Don't set initial rotation - we'll update it dynamically
    this.add(this.prevTextMesh);
    
    // Initially show only next text
    this.prevTextMesh.visible = false;
  }
  
  setPortalType(type) {
    this.portalType = type;
    
    if (type === 'next') {
      // Update to next portal appearance (blue)
      this.ring.material = this.nextPortalMaterial;
      this.portalDisk.material = this.nextDiskMaterial;
      this.glow.material = this.nextGlowMaterial;
      this.particles.material = this.nextParticleMaterial;
      
      // Show next text, hide prev text
      if (this.nextTextMesh) this.nextTextMesh.visible = true;
      if (this.prevTextMesh) this.prevTextMesh.visible = false;
    } else {
      // Update to prev portal appearance (red)
      this.ring.material = this.prevPortalMaterial;
      this.portalDisk.material = this.prevDiskMaterial;
      this.glow.material = this.prevGlowMaterial;
      this.particles.material = this.prevParticleMaterial;
      
      // Show prev text, hide next text
      if (this.nextTextMesh) this.nextTextMesh.visible = false;
      if (this.prevTextMesh) this.prevTextMesh.visible = true;
    }
  }
  
  update(deltaTime, totalDistance, bikePosition) {
    // Keep the portal ring static (no rotation)
    
    // Rotate particles
    this.particles.rotation.z -= deltaTime * 0.5;
    
    // Pulse the glow and disk
    const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
    this.glow.scale.set(8 * pulseScale, 8 * pulseScale, 1);
    
    // Update text rotation to face bike if bike position is provided
    if (bikePosition && this.nextTextMesh && this.prevTextMesh) {
      // Calculate direction to bike
      const directionToBike = new THREE.Vector3();
      directionToBike.subVectors(this.position, new THREE.Vector3(bikePosition.x, this.position.y, bikePosition.z)).normalize();
      
      // Calculate angle from direction
      const angle = Math.atan2(directionToBike.x, directionToBike.z);
      
      // Apply rotation to text meshes
      this.nextTextMesh.rotation.y = angle;
      this.prevTextMesh.rotation.y = angle;
    }
    
    // Change portal disk color over time
    if (this.portalType === 'next') {
      const hue = (Date.now() % 6000) / 6000;
      const portalColor = new THREE.Color().setHSL(hue, 1, 0.5);
      this.portalDisk.material.color.lerp(portalColor, deltaTime * 2);
    } else {
      // For previous portal, pulse between red and dark red
      const intensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
      this.portalDisk.material.color.setRGB(1, intensity * 0.3, intensity * 0.3);
    }
    
    // Calculate current kilometer
    const currentKilometer = Math.floor(totalDistance / this.distanceInterval);
    
    // If we've passed the current portal's kilometer, spawn a new one
    if (currentKilometer > this.portalKilometer || this.lastSpawnDistance === -1) {
      this.spawnAtNewLocation(totalDistance);
      console.log(`Spawning new ${this.portalType} portal at position ${this.position.z}, bike at: ${totalDistance}`);
    }
  }
  
  spawnAtNewLocation(totalDistance) {
    // Pick a random lane
    const randomLaneIndex = Math.floor(Math.random() * this.lanes.length);
    this.currentLane = this.lanes[randomLaneIndex];
    
    // Calculate the current kilometer and the next kilometer milestone
    const currentKilometer = Math.floor(totalDistance / this.distanceInterval);
    this.portalKilometer = currentKilometer + 1; // Next kilometer marker
    
    // Toggle portal type for alternating portals
    if (this.portalType === 'next') {
      this.setPortalType('prev');
    } else {
      this.setPortalType('next');
    }
    
    // Hide portal if we should show only one type and there's no referrer
    if (this.portalType === 'prev' && !this.hasReferrer) {
      // If there's no referrer, make the prev portal spawn further ahead
      this.portalKilometer += 1;
    }
    
    // Set position - spawn at next kilometer mark, 100 units ahead
    this.position.set(
      this.currentLane,
      2, // Height above ground
      -(this.portalKilometer * this.distanceInterval + 100) // Spawn at next kilometer mark + 100 units
    );
    
    this.lastSpawnDistance = totalDistance;
    this.enteringPortal = false; // Reset portal entry state
    
    console.log(`Portal (${this.portalType}) spawned at distance: ${this.position.z}, next milestone: ${this.portalKilometer * this.distanceInterval}, bike at: ${totalDistance}`);
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
        color: this.portalType === 'next' ? 0x00ffff : 0xff3333,
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
        if (this.portalType === 'next') {
          // Redirect to next game
          const destination = 'https://portal.pieter.com/';
          console.log(`Redirecting to next game: ${destination}`);
          
          // Add portal=true and current location as ref in query params
          const currentUrl = encodeURIComponent(window.location.href.split('?')[0]); // Get base URL without query params
          const redirectUrl = `${destination}?portal=true&ref=${currentUrl}`;
          window.location.href = redirectUrl;
        } else if (this.portalType === 'prev' && this.referrerUrl) {
          // Redirect to previous game
          console.log(`Redirecting to previous game: ${this.referrerUrl}`);
          window.location.href = this.referrerUrl;
        } else {
          // Fallback if no referrer
          console.log("No valid referrer for prev portal, staying on current page");
          this.enteringPortal = false;
        }
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