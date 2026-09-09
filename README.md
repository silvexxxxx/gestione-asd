# 🏆 Gestionale ASD — Sistema Gestionale per Associazioni Sportive Dilettantistiche

**Gestionale ASD** è un'applicazione web-native progettata per la gestione contabile, amministrativa, associativa e di governance delle **Associazioni Sportive Dilettantistiche (ASD)** e **Società Sportive Dilettantistiche (SSD)**.

---

## 🚀 Caratteristiche Principali

- **Architettura Hybrid Local-First & Google Drive Native:** I dati risiedono sul computer dell'associazione e si sincronizzano tramite la cartella Google Drive dell'account societario, permettendo l'utilizzo su più postazioni senza server terzi o canoni cloud elevati. Operativo anche 100% offline.
- **Salvataggio Automatico File System Access API:** Organizzazione ed archiviazione automatica di tutti i PDF generati (ricevute, prima nota, compensi, verbali) suddivisi in sottocartelle per Anno Sportivo (es. `anno 2025-2026/ricevute/`, `anno 2025-2026/verbali direttivo/`, `anno 2025-2026/assemblee/`).
- **Anagrafica Soci & Atleti:** Calcolo automatico Codice Fiscale, registro tesserati EPS/FSN e RASD, monitoraggio certificati medici con alert scadenze e filtri avanzati.
- **Ricevute & Quote Associative:** Emissione ricevute singole/multiple, numerazione sequenziale cronologica fiscale, scorporo commissioni pagamenti digitali (SumUp, Stripe) e annullamenti/storni contabili.
- **Prima Nota & Chiusura Esercizio:** Tracciamento Cassa Contanti vs Banca/Conti Digitali, giroconti, riconciliazione con Estratto Conto Bancario e procedura guidata di **🔒 Chiusura Esercizio Annuale (31/08)** con generazione dei saldi iniziali al 01/09.
- **Governance & Verbali Automatizzati:** Wizard per la redazione dei Verbali di Consiglio Direttivo, Assemblee Ordinarie e Straordinarie con **importazione automatica dei dati di bilancio dalla Prima Nota** e rinnovo cariche sociali.

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

## 📄 Licenza

Software rilasciato con **Licenza Annuale**.
