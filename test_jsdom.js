const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('asd_gestionale.html', 'utf8');
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on('error', (err) => { console.log('JSDOM ERROR:', err); });
virtualConsole.on('log', (log) => { console.log('JSDOM LOG:', log); });
virtualConsole.on('jsdomError', (err) => { console.log('JSDOM INTERNAL ERROR:', err); });

const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
setTimeout(() => {
    try {
        console.log('App loaded. Calling openFastEntryModal...');
        dom.window.app.openFastEntryModal();
        console.log('Modal style:', dom.window.document.getElementById('fast-entry-modal').style.display);
    } catch (e) {
        console.log('Exception caught:', e);
    }
}, 500);
