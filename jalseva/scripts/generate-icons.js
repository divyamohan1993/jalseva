// Script to generate PWA icons from SVG
// Run: node scripts/generate-icons.js
// Requires: npm install sharp (only for icon generation)

const fs = require('fs');
const path = require('path');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0066FF"/>
  <path d="M256 80c0 0-120 160-120 260a120 120 0 0 0 240 0C376 240 256 80 256 80z" fill="white" opacity="0.9"/>
  <ellipse cx="220" cy="320" rx="30" ry="40" fill="white" opacity="0.3"/>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write SVG
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('Generated icon.svg');

// Try to use sharp for PNG generation
try {
  const sharp = require('sharp');
  const sizes = [72, 96, 128, 144, 192, 384, 512];

  sizes.forEach(async (size) => {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  });
} catch (e) {
  console.log('sharp not installed. Install with: npm install sharp');
  console.log('For now, SVG icon is available at public/icons/icon.svg');
}
