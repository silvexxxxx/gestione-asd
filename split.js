const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>', styleStart);

const styleContent = html.substring(styleStart + 7, styleEnd);
fs.writeFileSync('style.css', styleContent);

const scriptStart = html.indexOf('<script>', styleEnd);
const scriptEnd = html.lastIndexOf('</script>');

const scriptContent = html.substring(scriptStart + 8, scriptEnd);
fs.writeFileSync('app.js', scriptContent);

const newHtml = html.substring(0, styleStart) +
                '<link rel="stylesheet" href="style.css">' +
                html.substring(styleEnd + 8, scriptStart) +
                '<script src="app.js"></script>' +
                html.substring(scriptEnd + 9);

fs.writeFileSync('index.html', newHtml);

console.log('Successfully split index.html into style.css and app.js');
