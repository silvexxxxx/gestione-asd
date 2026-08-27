</script>

    <style>
        :root {
            --bg-deep: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.8);
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --accent: #8b5cf6;
            --text-main: #f1f5f9;
            --text-muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.1);
            --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        html,
        body {
            height: 100%;
            margin: 0;
            overflow: hidden;
        }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: 'Inter', sans-serif;
            background-image:
                radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 40%);
        }

        /* Notifications */
        #toast-container {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
        }

        .toast {
            background: var(--bg-card);
            backdrop-filter: blur(8px);
            border: 1px solid var(--border);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-top: 0.5rem;
            box-shadow: var(--glass-shadow);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease forwards;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }

            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        /* Layout */
        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        /* Top Navbar (previously Sidebar) */
        aside {
            background: rgba(15, 23, 42, 0.98);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--border);
            padding: 0.75rem 2rem;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            position: sticky;
            top: 0;
            z-index: 1000;
            height: auto;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
        }

        .nav-links {
            display: flex;
            flex-direction: row;
            gap: 4px;
            flex-wrap: wrap;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 10px;
            color: var(--text-muted);
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .nav-item:hover,
        .nav-item.active {
            background: rgba(59, 130, 246, 0.1);
            color: var(--primary);
        }

        .nav-item.active {
            box-shadow: inset 0 0 0 1px var(--primary);
        }

        .nav-dropdown {
            position: relative;
            display: inline-block;
        }

        .nav-dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(15, 23, 42, 0.98);
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.5);
            z-index: 2000;
            border: 1px solid var(--border);
            border-radius: 8px;
            top: 100%;
            left: 0;
            padding: 5px 0;
            backdrop-filter: blur(10px);
        }

        .nav-dropdown-content .nav-item {
            border-radius: 0;
            padding: 10px 16px;
            color: var(--text-muted);
        }

        .nav-dropdown-content .nav-item:hover,
        .nav-dropdown-content .nav-item.active {
            background: rgba(59, 130, 246, 0.1);
            color: var(--primary);
        }

        .nav-dropdown:hover .nav-dropdown-content {
            display: block;
        }

        /* Main Content */
        main {
            flex: 1;
            padding: 2rem;
            overflow: hidden;
            /* Main handles layout, child handles scroll */
            background: transparent;
            display: flex;
            flex-direction: column;
        }

        .page-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            width: 100%;
        }

        .page-header {
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }

        .header-title h1 {
            font-size: 1.875rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }

        .header-title p {
            color: var(--text-muted);
        }

        /* Cards & Glassmorphism */
        .glass-card {
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: var(--glass-shadow);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .glass-card:hover {
            box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.45);
        }

        /* Dashboard Grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            padding: 1.5rem;
            text-align: center;
        }

        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            display: block;
            margin-bottom: 0.25rem;
        }

        .stat-card .label {
            color: var(--text-muted);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Buttons */
        .btn {
            padding: 10px 20px;
            border-radius: 10px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            text-decoration: none;
            font-size: 0.9rem;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-success {
            background: var(--success);
            color: white;
        }

        .btn-success:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        .btn-danger {
            background: var(--danger);
            color: white;
        }

        .btn-danger:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        .btn-warning {
            background: var(--warning);
            color: white;
        }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-main);
        }

        .btn-outline:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        /* Tables */
        .table-container {
            flex: 1;
            width: 100%;
            overflow: auto;
            /* Handles both horizontal and vertical scroll */
            position: relative;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 0 0 16px 16px;
        }

        /* Specialized card for membership table to allow internal scroll */
        .member-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden !important;
            padding: 0 !important;
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            text-align: left;
        }

        th {
            padding: 1rem;
            color: var(--text-muted);
            font-weight: 600;
            font-size: 0.8rem;
            position: sticky;
            top: 0;
            background: var(--bg-deep);
            /* Use theme background for solid cover */
            z-index: 100;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            /* Use box-shadow for border to avoid gaps during sticky scroll */
            box-shadow: inset 0 -2px 0 var(--primary);
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.9375rem;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        .badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-active {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
        }

        .badge-moroso {
            background: rgba(239, 68, 68, 0.2);
            color: var(--danger);
        }

        .badge-cessato {
            background: rgba(148, 163, 184, 0.2);
            color: var(--text-muted);
        }

        /* Forms */
        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-muted);
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.5);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text-main);
            outline: none;
            transition: all 0.2s ease;
        }

        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal {
            background: var(--bg-deep);
            width: 90%;
            max-width: 600px;
            border-radius: 20px;
            border: 1px solid var(--border);
            padding: 2rem;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        }

        .modal-wide {
            max-width: 900px !important;
        }

        .stat-card-clickable {
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .stat-card-clickable:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 40px rgba(59,130,246,0.25);
            border-color: rgba(59,130,246,0.5);
        }

        /* Search & Filters */
        .toolbar {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }

        .search-input {
            flex: 1;
            min-width: 250px;
        }

        /* Calendar Styles */
        .calendar-grid {
            display: grid;
            grid-template-columns: 80px repeat(7, 1fr);
            gap: 1px;
            background: var(--border);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
        }

        .cal-header {
            background: rgba(30, 41, 59, 0.9);
            padding: 12px;
            text-align: center;
            font-weight: 600;
            font-size: 0.8rem;
        }

        .cal-time-cell {
            background: rgba(30, 41, 59, 0.9);
            padding: 10px;
            text-align: right;
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .cal-slot {
            background: var(--bg-deep);
            min-height: 50px;
            padding: 4px;
            position: relative;
            cursor: pointer;
        }

        .cal-slot:hover {
            background: rgba(59, 130, 246, 0.05);
        }

        .cal-entry {
            background: var(--primary);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 0.7rem;
            margin-bottom: 2px;
            color: white;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Utility */
        .hidden {
            display: none;
        }

        .text-success {
            color: var(--success);
        }

        .text-danger {
            color: var(--danger);
        }

        .text-warning {
            color: var(--warning);
        }

        /* --- STILI GUIDA E TOOLTIP --- */
        #global-guide-tooltip {
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            background: linear-gradient(135deg, var(--primary), #2563eb);
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 0.85rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            max-width: 250px;
            text-align: center;
            opacity: 0;
            transition: opacity 0.2s, transform 0.2s;
            transform: translateY(10px);
            visibility: hidden;
            border: 1px solid rgba(255,255,255,0.2);
            line-height: 1.4;
        }
        #global-guide-tooltip.show {
            opacity: 1;
            transform: translateY(0);
            visibility: visible;
        }
        body.guide-mode-active [data-guide] {
            cursor: help !important;
            outline: 2px dashed var(--primary) !important;
            outline-offset: 2px;
            transition: outline-color 0.2s;
        }
        body.guide-mode-active [data-guide]:hover {
            outline-color: #facc15 !important;
            background-color: rgba(250, 204, 21, 0.1);
        }
        /* Paywall */
        #paywall-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: #0f172a;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: #fff;
            padding: 20px;
        }
        .paywall-box {
            background: #1e293b;
            padding: 30px;
            border-radius: 12px;
            max-width: 450px;
            text-align: center;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .paywall-box h2 { margin-bottom: 15px; color: #f8fafc; font-size: 1.5rem; }
        .paywall-box p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px; }
        .paywall-box input {
            background: #0f172a; border: 1px solid #334155;
            color: white; border-radius: 6px; padding: 12px;
            width: 100%; font-family: monospace; font-size: 1rem;
            text-align: center; margin-bottom: 20px; letter-spacing: 1px;
        }
        .paywall-box input:focus { border-color: #3b82f6; outline: none; }
    </style>
</head>

<body>
    <!-- PAYWALL OVERLAY -->
    <div id="paywall-overlay" style="display: none;">
        <div class="paywall-box">
            <svg style="width: 50px; height: 50px; color: #3b82f6; margin-bottom: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            <h2>Licenza Software</h2>
            <p>Inserisci la tua Chiave di Licenza per sbloccare ASD Gestionale. Se non ne hai una, acquistala sul nostro sito.</p>
            <input type="text" id="license-key-input" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:12px;" onclick="app.verifyLicense()">
                <svg style="width: 18px; height: 18px; margin-right: 5px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Verifica Licenza
            </button>
            <div id="license-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 15px; display: none;">Chiave non valida o scaduta.</div>
        </div>
    </div>

    <div id="toast-container"></div>
    <div id="global-guide-tooltip"></div>

    <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside>
            <div class="logo-area">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 20V10"></path>
                    <path d="M12 20V4"></path>
                    <path d="M6 20v-6"></path>
                </svg>
                ASD Gestionale
            </div>

            <nav class="nav-links">
                <div class="nav-item active" data-page="dashboard" onclick="app.showPage('dashboard')" data-guide="Visualizza la panoramica generale della tua ASD: scadenze, statistiche e calendario odierno.">Dashboard</div>
                <div class="nav-item" data-page="soci" onclick="app.showPage('soci')" data-guide="Gestisci l'anagrafica di tutti gli iscritti. Aggiungi soci, verifica certificati medici e scadenze tesseramento.">Soci</div>
                <div class="nav-item" data-page="ricevute" onclick="app.showPage('ricevute')" data-guide="Archivio di tutte le ricevute emesse. Puoi scaricarle in PDF, annullarle e visualizzare il totale incassato.">Ricevute</div>
                
                <div class="nav-dropdown">
                    <div class="nav-item" style="cursor:default;">Calendario ▾</div>
                    <div class="nav-dropdown-content">
                        <div class="nav-item" data-page="sala-pesi" onclick="app.showPage('sala-pesi')" data-guide="Calendario settimanale completo. Pianifica i corsi, assegna sale e istruttori.">Calendario</div>
                        <div class="nav-item" data-page="corsi" onclick="app.showPage('corsi')" data-guide="Visualizza l'elenco dei corsi in programma e gestisci le iscrizioni.">Corsi</div>
                        <div class="nav-item" data-page="eventi" onclick="app.showPage('eventi')" data-guide="Gestisci eventi speciali, sponsorizzazioni e incassi dell'evento.">Eventi</div>
                    </div>
                </div>

                <div class="nav-item" data-page="istruttori" onclick="app.showPage('istruttori')" data-guide="Gestisci lo staff: aggiungi istruttori e visualizza il loro compenso in base alle ore lavorate.">Istruttori</div>
                <div class="nav-item" onclick="app.openSchedeAtleti()" data-guide="Gestione avanzata per schede di allenamento e performance degli atleti.">Schede Atleti</div>

                <div class="nav-dropdown">
                    <div class="nav-item" style="cursor:default;">Prima Nota & Cassa ▾</div>
                    <div class="nav-dropdown-content">
                        <div class="nav-item" data-page="primanota" onclick="app.showPage('primanota')" data-guide="Tieni traccia di tutte le entrate (ricevute) e delle uscite (spese) della tua associazione.">Prima Nota</div>
                        <div class="nav-item" data-page="magazzino" onclick="app.showPage('magazzino')" data-guide="Gestisci i beni di consumo per la palestra.">Magazzino</div>
                        <div class="nav-item" data-page="rimborsi" onclick="app.showPage('rimborsi')" data-guide="Gestione rimborsi spese per i collaboratori o membri del direttivo.">Rimborsi</div>
                    </div>
                </div>

                <div class="nav-item" data-page="database" onclick="app.showPage('database')" data-guide="Configura i dati dell'ASD (per le stampe), crea backup di sicurezza o svuota i dati vecchi.">Impostazioni</div>
            </nav>

            <div style="display: flex; align-items: center; gap: 12px; min-width: 200px; justify-content: flex-end;">
                <button id="cloud-indicator-btn" class="btn btn-outline" title="Stato Sincronizzazione" onclick="app.showPage('database')"
                    style="padding: 6px 10px; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.5); color: var(--danger); display: flex; align-items: center; gap: 4px;">
                    <span id="cloud-indicator-icon">☁️</span>
                    <span id="cloud-indicator-label">Offline</span>
                </button>
                <button class="btn btn-outline" id="fullscreen-btn" title="Schermo Intero"
                    onclick="app.toggleFullscreen()" style="padding: 6px 10px; font-size: 0.75rem;">⛶</button>

                <button
                    onclick="app.exitAppPrompt()"
                    title="Salva e chiudi il gestionale"
                    style="
                        display: flex; align-items: center; gap: 6px;
                        padding: 6px 14px; font-size: 0.78rem; font-weight: 600;
                        background: rgba(239,68,68,0.12); color: #f87171;
                        border: 1px solid rgba(239,68,68,0.35); border-radius: 8px;
                        cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.15s;
                        white-space: nowrap;
                    "
                    onmouseover="this.style.background='rgba(239,68,68,0.25)';this.style.borderColor='rgba(239,68,68,0.6)';this.style.transform='translateY(-1px)';"
                    onmouseout="this.style.background='rgba(239,68,68,0.12)';this.style.borderColor='rgba(239,68,68,0.35)';this.style.transform='';"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Esci
                </button>
                <div class="stat-card" style="padding: 0; text-align: left;">
                    <div
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span class="label" style="font-size: 0.65rem;">Storage</span>
                        <span id="storage-text" style="font-size: 0.65rem; color: var(--text-muted);">0.00 MB</span>
                    </div>
                    <div id="storage-indicator"
                        style="height: 6px; width: 100px; background: #334155; border-radius: 3px;">
                        <div id="storage-bar"
                            style="height: 100%; width: 2%; background: var(--success); border-radius: 3px;"></div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main id="main-content">
            <!-- Content will be injected here by JS -->
        </main>
    </div>

    <!-- Modals -->
    <div id="modal-overlay" class="modal-overlay">
        <div id="modal-content" class="modal">
            <!-- Modal content injected here -->
        </div>
    </div>

    <script>