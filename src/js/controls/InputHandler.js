export class InputHandler {
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };
    
    // Set up event listeners
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // For future use with touch/gamepad controls
    this.keyboard = this;
  }
  
  onKeyDown(event) {
    if (this.keys.hasOwnProperty(event.key)) {
      this.keys[event.key] = true;
    }
  }
  
  onKeyUp(event) {
    if (this.keys.hasOwnProperty(event.key)) {
      this.keys[event.key] = false;
    }
  }
  
  isKeyPressed(key) {
    return this.keys[key] === true;
  }
  
  // Update method - currently does nothing but needed for the game loop
  // This will be useful if we add more complex input handling in the future
  update() {
    // This is currently empty as keyboard input is handled by event listeners
    // But this method exists so the game loop can call it without errors
  }
} 