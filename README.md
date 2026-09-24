# 🏆 Gestionale ASD — Sistema Gestionale per Associazioni Sportive Dilettantistiche

**Gestionale ASD** è un'applicazione web-native progettata per la gestione contabile, amministrativa, associativa e di governance delle **Associazioni Sportive Dilettantistiche (ASD)** e **Società Sportive Dilettantistiche (SSD)**.

---

## 🚀 Caratteristiche Principali

- **Architettura Hybrid Local-First & Google Drive Native:** I dati risiedono sul computer dell'associazione e si sincronizzano tramite la cartella Google Drive dell'account societario, permettendo l'utilizzo su più postazioni senza server terzi o canoni cloud elevati. Operativo anche 100% offline.
- **Avvio Diretto 100% Offline & Nuovo Menu Rapido Cloud Topbar:** Avvio fulmineo in modalità locale pura senza popup o richieste bloccanti di rete. Pratico pannello a comparsa nella barra di navigazione con accesso alle 5 operazioni chiave: *Eredita dal Cloud* (con verifica a specchio e snapshot preventivo `PRE-DOWNLOAD-CLOUD`), *Sovrascrivi Cloud* (con salvataggio automatico di `GestioneASD_Backup_Precedente.json`), *Sincronizza/Unisci (Merge)* con risoluzione conflitti via timestamp, *Esploratore Versioni Cloud* e *Disconnessione Offline* immediata.
- **Flusso Fiscale & Amministrativo Bozza / Emessa:** Gestione a doppio stato per Ricevute Soci, Compensi Collaboratori Sportivi e Note Spesa / Rimborsi a piè di lista. La modalità *Bozza* (con filigrana grafica *"BOZZA NON DEFINITIVA"*) permette la libera compilazione, revisione degli importi e correzione dei giustificativi. La conversione in *Emessa* blocca i campi contabili a tutela della conformità fiscale e alimenta automaticamente la Prima Nota e i totalizzatori finanziari.
- **Menu Azioni Compatto di Riga (`⋮ Azioni`):** Design moderno a scomparsa con ritardo intelligente anti-chiusura accidentale (1 secondo) e pulsante primario di stampa immediata, che racchiude tutte le operazioni contestuali (Modifica, Cambio Stato, Invio Email, WhatsApp Ufficiale, Annullamento contabile ed Eliminazione Definitiva in modalità Debug).
- **Filtri Stagione Sportiva & Ricerca Live con Ricalcolo KPI:** Filtro per stagione associativa (es. 2025/2026 o archivio complessivo) e ricerca testuale dinamica in tempo reale con aggiornamento istantaneo dei totali incassati, da liquidare e delle statistiche nei moduli Soci, Ricevute, Compensi Collaboratori e Rimborsi Spese.
- **Modulo Acquisizione Documenti & Scansioni ("Inghiottitoio" Batch con QR Code):** Centro di dematerializzazione 100% offline con dropzone per file misti (PDF e immagini). Decodifica automatica dei QR Code univoci stampati su ricevute, liberatorie (minori e adulti) e verbali, fusione automatica multipagina di fogli sparsi in PDF unici conformi tramite `pdf-lib` (con allerta per pagine mancanti), archiviazione automatica per stagione sportiva e corsia di **smistamento rapido per certificati medici e bonifici** con anteprima/zoom, aggiornamento immediato delle scadenze sanitarie e dei KPI.
- **Trasferimento Archivio Completo su Nuovo Server (.ZIP) & Rigenerazione:** Strumento unificato di migrazione e backup totale per conservare non solo il database, ma tutti i **documenti fisici probatori originali** (certificati con timbro, liberatorie firmate a penna, bonifici, giustificativi) in un unico file compresso `.zip` trasportabile via chiavetta USB o Google Drive, affiancato dal wizard di rigenerazione procedurale per i soli documenti digitali emessi.
- **Wizard "Ripopola Archivio su Nuovo Server":** Rigenerazione completamente automatizzata su una nuova postazione server di tutte le cartelle per anno sportivo, dei file PDF di ricevute, compensi, note spese e verbali societari, unitamente a un file di backup omnicomprensivo `.json`, con barra di avanzamento percentuale e log in tempo reale.
- **Salvataggio Automatico File System Access API:** Organizzazione ed archiviazione automatica di tutti i PDF generati (ricevute, prima nota, compensi, rimborsi, verbali, liberatorie) suddivisi in sottocartelle per Anno Sportivo (es. `anno 2026-2027/ricevute/`, `anno 2026-2027/liberatorie/`, `anno 2026-2027/certificati medici/`).
- **Anagrafica Soci, Moduli QR & Singolo Export Excel Dinamico:** Calcolo automatico CF, monitoraggio certificati medici con alert scadenze, stampa liberatorie con QR code anticontraffazione (`📝 Lib`), singolo pulsante di esportazione Excel collegato in tempo reale alla condizione del filtro selezionato, note interne adesive stile "post-it", integrazione WhatsApp ufficiale e importazione massiva soci tramite foglio di calcolo Excel (`.xlsx`) preconfigurato.
- **Prima Nota & Chiusura Esercizio Annuale (31/08):** Tracciamento Cassa Contanti vs Banca/Conti Digitali, giroconti, riconciliazione con Estratto Conto Bancario e procedura guidata di **🔒 Chiusura Esercizio Annuale** con riporto automatico dei saldi iniziali al 01/09.
- **Governance & Verbali Automatizzati:** Wizard per la redazione dei Verbali di Consiglio Direttivo, Assemblee Ordinarie e Straordinarie con **importazione automatica dei saldi di bilancio e del rendiconto dalla Prima Nota** e rinnovo cariche sociali.
- **Tutor Interattivo & Guida Online Integrata (100% Copertura):** Assistente contestuale attivabile con un clic che illustra azione da compiere ed effetto immediato per ogni singolo pulsante o comando del software, affiancato dal manuale online a 12 capitoli costantemente aggiornato con tutte le recenti implementazioni.

---

## ⚠️ Limiti Operativi & Perimetro di Competenza (D.Lgs. 36/2021 - Riforma dello Sport)

Al fine di garantire la massima trasparenza verso l'utente:

1. **Perimetro di Competenza:**  
   Il modulo collaboratori e la generazione delle relative ricevute compenso sono progettati specificamente ed esclusivamente per **compensi sportivi dilettantistici rientranti nella fascia di esenzione totale (fino a € 5.000,00 annui per singolo percipiente)**.

2. **Esclusione Adempimenti Sostituto d'Imposta:**  
   Il software **NON gestisce** il calcolo, la trattenuta ed il versamento dei contributi previdenziali (**INPS Gestione Separata** per la fascia tra 5.000 € e 15.000 €) né delle ritenute fiscali **IRPEF** (per compensi superiori a 15.000 €). Il software **NON genera** i modelli **F24** per il versamento delle ritenute né la **Certificazione Unica (CU)** annuale.

3. **Target di Riferimento Consigliato:**  
   Il gestionale è ideale per **ASD e SSD dilettantistiche di piccole e medie dimensioni** i cui istruttori e tecnici percepiscono rimborsi o compensi contenuti entro la soglia esente di 5.000 €/anno. Qualora l'associazione preveda compensi di importo superiore che richiedano la qualifica e gli adempimenti del sostituto d'imposta, tali adempimenti devono essere affidati al proprio **commercialista / consulente del lavoro** o gestiti tramite software paghe dedicati.

---

## 🛠️ Requisiti Tecnologici

- Browser moderno compatibile con HTML5 e File System Access API (Google Chrome, Microsoft Edge, Opera, Brave).
- Compatibile con sistemi operativi Windows, macOS e Linux.

---

## 📄 Licenza & Gestione Postazioni

- **Licenza Annuale Multi-Dispositivo:** Software fornito con licenza annuale (gestita tramite Lemon Squeezy) che include l'utilizzo simultaneo su un massimo di **5 postazioni/dispositivi** per ciascuna associazione.
- **Gestione Flessibile degli Slot:** Tramite il pannello Impostazioni è possibile monitorare i dispositivi collegati e disattivare postazioni dismesse o sostituite per liberare lo slot a favore di un nuovo dispositivo, mantenendo inalterata la scadenza naturale e i giorni residui della licenza.
