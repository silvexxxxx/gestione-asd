const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `            resumeInit() {`;
const fix = `            resumeInit() {
                // --- FIX CORSI DUPLICATI (PULIZIA AUTOMATICA) ---
                if (this.state.corsi && this.state.corsi.length > 0) {
                    const uniqueCorsi = [];
                    const seen = new Set();
                    let duplicatesRemoved = 0;
                    
                    this.state.corsi.forEach(c => {
                        // Creiamo un'impronta digitale del corso. Ignoriamo l'ID perché copia/incolla genera nuovi ID.
                        const fingerprint = \`\${c.nome}|\${c.dayOfWeek}|\${c.startTime}|\${c.endTime}|\${c.sala_id}|\${c.istruttore_id}|\${c.inizio}|\${c.fine}\`;
                        if (seen.has(fingerprint)) {
                            duplicatesRemoved++;
                        } else {
                            seen.add(fingerprint);
                            uniqueCorsi.push(c);
                        }
                    });
                    
                    if (duplicatesRemoved > 0) {
                        console.log(\`[Auto-Fix] Rimosse \${duplicatesRemoved} attività duplicate nel calendario!\`);
                        this.state.corsi = uniqueCorsi;
                        this.saveAll();
                        this.toast(\`Ho rimosso \${duplicatesRemoved} corsi duplicati dal calendario per velocizzare l'app!\`, 'success');
                    }
                }
                // --- FINE FIX ---`;

html = html.replace(target, fix);
fs.writeFileSync('index.html', html);
console.log('Patched index.html with deduplication logic.');
