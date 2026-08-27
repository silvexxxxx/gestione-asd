const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

const badSyntax = '${annoSportivoLabel}`;                       <div style="display:flex; gap:3px; justify-content:center; margin-top:4px; flex-wrap:wrap;">';
const goodSyntax = '${annoSportivoLabel}`;\n                        gridHtml += `<div style="display:flex; gap:3px; justify-content:center; margin-top:4px; flex-wrap:wrap;">';

app = app.replace(badSyntax, goodSyntax);
fs.writeFileSync('app.js', app);
