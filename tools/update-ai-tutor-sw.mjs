import fs from 'fs';

const swPath = 'sw.js';
let swContent = fs.readFileSync(swPath, 'utf8');

// 1. Bump version
swContent = swContent.replace(/const VERSION\s+=\s+'v(\d+)';/, (match, p1) => {
  return `const VERSION    = 'v${parseInt(p1) + 1}';`;
});

// 2. Define new assets to precache
const newAssets = [
  'css/ai-tutor.css',
  'js/ai-tutor/utils.js',
  'js/ai-tutor/api.js',
  'js/ai-tutor/voice.js',
  'js/ai-tutor/chat.js',
  'js/ai-tutor/storage.js',
  'js/ai-tutor/widget.js',
  'js/ai-tutor/init.js'
];

// 3. Inject into PRECACHE array safely
const precacheStart = swContent.indexOf('const PRECACHE = [');
const precacheEnd = swContent.indexOf('];', precacheStart);

if (precacheStart !== -1 && precacheEnd !== -1) {
  const beforeArray = swContent.substring(0, precacheStart + 18);
  const afterArray = swContent.substring(precacheEnd);
  
  // Format new assets with proper indentation
  const formattedAssets = newAssets.map(asset => `  '${asset}',`).join('\n');
  
  swContent = beforeArray + '\n' + formattedAssets + '\n' + afterArray;
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log('✅ Service Worker updated successfully. New version injected.');
} else {
  console.error('❌ Could not find PRECACHE array in sw.js');
}
