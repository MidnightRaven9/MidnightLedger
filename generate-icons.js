import sharp from 'sharp';
import fs from 'fs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Rounded black background -->
  <rect width="512" height="512" rx="110" fill="#0C0C0D" />
  
  <defs>
    <!-- Purple to Lavender Gradient -->
    <linearGradient id="purple-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="40%" stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#C084FC" />
    </linearGradient>
    
    <!-- Moon Mask -->
    <mask id="moon-mask">
      <!-- White circle allows rendering -->
      <circle cx="256" cy="190" r="95" fill="#FFFFFF" />
      <!-- Black circle masks/cuts rendering -->
      <circle cx="296" cy="165" r="95" fill="#000000" />
    </mask>
  </defs>
  
  <!-- Crescent Moon shape using the mask on a rect of the gradient -->
  <rect x="50" y="50" width="412" height="300" fill="url(#purple-grad)" mask="url(#moon-mask)" />
  
  <!-- Three Ledger Lines -->
  <rect x="90" y="335" width="332" height="14" rx="7" fill="url(#purple-grad)" />
  <rect x="90" y="375" width="332" height="14" rx="7" fill="url(#purple-grad)" />
  <rect x="90" y="415" width="332" height="14" rx="7" fill="url(#purple-grad)" />
</svg>
`;

async function run() {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  const svgBuffer = Buffer.from(svg);

  // Generate 512x512 icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('Generated public/icon-512.png');

  // Generate 192x192 icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('Generated public/icon-192.png');

  // Generate 180x180 apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // Generate 32x32 favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.png');
  console.log('Generated public/favicon.png');
}

run().catch(console.error);
