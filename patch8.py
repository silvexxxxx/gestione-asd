# -*- coding: utf-8 -*-
import re

with open('asd_gestionale.html', 'r', encoding='utf-8') as f:
    content = f.read()

modal_html = '''<!-- Fast Entry Modal -->
    <div id="fast-entry-modal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        <div class="modal-content" style="max-width: 600px; background:white; padding:2rem; border-radius:12px; width:90%; position:relative;">
            <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h2 style="margin:0; font-size:1.4rem;">⚡ Inserimento Storico Ricevute</h2>
                <button type="button" onclick="app.closeFastEntryModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <form id="fast-entry-form" onsubmit="app.saveFastEntry(event)">
                <p style="font-size:0.85rem; color:#666; margin-bottom:1.5rem;">Inserisci le ricevute cartacee velocemente. Premendo Invio, i dati verranno salvati e svuotati, il numero incrementato in automatico. I soci non trovati verranno creati al volo.</p>
                <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                    <div class="form-group">
                        <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600;">Data Emissione</label>
                        <input type="date" id="fe-data" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                    </div>
                    <div class="form-group">
                        <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600;">N° Cartaceo</label>
                        <input type="number" id="fe-numero" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600;">Cognome e Nome Socio</label>
                    <input type="text" id="fe-socio-nome" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required list="fe-soci-list" autocomplete="off" placeholder="Es. Rossi Mario">
                    <datalist id="fe-soci-list"></datalist>
                </div>
                
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600;">Metodo di Pagamento</label>
                    <select id="fe-pagamento" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" required>
                        <option value="Contanti">Contanti</option>
                        <option value="Bonifico">Bonifico</option>
                        <option value="POS">POS/Carta</option>
                        <option value="Assegno">Assegno</option>
                    </select>
                </div>

                <div style="background:#f3f4f6; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <div class="form-group" style="margin-bottom:15px;">
                        <label style="color:#059669; font-weight:bold; font-size:1.1rem; display:block; margin-bottom:5px;">IMPORTO TOTALE (€)</label>
                        <input type="number" step="0.01" id="fe-importo" class="form-control" style="width:100%; font-size:1.5rem; font-weight:bold; color:#059669; height:50px; padding:10px; border:2px solid #059669; border-radius:6px;" required>
                    </div>
                    
                    <p style="font-size:0.85rem; color:#444; margin-bottom:10px;">Opzionale: Dettaglio Voci (sarà unito nella causale)</p>
                    <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                        <div class="form-group">
                            <label style="display:block; margin-bottom:5px; font-size:0.85rem;">Di cui Quota/Corso</label>
                            <input type="number" step="0.01" id="fe-quota" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div class="form-group">
                            <label style="display:block; margin-bottom:5px; font-size:0.85rem;">Di cui Tesseramento</label>
                            <input type="number" step="0.01" id="fe-tess" class="form-control" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>
                </div>
                
                <div class="form-actions" style="display:flex; justify-content: space-between; align-items:center;">
                    <span id="fe-status" style="color:#059669; font-weight:bold; opacity:0; transition:opacity 0.3s;">✅ Salvata!</span>
                    <div>
                        <button type="button" class="btn btn-outline" style="padding:10px 20px; border-radius:6px; cursor:pointer;" onclick="app.closeFastEntryModal()">Chiudi</button>
                        <button type="submit" class="btn btn-primary" style="background:#ca8a04; color:white; padding:10px 20px; border-radius:6px; border:none; cursor:pointer; font-weight:bold;">Salva e Prossima (Invio)</button>
                    </div>
                </div>
            </form>
        </div>
    </div>
'''

if 'id="fast-entry-modal"' not in content:
    content = content.replace('</body>', modal_html + '\n</body>')

with open('asd_gestionale.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch 8 completata!")
