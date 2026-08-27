const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');

sw = sw.replace('const ASSETS = [', 'const ASSETS = [\n  "./style.css",\n  "./app.js",');

// Bump cache version
sw = sw.replace(/CACHE_NAME = "gestione-asd-v\d+"/, 'CACHE_NAME = "gestione-asd-v31"');

fs.writeFileSync('sw.js', sw);
