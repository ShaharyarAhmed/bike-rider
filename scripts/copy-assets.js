import { copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define source and destination directories
const sourceDir = join(__dirname, '..', 'src');
const destDir = join(__dirname, '..', 'dist');

// Create necessary directories
mkdirSync(join(destDir, 'assets', 'models'), { recursive: true });
mkdirSync(join(destDir, 'assets', 'images'), { recursive: true });
mkdirSync(join(destDir, 'assets', 'sounds'), { recursive: true });

// Copy models
const models = [
  'bike1.glb',
  'bus1.glb',
  'bus2.glb',
  'car1_grey.glb',
  'car2_blue.glb',
  'car3_red.glb',
  'car4_white.glb',
  'car5_taxi.glb',
  'mini_truck1.glb',
  'police_car1.glb',
  'tree1.glb',
  'tree2.glb',
  'tree3.glb',
  'tree4.glb',
  'tree_trunk1.glb',
  'tree_trunk2.glb',
  'truck1.glb',
  'truck2.glb'
];

// Copy images
const images = [
  'bg1.png',
  'bg2.png'
];

// Copy all models
models.forEach(model => {
  const sourcePath = join(sourceDir, 'models', model);
  const destPath = join(destDir, 'assets', 'models', model);
  try {
    copyFileSync(sourcePath, destPath);
    console.log(`Copied ${model} to assets/models/`);
  } catch (err) {
    console.error(`Error copying ${model}:`, err);
  }
});

// Copy all images
images.forEach(image => {
  const sourcePath = join(sourceDir, 'assets', image);
  const destPath = join(destDir, 'assets', 'images', image);
  try {
    copyFileSync(sourcePath, destPath);
    console.log(`Copied ${image} to assets/images/`);
  } catch (err) {
    console.error(`Error copying ${image}:`, err);
  }
}); 