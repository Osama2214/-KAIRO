/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const imagesDir = path.join(__dirname, '..', 'public', 'images');
const images = [
  'hero-mobile-bg.png',
  'hero-mobile-bg-2.png',
  'hero-mobile-bg-3.png',
  'hero-mobile-bg-4.png'
];

async function convert() {
  for (const img of images) {
    const inputPath = path.join(imagesDir, img);
    const baseName = img.replace('.png', '');
    const outputPath = path.join(imagesDir, `${baseName}.webp`);
    
    if (fs.existsSync(inputPath)) {
      const originalSize = fs.statSync(inputPath).size;
      await sharp(inputPath)
        .webp({ quality: 88, effort: 6 })
        .toFile(outputPath);
      const newSize = fs.statSync(outputPath).size;
      console.log(`${img}: ${(originalSize / 1024).toFixed(1)} KB -> ${baseName}.webp: ${(newSize / 1024).toFixed(1)} KB (Saved ${(((originalSize - newSize) / originalSize) * 100).toFixed(1)}%)`);
    }
  }
}

convert();
