const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE_NAME = 'asd-gestionale-v[0-9]+';/, 'const CACHE_NAME = "asd-gestionale-v' + Date.now() + '";');
fs.writeFileSync('sw.js', sw);
console.log('SW cache updated.');
