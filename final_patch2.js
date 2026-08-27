const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// ======================================================
// PATCH 1: Replace basic deduplication with aggressive merge-based one
// ======================================================
const idx1 = html.indexOf("this.state.corsi.forEach(c => {\n                        // Creiamo un'impronta digitale del corso");
if (idx1 === -1) { console.error('PATCH 1: not found'); process.exit(1); }
const endIdx1 = html.indexOf('});', idx1) + 3;
const newDedup = `// Raggruppa corsi con stessa firma (ignora date) e fonde le date
                    const groupedCorsi = {};
                    this.state.corsi.forEach(c => {
                        const fp = (c.nome||'') + '|' + c.dayOfWeek + '|' + (c.startTime||'') + '|' + (c.endTime||'') + '|' + (c.sala_id||'') + '|' + (c.istruttore_id||'');
                        if (!groupedCorsi[fp]) groupedCorsi[fp] = [];
                        groupedCorsi[fp].push(c);
                    });
                    Object.values(groupedCorsi).forEach(group => {
                        if (group.length === 1) {
                            uniqueCorsi.push(group[0]);
                        } else {
                            let ei = group[0].inizio, lf = group[0].fine;
                            group.forEach(c => {
                                if (c.inizio && (!ei || c.inizio < ei)) ei = c.inizio;
                                if (c.fine && (!lf || c.fine > lf)) lf = c.fine;
                            });
                            uniqueCorsi.push(Object.assign({}, group[0], { inizio: ei, fine: lf }));
                            duplicatesRemoved += (group.length - 1);
                        }
                    });`;
html = html.substring(0, idx1) + newDedup + html.substring(endIdx1);

// ======================================================
// PATCH 2: Add sports year divider to calendar header
// ======================================================
// Find the exact gridHtml += line for the header
const MARKER = "gridHtml += `<div style=\"background:${headerBg}; padding:6px 4px;";
const idx2 = html.indexOf(MARKER);
if (idx2 === -1) { console.error('PATCH 2 marker not found'); process.exit(1); }

// We need to insert variables BEFORE this line and replace the MARKER
// Find the beginning of the line (go back to find \n)
let lineStart = idx2;
while (lineStart > 0 && html[lineStart - 1] !== '\n') lineStart--;

// The new code to insert before the gridHtml += line
const insertBefore = `                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14;' : '';
                const annoSportivoLabel = isNewSportsYear ? '<div style="background:#39ff14;color:black;font-size:0.55rem;margin-top:3px;padding:1px 3px;border-radius:3px;font-weight:bold;">ANNO ' + d.getFullYear().toString().slice(-2) + '/' + (d.getFullYear()+1).toString().slice(-2) + '</div>' : '';
\n`;

// Also need to update the marker itself to include ${leftBorderStyle} and later ${annoSportivoLabel}
// First do the insertion
html = html.substring(0, lineStart) + insertBefore + html.substring(lineStart);

// Now find the (now shifted) MARKER and update it
const idx2b = html.indexOf(MARKER);
const newMarker = 'gridHtml += `<div style="background:${headerBg}; ${leftBorderStyle} padding:6px 4px;';
html = html.replace(MARKER, newMarker);

// Now find the dateStr div closing and add annoSportivoLabel after it
const DATEMARKER = '${dateStr}</div>';
const idx3 = html.indexOf(DATEMARKER, idx2b);
if (idx3 === -1) { console.error('PATCH 3 dateStr marker not found'); process.exit(1); }
html = html.substring(0, idx3 + DATEMARKER.length) + '${annoSportivoLabel}' + html.substring(idx3 + DATEMARKER.length);

// ======================================================
// PATCH 3: Bump SW cache version
// ======================================================
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/CACHE_NAME = "gestione-asd-v\d+"/, 'CACHE_NAME = "gestione-asd-v34"');
fs.writeFileSync('sw.js', sw);

fs.writeFileSync('index.html', html);
console.log('All patches applied successfully!');
