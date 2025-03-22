# Bike Rider Game

A simple 3D bike riding game inspired by "Highway Rider Motorcycle Racer", built with Three.js and Vite.

## Features

- 3D road environment
- Keyboard controls for bike movement
- Third-person camera that follows the bike
- Smooth acceleration and braking mechanics

## Controls

- **↑ (Up Arrow):** Accelerate
- **↓ (Down Arrow):** Brake
- **← (Left Arrow):** Move left
- **→ (Right Arrow):** Move right

## Development

### Prerequisites

- Node.js (v14 or later)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the game

To start the development server:
```
npm run dev
```

Then open your browser and navigate to `http://localhost:5173`

### Building for production

To build for production:
```
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
bike-rider/
├── src/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── components/
│   │   │   ├── Bike.js
│   │   │   └── Road.js
│   │   ├── controls/
│   │   │   └── InputHandler.js
│   │   ├── scenes/
│   │   │   └── GameScene.js
│   │   ├── utils/
│   │   │   └── renderer.js
│   │   ├── Game.js
│   │   └── main.js
│   └── index.html
├── package.json
└── README.md
```

## Future Improvements

- Add obstacles and traffic
- Implement score tracking
- Add multiple levels
- Create a more detailed bike model
- Add sound effects and music
- Mobile touch controls 