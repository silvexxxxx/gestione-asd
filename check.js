const acorn = require('acorn');
const fs = require('fs');
const js = fs.readFileSync('temp.js', 'utf8');
try {
    acorn.parse(js, { ecmaVersion: 2020 });
    console.log('Valid syntax');
} catch (e) {
    console.log(e.message);
}
