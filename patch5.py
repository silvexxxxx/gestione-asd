# -*- coding: utf-8 -*-
import re

with open('asd_gestionale.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add safeAction method
old_export = 'exportData() {'
new_export = '''safeAction(id, buttonElement, defaultText, dangerColor, actionCallback) {
            if (!this._safeClicks) this._safeClicks = {};
            if (!this._safeTimeouts) this._safeTimeouts = {};
            
            let count = this._safeClicks[id] || 7;
            count--;
            
            if (count > 0) {
                this._safeClicks[id] = count;
                buttonElement.innerHTML = `⚠️ Clicca altre ${count} volte per confermare!`;
                buttonElement.style.background = dangerColor;
                buttonElement.style.color = "white";
                buttonElement.style.borderColor = dangerColor;
                
                if (this._safeTimeouts[id]) clearTimeout(this._safeTimeouts[id]);
                this._safeTimeouts[id] = setTimeout(() => {
                    this._safeClicks[id] = 7;
                    buttonElement.innerHTML = defaultText;
                    buttonElement.style.background = "";
                    buttonElement.style.color = "";
                    buttonElement.style.borderColor = "";
                }, 3000);
            } else {
                this._safeClicks[id] = 7;
                buttonElement.innerHTML = defaultText;
                buttonElement.style.background = "";
                buttonElement.style.color = "";
                buttonElement.style.borderColor = "";
                if(this._safeTimeouts[id]) clearTimeout(this._safeTimeouts[id]);
                
                actionCallback();
            }
        },
        exportData() {'''
if 'safeAction(' not in content:
    content = content.replace(old_export, new_export, 1)

# 2. Replace UI blocks
old_ui = '''<!-- Import/Export -->
                            <div class="glass-card">
                                <h3 style="margin-bottom:1rem;">💾 Esportazioni File JSON/Excel</h3>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <button class="btn btn-outline" onclick="app.exportData()" data-guide="Salva una copia completa di tutti i dati del gestionale (soci, ricevute, corsi) in un file .json sul tuo computer.">⬇️ Esporta Backup JSON</button>
                                    <label class="btn btn-outline" style="cursor:pointer;" data-guide="Ripristina i dati da un file di backup .json precedentemente salvato. I dati attuali verranno sostituiti.">⬆️ Importa Backup JSON<input type="file" accept=".json" onchange="app.importData(event)" style="display:none;"></label>
                                    <button class="btn btn-outline" onclick="app.exportSociExcel()" data-guide="Genera un file Excel contenente l'anagrafica completa di tutti i soci.">📊 Esporta Soci XLSX</button>
                                    <label class="btn btn-outline" style="cursor:pointer;" data-guide="Importa massivamente una lista di soci a partire da un file Excel (XLSX).">📋 Importa Soci XLSX<input type="file" accept=".xlsx, .xls" onchange="app.importSociExcel(event)" style="display:none;"></label>
                                </div>
                            </div>

                            <!-- Cancella Database Iscritti -->
                            <div class="glass-card" style="border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.04);">
                                <h3 style="margin-bottom:1rem;">⚠️ Azioni Pericolose</h3>
                                <p style="font-size:0.85rem; margin-bottom:1rem; color:var(--text-muted);">Queste operazioni eliminano o sovrascrivono i dati attuali.</p>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <label class="btn btn-outline" style="text-align:center; cursor:pointer;" data-guide="ATTENZIONE: Carica un file .json di backup per ripristinare il database. I dati attuali verranno sovrascritti.">
                                        Importa Backup (.json)
                                        <input type="file" accept=".json" style="display:none" onchange="app.importData(event)">
                                    </label>
                                    <button class="btn btn-danger" onclick="app.clearSociDatabase()" data-guide="Elimina tutti gli iscritti dal database in modo irreversibile.">🗑️ Azzera Database Iscritti</button>
                                </div>
                            </div>'''

new_ui = '''<!-- Import/Export -->
                            <div class="glass-card">
                                <h3 style="margin-bottom:1rem;">💾 Esportazioni Sicure</h3>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    <button class="btn btn-outline" onclick="app.exportData()" data-guide="Salva una copia completa di tutti i dati del gestionale (soci, ricevute, corsi) in un file .json sul tuo computer.">⬇️ Esporta Backup JSON</button>
                                    <button class="btn btn-outline" onclick="app.exportSociExcel()" data-guide="Genera un file Excel contenente l'anagrafica completa di tutti i soci.">📊 Esporta Soci XLSX</button>
                                </div>
                            </div>

                            <!-- Cancella Database Iscritti -->
                            <div class="glass-card" style="border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.04);">
                                <h3 style="margin-bottom:1rem;">⚠️ Azioni Pericolose (Sovrascrittura)</h3>
                                <p style="font-size:0.85rem; margin-bottom:1rem; color:var(--text-muted);">Queste operazioni eliminano o sovrascrivono i dati attuali. Usa la sicura per confermare.</p>
                                <div style="display:flex; flex-direction:column; gap:10px;">
                                    
                                    <input type="file" id="hidden-import-json" accept=".json" style="display:none" onchange="app.importData(event)">
                                    <button class="btn btn-outline" style="text-align:center;" onclick="app.safeAction('import-json', this, '⬆️ Importa Backup JSON', '#dc2626', () => document.getElementById('hidden-import-json').click())" data-guide="ATTENZIONE: Carica un file .json di backup per ripristinare il database. I dati attuali verranno sovrascritti. Clicca più volte per sbloccare.">⬆️ Importa Backup JSON</button>
                                    
                                    <input type="file" id="hidden-import-excel" accept=".xlsx, .xls" style="display:none" onchange="app.importSociExcel(event)">
                                    <button class="btn btn-outline" style="text-align:center;" onclick="app.safeAction('import-excel', this, '📋 Importa Soci XLSX', '#dc2626', () => document.getElementById('hidden-import-excel').click())" data-guide="ATTENZIONE: Importa massivamente una lista di soci sovrascrivendo i campi esistenti. Clicca più volte per sbloccare.">📋 Importa Soci XLSX</button>

                                    <button class="btn btn-danger" onclick="app.safeAction('clear-db', this, '🗑️ Azzera Database Iscritti', '#991b1b', () => app.clearSociDatabase())" data-guide="Elimina tutti gli iscritti dal database in modo irreversibile. Clicca più volte per sbloccare.">🗑️ Azzera Database Iscritti</button>
                                </div>
                            </div>'''

content = content.replace(old_ui, new_ui)

# 3. Update the Guide
old_guide = '''<h3>Esportazione Esterna (Backup):</h3>
                                <p>I salvataggi di stato rimangono all'interno del programma. E' comunque <strong>FONDAMENTALE</strong> esportare periodicamente un Backup completo sul tuo computer usando il tasto "Esporta Backup JSON". Se formatti o cambi computer, potrai ripristinare tutto caricando quel file.</p>

                                <h3>Esportazione Excel:</h3>
                                <p>Puoi esportare l'elenco dei soci in formato Excel tramite il pulsante apposito nelle Impostazioni.</p>`;'''

new_guide = '''<h3>Esportazione Esterna (Backup):</h3>
                                <p>I salvataggi di stato rimangono all'interno del programma. E' comunque <strong>FONDAMENTALE</strong> esportare periodicamente un Backup completo sul tuo computer usando il tasto "Esporta Backup JSON". Se formatti o cambi computer, potrai ripristinare tutto caricando quel file.</p>

                                <h3>Azioni Pericolose e Sicura:</h3>
                                <p>Tutte le operazioni di importazione dati (JSON o Excel) o di cancellazione (Azzera Database) sovrascrivono irrimediabilmente i dati attuali. Per evitare disastri accidentali, questi pulsanti si trovano in un'area riservata e <strong>sono protetti da un meccanismo di sicura</strong>: devi cliccarli 7 volte di seguito rapidamente per sbloccare l'azione, dimostrando l'intenzionalità dell'operazione.</p>`;'''

content = content.replace(old_guide, new_guide)

with open('asd_gestionale.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch 5 completata!")
