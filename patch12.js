const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const editModalTarget = `<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:1rem;">
                            <button type="button" class="btn btn-outline" onclick="app.openCorsoDetail(\${id})">Annulla</button>
                            <button type="submit" class="btn btn-primary">💾 Salva Modifiche</button>
                        </div>`;

const editModalFix = `<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:1rem; width:100%;">
                            <button type="button" class="btn" style="background:#dc2626; color:white; border:none; margin-right:auto;" onclick="if(confirm('Vuoi davvero eliminare questo corso?')){ app.deleteCorso(\${id}); app.closeModal(); }">🗑️ Elimina</button>
                            <button type="button" class="btn btn-outline" onclick="app.openCorsoDetail(\${id})">Annulla</button>
                            <button type="submit" class="btn btn-primary">💾 Salva Modifiche</button>
                        </div>`;

html = html.replace(editModalTarget, editModalFix);
fs.writeFileSync('index.html', html);
console.log('Added Delete button to edit corso modal.');
