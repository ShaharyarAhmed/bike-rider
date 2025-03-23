/**
 * Class to manage camera settings in a centralized way
 * This makes it easier to adjust camera behavior across the game
 */
export class CameraSettings {
  constructor() {
    // Default camera position settings
    this.height = 2; // Height above the bike (Y offset)
    this.distance = 3; // Distance behind the bike (Z offset)
    this.lateralOffset = 0; // Horizontal offset from bike (X offset)
    
    // Camera behavior settings
    this.followSpeed = 0.1; // How quickly camera follows bike (0-1, higher = faster)
    this.lookAtOffset = { x: 0, y: 1, z: -3 }; // Offset for lookAt point (in front of bike)
    
    // Camera view settings
    this.fov = 75; // Field of view in degrees
    this.near = 0.1; // Near clipping plane
    this.far = 1000; // Far clipping plane
    
    // Speed-based adjustments
    this.heightMultiplier = 0.05; // How much height increases with speed
    this.distanceMultiplier = 0.1; // How much distance increases with speed
    this.maxDistanceIncrease = 4; // Maximum additional distance due to speed
    
    // Debug camera settings
    this.debugHeight = 8; // Height in debug mode
    this.debugDistance = 12; // Distance in debug mode
  }
  
  // Get camera position based on bike position and speed
  getPosition(bikePosition, bikeSpeed, debug = false) {
    if (debug) {
      return {
        x: bikePosition.x + this.lateralOffset,
        y: bikePosition.y + this.debugHeight,
        z: bikePosition.z + this.debugDistance
      };
    }
    
    // Calculate speed-based adjustments (limited by max values)
    const speedDistanceAdjust = Math.min(bikeSpeed * this.distanceMultiplier, this.maxDistanceIncrease);
    const speedHeightAdjust = bikeSpeed * this.heightMultiplier;
    
    return {
      x: bikePosition.x + this.lateralOffset,
      y: bikePosition.y + this.height + speedHeightAdjust,
      z: bikePosition.z + this.distance + speedDistanceAdjust
    };
  }
  
  // Get the point the camera should look at
  getLookAtPoint(bikePosition) {
    return {
      x: bikePosition.x + this.lookAtOffset.x,
      y: bikePosition.y + this.lookAtOffset.y,
      z: bikePosition.z + this.lookAtOffset.z
    };
  }
  
  // Return initialization settings for perspective camera
  getInitSettings() {
    return {
      fov: this.fov,
      near: this.near,
      far: this.far
    };
  }
  
  // Return default starting position (used when game starts/resets)
  getDefaultPosition() {
    return {
      x: 0,
      y: this.height,
      z: this.distance
    };
  }
} 