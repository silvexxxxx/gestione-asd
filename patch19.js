const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `deleteCorso(id) {
            const c = this.state.corsi.find(x => x.id === id);
            if (!c) return;
            if (confirm(\`Eliminare definitivamente "\${c.nome}"?\`)) {
                this.state.corsi = this.state.corsi.filter(x => x.id !== id);
                this.saveAll();
                this.closeModal();
                this.toast('Attività eliminata.', 'danger');
                if (this.state.currentPage === 'corsi') {
                    this.renderCorsi();
                } else {
                    this.renderSalaPesi();
                }
            }
        },`;

const fix = `promptDeleteCorso(id) {
            const c = this.state.corsi.find(x => x.id === id);
            if (!c) return;
            
            const weekDays = this.getWeekDates(this.state.currentWeekOffset || 0);
            const targetDateObj = weekDays[c.dayOfWeek - 1];
            const targetDateStr = targetDateObj.toISOString().split('T')[0];
            const targetDateFormatted = this.formatDate(targetDateStr);
            const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

            this.openModal('Opzioni Eliminazione', \`
                <p>Stai per eliminare <strong>\${c.nome}</strong> del \${giorni[c.dayOfWeek % 7]}.</p>
                <p>Cosa vuoi fare?</p>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                    <button class="btn" style="background:var(--card-bg); border:1px solid var(--danger); color:var(--text); text-align:left; padding:12px; display:flex; flex-direction:column; gap:4px;" onclick="app.executeDeleteCorso(\${id}, 'all')">
                        <div style="font-weight:600; font-size:1rem; color:var(--danger);">🗑️ Elimina l'intero periodo</div>
                        <span style="font-size:0.8rem; color:var(--text-muted);">Il corso verrà cancellato definitivamente dal calendario.</span>
                    </button>
                    
                    <button class="btn" style="background:var(--card-bg); border:1px solid var(--warning); color:var(--text); text-align:left; padding:12px; display:flex; flex-direction:column; gap:4px;" onclick="app.executeDeleteCorso(\${id}, '\${targetDateStr}')">
                        <div style="font-weight:600; font-size:1rem; color:var(--warning);">✂️ Elimina SOLO questa settimana (\${targetDateFormatted})</div>
                        <span style="font-size:0.8rem; color:var(--text-muted);">Il corso verrà interrotto questa settimana e riprenderà regolarmente dalla prossima.</span>
                    </button>
                    
                    <button class="btn btn-outline" style="margin-top:10px;" onclick="app.openEditCorsoModal(\${id})">Annulla Operazione</button>
                </div>
            \`);
        },

        executeDeleteCorso(id, mode) {
            const cIndex = this.state.corsi.findIndex(x => x.id === id);
            if (cIndex === -1) return;
            const c = this.state.corsi[cIndex];

            this.closeModal();

            if (mode === 'all') {
                this.state.corsi.splice(cIndex, 1);
                this.saveAll();
                this.toast('Corso eliminato definitivamente.');
                if (this.state.currentPage === 'corsi') this.renderCorsi();
                else this.renderSalaPesi();
            } else {
                const targetDateStr = mode;
                const targetDate = new Date(targetDateStr);
                
                const prevWeek = new Date(targetDate);
                prevWeek.setDate(prevWeek.getDate() - 7);
                const prevWeekStr = prevWeek.toISOString().split('T')[0];

                const nextWeek = new Date(targetDate);
                nextWeek.setDate(nextWeek.getDate() + 7);
                const nextWeekStr = nextWeek.toISOString().split('T')[0];

                if (!c.fine || c.fine >= nextWeekStr) {
                    const clone = JSON.parse(JSON.stringify(c));
                    clone.id = Date.now() + Math.floor(Math.random() * 1000);
                    clone.inizio = nextWeekStr;
                    clone.iscritti = []; // Svuota iscritti per il corso sdoppiato futuro
                    this.state.corsi.push(clone);
                }

                c.fine = prevWeekStr;

                if (c.inizio > c.fine) {
                    // Se la data di inizio era successiva alla fine (es. hanno cancellato la primissima occorrenza)
                    this.state.corsi.splice(cIndex, 1);
                }

                this.saveAll();
                this.toast('Giorno rimosso con successo (il corso è stato diviso).');
                if (this.state.currentPage === 'corsi') this.renderCorsi();
                else this.renderSalaPesi();
            }
        },

        deleteCorso(id) {
            this.promptDeleteCorso(id);
        },`;

if(html.includes(target)) {
    html = html.replace(target, fix);
    fs.writeFileSync('index.html', html);
    console.log('Successfully updated deleteCorso.');
} else {
    console.log('Target not found');
}
