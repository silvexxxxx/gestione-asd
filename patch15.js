const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `pasteDay(targetDayOfWeek) {
            const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
            if (!this.state.copiedDay || !this.state.copiedDay.corsi || this.state.copiedDay.corsi.length === 0) {
                this.toast('Nessun giorno copiato da incollare!', 'warning');
                return;
            }

            const srcDayName = DAYS[this.state.copiedDay.dayOfWeek - 1];
            const targetDayName = DAYS[targetDayOfWeek - 1];

            if (this.state.copiedDay.dayOfWeek === targetDayOfWeek) {
                this.toast('Non puoi incollare il giorno su se stesso!', 'warning');
                return;
            }

            const count = this.state.copiedDay.corsi.length;
            if (!confirm(\`Vuoi incollare le \${count} attività di \${srcDayName} sopra \${targetDayName}?\`)) {
                return;
            }

            const giorniShort = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom' };

            let addedCount = 0;
            this.state.copiedDay.corsi.forEach((c, idx) => {
                const newCorso = {
                    ...c,
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    dayOfWeek: targetDayOfWeek,
                    schedule: \`\${giorniShort[targetDayOfWeek]} \${c.startTime}\`,
                    iscritti: [] // Reset iscrizioni per le nuove attività collegate
                };
                this.state.corsi.push(newCorso);
                addedCount++;
            });

            this.saveAll();
            this.toast(\`\${addedCount} attività incollate con successo in \${targetDayName}!\`);
            this.renderSalaPesi();
        },`;

const fix = `pasteDay(targetDayOfWeek) {
            const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
            if (!this.state.copiedDay || !this.state.copiedDay.corsi || this.state.copiedDay.corsi.length === 0) {
                this.toast('Nessun giorno copiato da incollare!', 'warning');
                return;
            }

            const srcDayName = DAYS[this.state.copiedDay.dayOfWeek - 1];
            const targetDayName = DAYS[targetDayOfWeek - 1];

            if (this.state.copiedDay.dayOfWeek === targetDayOfWeek) {
                this.toast('Non puoi incollare il giorno su se stesso!', 'warning');
                return;
            }

            const count = this.state.copiedDay.corsi.length;
            const weekDaysForPaste = this.getWeekDates(this.state.currentWeekOffset || 0);
            const targetDateStr = weekDaysForPaste[targetDayOfWeek - 1].toISOString().split('T')[0];

            this.openModal('Opzioni Incolla', \`
                <p>Stai incollando <strong>\${count} attività</strong> da \${srcDayName} a \${targetDayName}.</p>
                <p>Come vuoi gestire la <strong>validità temporale</strong> di questi nuovi corsi?</p>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                    <button class="btn" style="background:var(--card-bg); border:1px solid var(--border); color:var(--text); text-align:left; padding:12px; display:flex; flex-direction:column; gap:4px;" onclick="app.executePasteDay(\${targetDayOfWeek}, true)">
                        <div style="font-weight:600; font-size:1rem; color:var(--primary);">🗓️ Mantieni l'intero periodo originale</div>
                        <span style="font-size:0.8rem; color:var(--text-muted);">I nuovi corsi avranno esattamente la stessa data di "Inizio" e "Fine" di quelli che hai copiato.</span>
                    </button>
                    
                    <button class="btn" style="background:var(--card-bg); border:1px solid var(--border); color:var(--text); text-align:left; padding:12px; display:flex; flex-direction:column; gap:4px;" onclick="app.executePasteDay(\${targetDayOfWeek}, false)">
                        <div style="font-weight:600; font-size:1rem; color:var(--success);">📍 Incolla SOLO per questa data</div>
                        <span style="font-size:0.8rem; color:var(--text-muted);">La validità sarà limitata ad un solo giorno (<strong>\${this.formatDate(targetDateStr)}</strong>). Potrai usare "Estendi" in seguito.</span>
                    </button>
                </div>
            \`);
        },

        executePasteDay(targetDayOfWeek, keepPeriod) {
            this.closeModal();
            const giorniShort = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab', 7: 'Dom' };
            const targetDayName = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'][targetDayOfWeek - 1];
            
            const weekDaysForPaste = this.getWeekDates(this.state.currentWeekOffset || 0);
            const targetDateStr = weekDaysForPaste[targetDayOfWeek - 1].toISOString().split('T')[0];

            let addedCount = 0;
            this.state.copiedDay.corsi.forEach((c, idx) => {
                const newCorso = {
                    ...c,
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    dayOfWeek: targetDayOfWeek,
                    schedule: \`\${giorniShort[targetDayOfWeek]} \${c.startTime}\`,
                    iscritti: [] // Reset iscrizioni
                };
                
                if (!keepPeriod) {
                    newCorso.inizio = targetDateStr;
                    newCorso.fine = targetDateStr;
                }

                this.state.corsi.push(newCorso);
                addedCount++;
            });
            this.saveAll();
            this.toast(\`\${addedCount} attività incollate con successo in \${targetDayName}!\`);
            this.renderSalaPesi();
        },`;

if(html.includes(target)) {
    html = html.replace(target, fix);
    fs.writeFileSync('index.html', html);
    console.log('Successfully applied patch to pasteDay.');
} else {
    console.log('Target not found!');
}
