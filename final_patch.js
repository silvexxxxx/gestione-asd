const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// PATCH 1: Replace basic deduplication with aggressive merge-based one
const oldDedup = `                    this.state.corsi.forEach(c => {
                        // Creiamo un'impronta digitale del corso. Ignoriamo l'ID perché copia/incolla genera nuovi ID.
                        const fingerprint = \`\${c.nome}|\${c.dayOfWeek}|\${c.startTime}|\${c.endTime}|\${c.sala_id}|\${c.istruttore_id}|\${c.inizio}|\${c.fine}\`;
                        if (seen.has(fingerprint)) {
                            duplicatesRemoved++;
                        } else {
                            seen.add(fingerprint);
                            uniqueCorsi.push(c);
                        }
                    });`;

const newDedup = `                    // Raggruppa corsi con stessa firma (ignora date) e fonde le date
                    const groupedCorsi = {};
                    this.state.corsi.forEach(c => {
                        const fingerprint = \`\${c.nome}|\${c.dayOfWeek}|\${c.startTime}|\${c.endTime}|\${c.sala_id}|\${c.istruttore_id}\`;
                        if (!groupedCorsi[fingerprint]) groupedCorsi[fingerprint] = [];
                        groupedCorsi[fingerprint].push(c);
                    });
                    Object.values(groupedCorsi).forEach(group => {
                        if (group.length === 1) {
                            uniqueCorsi.push(group[0]);
                        } else {
                            let earliestInizio = group.reduce((min, c) => (!c.inizio || (min && min < c.inizio)) ? min : c.inizio, group[0].inizio);
                            let latestFine = group.reduce((max, c) => (!c.fine || (max && max > c.fine)) ? max : c.fine, group[0].fine);
                            uniqueCorsi.push({ ...group[0], inizio: earliestInizio, fine: latestFine });
                            duplicatesRemoved += (group.length - 1);
                        }
                    });`;

if (html.indexOf(oldDedup) === -1) {
    console.error('PATCH 1: Target string not found!');
    process.exit(1);
}
html = html.replace(oldDedup, newDedup);

// PATCH 2: Add sports year divider - add variables inside DAYS.forEach loop, right before gridHtml += header
const oldHeaderBg = `                let headerBg = 'rgba(30,41,59,0.95)';
                let colorStyle = '';
                if (isHoliday) {
                    headerBg = 'rgba(239,68,68,0.2)'; // Sfondo rosso chiaro per festività
                    colorStyle = 'color: #ef4444;';
                } else if (isToday) {
                    headerBg = 'rgba(59,130,246,0.25)';
                    colorStyle = 'color: var(--primary);';
                }

                gridHtml += \`<div style="background:\${headerBg}; padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>`;

const newHeaderBg = `                let headerBg = 'rgba(30,41,59,0.95)';
                let colorStyle = '';
                if (isHoliday) {
                    headerBg = 'rgba(239,68,68,0.2)'; // Sfondo rosso chiaro per festività
                    colorStyle = 'color: #ef4444;';
                } else if (isToday) {
                    headerBg = 'rgba(59,130,246,0.25)';
                    colorStyle = 'color: var(--primary);';
                }

                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14;' : '';
                const annoSportivoLabel = isNewSportsYear ? \`<div style="background:#39ff14;color:black;font-size:0.55rem;margin-top:3px;padding:1px 3px;border-radius:3px;font-weight:bold;">🏆 ANNO \${d.getFullYear().toString().slice(-2)}/\${(d.getFullYear()+1).toString().slice(-2)}</div>\` : '';

                gridHtml += \`<div style="background:\${headerBg}; \${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\${annoSportivoLabel}`;

if (html.indexOf(oldHeaderBg) === -1) {
    console.error('PATCH 2: Target string not found!');
    process.exit(1);
}
html = html.replace(oldHeaderBg, newHeaderBg);

// PATCH 3: Bump sw cache
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/CACHE_NAME = "gestione-asd-v\d+"/, 'CACHE_NAME = "gestione-asd-v34"');
fs.writeFileSync('sw.js', sw);

fs.writeFileSync('index.html', html);
console.log('All patches applied successfully!');
