const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

// Bump cache version again
sw = sw.replace(/CACHE_NAME = "gestione-asd-v\d+"/, 'CACHE_NAME = "gestione-asd-v32"');

fs.writeFileSync('sw.js', sw);
