const { invoke } = window.__TAURI__.core;
const { LogicalPosition, getCurrentWindow, availableMonitors, currentMonitor } = window.__TAURI__.window;

class DesktopPet {
  constructor() {
    this.window = getCurrentWindow();
    this.isRandomMoving = false;
    this.randomMoveInterval = null;
    this.moveDistance = 100;
    this.moveStep = 5;
    this.moveDelay = 2;
    this.randomMoveDelay = 500;
    this.isMoving = false;
    this.currentX = null;
    this.currentY = null;
    this.windowWidth = 200;
    this.windowHeight = 200;
    this.screenWidth = null;
    this.screenHeight = null;
    this.screenX = 0;
    this.screenY = 0;
    
    this.initialize();
  }

  async initialize() {
    // Get screen size from current monitor
    try {
      const monitor = await currentMonitor();
      console.log('Monitor info:', monitor);
      
      if (monitor) {
        // Physical size needs to be converted to logical pixels
        const scaleFactor = monitor.scaleFactor || 1;
        
        // Use physical size divided by scale factor for logical coordinates
        this.screenWidth = Math.floor(monitor.size.width / scaleFactor);
        this.screenHeight = Math.floor(monitor.size.height / scaleFactor);
        this.screenX = Math.floor((monitor.position?.x || 0) / scaleFactor);
        this.screenY = Math.floor((monitor.position?.y || 0) / scaleFactor);
        
        console.log('Screen size (logical):', this.screenWidth, 'x', this.screenHeight);
        console.log('Screen position (logical):', this.screenX, ',', this.screenY);
        console.log('Scale factor:', scaleFactor);
      } else {
        // Fallback to reasonable defaults
        this.screenWidth = 1920;
        this.screenHeight = 1080;
        this.screenX = 0;
        this.screenY = 0;
      }
    } catch (error) {
      console.error('Error getting screen size:', error);
      this.screenWidth = 1920;
      this.screenHeight = 1080;
      this.screenX = 0;
      this.screenY = 0;
    }
    
    // Get initial position
    try {
      const pos = await this.window.outerPosition();
      // outerPosition returns PhysicalPosition, convert to logical
      const scaleFactor = (await currentMonitor())?.scaleFactor || 1;
      this.currentX = Math.floor(pos.x / scaleFactor);
      this.currentY = Math.floor(pos.y / scaleFactor);
      console.log('Initial position (logical):', this.currentX, this.currentY);
    } catch (error) {
      console.error('Error getting initial position:', error);
      // Center the window as fallback
      this.currentX = Math.floor((this.screenWidth - this.windowWidth) / 2);
      this.currentY = Math.floor((this.screenHeight - this.windowHeight) / 2);
    }
    
    // Listen to position changes to keep our tracked position in sync
    this.window.onMoved(async ({ payload: position }) => {
      // Position payload is PhysicalPosition with x, y properties
      try {
        const monitor = await currentMonitor();
        const scaleFactor = monitor?.scaleFactor || 1;
        this.currentX = Math.floor(position.x / scaleFactor);
        this.currentY = Math.floor(position.y / scaleFactor);
        console.log('Window moved to (logical):', this.currentX, this.currentY);
      } catch (error) {
        console.error('Error in onMoved handler:', error);
      }
    });
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.moveUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.moveDown();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.moveRight();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          this.toggleRandomMove();
          break;
      }
    });
  }

  async moveUp() {
    if (this.isMoving) return;
    await this.smoothMove(0, -this.moveDistance);
  }

  async moveDown() {
    if (this.isMoving) return;
    await this.smoothMove(0, this.moveDistance);
  }

  async moveLeft() {
    if (this.isMoving) return;
    await this.smoothMove(-this.moveDistance, 0);
  }

  async moveRight() {
    if (this.isMoving) return;
    await this.smoothMove(this.moveDistance, 0);
  }

  async smoothMove(deltaX, deltaY) {
    if (this.isMoving) return;
    
    this.isMoving = true;
    
    try {
      // Use our tracked position
      const startX = this.currentX;
      const startY = this.currentY;
      
      let targetX = startX + deltaX;
      let targetY = startY + deltaY;
      
      // Apply screen boundaries - keep pet fully visible
      // Note: coordinates are relative to screen origin, not monitor
      const minX = 0;
      const minY = 0;
      const maxX = this.screenWidth - this.windowWidth;
      const maxY = this.screenHeight - this.windowHeight;
      
      console.log('Move request - Current:', startX, startY, 'Delta:', deltaX, deltaY);
      console.log('Target before clamp:', targetX, targetY);
      console.log('Boundaries:', `minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
      
      // Clamp target position to screen bounds
      targetX = Math.max(minX, Math.min(maxX, targetX));
      targetY = Math.max(minY, Math.min(maxY, targetY));
      
      console.log('Target after clamp:', targetX, targetY);
      
      // Recalculate delta based on clamped target
      const actualDeltaX = targetX - startX;
      const actualDeltaY = targetY - startY;
      
      const distance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
      
      if (distance < 1) {
        // Already at target or too close to move
        this.isMoving = false;
        return;
      }
      
      const steps = Math.ceil(distance / this.moveStep);
      const stepX = actualDeltaX / steps;
      const stepY = actualDeltaY / steps;
      
      for (let i = 1; i <= steps; i++) {
        if (!this.isMoving) break;
        
        let newX = Math.round(startX + (stepX * i));
        let newY = Math.round(startY + (stepY * i));
        
        // Double-check bounds
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
        
        // Validate coordinates
        if (!isFinite(newX) || !isFinite(newY)) {
          console.error('Invalid coordinates:', newX, newY);
          break;
        }
        
        // Set position using LogicalPosition
        await this.window.setPosition(new LogicalPosition(newX, newY));
        
        // Update tracked position
        this.currentX = newX;
        this.currentY = newY;
        
        await new Promise(resolve => setTimeout(resolve, this.moveDelay));
      }
      
      console.log('Move complete. Final position:', this.currentX, this.currentY);
    } catch (error) {
      console.error('Error during smooth move:', error);
    } finally {
      this.isMoving = false;
    }
  }

  async moveInRandomDirection() {
    const directions = ['up', 'down', 'left', 'right'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    switch(randomDirection) {
      case 'up':
        await this.moveUp();
        break;
      case 'down':
        await this.moveDown();
        break;
      case 'left':
        await this.moveLeft();
        break;
      case 'right':
        await this.moveRight();
        break;
    }
  }

  toggleRandomMove() {
    if (this.isRandomMoving) {
      // Stop random movement
      this.isRandomMoving = false;
      clearInterval(this.randomMoveInterval);
      console.log('Random movement stopped');
    } else {
      // Start random movement
      this.isRandomMoving = true;
      console.log('Random movement started');
      
      this.randomMoveInterval = setInterval(() => {
        this.moveInRandomDirection();
      }, this.randomMoveDelay);
    }
  }


}

// Initialize the desktop pet when the DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  new DesktopPet();
});
