const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const copiedLabelTarget = `const copiedLabel = this.state.copiedDay ? \` &nbsp;|&nbsp; 📋 \${DAYS[this.state.copiedDay.dayOfWeek - 1]} <span style="cursor:pointer; text-decoration:underline;" onclick="app.clearCopiedDay()">[Annulla]</span>\` : '';`;

const copiedLabelFix = `const copiedLabel = this.state.copiedDay ? \`<div style="background:var(--accent); color:white; padding:2px 8px; border-radius:12px; margin-top:4px; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-weight:600;">📋 In memoria: \${DAYS[this.state.copiedDay.dayOfWeek - 1]} <span style="cursor:pointer; opacity:0.8; font-size:0.8rem;" title="Annulla Copia" onclick="app.clearCopiedDay()">✖</span></div>\` : '';`;

html = html.replace(copiedLabelTarget, copiedLabelFix);
fs.writeFileSync('index.html', html);
console.log('Fixed copiedLabel styling.');
