/**
 * Gestionale ASD — Modulo Acquisizione Documenti & Scansioni
 * Sistema integrato di:
 * 1. Generazione QR Code univoco su moduli stampabili jsPDF
 * 2. Inghiottitoio batch drag & drop per scansioni (PDF, JPG, PNG)
 * 3. Motore di elaborazione client-side (pdf.js + jsQR + pdf-lib + File System Access API)
 * 4. Smistamento automatico documenti firmati e smistamento manuale rapido certificati medici / bonifici
 */

(function () {
    // Configura worker locale per pdf.js se disponibile
    if (typeof window !== 'undefined' && window.pdfjsLib) {
        try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = './lib/pdf.worker.min.js';
        } catch (e) {
            console.warn('Configurazione worker pdf.js:', e);
        }
    }

    // Oggetto estensione per l'applicazione
    const scanModule = {
        state: {
            processing: false,
            totalFiles: 0,
            processedFiles: 0,
            currentFileName: '',
            progressPercent: 0,
            logs: [],
            archived: [],
            manualQueue: [],
            anomalies: [],
            initialized: false
        },

        init() {
            if (this.state.initialized) return;
            this.state.initialized = true;

            // Ripristina cronologia archiviazione se presente nel database
            if (window.app && window.app.state && Array.isArray(window.app.state.scan_archive_history)) {
                this.state.archived = [...window.app.state.scan_archive_history];
            }
        },

        // =========================================================================
        // SEZIONE 1: GENERATORE QR CODE COMPATTO CLIENT-SIDE (100% OFFLINE)
        // =========================================================================

        /**
         * Genera un Data URL PNG contenente il QR code per il testo specificato.
         * Utilizza qrcode-generator (sincrono, leggero e affidabile) con fallback su qrcodejs.
         */
        async generateQrDataUrl(payload, size = 120) {
            if (!payload) return null;
            try {
                // 1. Prova qrcode-generator
                if (typeof window.qrcode === 'function') {
                    const qr = window.qrcode(0, 'M');
                    qr.addData(payload);
                    qr.make();
                    return qr.createDataURL(4, 0);
                }

                // 2. Prova davidshimjs QRCode
                if (typeof window.QRCode === 'function') {
                    return new Promise((resolve) => {
                        const tempDiv = document.createElement('div');
                        tempDiv.style.display = 'none';
                        document.body.appendChild(tempDiv);
                        try {
                            new window.QRCode(tempDiv, {
                                text: payload,
                                width: size,
                                height: size,
                                correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0
                            });
                            setTimeout(() => {
                                const canvas = tempDiv.querySelector('canvas');
                                let res = null;
                                if (canvas) {
                                    res = canvas.toDataURL('image/png');
                                } else {
                                    const img = tempDiv.querySelector('img');
                                    if (img && img.src) res = img.src;
                                }
                                tempDiv.remove();
                                resolve(res);
                            }, 40);
                        } catch (err) {
                            tempDiv.remove();
                            resolve(null);
                        }
                    });
                }
            } catch (err) {
                console.error('Errore generazione QR code:', err);
            }
            return null;
        },

        /**
         * Applica il QR Code in alto a destra su OGNI pagina di un documento jsPDF.
         * Payload standard: ASD|{TIPO_DOC}|{ID_SOCIO}|{ANNO}|{PAGINA}|{TOT_PAGINE}
         */
        async stampQrOnJsPdf(doc, tipoDoc, idSocioOrDoc, sportsYear) {
            if (!doc || !tipoDoc) return;
            try {
                const totalPages = doc.internal.getNumberOfPages();
                const cleanYear = (sportsYear || new Date().getFullYear()).toString().replace(/[/_\\]/g, '-');
                const cleanId = (idSocioOrDoc || 'DOC').toString().replace(/[|]/g, '_');

                for (let p = 1; p <= totalPages; p++) {
                    doc.setPage(p);
                    const qrPayload = `ASD|${tipoDoc}|${cleanId}|${cleanYear}|${p}|${totalPages}`;
                    const qrDataUrl = await this.generateQrDataUrl(qrPayload, 120);

                    if (qrDataUrl) {
                        // Stampiamo in alto a destra a 20x20 mm (x: 178, y: 10 su pagina A4 da 210mm)
                        doc.addImage(qrDataUrl, 'PNG', 178, 10, 20, 20);
                        
                        // Piccola etichetta descrittiva sotto il QR per leggibilità visiva
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(6);
                        doc.setTextColor(100, 116, 139);
                        doc.text(`Pag. ${p}/${totalPages}`, 188, 32, { align: 'center' });
                    }
                }
            } catch (err) {
                console.warn('Errore applicazione QR su jsPDF:', err);
            }
        },

        // =========================================================================
        // SEZIONE 2: DECODIFICA E SCANNER (pdf.js + jsQR)
        // =========================================================================

        /**
         * Decodifica ImageData tramite jsQR
         */
        decodeImageDataWithJsQR(imageData, width, height) {
            if (typeof window.jsQR !== 'function') {
                console.error('Libreria jsQR non caricata.');
                return null;
            }
            try {
                // Primo tentativo: scansione standard diretta
                let code = window.jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' });
                if (code && code.data) return code.data;

                // Secondo tentativo: tenta con inversione colori (ad es. scansione invertita o contrastata)
                code = window.jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
                if (code && code.data) return code.data;
            } catch (e) {
                console.warn('Eccezione durante decode jsQR:', e);
            }
            return null;
        },

        /**
         * Esegue la scansione di una o più pagine PDF cercando il QR Code.
         * Restituisce le informazioni delle pagine scansionate e l'eventuale payload.
         */
        async scanPdfFile(file) {
            const arrayBuffer = await file.arrayBuffer();
            if (!window.pdfjsLib) {
                throw new Error('Libreria pdf.js non disponibile');
            }

            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            const numPages = pdfDoc.numPages;

            const pagesResult = [];
            let firstPageThumbnail = null;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                // Utilizziamo scala 2.0 per ottenere pixel nitidi ideali per la scansione QR
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                await page.render({ canvasContext: ctx, viewport }).promise;

                if (pageNum === 1) {
                    // Genera miniatura leggera della prima pagina per l'anteprima UI
                    const thumbCanvas = document.createElement('canvas');
                    const thumbScale = Math.min(220 / canvas.width, 280 / canvas.height);
                    thumbCanvas.width = canvas.width * thumbScale;
                    thumbCanvas.height = canvas.height * thumbScale;
                    const thumbCtx = thumbCanvas.getContext('2d');
                    thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
                    firstPageThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);
                }

                // 1. Scansiona prima l'angolo in alto a destra (dove viene generato il QR code)
                // Questo rende la scansione istantanea (10-20ms anziché scansionare l'intero foglio A4)
                let payload = null;
                const qrAreaWidth = Math.floor(canvas.width * 0.45);
                const qrAreaHeight = Math.floor(canvas.height * 0.40);
                const qrAreaX = canvas.width - qrAreaWidth;
                const qrAreaY = 0;

                try {
                    const topCornerImgData = ctx.getImageData(qrAreaX, qrAreaY, qrAreaWidth, qrAreaHeight);
                    payload = this.decodeImageDataWithJsQR(topCornerImgData, qrAreaWidth, qrAreaHeight);
                } catch (e) {}

                // 2. Se non trovato nell'angolo in alto a destra, scansiona l'intera pagina
                if (!payload) {
                    try {
                        const fullImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        payload = this.decodeImageDataWithJsQR(fullImgData, canvas.width, canvas.height);
                    } catch (e) {}
                }

                pagesResult.push({
                    pageNum: pageNum,
                    payload: payload
                });
            }

            return {
                isPdf: true,
                numPages: numPages,
                pagesResult: pagesResult,
                thumbnail: firstPageThumbnail,
                arrayBuffer: arrayBuffer
            };
        },

        /**
         * Scansiona un file immagine (JPG, PNG) alla ricerca del QR code
         */
        async scanImageFile(file) {
            const arrayBuffer = await file.arrayBuffer();
            const objectUrl = URL.createObjectURL(file);

            const img = await new Promise((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = objectUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Genera miniatura
            const thumbCanvas = document.createElement('canvas');
            const thumbScale = Math.min(220 / canvas.width, 280 / canvas.height);
            thumbCanvas.width = canvas.width * thumbScale;
            thumbCanvas.height = canvas.height * thumbScale;
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

            URL.revokeObjectURL(objectUrl);

            // 1. Prova prima nell'angolo in alto a destra
            let payload = null;
            const qrAreaWidth = Math.floor(canvas.width * 0.45);
            const qrAreaHeight = Math.floor(canvas.height * 0.40);
            const qrAreaX = canvas.width - qrAreaWidth;
            const qrAreaY = 0;

            try {
                const cornerData = ctx.getImageData(qrAreaX, qrAreaY, qrAreaWidth, qrAreaHeight);
                payload = this.decodeImageDataWithJsQR(cornerData, qrAreaWidth, qrAreaHeight);
            } catch (e) {}

            // 2. Se non trovato, scansiona l'intera immagine
            if (!payload) {
                try {
                    const fullData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    payload = this.decodeImageDataWithJsQR(fullData, canvas.width, canvas.height);
                } catch (e) {}
            }

            return {
                isPdf: false,
                numPages: 1,
                pagesResult: [{ pageNum: 1, payload: payload }],
                thumbnail: thumbnail,
                arrayBuffer: arrayBuffer
            };
        },

        /**
         * Parsing del payload standardizzato del QR Code:
         * ASD|{TIPO_DOC}|{ID_SOCIO}|{ANNO}|{PAGINA}|{TOT_PAGINE}
         */
        parseQrPayload(raw) {
            if (!raw || typeof raw !== 'string') return null;
            const trimmed = raw.trim();
            const parts = trimmed.split('|');
            if (parts.length < 6 || parts[0] !== 'ASD') {
                return null;
            }

            const tipoDoc = parts[1].toUpperCase();
            const idSocioRaw = parts[2];
            const anno = parts[3];
            const pagina = parseInt(parts[4], 10) || 1;
            const totPagine = parseInt(parts[5], 10) || 1;

            return {
                raw: trimmed,
                tipoDoc: tipoDoc,
                idSocioRaw: idSocioRaw,
                anno: anno,
                pagina: pagina,
                totPagine: totPagine
            };
        },

        // =========================================================================
        // SEZIONE 3: FUSIONE FOGLI SCIOLTI IN UNICO PDF (pdf-lib)
        // =========================================================================

        /**
         * Unisce più pagine (fogli sciolti PDF o immagini JPG/PNG) in un unico PDF definitivo
         */
        async mergePagesToUnifiedPdf(pageItems) {
            if (!window.PDFLib) {
                throw new Error('Libreria pdf-lib non caricata.');
            }

            const { PDFDocument } = window.PDFLib;
            const mergedPdf = await PDFDocument.create();

            // Ordina rigorosamente per numero di pagina dichiarata
            pageItems.sort((a, b) => a.parsedQr.pagina - b.parsedQr.pagina);

            for (const item of pageItems) {
                if (item.isPdf) {
                    const donorDoc = await PDFDocument.load(item.arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(donorDoc, donorDoc.getPageIndices());
                    copiedPages.forEach(p => mergedPdf.addPage(p));
                } else {
                    // È un'immagine (JPG o PNG)
                    let img;
                    if (item.file.type.toLowerCase().includes('png')) {
                        img = await mergedPdf.embedPng(item.arrayBuffer);
                    } else {
                        img = await mergedPdf.embedJpg(item.arrayBuffer);
                    }

                    // Crea foglio standard A4 in punti (595.28 x 841.89)
                    const a4Width = 595.28;
                    const a4Height = 841.89;
                    const newPage = mergedPdf.addPage([a4Width, a4Height]);

                    // Ridimensiona mantenendo il rapporto d'aspetto con margini di 10 pt
                    const margin = 10;
                    const maxW = a4Width - (margin * 2);
                    const maxH = a4Height - (margin * 2);
                    const scale = Math.min(maxW / img.width, maxH / img.height);
                    const drawW = img.width * scale;
                    const drawH = img.height * scale;
                    const posX = (a4Width - drawW) / 2;
                    const posY = (a4Height - drawH) / 2;

                    newPage.drawImage(img, {
                        x: posX,
                        y: posY,
                        width: drawW,
                        height: drawH
                    });
                }
            }

            const pdfBytes = await mergedPdf.save();
            return new Blob([pdfBytes], { type: 'application/pdf' });
        },

        // =========================================================================
        // SEZIONE 4: ELABORAZIONE BATCH E SMISTAMENTO FILE
        // =========================================================================

        addLog(text, type = 'info') {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const logEntry = { time: timeStr, text, type };
            this.state.logs.unshift(logEntry);
            if (this.state.logs.length > 100) this.state.logs.pop();
            this.renderLogs();
        },

        async processFiles(fileList) {
            if (!fileList || fileList.length === 0) return;
            this.init();

            this.state.processing = true;
            this.state.totalFiles = fileList.length;
            this.state.processedFiles = 0;
            this.state.progressPercent = 0;
            this.updateProgressUI();

            this.addLog(`🚀 Avviata scansione batch di ${fileList.length} file...`, 'info');

            const recognizedItems = [];
            const manualCandidateFiles = [];

            // Fase 1: Scansione individuale di ogni singolo file
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                this.state.currentFileName = file.name;
                this.state.processedFiles = i + 1;
                this.state.progressPercent = Math.round(((i + 1) / fileList.length) * 100);
                this.updateProgressUI();

                try {
                    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
                    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);

                    if (!isPdf && !isImg) {
                        this.addLog(`⚠️ File ignorato (formato non supportato): ${file.name}`, 'warning');
                        continue;
                    }

                    this.addLog(`🔍 Analisi in corso: ${file.name}...`, 'info');

                    let scanRes;
                    if (isPdf) {
                        scanRes = await this.scanPdfFile(file);
                    } else {
                        scanRes = await this.scanImageFile(file);
                    }

                    // Verifica se una delle pagine contiene un QR Code valido
                    let foundQr = null;
                    let foundPageNum = 1;
                    for (const pr of scanRes.pagesResult) {
                        if (pr.payload) {
                            const parsed = this.parseQrPayload(pr.payload);
                            if (parsed) {
                                foundQr = parsed;
                                foundPageNum = pr.pageNum;
                                break;
                            }
                        }
                    }

                    if (foundQr) {
                        this.addLog(`✅ Rilevato QR [${foundQr.tipoDoc} - ${foundQr.idSocioRaw}] Pagina ${foundQr.pagina}/${foundQr.totPagine} in: ${file.name}`, 'success');
                        recognizedItems.push({
                            file: file,
                            isPdf: isPdf,
                            numPagesInFile: scanRes.numPages,
                            parsedQr: foundQr,
                            thumbnail: scanRes.thumbnail,
                            arrayBuffer: scanRes.arrayBuffer
                        });
                    } else {
                        this.addLog(`ℹ️ Nessun QR Code rilevato in: ${file.name} (indirizzato a smistamento manuale)`, 'warning');
                        manualCandidateFiles.push({
                            file: file,
                            isPdf: isPdf,
                            thumbnail: scanRes.thumbnail,
                            arrayBuffer: scanRes.arrayBuffer
                        });
                    }
                } catch (err) {
                    console.error('Errore analisi file:', err);
                    this.addLog(`❌ Errore durante l'elaborazione di "${file.name}": ${err.message}`, 'error');
                }
            }

            // Fase 2: Gestione documenti con QR Code (Raggruppamento, controllo completezza, fusione)
            await this.processRecognizedGroup(recognizedItems);

            // Fase 3: Gestione documenti senza QR Code (Coda manuale)
            this.processManualCandidates(manualCandidateFiles);

            this.state.processing = false;
            this.state.currentFileName = '';
            this.updateProgressUI();
            this.renderResults();
            this.addLog(`🏁 Elaborazione batch completata!`, 'success');
            if (window.app && typeof window.app.toast === 'function') {
                window.app.toast(`Scansione completata: ${recognizedItems.length} pagine riconosciute, ${manualCandidateFiles.length} file da smistare.`, 'success');
            }
        },

        /**
         * Raggruppa i file per tipo documento, ID socio/doc e anno sportivo
         */
        async processRecognizedGroup(items) {
            if (items.length === 0) return;

            // Raggruppa per chiave univoca: TIPO__IDSOCIO__ANNO
            const groups = {};
            for (const item of items) {
                const qr = item.parsedQr;
                const groupKey = `${qr.tipoDoc}__${qr.idSocioRaw}__${qr.anno}`;
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        groupKey: groupKey,
                        tipoDoc: qr.tipoDoc,
                        idSocioRaw: qr.idSocioRaw,
                        anno: qr.anno,
                        totPagineDichiarate: qr.totPagine,
                        items: []
                    };
                }
                groups[groupKey].items.push(item);
            }

            for (const groupKey in groups) {
                const group = groups[groupKey];
                const expectedTotal = group.totPagineDichiarate;

                // Caso A: È un unico file PDF multipagina che contiene già tutte le pagine
                const singleFile = group.items.length === 1 ? group.items[0] : null;
                const isSingleCompletePdf = singleFile && singleFile.isPdf && (singleFile.numPagesInFile >= expectedTotal);

                if (isSingleCompletePdf) {
                    this.addLog(`📦 Documento PDF già completo (${singleFile.numPagesInFile} pag): archiviazione diretta...`, 'info');
                    const finalBlob = new Blob([singleFile.arrayBuffer], { type: 'application/pdf' });
                    await this.archiveRecognizedDocument(group, finalBlob, singleFile.thumbnail, singleFile.numPagesInFile);
                    continue;
                }

                // Caso B: Fogli sciolti (JPG, PNG o PDF singoli)
                // Raccoglie le pagine presenti
                const pagesMap = new Map();
                for (const item of group.items) {
                    pagesMap.set(item.parsedQr.pagina, item);
                }

                const pagesFound = Array.from(pagesMap.keys()).sort((a, b) => a - b);
                const missingPages = [];
                for (let p = 1; p <= expectedTotal; p++) {
                    if (!pagesMap.has(p)) {
                        missingPages.push(p);
                    }
                }

                // Se mancano pagine intermedie: BLOCCA e segnala l'anomalia!
                if (missingPages.length > 0) {
                    this.addLog(`⚠️ ANOMALIA: Documento incompleto [${group.tipoDoc} ${group.idSocioRaw}]! Pagine presenti: [${pagesFound.join(', ')}] su ${expectedTotal}. Mancano le pagine: [${missingPages.join(', ')}].`, 'error');
                    this.state.anomalies.push({
                        groupKey: group.groupKey,
                        tipoDoc: group.tipoDoc,
                        idSocioRaw: group.idSocioRaw,
                        anno: group.anno,
                        totPagine: expectedTotal,
                        pagesFound: pagesFound,
                        missingPages: missingPages,
                        items: group.items
                    });
                    continue;
                }

                // Tutte le pagine da 1 a N sono presenti: FONDE in un unico PDF definitivo!
                this.addLog(`✨ Fogli sciolti completi (1..${expectedTotal}). Fusione in unico PDF definitivo in corso...`, 'info');
                const sortedItems = [];
                for (let p = 1; p <= expectedTotal; p++) {
                    sortedItems.push(pagesMap.get(p));
                }

                try {
                    const mergedBlob = await this.mergePagesToUnifiedPdf(sortedItems);
                    const firstThumb = sortedItems[0].thumbnail;
                    await this.archiveRecognizedDocument(group, mergedBlob, firstThumb, expectedTotal);
                    this.addLog(`🎉 Fusione e archiviazione completata per ${group.tipoDoc} ${group.idSocioRaw}!`, 'success');
                } catch (err) {
                    console.error('Errore fusione PDF:', err);
                    this.addLog(`❌ Errore durante la fusione di ${group.groupKey}: ${err.message}`, 'error');
                }
            }
        },

        /**
         * Rimuove dal File System l'eventuale bozza vuota o modulo non compilato (es. Liberatoria_Adulto_... o Liberatoria_Minori_...)
         * una volta che la versione firmata è stata acquisita e archiviata.
         */
        async cleanObsoleteUnsignedLiberatorie(socio, sportsYear) {
            if (!socio || !window.app || typeof window.app.getOutputFolder !== 'function') return;
            try {
                const dirHandle = await window.app.getOutputFolder();
                if (!dirHandle) return;
                const safeYear = (sportsYear || window.app.getSportsYear() || new Date().getFullYear()).toString().replace(/[/_\\]/g, '-');
                const yearDir = await dirHandle.getDirectoryHandle('anno ' + safeYear, { create: false });
                const libDir = await yearDir.getDirectoryHandle('liberatorie', { create: false });

                const sCog = (socio.cognome || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const sNom = (socio.nome || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                for await (const entry of libDir.values()) {
                    if (entry.kind === 'file') {
                        const fn = entry.name.toLowerCase();
                        const fnClean = fn.replace(/[^a-z0-9]/g, '');
                        const isLiberatoria = fn.startsWith('liberatoria_') || fn.includes('liberatoria');
                        const isSigned = fn.includes('firmata');
                        
                        // Corrisponde al socio se contiene cognome e nome
                        const matchesSocio = sCog.length >= 2 && fnClean.includes(sCog) && (sNom.length < 2 || fnClean.includes(sNom));

                        if (isLiberatoria && matchesSocio && !isSigned) {
                            try {
                                await libDir.removeEntry(entry.name);
                                this.addLog(`🧹 Rimosso modulo vuoto obsoleto: ${entry.name} (sostituito dal firmato)`, 'info');
                            } catch (eRm) {
                                console.warn('Rimozione modulo vuoto fallita:', entry.name, eRm);
                            }
                        }
                    }
                }
            } catch (e) {
                // Cartella non trovata o permessi non concessi, ignora silenziosamente
            }
        },

        /**
         * Salva il documento riconosciuto nel File System e aggiorna IndexedDB / stato
         */
        async archiveRecognizedDocument(group, blob, thumbnail, pageCount) {
            const { tipoDoc, idSocioRaw, anno } = group;
            const currentYearStr = window.app && typeof window.app.getSportsYear === 'function' ? window.app.getSportsYear() : (anno || new Date().getFullYear());

            let cleanSocioId = idSocioRaw;
            if (cleanSocioId.startsWith('SOCIO_')) {
                cleanSocioId = cleanSocioId.replace('SOCIO_', '');
            }

            // Ricerca socio corrispondente nel database
            let socio = null;
            if (window.app && window.app.state && Array.isArray(window.app.state.soci)) {
                socio = window.app.state.soci.find(s => 
                    String(s.id) === String(cleanSocioId) || 
                    (s.cf && s.cf.toUpperCase() === idSocioRaw.toUpperCase())
                );
            }

            // Ricerca eventuale ricevuta se tipoDoc === 'RIC'
            let receipt = null;
            if (tipoDoc === 'RIC' && window.app && window.app.state && Array.isArray(window.app.state.ricevute)) {
                receipt = window.app.state.ricevute.find(r => 
                    String(r.id) === String(cleanSocioId) || 
                    `RIC_${r.numero}_${r.anno}` === idSocioRaw ||
                    idSocioRaw.startsWith(`RIC_${r.numero}_`)
                );
                if (receipt && !socio) {
                    socio = window.app.state.soci.find(s => s.id === receipt.socio_id);
                }
            }

            // Determina la categoria e il nome del file sul disco
            let category = 'documenti';
            let targetFileName = `Doc_Firmato_${tipoDoc}_${idSocioRaw}_${anno}.pdf`;
            let typeLabel = 'Documento';

            const safeSocioName = socio ? `${socio.cognome}_${socio.nome}`.replace(/\s+/g, '_') : idSocioRaw;

            if (tipoDoc === 'LIB' || tipoDoc === 'MAN' || tipoDoc === 'ISC') {
                category = 'liberatorie';
                typeLabel = tipoDoc === 'LIB' ? 'Liberatoria Minori/Adulti' : (tipoDoc === 'MAN' ? 'Manleva Responsabilità' : 'Modulo Iscrizione');
                targetFileName = `Liberatoria_Firmata_${safeSocioName}_${anno}.pdf`;

                // Aggiorna anagrafica socio: stato impostato su Firmato / Acquisito
                if (socio) {
                    socio.liberatoria_consegnata = true;
                    socio.liberatoria_file = targetFileName;
                    socio.liberatoria_data_acquisizione = new Date().toISOString();
                    socio.updated_at = new Date().toISOString();
                }
            } else if (tipoDoc === 'RIC') {
                category = 'ricevute';
                typeLabel = 'Ricevuta Pagamento';
                const rNum = receipt ? receipt.numero : 'N';
                targetFileName = `Ricevuta_Firmata_N${rNum}_${safeSocioName}.pdf`;

                if (receipt) {
                    receipt.stato = 'firmata';
                    receipt.firmata = true;
                    receipt.file_firmato = targetFileName;
                    receipt.data_scansione = new Date().toISOString();
                }
            } else if (tipoDoc === 'VER') {
                category = 'verbali direttivo';
                typeLabel = 'Verbale Societario';
                targetFileName = `Verbale_Firmato_${idSocioRaw}_${anno}.pdf`;
            }

            // Salva nel file system tramite File System Access API
            let saveSuccess = false;
            if (window.app && typeof window.app.saveDocumentFS === 'function') {
                saveSuccess = await window.app.saveDocumentFS(targetFileName, blob, category, currentYearStr, true);
            }

            // Se è una liberatoria firmata, rimuove automaticamente la bozza vuota precompilata del socio
            if ((tipoDoc === 'LIB' || tipoDoc === 'MAN' || tipoDoc === 'ISC') && socio) {
                await this.cleanObsoleteUnsignedLiberatorie(socio, currentYearStr);
            }

            // Salva le modifiche in IndexedDB
            if (window.app && typeof window.app.saveAll === 'function') {
                window.app.saveAll();
            }

            const savedPath = `anno ${currentYearStr}/${category}/${targetFileName}`;
            const archivedRecord = {
                id: 'arc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                title: `${typeLabel} — ${socio ? (socio.cognome + ' ' + socio.nome) : idSocioRaw}`,
                type: typeLabel,
                tipoDoc: tipoDoc,
                socioName: socio ? `${socio.cognome} ${socio.nome}` : 'Socio ID ' + idSocioRaw,
                socioId: socio ? socio.id : idSocioRaw,
                fileName: targetFileName,
                path: savedPath,
                time: new Date().toLocaleTimeString('it-IT'),
                pageInfo: `${pageCount} fogli uniti`,
                thumbnail: thumbnail,
                blob: blob,
                blobUrl: URL.createObjectURL(blob)
            };

            this.state.archived.unshift(archivedRecord);

            // Mantieni memoria nello stato permanente per la cronologia
            if (window.app && window.app.state) {
                if (!Array.isArray(window.app.state.scan_archive_history)) {
                    window.app.state.scan_archive_history = [];
                }
                window.app.state.scan_archive_history.unshift({
                    id: archivedRecord.id,
                    title: archivedRecord.title,
                    type: archivedRecord.type,
                    socioName: archivedRecord.socioName,
                    fileName: archivedRecord.fileName,
                    path: archivedRecord.path,
                    time: archivedRecord.time,
                    pageInfo: archivedRecord.pageInfo
                });
                if (window.app.state.scan_archive_history.length > 50) {
                    window.app.state.scan_archive_history.pop();
                }
            }

            this.addLog(`💾 Salvato e registrato: ${savedPath}`, 'success');
        },

        // =========================================================================
        // SEZIONE 5: MOTORE SMART RULES (REGOLE DI SMISTAMENTO INTELLIGENTI)
        // =========================================================================

        getSmartRules() {
            const custom = (window.app && window.app.state && window.app.state.settings && Array.isArray(window.app.state.settings.document_smart_rules))
                ? window.app.state.settings.document_smart_rules
                : [];
            
            const defaults = [
                { id: 'def_lib', keyword: 'liberatoria', scope: 'socio', docType: 'liberatoria', category: 'liberatorie', isRoot: false, label: 'Liberatorie Soci' },
                { id: 'def_man', keyword: 'manleva', scope: 'socio', docType: 'liberatoria', category: 'liberatorie', isRoot: false, label: 'Manleve Soci' },
                { id: 'def_med', keyword: 'certificato', scope: 'socio', docType: 'certificato', category: 'certificati medici', isRoot: false, label: 'Certificati Medici' },
                { id: 'def_vis', keyword: 'visita', scope: 'socio', docType: 'certificato', category: 'certificati medici', isRoot: false, label: 'Visite Mediche' },
                { id: 'def_bon', keyword: 'bonifico', scope: 'socio', docType: 'bonifico', category: 'bonifici', isRoot: false, label: 'Bonifici Esterni' },
                { id: 'def_con', keyword: 'contabile', scope: 'socio', docType: 'bonifico', category: 'bonifici', isRoot: false, label: 'Contabili Bonifico' },
                { id: 'def_bol', keyword: 'bolletta', scope: 'asd', docType: 'bolletta', category: 'bollette utenze', isRoot: false, label: 'Bollette Utenze' },
                { id: 'def_ene', keyword: 'enel', scope: 'asd', docType: 'bolletta', category: 'bollette utenze', isRoot: false, label: 'Utenze Elettriche' },
                { id: 'def_a2a', keyword: 'a2a', scope: 'asd', docType: 'bolletta', category: 'bollette utenze', isRoot: false, label: 'Utenze A2A' },
                { id: 'def_luc', keyword: 'luce', scope: 'asd', docType: 'bolletta', category: 'bollette utenze', isRoot: false, label: 'Utenze Luce' },
                { id: 'def_gas', keyword: 'gas', scope: 'asd', docType: 'bolletta', category: 'bollette utenze', isRoot: false, label: 'Utenze Gas' },
                { id: 'def_fat', keyword: 'fattura', scope: 'asd', docType: 'fattura', category: 'fatture acquisti', isRoot: false, label: 'Fatture Fornitori' },
                { id: 'def_sco', keyword: 'scontrino', scope: 'asd', docType: 'scontrino', category: 'scontrini e rimborsi', isRoot: false, label: 'Scontrini Cassa' },
                { id: 'def_rim', keyword: 'rimborso', scope: 'asd', docType: 'scontrino', category: 'scontrini e rimborsi', isRoot: false, label: 'Rimborsi Spese' },
                { id: 'def_aff', keyword: 'affitto', scope: 'asd', docType: 'contratto', category: 'contratti e affitti', isRoot: false, label: 'Contratti e Affitti' }
            ];

            return [...custom, ...defaults];
        },

        addCustomSmartRule(rule) {
            if (!window.app.state.settings) window.app.state.settings = {};
            if (!Array.isArray(window.app.state.settings.document_smart_rules)) {
                window.app.state.settings.document_smart_rules = [];
            }
            const cleanKw = (rule.keyword || '').trim().toLowerCase();
            if (!cleanKw) return;

            window.app.state.settings.document_smart_rules = window.app.state.settings.document_smart_rules.filter(
                r => (r.keyword || '').toLowerCase() !== cleanKw
            );
            window.app.state.settings.document_smart_rules.unshift({
                id: 'rule_' + Date.now(),
                keyword: cleanKw,
                scope: rule.scope || 'asd',
                docType: rule.docType || 'altro',
                category: rule.category || 'documenti',
                isRoot: !!rule.isRoot,
                label: rule.label || rule.category || cleanKw,
                created_at: new Date().toISOString()
            });
            window.app.saveAll();
        },

        deleteCustomSmartRule(ruleId) {
            if (window.app.state && window.app.state.settings && Array.isArray(window.app.state.settings.document_smart_rules)) {
                window.app.state.settings.document_smart_rules = window.app.state.settings.document_smart_rules.filter(r => r.id !== ruleId);
                window.app.saveAll();
                this.renderSmartRulesModalContent();
                if (window.app) window.app.toast('Regola eliminata con successo.', 'info');
            }
        },

        detectSocioFromFileName(fileName) {
            if (!fileName || !window.app || !window.app.state || !Array.isArray(window.app.state.soci)) return null;
            const cleanName = fileName.toLowerCase().replace(/[^a-z0-9àèéìòù\s]/g, ' ');
            const words = cleanName.split(/\s+/).filter(w => w.length >= 3);

            for (const s of window.app.state.soci) {
                const cog = (s.cognome || '').toLowerCase().trim();
                const nom = (s.nome || '').toLowerCase().trim();
                const note = (s.note || '').toLowerCase().trim();
                const cf = (s.cf || '').toLowerCase().trim();

                // 1. Corrispondenza Codice Fiscale
                if (cf && cf.length >= 8 && cleanName.includes(cf)) return s;

                // 2. Corrispondenza Cognome e Nome o Alias in note (es. "Andrea" per Zhou Mingliang)
                const hasCog = cog && cog.length >= 3 && cleanName.includes(cog);
                const hasNom = nom && nom.length >= 3 && cleanName.includes(nom);
                const hasAlias = note && words.some(w => note.includes(w));

                if (hasCog && (hasNom || hasAlias)) return s;
                if (hasCog && words.length <= 4) return s;
            }
            return null;
        },

        detectRuleFromFileName(fileName) {
            if (!fileName) return null;
            const cleanName = fileName.toLowerCase();
            const rules = this.getSmartRules();
            for (const r of rules) {
                const kw = (r.keyword || '').toLowerCase().trim();
                if (kw && cleanName.includes(kw)) {
                    return r;
                }
            }
            return null;
        },

        openSmartRulesModal() {
            if (!window.app || typeof window.app.openModal !== 'function') return;
            window.app.openModal('⚙️ Regole Intelligenti di Smistamento', this.renderSmartRulesModalHtml());
        },

        renderSmartRulesModalHtml() {
            const allRules = this.getSmartRules();

            return `
                <div style="padding: 10px 0;">
                    <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.2rem; line-height: 1.5;">
                        Il gestionale analizza il nome dei file scansionati privi di QR Code e applica automaticamente la cartella, l'ambito e la tipologia corrispondente.
                        Puoi memorizzare nuove regole al volo durante lo smistamento manuale, oppure gestirle da questo pannello.
                    </p>

                    <!-- Modulo Rapido Nuova Regola -->
                    <div class="glass-card" style="padding: 1rem; margin-bottom: 1.5rem; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(59, 130, 246, 0.25);">
                        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #60a5fa; display: flex; align-items: center; gap: 6px;">
                            <span>➕ Aggiungi Nuova Regola Manuale</span>
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; align-items: end;">
                            <div>
                                <label style="font-size: 0.75rem; color: #cbd5e1; display: block; margin-bottom: 3px;">Parola chiave nel file:</label>
                                <input type="text" id="new-rule-kw" class="form-control" placeholder="es: tim, vodafone, gasolio" style="font-size: 0.82rem; padding: 6px 8px;">
                            </div>
                            <div>
                                <label style="font-size: 0.75rem; color: #cbd5e1; display: block; margin-bottom: 3px;">Ambito:</label>
                                <select id="new-rule-scope" class="form-control" style="font-size: 0.82rem; padding: 6px 8px;">
                                    <option value="asd">🏛️ Generale ASD / Spese</option>
                                    <option value="socio">👤 Socio / Atleta</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.75rem; color: #cbd5e1; display: block; margin-bottom: 3px;">Cartella Destinazione:</label>
                                <input type="text" id="new-rule-cat" class="form-control" placeholder="es: telecomunicazioni" style="font-size: 0.82rem; padding: 6px 8px;">
                            </div>
                            <div>
                                <button type="button" class="btn btn-primary" style="width: 100%; font-size: 0.82rem; padding: 6px 12px; font-weight: 600;" onclick="app.scanProcessor.handleCreateRuleFromModal()">
                                    Salva Regola
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Elenco Regole Esistenti -->
                    <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; color: #f8fafc;">
                        Regole Attive nel Sistema (${allRules.length})
                    </h4>
                    <div style="max-height: 280px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                        <table class="data-table" style="font-size: 0.82rem;">
                            <thead>
                                <tr>
                                    <th>Parola Chiave</th>
                                    <th>Ambito</th>
                                    <th>Cartella Assegnata</th>
                                    <th>Origine</th>
                                    <th style="text-align: right;">Azione</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allRules.map(r => {
                                    const isCustom = r.id && r.id.startsWith('rule_');
                                    return `
                                        <tr>
                                            <td><code style="color:#60a5fa; font-weight:600;">${r.keyword}</code></td>
                                            <td>${r.scope === 'socio' ? '👤 Socio' : '🏛️ Generale ASD'}</td>
                                            <td><span class="badge" style="background:rgba(59,130,246,0.15); color:#93c5fd;">${r.category}</span></td>
                                            <td><span style="font-size:0.75rem; color:${isCustom ? '#34d399' : '#94a3b8'};">${isCustom ? '🧠 Appresa' : '⚙️ Predefinita'}</span></td>
                                            <td style="text-align: right;">
                                                ${isCustom ? `
                                                    <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.72rem; color: #f87171; border-color: rgba(239,68,68,0.3);" onclick="app.scanProcessor.deleteCustomSmartRule('${r.id}')" title="Elimina regola">
                                                        🗑️
                                                    </button>
                                                ` : `<span style="font-size:0.75rem; color:#64748b;">Sistema</span>`}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        renderSmartRulesModalContent() {
            const modalBody = document.querySelector('#generic-modal .modal-body');
            if (modalBody) {
                modalBody.innerHTML = this.renderSmartRulesModalHtml();
            }
        },

        handleCreateRuleFromModal() {
            const kwInput = document.getElementById('new-rule-kw');
            const scopeInput = document.getElementById('new-rule-scope');
            const catInput = document.getElementById('new-rule-cat');
            if (!kwInput || !scopeInput || !catInput) return;

            const kw = kwInput.value.trim().toLowerCase();
            const scope = scopeInput.value;
            const cat = catInput.value.trim().toLowerCase();

            if (!kw || !cat) {
                if (window.app) window.app.toast('Inserisci parola chiave e cartella di destinazione!', 'warning');
                return;
            }

            this.addCustomSmartRule({
                keyword: kw,
                scope: scope,
                docType: 'altro',
                category: cat,
                isRoot: false,
                label: cat
            });

            if (window.app) window.app.toast(`Regola per "${kw}" salvata con successo!`, 'success');
            this.renderSmartRulesModalContent();
        },

        /**
         * Aggiunge file non riconosciuti alla coda di smistamento manuale applicando Smart Rules e auto-match socio
         */
        processManualCandidates(candidateFiles) {
            const todayPlusOneYear = new Date();
            todayPlusOneYear.setFullYear(todayPlusOneYear.getFullYear() + 1);
            const defaultScadenza = todayPlusOneYear.toISOString().split('T')[0];

            for (const c of candidateFiles) {
                const detectedSocio = this.detectSocioFromFileName(c.file.name);
                const matchedRule = this.detectRuleFromFileName(c.file.name);

                let scope = 'socio';
                let docType = 'altro';
                let category = 'documenti';
                let isRoot = false;
                let appliedRuleInfo = null;

                if (matchedRule) {
                    scope = matchedRule.scope;
                    docType = matchedRule.docType;
                    category = matchedRule.category;
                    isRoot = !!matchedRule.isRoot;
                    appliedRuleInfo = matchedRule;
                } else if (detectedSocio) {
                    scope = 'socio';
                    docType = 'liberatoria';
                    category = 'liberatorie';
                }

                // Estrai una parola chiave suggerita per la regola
                let suggestedKeyword = '';
                const fnTokens = c.file.name.replace(/[^a-zA-Z0-9àèéìòù]/g, ' ').split(/\s+/).filter(t => t.length >= 4);
                if (matchedRule) {
                    suggestedKeyword = matchedRule.keyword;
                } else if (fnTokens.length > 0) {
                    suggestedKeyword = fnTokens[0].toLowerCase();
                }

                // Titolo descrittivo per documenti generali
                let generalTitle = c.file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').trim();

                const item = {
                    id: 'man_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    file: c.file,
                    fileName: c.file.name,
                    fileSize: (c.file.size / 1024).toFixed(1) + ' KB',
                    isPdf: c.isPdf,
                    thumbnail: c.thumbnail,
                    blob: new Blob([c.arrayBuffer], { type: c.file.type || (c.isPdf ? 'application/pdf' : 'image/jpeg') }),
                    
                    scope: scope, // 'socio' o 'asd'
                    selectedSocioId: detectedSocio ? detectedSocio.id : null,
                    autoDetectedSocio: !!detectedSocio,
                    generalTitle: generalTitle,

                    docType: docType, // 'liberatoria', 'certificato', 'bonifico', 'bolletta', 'fattura', 'scontrino', 'altro'
                    category: category,
                    customCategoryName: '',
                    isRoot: isRoot,
                    scadenzaCertificato: defaultScadenza,
                    
                    rememberRule: false,
                    ruleKeyword: suggestedKeyword,
                    appliedRule: appliedRuleInfo,
                    note: ''
                };
                this.state.manualQueue.push(item);
            }
        },

        // =========================================================================
        // SEZIONE 5.1: METODI SMISTAMENTO MANUALE & MODIFICHE INTERFACCIA
        // =========================================================================

        selectManualSocio(itemId, socioId) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (!item) return;
            item.selectedSocioId = socioId;

            // Se è un certificato medico e il socio ha già una data di scadenza, possiamo suggerire il rinnovo
            if (item.docType === 'certificato' && window.app && window.app.state && Array.isArray(window.app.state.soci)) {
                const s = window.app.state.soci.find(x => x.id === socioId);
                if (s && s.certificato_scadenza) {
                    try {
                        const oldDate = new Date(s.certificato_scadenza);
                        if (!isNaN(oldDate.getTime())) {
                            oldDate.setFullYear(oldDate.getFullYear() + 1);
                            item.scadenzaCertificato = oldDate.toISOString().split('T')[0];
                        }
                    } catch (e) {}
                }
            }

            this.renderResults();
        },

        changeManualScope(itemId, newScope) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (!item) return;
            item.scope = newScope;
            if (newScope === 'asd') {
                item.docType = 'bolletta';
                item.category = 'bollette utenze';
            } else {
                item.docType = 'liberatoria';
                item.category = 'liberatorie';
            }
            this.renderResults();
        },

        changeManualDocType(itemId, newType) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (!item) return;
            item.docType = newType;
            if (newType === 'liberatoria') {
                item.category = 'liberatorie';
            } else if (newType === 'certificato') {
                item.category = 'certificati medici';
            } else if (newType === 'bonifico') {
                item.category = 'bonifici';
            } else if (newType === 'altro') {
                item.category = 'documenti';
            }
            this.renderResults();
        },

        changeManualCategory(itemId, newCat) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (!item) return;
            item.category = newCat;
            this.renderResults();
        },

        changeManualCustomCat(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) item.customCategoryName = val;
        },

        changeManualIsRoot(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) item.isRoot = val;
        },

        changeManualGeneralTitle(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) item.generalTitle = val;
        },

        changeManualScadenza(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) item.scadenzaCertificato = val;
        },

        toggleManualRememberRule(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) {
                item.rememberRule = val;
                this.renderResults();
            }
        },

        changeManualRuleKeyword(itemId, val) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (item) item.ruleKeyword = val;
        },

        removeManualItem(itemId) {
            this.state.manualQueue = this.state.manualQueue.filter(x => x.id !== itemId);
            this.renderResults();
        },

        /**
         * Conferma lo smistamento manuale, salva nel File System e aggiorna IndexedDB
         */
        async confirmManualSorting(itemId) {
            const item = this.state.manualQueue.find(x => x.id === itemId);
            if (!item) return;

            const isSocio = item.scope === 'socio';
            const currentYearStr = window.app && typeof window.app.getSportsYear === 'function' ? window.app.getSportsYear() : new Date().getFullYear();
            const ext = item.fileName.split('.').pop() || (item.isPdf ? 'pdf' : 'jpg');

            let socio = null;
            let safeName = 'ASD';
            if (isSocio) {
                if (!item.selectedSocioId) {
                    if (window.app) window.app.toast('Seleziona prima il socio a cui associare il documento!', 'warning');
                    return;
                }
                socio = (window.app.state.soci || []).find(s => s.id == item.selectedSocioId);
                if (!socio) {
                    if (window.app) window.app.toast('Socio selezionato non trovato nel database.', 'danger');
                    return;
                }
                safeName = `${socio.cognome}_${socio.nome}`.replace(/[\/\s]+/g, '_').replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_\-]/g, '');
            }

            let category = item.category || 'documenti';
            if (category === 'personalizzata') {
                category = (item.customCategoryName || '').trim() || 'altri_documenti';
            }
            const isRoot = !!item.isRoot;

            let targetFileName = '';
            let typeLabel = '';

            if (isSocio) {
                if (item.docType === 'liberatoria') {
                    category = 'liberatorie';
                    typeLabel = 'Liberatoria Firmata';
                    targetFileName = `Liberatoria_Firmata_${safeName}_${currentYearStr}.${ext}`;

                    // Aggiorna anagrafica socio
                    socio.liberatoria_consegnata = true;
                    socio.liberatoria_file = targetFileName;
                    socio.liberatoria_data_acquisizione = new Date().toISOString();
                    socio.updated_at = new Date().toISOString();

                    this.addLog(`📄 Registrata liberatoria firmata per ${socio.cognome} ${socio.nome}`, 'success');
                } else if (item.docType === 'certificato') {
                    if (!item.scadenzaCertificato) {
                        if (window.app) window.app.toast('Inserisci la data di scadenza del certificato medico!', 'warning');
                        return;
                    }
                    category = 'certificati medici';
                    typeLabel = 'Certificato Medico';
                    targetFileName = `Certificato_Medico_${safeName}_scad_${item.scadenzaCertificato}.${ext}`;

                    socio.certificato_scadenza = item.scadenzaCertificato;
                    socio.certificato_file = targetFileName;
                    socio.certificato_aggiornato_il = new Date().toISOString();
                    socio.updated_at = new Date().toISOString();

                    this.addLog(`🩺 Aggiornato certificato medico socio ${socio.cognome} ${socio.nome}: nuova scadenza ${item.scadenzaCertificato}`, 'success');
                } else if (item.docType === 'bonifico') {
                    category = 'bonifici';
                    typeLabel = 'Ricevuta / Bonifico Esterno';
                    const todayStr = new Date().toISOString().split('T')[0];
                    targetFileName = `Bonifico_${safeName}_${todayStr}.${ext}`;
                    this.addLog(`💳 Archiviata contabile/bonifico per ${socio.cognome} ${socio.nome}`, 'info');
                } else {
                    typeLabel = 'Altro Documento Socio';
                    targetFileName = `Doc_${safeName}_${item.fileName}`;
                }
            } else {
                // Ambito GENERALE ASD / SPESE
                const cleanTitle = (item.generalTitle || 'Doc_ASD').replace(/[\/\s]+/g, '_').replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ_\-]/g, '');
                const todayStr = new Date().toISOString().split('T')[0];

                if (item.docType === 'bolletta') {
                    typeLabel = 'Bolletta Utenze';
                    targetFileName = `Bolletta_${cleanTitle}_${todayStr}.${ext}`;
                } else if (item.docType === 'fattura') {
                    typeLabel = 'Fattura Fornitore';
                    targetFileName = `Fattura_${cleanTitle}_${todayStr}.${ext}`;
                } else if (item.docType === 'scontrino') {
                    typeLabel = 'Scontrino / Spesa Cassa';
                    targetFileName = `Scontrino_${cleanTitle}_${todayStr}.${ext}`;
                } else if (item.docType === 'contratto') {
                    typeLabel = 'Contratto / Accordo';
                    targetFileName = `Contratto_${cleanTitle}.${ext}`;
                } else {
                    typeLabel = 'Documento Generale ASD';
                    targetFileName = `ASD_${cleanTitle}.${ext}`;
                }
                this.addLog(`🏛️ Archiviato documento societario: ${typeLabel} (${targetFileName}) in "${category}"`, 'info');
            }

            // Memorizza regola se l'utente ha spuntato "Memorizza questa regola"
            if (item.rememberRule && item.ruleKeyword && item.ruleKeyword.trim()) {
                this.addCustomSmartRule({
                    keyword: item.ruleKeyword.trim(),
                    scope: item.scope,
                    docType: item.docType,
                    category: category,
                    isRoot: isRoot,
                    label: typeLabel
                });
                this.addLog(`🧠 Nuova regola memorizzata: "${item.ruleKeyword.trim()}" ➔ Cartella "${category}"`, 'success');
            }

            // Salva il file nel File System Access API
            if (window.app && typeof window.app.saveDocumentFS === 'function') {
                await window.app.saveDocumentFS(targetFileName, item.blob, category, currentYearStr, true, isRoot);
            }

            // Se è una liberatoria firmata, rimuove automaticamente la bozza vuota precompilata del socio
            if (isSocio && item.docType === 'liberatoria' && socio) {
                await this.cleanObsoleteUnsignedLiberatorie(socio, currentYearStr);
            }

            // Salva nel database IndexedDB per aggiornare anche gli indicatori Dashboard e stato soci!
            if (window.app && typeof window.app.saveAll === 'function') {
                window.app.saveAll();
            }

            // Rimuovi dalla coda di smistamento manuale
            this.state.manualQueue = this.state.manualQueue.filter(x => x.id !== itemId);

            // Aggiungi ai documenti archiviati con successo
            const savedPath = isRoot ? `${category}/${targetFileName}` : `anno ${currentYearStr}/${category}/${targetFileName}`;
            const archivedRecord = {
                id: 'arc_' + Date.now(),
                title: `${typeLabel} — ${isSocio && socio ? (socio.cognome + ' ' + socio.nome) : (item.generalTitle || 'ASD')}`,
                type: typeLabel,
                tipoDoc: item.docType.toUpperCase(),
                socioName: isSocio && socio ? `${socio.cognome} ${socio.nome}` : 'Generale ASD',
                socioId: isSocio && socio ? socio.id : null,
                fileName: targetFileName,
                path: savedPath,
                time: new Date().toLocaleTimeString('it-IT'),
                pageInfo: 'Smistato a mano',
                thumbnail: item.thumbnail,
                blob: item.blob,
                blobUrl: URL.createObjectURL(item.blob)
            };
            this.state.archived.unshift(archivedRecord);

            if (window.app) {
                const msg = isSocio && item.docType === 'liberatoria'
                    ? `Liberatoria firmata archiviata per ${socio.cognome} ${socio.nome}! Il modulo vuoto precedente è stato rimosso.`
                    : `Documento archiviato con successo in "${category}"!`;
                window.app.toast(msg, 'success');
            }

            this.renderResults();
        },

        // =========================================================================
        // SEZIONE 6: GENERATORI MODULI SOCI STAMPABILI (LIBERATORIE / MANLEVE)
        // =========================================================================

        /**
         * Modulo Iscrizione e Liberatoria / Manleva Adulti con QR Code Univoco
         */
        async stampaLiberatoriaAdulto(socioId) {
            const s = (window.app.state.soci || []).find(x => x.id === socioId);
            if (!s) return;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const set = window.app.state.settings || {};
            const currentYear = new Date().getFullYear();

            // Intestazione Palestra
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.text((set.asdName || 'ASSOCIAZIONE SPORTIVA DILETTANTISTICA').toUpperCase(), 20, 20);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(set.address || '', 20, 25);
            doc.text("C.F. / P.IVA: " + (set.pIva || '-'), 20, 29);

            // Titolo Modulo
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text("DOMANDA DI ISCRIZIONE, LIBERATORIA E MANLEVA RESPONSABILITÀ", 105, 42, null, null, "center");

            // Dati Socio Precompilati
            doc.setFillColor(248, 250, 252);
            doc.rect(20, 48, 170, 38, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.rect(20, 48, 170, 38, 'S');

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("DATI ANAGRAFICI DEL SOCIO / ATLETA:", 24, 54);
            doc.setFont("helvetica", "normal");
            doc.text(`Cognome e Nome: ${s.cognome} ${s.nome}`, 24, 61);
            doc.text(`Nato a: ${s.luogo_nascita || '__________'} il: ${window.app.formatDate(s.data_nascita)}`, 24, 68);
            doc.text(`Codice Fiscale: ${s.cf || '____________________'}  |  Telefono: ${s.tel || '-'}`, 24, 75);
            doc.text(`Residenza: ${s.residenza || '______________________________'}  |  Email: ${s.email || '-'}`, 24, 82);

            // Clausole e Dichiarazioni
            let y = 94;
            doc.setFontSize(9);
            const lineSpace = 5;

            doc.setFont("helvetica", "bold");
            doc.text("DICHIARAZIONI, PATTI E CONSENSI:", 20, y);
            y += lineSpace + 2;
            doc.setFont("helvetica", "normal");

            const clauses = [
                "1) DOMANDA DI AMMISSIONE: Il sottoscritto chiede l'ammissione a socio dell'associazione per la stagione sportiva in corso, impegnandosi ad osservare lo Statuto, i regolamenti interni e le delibere degli organi associativi.",
                "2) IDONEITÀ MEDICO-SPORTIVA: Dichiara di essere in stato di buona salute fisica e privo di controindicazioni alla pratica delle attività sportive dell'ASD. Si impegna a depositare e mantenere rinnovato il Certificato Medico di idoneità.",
                "3) MANLEVA RESPONSABILITÀ: Esonera espressamente l'Associazione, il Presidente e i tecnici istruttori da ogni responsabilità civile o penale per eventuali infortuni, danni a cose o persone durante la frequenza delle attività e l'uso degli attrezzi.",
                "4) REGOLAMENTO STRUTTURA: Dichiara di rispettare le norme igienico-sanitarie, di decoro e sicurezza in uso nei locali dell'ASD.",
                "5) PRIVACY (GDPR 2016/679): Presta il libero consenso al trattamento dei dati personali forniti per le finalità istituzionali e amministrative connesse alla qualifica di socio e atleta tesserato.",
                "6) DIRITTO D'IMMAGINE: Autorizza l'eventuale pubblicazione di fotografie o riprese video effettuate durante manifestazioni, saggi o corsi sui canali istituzionali dell'Associazione, a titolo gratuito e senza fini commerciali."
            ];

            clauses.forEach(p => {
                const lines = doc.splitTextToSize(p, 170);
                doc.text(lines, 20, y);
                y += (lines.length * 4.2) + 2.5;
            });

            y += 8;
            doc.text("Luogo e Data: _____________________________", 20, y);
            doc.text("Firma del Socio / Atleta:", 120, y);
            y += 12;
            doc.line(120, y, 185, y);
            doc.setFontSize(8);
            doc.text("(Firma leggibile per esteso)", 135, y + 4);

            // STAMPA QR CODE SU OGNI PAGINA
            await this.stampQrOnJsPdf(doc, 'LIB', `SOCIO_${s.id}`, currentYear);

            const fileName = `Liberatoria_Adulto_${s.cognome}_${s.nome}.pdf`;
            const blob = doc.output('blob');
            const sportsYear = window.app.getSportsYear();
            await window.app.saveDocumentFS(fileName, blob, 'liberatorie', sportsYear, true);

            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        },

        // =========================================================================
        // SEZIONE 7: RENDERING INTERFACCIA UTENTE (INGHIOTTITOIO & RISULTATI)
        // =========================================================================

        renderPage() {
            this.init();
            const main = document.getElementById('main-content');
            if (!main) return;

            main.classList.remove('page-schede-atleti', 'page-verbali');
            main.style.overflowY = 'auto';
            main.style.display = 'block';

            main.innerHTML = `
                <div class="page-content" style="max-width: 1280px; margin: 0 auto; padding: 1.5rem 1.25rem 5rem 1.25rem; width: 100%; box-sizing: border-box;">
                    
                    <!-- Header Pagina -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h1 style="margin: 0; font-size: 1.65rem; font-weight: 700; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                                <span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2)); border:1px solid rgba(59,130,246,0.3); font-size:1.3rem;">📥</span>
                                Acquisizione Documenti &amp; Scansioni
                            </h1>
                            <p style="margin: 6px 0 0 0; color: var(--text-muted); font-size: 0.9rem;">
                                Inghiottitoio intelligente: riconoscimento automatico QR Code, fusione fogli multipli, archiviazione in cartella e smistamento manuale rapido.
                            </p>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            <button class="btn btn-outline" onclick="app.scanProcessor.openSmartRulesModal()" style="display:inline-flex; align-items:center; gap:6px;" title="Visualizza e gestisci le regole di smistamento intelligenti">
                                <span>⚙️ Regole Intelligenti</span>
                            </button>
                            <button class="btn btn-outline" onclick="app.scanProcessor.checkFolderStatus()" style="display:inline-flex; align-items:center; gap:6px;" title="Verifica o collega la cartella di archiviazione">
                                <span id="scan-folder-indicator">📁 Cartella Documenti</span>
                            </button>
                            <button class="btn btn-outline" onclick="app.scanProcessor.clearQueue()" style="display:inline-flex; align-items:center; gap:6px;" title="Pulisci log e code di elaborazione">
                                <span>🧹 Pulisci Coda</span>
                            </button>
                        </div>
                    </div>

                    <!-- AREA SUPERIORE: INGHIOTTITOIO (DROPZONE) -->
                    <div class="glass-card" style="margin-bottom: 1.5rem; padding: 1.8rem; border: 2px dashed rgba(59, 130, 246, 0.45); background: rgba(30, 41, 59, 0.5); text-align: center; border-radius: 16px; transition: all 0.2s;" id="scan-dropzone">
                        <input type="file" id="scan-file-input" multiple accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf" style="display: none;" onchange="app.scanProcessor.handleFileInput(this)">
                        
                        <div style="margin-bottom: 1rem;">
                            <div style="width: 64px; height: 64px; margin: 0 auto; border-radius: 50%; background: rgba(59, 130, 246, 0.12); display: flex; align-items: center; justify-content: center; font-size: 2.2rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                                📄⚡
                            </div>
                        </div>

                        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 6px 0; color: #f8fafc;">
                            Trascina qui i tuoi documenti scansionati (PDF, JPG, PNG)
                        </h3>
                        <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 680px; margin: 0 auto 1.2rem auto; line-height: 1.5;">
                            Supporta fogli singoli, scansioni multipagina, ricevute con QR e documenti liberi (es. certificati medici o bonifici). Il motore client-side unisce automaticamente i fogli e archivia nel percorso corrispondente.
                        </p>

                        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="document.getElementById('scan-file-input').click()" style="padding: 10px 24px; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px;">
                                <span>📂 Seleziona File dal Computer</span>
                            </button>
                        </div>

                        <!-- Badge funzionalità -->
                        <div style="display: flex; justify-content: center; gap: 15px; margin-top: 1.5rem; flex-wrap: wrap; font-size: 0.78rem; color: #94a3b8;">
                            <span style="display: flex; align-items: center; gap: 4px;"><strong style="color:#10b981;">✓</strong> Decodifica QR Code istantanea</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><strong style="color:#10b981;">✓</strong> Unione automatica fogli sciolti (pdf-lib)</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><strong style="color:#10b981;">✓</strong> Aggiornamento scadenze visite mediche</span>
                            <span style="display: flex; align-items: center; gap: 4px;"><strong style="color:#10b981;">✓</strong> 100% Offline (senza server esterni)</span>
                        </div>
                    </div>

                    <!-- BARRA DI AVANZAMENTO E TERMINALE LOG IN TEMPO REALE -->
                    <div class="glass-card" id="scan-progress-card" style="margin-bottom: 1.5rem; padding: 1.2rem; display: ${this.state.processing || this.state.logs.length > 0 ? 'block' : 'none'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                            <div style="font-weight: 600; font-size: 0.88rem; color: #e2e8f0;" id="scan-progress-label">
                                ${this.state.processing ? `Elaborazione in corso (${this.state.processedFiles}/${this.state.totalFiles})...` : 'Registro Operazioni Scansione'}
                            </div>
                            <div style="font-size: 0.82rem; font-weight: 700; color: #60a5fa;" id="scan-progress-percent">
                                ${this.state.progressPercent}%
                            </div>
                        </div>

                        <div style="height: 8px; width: 100%; background: rgba(255, 255, 255, 0.08); border-radius: 4px; overflow: hidden; margin-bottom: 0.8rem;">
                            <div id="scan-progress-bar" style="height: 100%; width: ${this.state.progressPercent}%; background: linear-gradient(90deg, #3b82f6, #10b981); transition: width 0.2s ease;"></div>
                        </div>

                        <div id="scan-logs-container" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 12px; max-height: 130px; overflow-y: auto; font-family: monospace; font-size: 0.78rem; line-height: 1.5;">
                            ${this.renderLogsHtml()}
                        </div>
                    </div>

                    <!-- AREA RISULTATI ED ELABORAZIONE -->
                    <div id="scan-results-area">
                        ${this.renderResultsHtml()}
                    </div>

                </div>
            `;

            this.setupDropzoneEvents();
            this.checkFolderStatus();
        },

        setupDropzoneEvents() {
            const dz = document.getElementById('scan-dropzone');
            if (!dz) return;

            ['dragenter', 'dragover'].forEach(eventName => {
                dz.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.style.borderColor = '#3b82f6';
                    dz.style.background = 'rgba(59, 130, 246, 0.12)';
                    dz.style.transform = 'scale(1.005)';
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dz.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.style.borderColor = 'rgba(59, 130, 246, 0.45)';
                    dz.style.background = 'rgba(30, 41, 59, 0.5)';
                    dz.style.transform = 'scale(1)';
                }, false);
            });

            dz.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files && files.length > 0) {
                    this.processFiles(Array.from(files));
                }
            }, false);
        },

        handleFileInput(input) {
            if (input.files && input.files.length > 0) {
                this.processFiles(Array.from(input.files));
                input.value = '';
            }
        },

        updateProgressUI() {
            const card = document.getElementById('scan-progress-card');
            const bar = document.getElementById('scan-progress-bar');
            const percent = document.getElementById('scan-progress-percent');
            const label = document.getElementById('scan-progress-label');

            if (card) {
                card.style.display = (this.state.processing || this.state.logs.length > 0) ? 'block' : 'none';
            }
            if (bar) bar.style.width = `${this.state.progressPercent}%`;
            if (percent) percent.innerText = `${this.state.progressPercent}%`;
            if (label) {
                if (this.state.processing) {
                    label.innerText = `Elaborazione file ${this.state.processedFiles} di ${this.state.totalFiles} (${this.state.currentFileName})...`;
                } else {
                    label.innerText = 'Registro Operazioni Scansione (Completato)';
                }
            }
        },

        renderLogsHtml() {
            if (this.state.logs.length === 0) {
                return `<div style="color: #64748b; font-style: italic;">In attesa di file da acquisire...</div>`;
            }
            return this.state.logs.map(log => {
                let color = '#94a3b8';
                if (log.type === 'success') color = '#34d399';
                if (log.type === 'warning') color = '#fbbf24';
                if (log.type === 'error') color = '#f87171';
                return `<div style="color: ${color}; margin-bottom: 2px;">
                    <span style="color: #64748b;">[${log.time}]</span> ${log.text}
                </div>`;
            }).join('');
        },

        renderLogs() {
            const container = document.getElementById('scan-logs-container');
            if (container) {
                container.innerHTML = this.renderLogsHtml();
            }
        },

        clearQueue() {
            this.state.manualQueue = [];
            this.state.logs = [];
            this.state.anomalies = [];
            this.state.processing = false;
            this.state.progressPercent = 0;
            this.renderPage();
            if (window.app) window.app.toast('Coda e log ripuliti.', 'info');
        },

        async checkFolderStatus() {
            const el = document.getElementById('scan-folder-indicator');
            if (!el) return;

            if (window.app && typeof window.app.getOutputFolder === 'function') {
                const handle = await window.app.getOutputFolder();
                if (handle && handle.name) {
                    el.innerHTML = `📁 <span style="color:#34d399; font-weight:600;">${handle.name}</span>`;
                    el.title = `Cartella connessa: ${handle.name}`;
                } else {
                    el.innerHTML = `⚠️ <span style="color:#fbbf24;">Collega Cartella</span>`;
                    el.title = `Nessuna cartella selezionata: clicca per collegarla`;
                    el.parentElement.onclick = () => {
                        if (window.app.setupOutputFolder) {
                            window.app.setupOutputFolder().then(() => this.checkFolderStatus());
                        }
                    };
                }
            }
        },

        renderResultsHtml() {
            const archivedCount = this.state.archived.length;
            const manualCount = this.state.manualQueue.length;
            const anomaliesCount = this.state.anomalies.length;

            return `
                <div style="display: flex; flex-direction: column; gap: 2rem;">

                    <!-- EVENTUALI ANOMALIE FOGLI MANCANTI -->
                    ${anomaliesCount > 0 ? `
                        <div class="glass-card" style="border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08); padding: 1.2rem;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.8rem; color: #f87171;">
                                <span style="font-size: 1.3rem;">⚠️</span>
                                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Anomalie Rilevate: Fogli Mancanti (${anomaliesCount})</h3>
                            </div>
                            <p style="color: #cbd5e1; font-size: 0.85rem; margin-bottom: 1rem;">
                                I seguenti documenti contengono un QR code dichiarante più fogli, ma non sono state trovate tutte le pagine sequenziali dichiarate. L'archiviazione automatica è stata sospesa per prevenire fascicoli incompleti.
                            </p>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${this.state.anomalies.map(ano => `
                                    <div style="background: rgba(15, 23, 42, 0.6); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                        <div>
                                            <strong>${ano.tipoDoc} — ${ano.idSocioRaw}</strong> (Anno ${ano.anno})
                                            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 3px;">
                                                Pagine acquisite: <span style="color:#60a5fa;">[${ano.pagesFound.join(', ')}]</span> su <span style="color:#f8fafc;">${ano.totPagine}</span> totali. 
                                                <strong style="color: #f87171;">Mancano: [${ano.missingPages.join(', ')}]</strong>
                                            </div>
                                        </div>
                                        <button class="btn btn-outline" style="border-color: #f87171; color: #f87171; font-size: 0.8rem; padding: 4px 10px;" onclick="document.getElementById('scan-file-input').click()">
                                            ➕ Trascina Pagina Mancante
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- SEZIONE 1: DOCUMENTI ARCHIVIATI CON SUCCESSO -->
                    <div class="glass-card" style="padding: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #f8fafc;">
                                    ✅ Documenti Archiviati con Successo
                                </h2>
                                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3);">
                                    ${archivedCount}
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                File riconosciuti tramite QR Code o smistati e salvati in cartella
                            </div>
                        </div>

                        ${archivedCount === 0 ? `
                            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                                <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4;">📂</div>
                                <div style="font-weight: 500;">Nessun documento archiviato in questa sessione.</div>
                                <div style="font-size: 0.8rem; margin-top: 4px;">Trascina le scansioni nell'inghiottitoio superiore per iniziare.</div>
                            </div>
                        ` : `
                            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 60px;">Anteprima</th>
                                            <th>Documento &amp; Socio</th>
                                            <th>Tipologia</th>
                                            <th>Pagine</th>
                                            <th>Percorso File System</th>
                                            <th>Orario</th>
                                            <th style="text-align: right;">Azione</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.state.archived.map(arc => `
                                            <tr>
                                                <td style="padding: 6px;">
                                                    ${arc.thumbnail ? `
                                                        <img src="${arc.thumbnail}" style="width: 38px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="app.scanProcessor.openPreviewModal('${arc.thumbnail}', '${arc.title.replace(/'/g, "\\'")}')" title="Clicca per ingrandire">
                                                    ` : `
                                                        <div style="width: 38px; height: 50px; background: rgba(255,255,255,0.05); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📄</div>
                                                    `}
                                                </td>
                                                <td>
                                                    <div style="font-weight: 600; color: #f8fafc;">${arc.title}</div>
                                                    <div style="font-size: 0.78rem; color: var(--text-muted);">${arc.fileName}</div>
                                                </td>
                                                <td>
                                                    <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">
                                                        ${arc.type}
                                                    </span>
                                                </td>
                                                <td style="font-size: 0.85rem; color: #94a3b8;">
                                                    ${arc.pageInfo || '1 foglio'}
                                                </td>
                                                <td style="font-size: 0.78rem; font-family: monospace; color: #cbd5e1;">
                                                    ${arc.path}
                                                </td>
                                                <td style="font-size: 0.82rem; color: #94a3b8;">
                                                    ${arc.time}
                                                </td>
                                                <td style="text-align: right;">
                                                    ${arc.blobUrl ? `
                                                        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;" onclick="window.open('${arc.blobUrl}', '_blank')">
                                                            <span>👁️ Visualizza</span>
                                                        </button>
                                                    ` : `
                                                        <span style="font-size: 0.78rem; color: #64748b;">Archiviato</span>
                                                    `}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>

                    <!-- SEZIONE 2: DOCUMENTI DA SMISTARE MANUALMENTE (SENZA QR CODE) -->
                    <div class="glass-card" style="padding: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #f8fafc;">
                                    ⚠️ Documenti da Smistare Manualmente
                                </h2>
                                <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.3);">
                                    ${manualCount} da smistare
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                File privi di QR Code (Certificati medici, bonifici esterni, giustificativi)
                            </div>
                        </div>

                        ${manualCount === 0 ? `
                            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
                                <div style="font-size: 2.2rem; margin-bottom: 0.4rem; opacity: 0.4;">✨</div>
                                <div style="font-weight: 500;">Nessun documento in attesa di smistamento manuale.</div>
                                <div style="font-size: 0.8rem; margin-top: 4px;">Tutti i file processati sono stati riconosciuti automaticamente tramite QR Code.</div>
                            </div>
                        ` : `
                            <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                                ${this.state.manualQueue.map(item => this.renderManualItemCard(item)).join('')}
                            </div>
                        `}
                    </div>

                </div>
            `;
        },

        renderManualItemCard(item) {
            const sociList = (window.app && window.app.state && Array.isArray(window.app.state.soci)) ? window.app.state.soci : [];
            const selectedSocio = item.selectedSocioId ? sociList.find(s => s.id == item.selectedSocioId) : null;
            const isSocio = item.scope === 'socio';

            return `
                <div class="glass-card" style="padding: 1.25rem; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; display: grid; grid-template-columns: 110px 1fr; gap: 1.2rem; align-items: start;" id="card-${item.id}">
                    
                    <!-- Colonna Sinistra: Miniatura con zoom al click -->
                    <div style="text-align: center;">
                        ${item.thumbnail ? `
                            <img src="${item.thumbnail}" style="width: 100px; height: 130px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4);" onclick="app.scanProcessor.openPreviewModal('${item.thumbnail}', '${item.fileName.replace(/'/g, "\\'")}')" title="Clicca per visualizzare ingrandito">
                        ` : `
                            <div style="width: 100px; height: 130px; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 2rem; border: 1px solid rgba(255,255,255,0.1);">
                                📄
                            </div>
                        `}
                        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.fileName}">
                            ${item.fileName}
                        </div>
                        <div style="font-size: 0.68rem; color: #64748b;">
                            ${item.fileSize}
                        </div>
                    </div>

                    <!-- Colonna Destra: Modulo di Smistamento Avanzato -->
                    <div>
                        <!-- SELETTORE AMBITO: Socio vs Generale ASD -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; flex-wrap: wrap; gap: 8px;">
                            <div style="display: inline-flex; background: rgba(15, 23, 42, 0.8); padding: 3px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                                <button type="button" class="btn ${isSocio ? 'btn-primary' : 'btn-outline'}" style="font-size: 0.78rem; padding: 4px 12px; border: none; border-radius: 6px;" onclick="app.scanProcessor.changeManualScope('${item.id}', 'socio')">
                                    👤 Documento Socio
                                </button>
                                <button type="button" class="btn ${!isSocio ? 'btn-primary' : 'btn-outline'}" style="font-size: 0.78rem; padding: 4px 12px; border: none; border-radius: 6px;" onclick="app.scanProcessor.changeManualScope('${item.id}', 'asd')">
                                    🏛️ Generale ASD / Spese
                                </button>
                            </div>

                            ${item.appliedRule ? `
                                <div style="font-size: 0.74rem; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
                                    <span>✨ Regola applicata:</span>
                                    <strong style="color: #6ee7b7;">"${item.appliedRule.keyword}"</strong> ➔ <span>${item.category}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                            
                            ${isSocio ? `
                                <!-- CAMPO SOCIO -->
                                <div class="form-group" style="margin: 0; position: relative;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                        <label style="font-size: 0.8rem; font-weight: 600; color: #cbd5e1; margin: 0;">
                                            👤 Associa a Socio:
                                        </label>
                                        ${item.autoDetectedSocio && selectedSocio ? `
                                            <span style="font-size: 0.68rem; color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                                ✨ Rilevato dal nome file
                                            </span>
                                        ` : ''}
                                    </div>
                                    
                                    ${selectedSocio ? `
                                        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; border-radius: 6px; padding: 6px 10px;">
                                            <div style="font-size: 0.85rem; font-weight: 600; color: #93c5fd;">
                                                ${selectedSocio.cognome} ${selectedSocio.nome} 
                                                <span style="font-size: 0.75rem; font-weight: normal; color: #cbd5e1;">(CF: ${selectedSocio.cf || '-'})</span>
                                            </div>
                                            <button type="button" onclick="app.scanProcessor.selectManualSocio('${item.id}', null)" style="background: none; border: none; color: #f87171; cursor: pointer; font-size: 1rem; padding: 0 4px;" title="Cambia socio">&times;</button>
                                        </div>
                                    ` : `
                                        <input type="text" class="form-control" placeholder="Cerca cognome, nome, CF..." oninput="app.scanProcessor.handleSocioSearch(this, '${item.id}')" style="font-size: 0.85rem; padding: 7px 10px;">
                                        <div id="dropdown-soci-${item.id}" style="display: none; position: absolute; top: 100%; left: 0; right: 0; max-height: 180px; overflow-y: auto; background: #1e293b; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; z-index: 50; box-shadow: 0 8px 24px rgba(0,0,0,0.5);"></div>
                                    `}
                                </div>

                                <!-- TIPOLOGIA DOCUMENTO SOCIO -->
                                <div class="form-group" style="margin: 0;">
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; color: #cbd5e1;">
                                        📋 Tipologia Documento:
                                    </label>
                                    <select class="form-control" style="font-size: 0.85rem; padding: 7px 10px;" onchange="app.scanProcessor.changeManualDocType('${item.id}', this.value)">
                                        <option value="liberatoria" ${item.docType === 'liberatoria' ? 'selected' : ''}>📄 Liberatoria / Manleva Firmata</option>
                                        <option value="certificato" ${item.docType === 'certificato' ? 'selected' : ''}>🩺 Certificato Medico</option>
                                        <option value="bonifico" ${item.docType === 'bonifico' ? 'selected' : ''}>💳 Ricevuta / Bonifico Esterno</option>
                                        <option value="altro" ${item.docType === 'altro' ? 'selected' : ''}>📁 Altro Documento Socio</option>
                                    </select>
                                </div>

                                <!-- CAMPO CONDIZIONALE SCADENZA SE CERTIFICATO -->
                                ${item.docType === 'certificato' ? `
                                    <div class="form-group" style="margin: 0;">
                                        <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; color: #34d399;">
                                            📅 Scadenza Certificato:
                                        </label>
                                        <input type="date" class="form-control" value="${item.scadenzaCertificato || ''}" onchange="app.scanProcessor.changeManualScadenza('${item.id}', this.value)" style="font-size: 0.85rem; padding: 6px 10px; border-color: rgba(16, 185, 129, 0.4);">
                                        <span style="font-size: 0.7rem; color: #94a3b8; display: block; margin-top: 2px;">
                                            Aggiorna scadenza e KPI Dashboard.
                                        </span>
                                    </div>
                                ` : (item.docType === 'liberatoria' ? `
                                    <div style="font-size: 0.78rem; color: #93c5fd; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px; padding: 8px; align-self: center;">
                                        ✅ <strong>Sostituzione Automatica:</strong> Il modulo vuoto precedente verrà rimosso e il socio risulterà con <em>Liberatoria Consegnata ✔</em>.
                                    </div>
                                ` : `
                                    <div style="font-size: 0.78rem; color: #94a3b8; align-self: center; padding-top: 10px;">
                                        Verrà salvato nella cartella documenti del socio.
                                    </div>
                                `)}
                            ` : `
                                <!-- CAMPI GENERALE ASD / SPESE -->
                                <div class="form-group" style="margin: 0;">
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; color: #cbd5e1;">
                                        🏷️ Intestazione / Fornitore / Oggetto:
                                    </label>
                                    <input type="text" class="form-control" value="${(item.generalTitle || '').replace(/"/g, '&quot;')}" onchange="app.scanProcessor.changeManualGeneralTitle('${item.id}', this.value)" placeholder="es. Enel Energia, Decathlon, Affitto" style="font-size: 0.85rem; padding: 7px 10px;">
                                </div>

                                <div class="form-group" style="margin: 0;">
                                    <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; color: #cbd5e1;">
                                        📁 Cartella / Tipologia Spesa:
                                    </label>
                                    <select class="form-control" style="font-size: 0.85rem; padding: 7px 10px;" onchange="app.scanProcessor.changeManualCategory('${item.id}', this.value)">
                                        <option value="bollette utenze" ${item.category === 'bollette utenze' ? 'selected' : ''}>💡 Bollette Utenze (Luce/Gas/Acqua)</option>
                                        <option value="fatture acquisti" ${item.category === 'fatture acquisti' ? 'selected' : ''}>🧾 Fatture Acquisti / Fornitori</option>
                                        <option value="scontrini e rimborsi" ${item.category === 'scontrini e rimborsi' ? 'selected' : ''}>🎟️ Scontrini / Spese Cassa</option>
                                        <option value="contratti e affitti" ${item.category === 'contratti e affitti' ? 'selected' : ''}>📑 Contratti / Locazioni</option>
                                        <option value="verbali direttivo" ${item.category === 'verbali direttivo' ? 'selected' : ''}>🏛️ Verbali Direttivo</option>
                                        <option value="personalizzata" ${item.category === 'personalizzata' ? 'selected' : ''}>➕ Nuova Cartella Personalizzata...</option>
                                    </select>
                                </div>

                                ${item.category === 'personalizzata' ? `
                                    <div class="form-group" style="margin: 0;">
                                        <label style="display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; color: #60a5fa;">
                                            ✏️ Nome Nuova Cartella:
                                        </label>
                                        <input type="text" class="form-control" value="${(item.customCategoryName || '').replace(/"/g, '&quot;')}" onchange="app.scanProcessor.changeManualCustomCat('${item.id}', this.value)" placeholder="es. manutenzioni impianti" style="font-size: 0.85rem; padding: 6px 10px; border-color: #60a5fa;">
                                        <div style="margin-top: 4px;">
                                            <label style="font-size: 0.74rem; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                                <input type="checkbox" ${item.isRoot ? 'checked' : ''} onchange="app.scanProcessor.changeManualIsRoot('${item.id}', this.checked)">
                                                Cartella radice permanente (fuori dall'anno)
                                            </label>
                                        </div>
                                    </div>
                                ` : `
                                    <div style="font-size: 0.78rem; color: #94a3b8; align-self: center; padding-top: 10px;">
                                        Verrà salvato in <code>anno ${window.app ? window.app.getSportsYear() : ''}/${item.category}</code>.
                                    </div>
                                `}
                            `}

                        </div>

                        <!-- Riquadro Apprendimento Regola (Smart Rule) -->
                        <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 12px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <label style="font-size: 0.78rem; color: #e2e8f0; display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0;">
                                <input type="checkbox" ${item.rememberRule ? 'checked' : ''} onchange="app.scanProcessor.toggleManualRememberRule('${item.id}', this.checked)">
                                <span>🧠 <strong>Memorizza questa regola</strong> per i prossimi file simili</span>
                            </label>
                            ${item.rememberRule ? `
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 0.75rem; color: #94a3b8;">Parola chiave:</span>
                                    <input type="text" class="form-control" value="${(item.ruleKeyword || '').replace(/"/g, '&quot;')}" onchange="app.scanProcessor.changeManualRuleKeyword('${item.id}', this.value)" style="font-size: 0.78rem; padding: 3px 8px; width: 140px; border-color: #3b82f6;">
                                </div>
                            ` : ''}
                        </div>

                        <!-- Riga Pulsanti Azione -->
                        <div style="display: flex; justify-content: flex-end; gap: 8px; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                            <button class="btn btn-outline" style="border-color: rgba(239, 68, 68, 0.3); color: #f87171; font-size: 0.8rem; padding: 6px 12px;" onclick="app.scanProcessor.removeManualItem('${item.id}')" title="Rimuovi da questa sessione">
                                🗑️ Rimuovi
                            </button>
                            <button class="btn btn-primary" style="font-size: 0.85rem; padding: 6px 16px; font-weight: 600;" onclick="app.scanProcessor.confirmManualSorting('${item.id}')">
                                💾 Archivia Documento
                            </button>
                        </div>

                    </div>
                </div>
            `;
        },

        handleSocioSearch(input, itemId) {
            const dropdown = document.getElementById(`dropdown-soci-${itemId}`);
            if (!dropdown) return;

            const q = input.value.trim().toLowerCase();
            if (!q || q.length < 1) {
                dropdown.style.display = 'none';
                return;
            }

            const soci = (window.app && window.app.state && Array.isArray(window.app.state.soci)) ? window.app.state.soci : [];
            const matches = soci.filter(s => {
                const full = `${s.cognome || ''} ${s.nome || ''}`.toLowerCase();
                const cf = (s.cf || '').toLowerCase();
                return full.includes(q) || cf.includes(q);
            }).slice(0, 8);

            if (matches.length === 0) {
                dropdown.innerHTML = `<div style="padding: 8px 12px; font-size: 0.8rem; color: #94a3b8;">Nessun socio trovato per "${q}".</div>`;
            } else {
                dropdown.innerHTML = matches.map(s => `
                    <div style="padding: 8px 12px; font-size: 0.82rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='transparent'" onclick="app.scanProcessor.selectManualSocio('${itemId}', ${s.id})">
                        <strong style="color:#f8fafc;">${s.cognome} ${s.nome}</strong> 
                        <span style="color:#94a3b8; font-size: 0.74rem;">(CF: ${s.cf || '-'})</span>
                    </div>
                `).join('');
            }
            dropdown.style.display = 'block';
        },

        renderResults() {
            const area = document.getElementById('scan-results-area');
            if (area) {
                area.innerHTML = this.renderResultsHtml();
            }
        },

        openPreviewModal(imgSrc, title) {
            if (window.app && typeof window.app.openModal === 'function') {
                window.app.openModal(`Anteprima Scansione: ${title}`, `
                    <div style="text-align: center; max-height: 80vh; overflow-y: auto;">
                        <img src="${imgSrc}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                    </div>
                `);
            }
        }
    };

    // Esposizione globale
    window.scanModule = scanModule;

    // Integrazione dinamica con l'oggetto app principale
    function attachToApp() {
        if (!window.app) {
            setTimeout(attachToApp, 50);
            return;
        }

        window.app.scanProcessor = scanModule;
        window.app.renderAcquisizioneScansioni = function () {
            scanModule.renderPage();
        };

        // Aggancia i metodi di stampa con QR code
        window.app.stampaLiberatoriaAdulto = function (id) {
            return scanModule.stampaLiberatoriaAdulto(id);
        };

        // Funzione per generare Data URL QR code
        window.app.generateQrDataUrl = function (payload, size = 120) {
            return scanModule.generateQrDataUrl(payload, size);
        };

        window.app.stampQrOnJsPdf = function (doc, tipoDoc, idDoc, sportsYear) {
            return scanModule.stampQrOnJsPdf(doc, tipoDoc, idDoc, sportsYear);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachToApp);
    } else {
        attachToApp();
    }
})();
