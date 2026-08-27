const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `                    this.state.corsi.forEach(c => {
                        // Creiamo un'impronta digitale del corso. Ignoriamo l'ID perché copia/incolla genera nuovi ID.
                        const fingerprint = \`\${c.nome}|\${c.dayOfWeek}|\${c.startTime}|\${c.endTime}|\${c.sala_id}|\${c.istruttore_id}|\${c.inizio}|\${c.fine}\`;
                        if (seen.has(fingerprint)) {
                            duplicatesRemoved++;
                        } else {
                            seen.add(fingerprint);
                            uniqueCorsi.push(c);
                        }
                    });`;

const replacement = `                    // Aggressively merge courses that are identical except for dates
                    const groupedCorsi = {};
                    this.state.corsi.forEach(c => {
                        const fingerprint = \`\${c.nome}|\${c.dayOfWeek}|\${c.startTime}|\${c.endTime}|\${c.sala_id}|\${c.istruttore_id}\`;
                        if (!groupedCorsi[fingerprint]) {
                            groupedCorsi[fingerprint] = [];
                        }
                        groupedCorsi[fingerprint].push(c);
                    });
                    
                    Object.values(groupedCorsi).forEach(group => {
                        if (group.length === 1) {
                            uniqueCorsi.push(group[0]);
                        } else {
                            // Merge multiple identical courses into one by finding min inizio and max fine
                            let earliestInizio = group[0].inizio || '2020-01-01';
                            let latestFine = group[0].fine || '2100-12-31';
                            
                            group.forEach(c => {
                                if (c.inizio && c.inizio < earliestInizio) earliestInizio = c.inizio;
                                if (c.fine && c.fine > latestFine) latestFine = c.fine;
                            });
                            
                            const mergedCorso = { ...group[0], inizio: earliestInizio, fine: latestFine };
                            uniqueCorsi.push(mergedCorso);
                            duplicatesRemoved += (group.length - 1);
                        }
                    });`;

if (html.indexOf(targetStr) > -1) {
    html = html.replace(targetStr, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Deduplication logic replaced successfully.");
} else {
    console.log("Could not find targetStr in index.html");
}
