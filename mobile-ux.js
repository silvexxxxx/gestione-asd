/**
 * Gestionale ASD — Mobile UX v2 Controller
 * Migliora l'esperienza mobile (<= 768px) rendendola fluida, reattiva e "wow style".
 * Completamente isolato: attivabile/disattivabile a runtime (rollback istantaneo).
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'asd_mobile_ui_v2';

    const PAGE_META = {
        'dashboard':              { title: 'Dashboard',         drawer: false, fab: { label: 'Azioni', icon: 'plus', action: 'quickSheet' } },
        'soci':                   { title: 'Anagrafica Soci',   drawer: false, fab: { label: 'Nuovo Socio', icon: 'plus', action: () => app.openAddSocioModal() } },
        'ricevute':               { title: 'Ricevute',          drawer: false, fab: { label: 'Nuova', icon: 'plus', action: () => app.openAddRicevutaModal() } },
        'primanota':              { title: 'Prima Nota',        drawer: false, fab: { label: 'Movimento', icon: 'plus', action: () => app.showPrimaNotaForm() } },
        'sala-pesi':              { title: 'Calendario',        drawer: true,  fab: { label: 'Attività', icon: 'plus', action: () => app.openNewCorsoModal() } },
        'corsi':                  { title: 'Corsi',             drawer: true,  fab: { label: 'Pianifica', icon: 'plus', action: () => app.openNewCorsoModal() } },
        'eventi':                 { title: 'Eventi',            drawer: true,  fab: { label: 'Evento', icon: 'plus', action: () => app.openEventoModal() } },
        'istruttori':             { title: 'Istruttori',        drawer: true,  fab: { label: 'Istruttore', icon: 'plus', action: () => app.openAddIstruttoreModal() } },
        'dati-organizzazione':    { title: 'Dati ASD',          drawer: true,  fab: null },
        'ricevute-collaboratori': { title: 'Collaboratori',     drawer: true,  fab: { label: 'Compenso', icon: 'plus', action: () => app.openCompensoIstruttoreModal() } },
        'magazzino':              { title: 'Magazzino',         drawer: true,  fab: { label: 'Articolo', icon: 'plus', action: () => app.openMagazzinoModal() } },
        'rimborsi':               { title: 'Rimborsi Spese',    drawer: true,  fab: { label: 'Rimborso', icon: 'plus', action: () => app.openRimborsoModal() } },
        'verbali':                { title: 'Verbali',           drawer: true,  fab: null },
        'acquisizione-scansioni': { title: 'Scansioni',         drawer: true,  fab: null },
        'schede-atleti':          { title: 'Schede Atleti',     drawer: true,  fab: null },
        'database':               { title: 'Impostazioni',      drawer: true,  fab: null },
        'guida':                  { title: 'Guida',             drawer: true,  fab: null }
    };

    const SVG = {
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        filter: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>'
    };

    function esc(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const MobileUX = {
        _initialized: false,
        _enhancing: false,
        _mainObserver: null,
        _lastScrollY: 0,
        _popstateGuard: false,
        _sheetMode: null, // 'filter' | 'quick' | 'postit' | null

        isEnabled() {
            return localStorage.getItem(STORAGE_KEY) !== 'false';
        },

        isMobileViewport() {
            return window.innerWidth <= 768;
        },

        setEnabled(enabled, rerender = true) {
            localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
            document.body.classList.toggle('mobile-v2', !!enabled);

            if (!enabled) {
                this._cleanupInjectedUI();
                if (typeof app !== 'undefined' && typeof app.toast === 'function') {
                    app.toast('Interfaccia Mobile Classica ripristinata', 'info');
                }
            } else {
                this._ensureShellElements();
                if (typeof app !== 'undefined' && typeof app.toast === 'function') {
                    app.toast('Interfaccia Mobile Moderna (v2) attivata', 'success');
                }
            }

            this._syncDrawerToggleRow();
            if (rerender && typeof app !== 'undefined' && typeof app.showPage === 'function') {
                app.showPage(app.state?.currentPage || 'dashboard');
            }
        },

        toggleEnabled() {
            this.setEnabled(!this.isEnabled(), true);
        },

        init() {
            if (this._initialized) return;
            this._initialized = true;

            document.body.classList.toggle('mobile-v2', this.isEnabled());

            this._wrapAppMethods();
            this._ensureShellElements();
            this._injectDrawerRollbackRow();
            this._setupMainObserver();
            this._setupScrollListeners();
            this._setupPopstate();
            this._setupModalSwipe();

            if (this.isEnabled() && this.isMobileViewport()) {
                this.syncAll();
            }

            window.addEventListener('resize', () => {
                if (this.isEnabled() && this.isMobileViewport()) {
                    this.syncAll();
                } else if (!this.isMobileViewport()) {
                    document.body.classList.remove('has-mobile-fab', 'has-filter-bar');
                }
            });
        },

        // ====================================================================
        // WRAPPER METODI APP (zero flash caricamento + hook modali/filtri)
        // ====================================================================
        _wrapAppMethods() {
            if (typeof app === 'undefined') return;

            // 1. Elimina flash "Sto caricando..." in mobile v2
            const origShowPage = app.showPage.bind(app);
            app.showPage = (pageId) => {
                if (this.isEnabled() && this.isMobileViewport()) {
                    this._fastShowPage(pageId, origShowPage);
                } else {
                    origShowPage(pageId);
                }
            };

            // 2. Hook openModal / closeModal per history back & inputmode
            const origOpenModal = app.openModal.bind(app);
            app.openModal = (title, contentHtml) => {
                origOpenModal(title, contentHtml);
                if (this.isEnabled() && this.isMobileViewport()) {
                    this._pushOverlayState('modal');
                    this._enhanceInputs(document.getElementById('modal-content'));
                    this._syncFabVisibility();
                }
            };

            const origCloseModal = app.closeModal.bind(app);
            app.closeModal = () => {
                origCloseModal();
                if (this.isEnabled() && this.isMobileViewport()) {
                    this._popOverlayStateIfTop('modal');
                    this._syncFabVisibility();
                }
            };

            // 3. Hook filterCompensi & filterRimborsi per aggiornare subito le mobile cards
            if (typeof app.filterCompensi === 'function') {
                const origFC = app.filterCompensi.bind(app);
                app.filterCompensi = () => {
                    origFC();
                    if (this.isEnabled() && this.isMobileViewport()) {
                        this._renderCompensiCards();
                    }
                };
            }

            if (typeof app.filterRimborsi === 'function') {
                const origFR = app.filterRimborsi.bind(app);
                app.filterRimborsi = () => {
                    origFR();
                    if (this.isEnabled() && this.isMobileViewport()) {
                        this._renderRimborsiCards();
                    }
                };
            }

            // 4. Hook renderPostit per aggiornare dot in topbar e sheet
            if (typeof app.renderPostit === 'function') {
                const origRP = app.renderPostit.bind(app);
                app.renderPostit = () => {
                    origRP();
                    this._syncPostitIndicator();
                    if (this._sheetMode === 'postit') {
                        this._renderPostitSheetBody();
                    }
                };
            }

            // 5. Hook renderDatabase per mostrare sempre il toggle rollback in Impostazioni
            if (typeof app.renderDatabase === 'function') {
                const origRD = app.renderDatabase.bind(app);
                app.renderDatabase = () => {
                    origRD();
                    if (this.isMobileViewport()) {
                        this._injectSettingsRollbackCard();
                    }
                };
            }

            // 6. Hook mobileBottomNav drawer open/close per popstate, FAB & rollback toggle
            if (typeof mobileBottomNav !== 'undefined') {
                const origOpenMenu = mobileBottomNav.openMenu.bind(mobileBottomNav);
                mobileBottomNav.openMenu = () => {
                    origOpenMenu();
                    this._injectDrawerRollbackRow();
                    this._syncDrawerToggleRow();
                    if (this.isEnabled() && this.isMobileViewport()) {
                        this._pushOverlayState('drawer');
                        this._syncFabVisibility();
                    }
                };
                const origCloseMenu = mobileBottomNav.closeMenu.bind(mobileBottomNav);
                mobileBottomNav.closeMenu = () => {
                    origCloseMenu();
                    if (this.isEnabled() && this.isMobileViewport()) {
                        this._popOverlayStateIfTop('drawer');
                        this._syncFabVisibility();
                    }
                };
            }
        },

        _fastShowPage(pageId, origShowPage) {
            // Chiudi eventuali sheet aperti
            this.closeSheets(true);

            // Salva scroll esattamente come showPage originale
            const main = document.getElementById('main-content');
            const tableContainer = document.querySelector('#main-content .table-container') || document.querySelector('.table-container');
            if (app.state.currentPage === 'soci' && tableContainer) {
                if (tableContainer.scrollTop > 0 || !app._restoringSociScroll) {
                    app.state.lastSociScroll = tableContainer.scrollTop;
                    localStorage.setItem('asd_last_soci_scroll', app.state.lastSociScroll.toString());
                }
            } else if (app.state.currentPage === 'ricevute' && tableContainer) {
                if (tableContainer.scrollTop > 0 || !app._restoringRicevuteScroll) {
                    app.state.lastRicevuteScroll = tableContainer.scrollTop;
                    localStorage.setItem('asd_last_ricevute_scroll', app.state.lastRicevuteScroll.toString());
                }
            } else if (app.state.currentPage === 'primanota' && tableContainer) {
                if (tableContainer.scrollTop > 0 || !app._restoringPnScroll) {
                    app.state.lastPrimaNotaScroll = tableContainer.scrollTop;
                    localStorage.setItem('asd_last_primanota_scroll', app.state.lastPrimaNotaScroll.toString());
                }
            }

            if (main) {
                main.classList.toggle('page-schede-atleti', pageId === 'schede-atleti');
                main.classList.toggle('page-verbali', pageId === 'verbali');
                if (pageId !== 'verbali') {
                    main.style.overflowY = '';
                    main.style.display = '';
                }
            }

            app.state.currentPage = pageId;
            localStorage.setItem('asd_current_page', pageId);

            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.toggle('active', el.dataset.page === pageId);
            });

            switch (pageId) {
                case 'dashboard': app.renderDashboard(); break;
                case 'soci': {
                    const targetSociScroll = app.state.lastSociScroll || parseFloat(localStorage.getItem('asd_last_soci_scroll')) || 0;
                    app.renderSoci();
                    if (targetSociScroll > 0 && typeof app.restoreTableScroll === 'function') {
                        app.restoreTableScroll('soci', targetSociScroll);
                    }
                    break;
                }
                case 'ricevute': {
                    const targetRicevuteScroll = app.state.lastRicevuteScroll || parseFloat(localStorage.getItem('asd_last_ricevute_scroll')) || 0;
                    app.renderRicevute(false);
                    if (targetRicevuteScroll > 0 && typeof app.restoreTableScroll === 'function') {
                        app.restoreTableScroll('ricevute', targetRicevuteScroll);
                    }
                    break;
                }
                case 'primanota': {
                    const targetPnScroll = app.state.lastPrimaNotaScroll || parseFloat(localStorage.getItem('asd_last_primanota_scroll')) || 0;
                    app.renderPrimaNota(false);
                    if (targetPnScroll > 0 && typeof app.restoreTableScroll === 'function') {
                        app.restoreTableScroll('primanota', targetPnScroll);
                    }
                    break;
                }
                case 'ricevute-collaboratori': app.renderRicevuteCollaboratori(); break;
                case 'schede-atleti': app.renderSchedeAtleti(); break;
                case 'sala-pesi': app.renderSalaPesi(); break;
                case 'corsi': app.renderCorsi(); break;
                case 'istruttori': app.renderIstruttori(); break;
                case 'magazzino': app.renderMagazzino(); break;
                case 'eventi': app.renderEventi(); break;
                case 'rimborsi': app.renderRimborsi(); break;
                case 'verbali':
                    if (main) {
                        main.classList.add('page-verbali');
                        main.style.overflowY = 'auto';
                        main.style.display = 'block';
                    }
                    if (app.state.verbali_current_view !== 'preview') {
                        app.state.verbali_current_view = 'hub';
                    }
                    app.renderVerbali();
                    break;
                case 'acquisizione-scansioni':
                    if (app.renderAcquisizioneScansioni) app.renderAcquisizioneScansioni();
                    break;
                case 'dati-organizzazione': app.renderDatiOrganizzazione(); break;
                case 'database': app.renderDatabase(); break;
                case 'guida': app.renderGuida(); break;
                default:
                    origShowPage(pageId);
                    return;
            }

            if (main) main.scrollTop = 0;
            this.syncAll();
        },

        // ====================================================================
        // SHELL DOM (Topbar title/actions, FAB, Filter Sheet, Quick Sheet)
        // ====================================================================
        _ensureShellElements() {
            if (!this.isEnabled()) return;

            // 1. Titolo pagina dinamico nella topbar
            const logoArea = document.querySelector('aside .logo-area');
            if (logoArea && !document.getElementById('mobile-topbar-page-title')) {
                const titleSpan = document.createElement('span');
                titleSpan.id = 'mobile-topbar-page-title';
                titleSpan.className = 'm-v2-only';
                titleSpan.textContent = 'Dashboard';
                logoArea.appendChild(titleSpan);
                logoArea.classList.add('has-page-title');
            }

            // 2. Pulsanti rapidi nella topbar (Cerca + Post-it)
            const asideActions = document.querySelector('aside .aside-actions');
            if (asideActions && !document.getElementById('m-topbar-quick-actions')) {
                const wrap = document.createElement('div');
                wrap.id = 'm-topbar-quick-actions';
                wrap.className = 'm-topbar-quick-actions m-v2-only';
                wrap.innerHTML = `
                    <button type="button" class="m-topbar-icon-btn" id="m-topbar-search-btn" title="Cerca" aria-label="Cerca nella pagina">
                        ${SVG.search}
                    </button>
                    <button type="button" class="m-topbar-icon-btn" id="m-topbar-postit-btn" title="Note Post-it" aria-label="Note rapide Post-it">
                        ${SVG.pin}
                        <span class="m-topbar-dot" id="m-topbar-postit-dot" style="display:none;"></span>
                    </button>
                `;
                asideActions.insertBefore(wrap, asideActions.firstChild);

                document.getElementById('m-topbar-search-btn').addEventListener('click', () => this._focusSearchOrQuickSheet());
                document.getElementById('m-topbar-postit-btn').addEventListener('click', () => this.openPostitSheet());
            }

            // 3. FAB Contestuale
            if (!document.getElementById('mobile-fab')) {
                const fab = document.createElement('button');
                fab.id = 'mobile-fab';
                fab.type = 'button';
                fab.setAttribute('aria-label', 'Azione rapida');
                fab.innerHTML = `${SVG.plus}<span id="mobile-fab-label">Nuovo</span>`;
                fab.addEventListener('click', () => this._handleFabClick());
                document.body.appendChild(fab);
            }

            // 4. Filter Bottom Sheet
            if (!document.getElementById('mobile-filter-sheet')) {
                const backdrop = document.createElement('div');
                backdrop.id = 'mobile-filter-sheet-backdrop';
                backdrop.addEventListener('click', () => this.closeSheets());

                const sheet = document.createElement('div');
                sheet.id = 'mobile-filter-sheet';
                sheet.setAttribute('role', 'dialog');
                sheet.setAttribute('aria-modal', 'true');
                sheet.innerHTML = `
                    <div class="m-sheet-handle"></div>
                    <div class="m-sheet-header">
                        <span class="m-sheet-title" id="m-filter-sheet-title">Filtri</span>
                        <button type="button" class="mnd-close-btn" id="m-filter-sheet-close" aria-label="Chiudi">✕</button>
                    </div>
                    <div id="m-filter-sheet-body"></div>
                `;
                document.body.appendChild(backdrop);
                document.body.appendChild(sheet);
                document.getElementById('m-filter-sheet-close').addEventListener('click', () => this.closeSheets());
            }

            // 5. Quick Action / Post-it Bottom Sheet
            if (!document.getElementById('mobile-quick-sheet')) {
                const backdrop = document.createElement('div');
                backdrop.id = 'mobile-quick-sheet-backdrop';
                backdrop.addEventListener('click', () => this.closeSheets());

                const sheet = document.createElement('div');
                sheet.id = 'mobile-quick-sheet';
                sheet.setAttribute('role', 'dialog');
                sheet.setAttribute('aria-modal', 'true');
                sheet.innerHTML = `
                    <div class="m-sheet-handle"></div>
                    <div class="m-sheet-header">
                        <span class="m-sheet-title" id="m-quick-sheet-title">Azioni Rapide</span>
                        <button type="button" class="mnd-close-btn" id="m-quick-sheet-close" aria-label="Chiudi">✕</button>
                    </div>
                    <div id="m-quick-sheet-body"></div>
                `;
                document.body.appendChild(backdrop);
                document.body.appendChild(sheet);
                document.getElementById('m-quick-sheet-close').addEventListener('click', () => this.closeSheets());
            }
        },

        _cleanupInjectedUI() {
            document.body.classList.remove('has-mobile-fab', 'has-filter-bar');
            const logoArea = document.querySelector('aside .logo-area');
            if (logoArea) logoArea.classList.remove('has-page-title');

            document.querySelectorAll('.m-v2-only, #mobile-fab, #mobile-filter-sheet-backdrop, #mobile-filter-sheet, #mobile-quick-sheet-backdrop, #mobile-quick-sheet').forEach(el => el.remove());
            document.querySelectorAll('.m-filter-bar, .m-hero-card, .m-quick-actions-grid, #mobile-istruttori-cards, #mobile-compensi-cards, #mobile-rimborsi-cards, #mobile-magazzino-cards').forEach(el => el.remove());
            document.querySelectorAll('.m-cards-replaced-table').forEach(el => el.classList.remove('m-cards-replaced-table'));
            document.querySelectorAll('.m-toolbar-enhanced').forEach(el => el.classList.remove('m-toolbar-enhanced'));
            document.querySelectorAll('.m-kpi-scroll-grid').forEach(el => el.classList.remove('m-kpi-scroll-grid'));
            document.querySelectorAll('.m-card-quick-btn').forEach(el => el.remove());

            const menuBtn = document.getElementById('mbn-menu-btn');
            if (menuBtn) menuBtn.classList.remove('active-drawer-route');
        },

        // ====================================================================
        // SYNC HEADER, BOTTOM NAV, FAB & POST-IT
        // ====================================================================
        syncAll() {
            if (!this.isEnabled() || !this.isMobileViewport()) return;
            this._ensureShellElements();

            const pageId = (typeof app !== 'undefined' && app.state?.currentPage) ? app.state.currentPage : 'dashboard';
            this.syncHeader(pageId);
            this.syncBottomNav(pageId);
            this.syncFab(pageId);
            this._syncPostitIndicator();
            this.enhanceCurrentPage();
        },

        syncHeader(pageId) {
            const meta = PAGE_META[pageId] || { title: 'Gestionale ASD' };
            const titleEl = document.getElementById('mobile-topbar-page-title');
            if (titleEl) titleEl.textContent = meta.title;
        },

        syncBottomNav(pageId) {
            const meta = PAGE_META[pageId];
            const menuBtn = document.getElementById('mbn-menu-btn');
            if (menuBtn) {
                menuBtn.classList.toggle('active-drawer-route', !!(meta && meta.drawer));
            }
        },

        syncFab(pageId) {
            const fab = document.getElementById('mobile-fab');
            const fabLabel = document.getElementById('mobile-fab-label');
            const meta = PAGE_META[pageId];
            if (!fab) return;

            if (meta && meta.fab) {
                document.body.classList.add('has-mobile-fab');
                if (fabLabel) fabLabel.textContent = meta.fab.label;
                fab.style.display = 'flex';
                this._syncFabVisibility();
            } else {
                document.body.classList.remove('has-mobile-fab');
                fab.style.display = 'none';
            }
        },

        _syncFabVisibility() {
            const fab = document.getElementById('mobile-fab');
            if (!fab) return;
            const modalOpen = document.getElementById('modal-overlay')?.style.display === 'flex';
            const drawerOpen = document.getElementById('mobile-nav-drawer')?.classList.contains('open');
            const sheetOpen = !!this._sheetMode;
            fab.classList.toggle('fab-hidden', !!(modalOpen || drawerOpen || sheetOpen));
        },

        _handleFabClick() {
            const pageId = app?.state?.currentPage || 'dashboard';
            const meta = PAGE_META[pageId];
            if (!meta || !meta.fab) return;
            if (meta.fab.action === 'quickSheet') {
                this.openQuickActionSheet();
            } else if (typeof meta.fab.action === 'function') {
                meta.fab.action();
            }
        },

        _syncPostitIndicator() {
            const dot = document.getElementById('m-topbar-postit-dot');
            if (!dot || typeof app === 'undefined') return;
            const activeCount = (app.state?.postit || []).filter(p => !p.nascosto && !p.fatto).length;
            dot.style.display = activeCount > 0 ? 'block' : 'none';
        },

        _focusSearchOrQuickSheet() {
            const input = document.querySelector('.m-search-input');
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            this.openQuickActionSheet();
        },

        // ====================================================================
        // MAIN OBSERVER & ENHANCER ROUTER
        // ====================================================================
        _setupMainObserver() {
            const main = document.getElementById('main-content');
            if (!main) return;
            let rafId = null;
            this._mainObserver = new MutationObserver(() => {
                if (this._enhancing || !this.isEnabled() || !this.isMobileViewport()) return;
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    this.enhanceCurrentPage();
                });
            });
            this._mainObserver.observe(main, { childList: true, subtree: true });
        },

        enhanceCurrentPage() {
            if (this._enhancing || !this.isEnabled() || !this.isMobileViewport() || typeof app === 'undefined') return;
            this._enhancing = true;
            try {
                const pageId = app.state?.currentPage || 'dashboard';
                document.body.classList.remove('has-filter-bar');

                if (pageId === 'dashboard') {
                    this._enhanceDashboard();
                } else if (pageId === 'soci') {
                    this._enhanceFilterBar({
                        searchId: 'socio-search',
                        placeholder: 'Cerca socio o codice fiscale...',
                        selectId: 'socio-filter-status',
                        chips: [
                            { value: 'ANNO_CORRENTE', label: 'Anno Corrente' },
                            { value: 'ALL', label: 'Tutti' },
                            { value: 'ATTIVO', label: 'Attivi', cls: 'chip-success' },
                            { value: 'MOROSO', label: 'Morosi', cls: 'chip-danger' },
                            { value: 'QUOTA_SCADUTA', label: 'Scadute', cls: 'chip-warning' },
                            { value: 'CESSATO', label: 'Cessati' }
                        ],
                        extraControls: [
                            { type: 'select', id: 'socio-filter-status', label: 'Stato Soci' },
                            { type: 'button', label: '📊 Esporta Excel Selezione', onclick: () => app.exportSociFiltratiExcel() }
                        ]
                    });
                    this._enhanceSociCardsQuickActions();
                } else if (pageId === 'ricevute') {
                    this._enhanceFilterBar({
                        searchId: 'receipt-search',
                        placeholder: 'Cerca socio o N. ricevuta...',
                        selectId: 'receipt-filter-registro',
                        chips: [
                            { value: 'all', label: 'Tutte' },
                            { value: 'digitale', label: '💻 Digitale' },
                            { value: 'cartaceo', label: '📋 Cartaceo', cls: 'chip-warning' }
                        ],
                        extraControls: [
                            { type: 'select', id: 'receipt-filter-anno', label: 'Stagione Sportiva' },
                            { type: 'select', id: 'receipt-filter-registro', label: 'Registro' },
                            { type: 'dateRange', startId: 'receipt-date-start', endId: 'receipt-date-end', clearFn: () => app.clearRicevuteDateFilter() },
                            { type: 'button', label: '📊 Esporta Excel', onclick: () => app.exportRicevuteExcel() }
                        ]
                    });
                    this._enhanceRicevuteCardsQuickActions();
                } else if (pageId === 'primanota') {
                    this._enhanceFilterBar({
                        searchId: 'pn-search',
                        placeholder: 'Cerca causale o categoria...',
                        selectId: 'pn-tipo',
                        chips: [
                            { value: 'all', label: 'Tutti' },
                            { value: 'Entrata', label: 'Entrate', cls: 'chip-success' },
                            { value: 'Uscita', label: 'Uscite', cls: 'chip-danger' },
                            { value: 'Giroconto', label: 'Giroconti' }
                        ],
                        extraControls: [
                            { type: 'select', id: 'pn-year', label: 'Anno Sportivo' },
                            { type: 'select', id: 'pn-quarter', label: 'Trimestre' },
                            { type: 'select', id: 'pn-tipo', label: 'Tipo Movimento' },
                            { type: 'input', id: 'pn-search-importo', label: 'Filtra Importo Exact (€)' },
                            { type: 'checkbox', id: 'pn-hide-riconciliazione', label: 'Nascondi Riporti & Rettifiche' },
                            { type: 'button', label: '💰 Saldi Iniziali', onclick: () => app.openSaldoInizialeModal() },
                            { type: 'button', label: '🔒 Chiusura Esercizio', onclick: () => app.chiudiEsercizio() },
                            { type: 'button', label: '📊 Esporta Excel', onclick: () => app.exportPrimaNotaExcel() },
                            { type: 'button', label: '📄 Esporta PDF', onclick: () => app.exportPrimaNotaPDF() }
                        ]
                    });
                } else if (pageId === 'istruttori') {
                    this._renderIstruttoriCards();
                    this._convertKpiGridToScroll();
                } else if (pageId === 'ricevute-collaboratori') {
                    this._enhanceFilterBar({
                        searchId: 'compensi-search',
                        placeholder: 'Cerca collaboratore o N. ricevuta...',
                        selectId: 'compensi-filter-istruttore',
                        chipsFromSelect: true,
                        extraControls: [
                            { type: 'select', id: 'compensi-filter-istruttore', label: 'Collaboratore' },
                            { type: 'select', id: 'compensi-filter-anno', label: 'Stagione Sportiva' },
                            { type: 'dateRange', startId: 'compensi-date-start', endId: 'compensi-date-end', clearFn: () => app.clearCompensiDateFilter() },
                            { type: 'button', label: '📊 Esporta Excel', onclick: () => app.exportCompensiExcel() }
                        ]
                    });
                    this._convertKpiGridToScroll();
                    this._renderCompensiCards();
                } else if (pageId === 'rimborsi') {
                    this._enhanceFilterBar({
                        searchId: 'rimborsi-search',
                        placeholder: 'Cerca richiedente o spesa...',
                        selectId: 'rimborsi-filter-stato',
                        chips: [
                            { value: 'all', label: 'Tutti' },
                            { value: 'da_pagare', label: 'Da Pagare', cls: 'chip-warning' },
                            { value: 'pagato', label: 'Pagati', cls: 'chip-success' },
                            { value: 'bozza', label: 'Bozze', cls: 'chip-danger' },
                            { value: 'annullato', label: 'Annullati' }
                        ],
                        extraControls: [
                            { type: 'select', id: 'rimborsi-filter-anno', label: 'Stagione Sportiva' },
                            { type: 'select', id: 'rimborsi-filter-stato', label: 'Stato' },
                            { type: 'dateRange', startId: 'rimborsi-date-start', endId: 'rimborsi-date-end', clearFn: () => app.clearRimborsiDateFilter() },
                            { type: 'button', label: '📊 Esporta Excel', onclick: () => app.exportRimborsiExcel() }
                        ]
                    });
                    this._convertKpiGridToScroll();
                    this._renderRimborsiCards();
                } else if (pageId === 'magazzino') {
                    this._renderMagazzinoCards();
                } else if (pageId === 'database') {
                    this._injectSettingsRollbackCard();
                }

                this._enhanceInputs(document.getElementById('main-content'));
            } finally {
                this._enhancing = false;
            }
        },

        // ====================================================================
        // FASE 4: DASHBOARD "WOW STYLE"
        // ====================================================================
        _enhanceDashboard() {
            const pageContent = document.querySelector('#main-content .page-content');
            const statsRow = document.querySelector('#main-content .stats-row');
            if (!pageContent || !statsRow) return;

            if (!document.getElementById('m-dashboard-hero')) {
                const soci = app.state?.soci || [];
                const active = soci.filter(s => typeof app.isActiveMember === 'function' ? app.isActiveMember(s) : true);
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                let inRegola = 0;
                active.forEach(s => {
                    const qOk = !s.quota_scadenza || new Date(s.quota_scadenza) >= now;
                    const cOk = !s.certificato_scadenza || new Date(s.certificato_scadenza) >= now;
                    if (qOk && cOk) inRegola++;
                });
                const pct = active.length > 0 ? Math.round((inRegola / active.length) * 100) : 100;
                const yStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
                const seasonLabel = `Stagione ${yStart}/${String(yStart + 1).slice(-2)}`;
                const asdName = (app.state?.settings?.asdName || 'Gestionale ASD').trim();

                const hero = document.createElement('div');
                hero.id = 'm-dashboard-hero';
                hero.className = 'm-hero-card';
                hero.innerHTML = `
                    <div class="m-hero-top">
                        <div class="m-hero-title">${esc(asdName)}</div>
                        <span class="m-hero-season">${seasonLabel}</span>
                    </div>
                    <div class="m-health-meta">
                        <span>Regolarità Soci (Quote + Certificati)</span>
                        <strong style="color:${pct >= 80 ? '#34d399' : (pct >= 50 ? '#fbbf24' : '#f87171')};">${pct}% (${inRegola}/${active.length})</strong>
                    </div>
                    <div class="m-health-bar">
                        <div class="m-health-fill" style="width:${pct}%;"></div>
                    </div>
                `;

                const qaGrid = document.createElement('div');
                qaGrid.id = 'm-dashboard-qa';
                qaGrid.className = 'm-quick-actions-grid';
                qaGrid.innerHTML = `
                    <button type="button" class="m-qa-tile" onclick="app.openAddSocioModal()">
                        <span class="m-qa-icon" style="background:rgba(59,130,246,0.18); color:#60a5fa;">👤+</span>
                        <span>Socio</span>
                    </button>
                    <button type="button" class="m-qa-tile" onclick="app.openAddRicevutaModal()">
                        <span class="m-qa-icon" style="background:rgba(16,185,129,0.18); color:#34d399;">🧾</span>
                        <span>Ricevuta</span>
                    </button>
                    <button type="button" class="m-qa-tile" onclick="app.showPrimaNotaForm()">
                        <span class="m-qa-icon" style="background:rgba(139,92,246,0.18); color:#a78bfa;">💶</span>
                        <span>Cassa</span>
                    </button>
                    <button type="button" class="m-qa-tile" onclick="mobileBottomNav.navigate('sala-pesi')">
                        <span class="m-qa-icon" style="background:rgba(245,158,11,0.18); color:#fbbf24;">📅</span>
                        <span>Oggi</span>
                    </button>
                `;

                // Nascondi header verboso in dashboard visto che il hero + topbar fanno già tutto
                const pageHeader = pageContent.querySelector('.page-header');
                if (pageHeader) pageHeader.style.display = 'none';

                statsRow.parentNode.insertBefore(hero, statsRow);
                statsRow.parentNode.insertBefore(qaGrid, statsRow);
            }
        },

        // ====================================================================
        // FASE 2: FILTER BAR COMPATTA + CHIPS + BOTTOM SHEET FILTRI
        // ====================================================================
        _enhanceFilterBar(cfg) {
            const memberCard = document.querySelector('#main-content .member-card');
            if (!memberCard) return;

            document.body.classList.add('has-filter-bar');
            memberCard.classList.add('m-toolbar-enhanced');

            const existing = memberCard.querySelector('.m-filter-bar');
            const origSearch = document.getElementById(cfg.searchId);
            const origSelect = cfg.selectId ? document.getElementById(cfg.selectId) : null;

            // Costruisci chips dinamiche se richiesto da select
            let chips = cfg.chips || [];
            if (cfg.chipsFromSelect && origSelect) {
                chips = Array.from(origSelect.options).slice(0, 8).map(opt => ({
                    value: opt.value,
                    label: opt.text.replace(/^[^\w\s]+\s*/, '').trim() || opt.text
                }));
            }

            if (!existing) {
                const bar = document.createElement('div');
                bar.className = 'm-filter-bar';
                bar.innerHTML = `
                    <div class="m-filter-search-row">
                        <div class="m-search-wrap">
                            ${SVG.search}
                            <input type="search" class="m-search-input" placeholder="${esc(cfg.placeholder)}" value="${esc(origSearch ? origSearch.value : '')}">
                            <button type="button" class="m-search-clear ${origSearch && origSearch.value ? 'visible' : ''}" aria-label="Pulisci">✕</button>
                        </div>
                        <button type="button" class="m-filter-trigger-btn">
                            ${SVG.filter}
                            <span>Filtri</span>
                            <span class="m-filter-count-pill" style="display:none;">0</span>
                        </button>
                    </div>
                    ${chips.length > 0 ? `
                        <div class="m-chips-row">
                            ${chips.map(c => `<button type="button" class="m-chip ${c.cls || ''}" data-val="${esc(c.value)}">${esc(c.label)}</button>`).join('')}
                        </div>
                    ` : ''}
                `;
                memberCard.insertBefore(bar, memberCard.firstChild);

                const mSearch = bar.querySelector('.m-search-input');
                const mClear = bar.querySelector('.m-search-clear');
                const mTrigger = bar.querySelector('.m-filter-trigger-btn');

                mSearch.addEventListener('input', () => {
                    mClear.classList.toggle('visible', mSearch.value.length > 0);
                    if (origSearch) {
                        origSearch.value = mSearch.value;
                        origSearch.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });

                mClear.addEventListener('click', () => {
                    mSearch.value = '';
                    mClear.classList.remove('visible');
                    if (origSearch) {
                        origSearch.value = '';
                        origSearch.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    mSearch.focus();
                });

                bar.querySelectorAll('.m-chip').forEach(chip => {
                    chip.addEventListener('click', () => {
                        if (!origSelect) return;
                        origSelect.value = chip.dataset.val;
                        origSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        this._syncChipsActive(bar, origSelect);
                        this._updateFilterCountBadge(bar, cfg);
                    });
                });

                mTrigger.addEventListener('click', () => this.openFilterSheet(cfg, bar));
            }

            const barEl = memberCard.querySelector('.m-filter-bar');
            if (barEl) {
                if (origSelect) this._syncChipsActive(barEl, origSelect);
                this._updateFilterCountBadge(barEl, cfg);
            }
        },

        _syncChipsActive(bar, origSelect) {
            const cur = String(origSelect.value);
            bar.querySelectorAll('.m-chip').forEach(ch => {
                ch.classList.toggle('active', String(ch.dataset.val) === cur);
            });
        },

        _updateFilterCountBadge(bar, cfg) {
            let count = 0;
            (cfg.extraControls || []).forEach(ctrl => {
                if (ctrl.type === 'select') {
                    const el = document.getElementById(ctrl.id);
                    if (el && el.selectedIndex > 0 && el.value !== 'all' && el.value !== 'ANNO_CORRENTE') count++;
                } else if (ctrl.type === 'dateRange') {
                    const s = document.getElementById(ctrl.startId)?.value;
                    const e = document.getElementById(ctrl.endId)?.value;
                    if (s || e) count++;
                } else if (ctrl.type === 'input') {
                    if (document.getElementById(ctrl.id)?.value) count++;
                }
            });
            const btn = bar.querySelector('.m-filter-trigger-btn');
            const pill = bar.querySelector('.m-filter-count-pill');
            if (btn) btn.classList.toggle('has-active', count > 0);
            if (pill) {
                pill.textContent = String(count);
                pill.style.display = count > 0 ? 'inline-flex' : 'none';
            }
        },

        openFilterSheet(cfg, bar) {
            const body = document.getElementById('m-filter-sheet-body');
            const title = document.getElementById('m-filter-sheet-title');
            if (!body) return;
            if (title) title.textContent = 'Filtri & Azioni';

            const fragments = [];
            (cfg.extraControls || []).forEach((ctrl, idx) => {
                if (ctrl.type === 'select') {
                    const orig = document.getElementById(ctrl.id);
                    if (!orig) return;
                    const optsHtml = Array.from(orig.options).map(o =>
                        `<option value="${esc(o.value)}" ${o.value === orig.value ? 'selected' : ''}>${esc(o.text)}</option>`
                    ).join('');
                    fragments.push(`
                        <div class="form-group">
                            <label>${esc(ctrl.label)}</label>
                            <select class="form-control m-proxy-select" data-target="${esc(ctrl.id)}">${optsHtml}</select>
                        </div>
                    `);
                } else if (ctrl.type === 'dateRange') {
                    const sVal = document.getElementById(ctrl.startId)?.value || '';
                    const eVal = document.getElementById(ctrl.endId)?.value || '';
                    fragments.push(`
                        <div class="form-group">
                            <label>Intervallo Date</label>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                <input type="date" class="form-control m-proxy-date" data-target="${esc(ctrl.startId)}" value="${esc(sVal)}">
                                <input type="date" class="form-control m-proxy-date" data-target="${esc(ctrl.endId)}" value="${esc(eVal)}">
                            </div>
                            <button type="button" class="btn btn-outline m-proxy-date-clear" data-idx="${idx}" style="margin-top:8px; width:100%; justify-content:center;">✕ Azzera Date</button>
                        </div>
                    `);
                } else if (ctrl.type === 'input') {
                    const val = document.getElementById(ctrl.id)?.value || '';
                    fragments.push(`
                        <div class="form-group">
                            <label>${esc(ctrl.label)}</label>
                            <input type="text" inputmode="decimal" class="form-control m-proxy-input" data-target="${esc(ctrl.id)}" value="${esc(val)}" placeholder="Es. 50.00">
                        </div>
                    `);
                } else if (ctrl.type === 'checkbox') {
                    const checked = !!document.getElementById(ctrl.id)?.checked;
                    fragments.push(`
                        <label style="display:flex; align-items:center; gap:10px; padding:12px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:12px; margin-bottom:12px; cursor:pointer;">
                            <input type="checkbox" class="m-proxy-check" data-target="${esc(ctrl.id)}" ${checked ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--primary);">
                            <span style="font-size:0.88rem; font-weight:600;">${esc(ctrl.label)}</span>
                        </label>
                    `);
                } else if (ctrl.type === 'button') {
                    fragments.push(`
                        <button type="button" class="btn btn-outline m-proxy-action" data-idx="${idx}" style="width:100%; justify-content:center; margin-bottom:8px; min-height:44px;">${esc(ctrl.label)}</button>
                    `);
                }
            });

            body.innerHTML = fragments.join('') + `
                <button type="button" class="btn btn-primary" id="m-filter-sheet-done" style="width:100%; justify-content:center; min-height:46px; margin-top:6px;">Applica e Chiudi</button>
            `;

            // Collega eventi proxy verso i controlli reali
            body.querySelectorAll('.m-proxy-select').forEach(sel => {
                sel.addEventListener('change', () => {
                    const target = document.getElementById(sel.dataset.target);
                    if (target) {
                        target.value = sel.value;
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        if (bar && cfg.selectId === sel.dataset.target) this._syncChipsActive(bar, target);
                        if (bar) this._updateFilterCountBadge(bar, cfg);
                    }
                });
            });

            body.querySelectorAll('.m-proxy-date').forEach(inp => {
                inp.addEventListener('change', () => {
                    const target = document.getElementById(inp.dataset.target);
                    if (target) {
                        target.value = inp.value;
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                        if (bar) this._updateFilterCountBadge(bar, cfg);
                    }
                });
            });

            body.querySelectorAll('.m-proxy-date-clear').forEach(btn => {
                btn.addEventListener('click', () => {
                    const ctrl = cfg.extraControls[parseInt(btn.dataset.idx, 10)];
                    if (ctrl && typeof ctrl.clearFn === 'function') ctrl.clearFn();
                    body.querySelectorAll('.m-proxy-date').forEach(d => { d.value = ''; });
                    if (bar) this._updateFilterCountBadge(bar, cfg);
                });
            });

            body.querySelectorAll('.m-proxy-input').forEach(inp => {
                inp.addEventListener('input', () => {
                    const target = document.getElementById(inp.dataset.target);
                    if (target) {
                        target.value = inp.value;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        if (bar) this._updateFilterCountBadge(bar, cfg);
                    }
                });
            });

            body.querySelectorAll('.m-proxy-check').forEach(chk => {
                chk.addEventListener('change', () => {
                    const target = document.getElementById(chk.dataset.target);
                    if (target) {
                        target.checked = chk.checked;
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });

            body.querySelectorAll('.m-proxy-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const ctrl = cfg.extraControls[parseInt(btn.dataset.idx, 10)];
                    this.closeSheets();
                    if (ctrl && typeof ctrl.onclick === 'function') ctrl.onclick();
                });
            });

            document.getElementById('m-filter-sheet-done').addEventListener('click', () => this.closeSheets());
            this._openSheet('filter');
        },

        // ====================================================================
        // QUICK ACTIONS 1-TAP SU CARD SOCI & RICEVUTE
        // ====================================================================
        _enhanceSociCardsQuickActions() {
            const cards = document.querySelectorAll('#soci-cards-container .socio-card');
            cards.forEach(card => {
                const header = card.querySelector('.sc-header');
                if (!header || header.querySelector('.m-card-quick-btn')) return;
                const idMatch = (card.id || '').match(/^sc-(\d+)$/);
                if (!idMatch) return;
                const socioId = Number(idMatch[1]);
                const socio = (app.state?.soci || []).find(s => Number(s.id) === socioId);
                if (!socio) return;

                const chevron = header.querySelector('.sc-chevron');
                const wrap = document.createElement('div');
                wrap.style.cssText = 'display:inline-flex; gap:5px; align-items:center; flex-shrink:0;';
                wrap.addEventListener('click', (e) => e.stopPropagation());

                if (socio.tel) {
                    const waBtn = document.createElement('button');
                    waBtn.type = 'button';
                    waBtn.className = 'm-card-quick-btn btn-wa';
                    waBtn.title = 'Messaggio rapido';
                    waBtn.textContent = '💬';
                    waBtn.onclick = () => app.openContactSocioModal(socioId);
                    wrap.appendChild(waBtn);
                }
                const payBtn = document.createElement('button');
                payBtn.type = 'button';
                payBtn.className = 'm-card-quick-btn btn-pay';
                payBtn.title = 'Emetti ricevuta';
                payBtn.textContent = '💳';
                payBtn.onclick = () => app.openAddRicevutaModal(null, null, null, socioId);
                wrap.appendChild(payBtn);

                if (chevron) header.insertBefore(wrap, chevron);
                else header.appendChild(wrap);
            });
        },

        _enhanceRicevuteCardsQuickActions() {
            const cards = document.querySelectorAll('#ricevute-cards-container .socio-card');
            cards.forEach(card => {
                const header = card.querySelector('.sc-header');
                if (!header || header.querySelector('.m-card-quick-btn')) return;
                const rId = (card.id || '').replace(/^rc-/, '');
                if (!rId) return;

                const chevron = header.querySelector('.sc-chevron');
                const printBtn = document.createElement('button');
                printBtn.type = 'button';
                printBtn.className = 'm-card-quick-btn';
                printBtn.title = 'Stampa ricevuta';
                printBtn.textContent = '🖨️';
                printBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    app.printReceipt(rId);
                });

                if (chevron) header.insertBefore(printBtn, chevron);
                else header.appendChild(printBtn);
            });
        },

        // ====================================================================
        // FASE 3: MOBILE CARDS PER ISTRUTTORI, COMPENSI, RIMBORSI, MAGAZZINO
        // ====================================================================
        _convertKpiGridToScroll() {
            document.querySelectorAll('#main-content .glass-card > div[style*="grid-template-columns"]').forEach(grid => {
                grid.classList.add('m-kpi-scroll-grid');
            });
        },

        _renderIstruttoriCards() {
            const table = document.getElementById('istruttori-table');
            if (!table) return;
            const tableWrap = table.closest('.table-container');
            if (!tableWrap) return;
            tableWrap.classList.add('m-cards-replaced-table');

            let container = document.getElementById('mobile-istruttori-cards');
            if (!container) {
                container = document.createElement('div');
                container.id = 'mobile-istruttori-cards';
                tableWrap.parentNode.insertBefore(container, tableWrap.nextSibling);
            }

            const list = typeof app.getSortedIstruttori === 'function' ? app.getSortedIstruttori() : (app.state?.istruttori || []);
            if (list.length === 0) {
                container.innerHTML = `<div class="sc-empty">Nessun istruttore registrato. Premi <strong>+ Istruttore</strong> per iniziare.</div>`;
                return;
            }

            const ruoloMap = {
                'volontario': { bg: 'rgba(16,185,129,0.16)', col: '#34d399', lbl: 'Volontario' },
                'collaboratore': { bg: 'rgba(59,130,246,0.16)', col: '#60a5fa', lbl: 'Collaboratore' },
                'dipendente': { bg: 'rgba(139,92,246,0.16)', col: '#a78bfa', lbl: 'Dipendente' }
            };

            container.innerHTML = list.map(i => {
                const rb = ruoloMap[i.ruolo] || { bg: 'rgba(148,163,184,0.16)', col: '#94a3b8', lbl: i.ruolo || 'Staff' };
                const initial = ((i.nome || '?')[0]).toUpperCase();
                const corsi = (app.state?.corsi || []).filter(c => c.istruttore_id == i.id);
                const cardId = `m-ist-${i.id}`;
                return `
                    <div class="socio-card m-entity-card" id="${cardId}">
                        <div class="sc-header" onclick="document.getElementById('${cardId}').classList.toggle('sc-open')">
                            <div class="sc-avatar">${esc(initial)}</div>
                            <div class="sc-main-info">
                                <div class="sc-name">${esc(i.nome)}</div>
                                <div class="sc-subtitle">${esc((i.discipline || []).join(', ') || 'Nessuna disciplina')}</div>
                            </div>
                            <div class="sc-badge-wrap">
                                <span class="badge" style="background:${rb.bg}; color:${rb.col}; font-size:0.68rem; padding:2px 7px;">${esc(rb.lbl)}</span>
                                <span style="font-size:0.75rem; font-weight:700; color:#34d399;">${i.compenso_mensile ? '€ ' + parseFloat(i.compenso_mensile).toFixed(0) + '/m' : (i.ore_settimanali ? i.ore_settimanali + 'h/s' : '')}</span>
                            </div>
                            <span class="sc-chevron">▼</span>
                        </div>
                        <div class="sc-details">
                            ${i.tel ? `<div class="sc-detail-row"><span class="sc-detail-icon">📞</span><span class="sc-detail-label">Telefono</span><span class="sc-detail-value"><a href="tel:${esc(i.tel)}">${esc(i.tel)}</a></span></div>` : ''}
                            ${i.email ? `<div class="sc-detail-row"><span class="sc-detail-icon">✉️</span><span class="sc-detail-label">Email</span><span class="sc-detail-value"><a href="mailto:${esc(i.email)}">${esc(i.email)}</a></span></div>` : ''}
                            <div class="sc-detail-row"><span class="sc-detail-icon">⏱️</span><span class="sc-detail-label">Monte Ore</span><span class="sc-detail-value">${i.ore_settimanali ? esc(i.ore_settimanali) + ' ore/settimana' : '—'} (${corsi.length} turni)</span></div>
                            <div class="sc-detail-divider"></div>
                            <div class="sc-actions">
                                <button type="button" class="sc-action-btn primary" onclick="app.openAssegnaOrariModal(${i.id})">📅 Orari</button>
                                <button type="button" class="sc-action-btn success" onclick="app.openCompensoIstruttoreModal(${i.id})">📄 Compenso</button>
                                <button type="button" class="sc-action-btn" onclick="app.openEditIstruttoreModal(${i.id})">✏️ Modifica</button>
                                <button type="button" class="sc-action-btn danger" onclick="app.deleteIstruttore(${i.id})">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        _renderCompensiCards() {
            const tbody = document.getElementById('compensi-tbody');
            if (!tbody) return;
            const tableWrap = tbody.closest('.table-container');
            if (!tableWrap) return;
            tableWrap.classList.add('m-cards-replaced-table');

            let container = document.getElementById('mobile-compensi-cards');
            if (!container) {
                container = document.createElement('div');
                container.id = 'mobile-compensi-cards';
                tableWrap.parentNode.insertBefore(container, tableWrap.nextSibling);
            }

            const list = typeof app.getFilteredCompensi === 'function' ? app.getFilteredCompensi() : [];
            if (list.length === 0) {
                container.innerHTML = `<div class="sc-empty">Nessuna ricevuta compenso trovata.</div>`;
                return;
            }

            const sorted = [...list].sort((a, b) => (new Date(b.data).getTime() || 0) - (new Date(a.data).getTime() || 0));
            container.innerHTML = sorted.map(r => {
                const instr = (app.state?.istruttori || []).find(i => i.id == r.istruttore_id);
                const nome = (instr ? instr.nome : (r.socio_nome || '—')).replace('ISTRUTTORE: ', '');
                const sYear = app.getRecordSportsYear(r);
                const numFmt = `C${String(r.numero).padStart(3, '0')}/${app.formatAnno(sYear)}`;
                const isAnn = !!r.annullata;
                const isBozza = r.stato === 'bozza';
                const cardCls = isAnn ? 'sc-expired' : (isBozza ? 'sc-warning' : '');
                const statoBadge = isAnn
                    ? `<span class="rc-stato-badge annullata">🚫 Annullata</span>`
                    : (isBozza ? `<span class="rc-stato-badge bozza">🔴 Bozza</span>` : `<span class="rc-stato-badge emessa">🟢 Emessa</span>`);
                const cardId = `m-comp-${r.id}`;

                return `
                    <div class="socio-card m-entity-card ${cardCls}" id="${cardId}">
                        <div class="sc-header" onclick="document.getElementById('${cardId}').classList.toggle('sc-open')">
                            <div class="sc-avatar" style="border-radius:10px; font-size:0.8rem;">📑</div>
                            <div class="sc-main-info">
                                <div class="sc-name">${esc(nome)}</div>
                                <div class="sc-subtitle">${esc(r.prestazione || 'Attività sportiva')} · ${app.formatDate(r.data)}</div>
                            </div>
                            <div class="rc-header-right">
                                <span class="rc-amount ${isAnn ? 'annullata' : ''}">€ ${parseFloat(r.importo || 0).toFixed(2)}</span>
                                <span class="rc-num-pill">${esc(numFmt)}</span>
                            </div>
                            <span class="sc-chevron">▼</span>
                        </div>
                        <div class="sc-details">
                            <div class="sc-detail-row"><span class="sc-detail-icon">💳</span><span class="sc-detail-label">Metodo</span><span class="sc-detail-value">${esc(r.pagamento || 'Bonifico')}</span></div>
                            <div class="sc-detail-row"><span class="sc-detail-icon">📄</span><span class="sc-detail-label">Stato</span><span class="sc-detail-value">${statoBadge}</span></div>
                            ${r.periodo ? `<div class="sc-detail-row"><span class="sc-detail-icon">🗓️</span><span class="sc-detail-label">Periodo</span><span class="sc-detail-value">${esc(r.periodo)}</span></div>` : ''}
                            <div class="sc-detail-divider"></div>
                            <div class="sc-actions">
                                <button type="button" class="sc-action-btn primary" onclick="app.printCompensoReceipt('${esc(r.id)}')">🖨️ Stampa</button>
                                ${isBozza && !isAnn ? `<button type="button" class="sc-action-btn success" onclick="app.toggleCompensoStato('${esc(r.id)}', event)">✅ Emetti</button>` : ''}
                                ${(isBozza || app.state?.debugMode) && !isAnn ? `<button type="button" class="sc-action-btn warning" onclick="app.openEditCompensoModal('${esc(r.id)}')">✏️ Modifica</button>` : ''}
                                ${!isAnn ? `<button type="button" class="sc-action-btn danger" onclick="app.annullaCompensoReceipt('${esc(r.id)}')">🚫 Annulla</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        _renderRimborsiCards() {
            const tbody = document.getElementById('rimborsi-tbody');
            if (!tbody) return;
            const tableWrap = tbody.closest('.table-container');
            if (!tableWrap) return;
            tableWrap.classList.add('m-cards-replaced-table');

            let container = document.getElementById('mobile-rimborsi-cards');
            if (!container) {
                container = document.createElement('div');
                container.id = 'mobile-rimborsi-cards';
                tableWrap.parentNode.insertBefore(container, tableWrap.nextSibling);
            }

            const list = typeof app.getFilteredRimborsi === 'function' ? app.getFilteredRimborsi() : [];
            if (list.length === 0) {
                container.innerHTML = `<div class="sc-empty">Nessun rimborso trovato con i filtri attuali.</div>`;
                return;
            }

            const sorted = [...list].sort((a, b) => (new Date(b.data).getTime() || 0) - (new Date(a.data).getTime() || 0));
            container.innerHTML = sorted.map(r => {
                const isAnn = !!r.annullato;
                const isPag = !!r.pagato && !isAnn;
                const isBozza = r.stato === 'bozza';
                const voci = (r.voci && r.voci.length > 0) ? r.voci : [{ tipo: 'Altro', desc: r.descrizione || 'Spesa sostenuta', importo: r.importo || 0 }];
                const cardCls = isAnn ? 'sc-expired' : (!isPag ? 'sc-warning' : '');
                const cardId = `m-rimb-${r.id}`;
                const payBadge = isAnn
                    ? `<span class="rc-stato-badge annullata">STORMATO</span>`
                    : (isPag ? `<span class="rc-stato-badge emessa">PAGATO</span>` : `<span class="rc-origin-badge cartacea">DA PAGARE</span>`);

                return `
                    <div class="socio-card m-entity-card ${cardCls}" id="${cardId}">
                        <div class="sc-header" onclick="document.getElementById('${cardId}').classList.toggle('sc-open')">
                            <div class="sc-avatar" style="border-radius:10px; font-size:0.85rem;">💸</div>
                            <div class="sc-main-info">
                                <div class="sc-name">${esc(r.richiedente || '—')}</div>
                                <div class="sc-subtitle">${app.formatDate(r.data)} · ${voci.length} ${voci.length === 1 ? 'voce' : 'voci'}</div>
                            </div>
                            <div class="rc-header-right">
                                <span class="rc-amount ${isAnn ? 'annullata' : ''}">€ ${Number(r.importo || 0).toFixed(2)}</span>
                                ${payBadge}
                            </div>
                            <span class="sc-chevron">▼</span>
                        </div>
                        <div class="sc-details">
                            ${voci.map(v => `
                                <div class="sc-detail-row">
                                    <span class="sc-detail-icon">•</span>
                                    <span class="sc-detail-label">${esc(app.getRimborsoCategoriaLabel ? app.getRimborsoCategoriaLabel(v.tipo) : v.tipo)}</span>
                                    <span class="sc-detail-value">${esc(v.desc || '')} — <strong>€ ${Number(v.importo || 0).toFixed(2)}</strong></span>
                                </div>
                            `).join('')}
                            ${r.note ? `<div class="sc-detail-row"><span class="sc-detail-icon">📝</span><span class="sc-detail-label">Note</span><span class="sc-detail-value">${esc(r.note)}</span></div>` : ''}
                            <div class="sc-detail-divider"></div>
                            <div class="sc-actions">
                                ${!isAnn && !isPag ? `<button type="button" class="sc-action-btn success" onclick="app.segnaRimborsoPagato('${esc(r.id)}')">✅ Paga</button>` : ''}
                                ${isBozza && !isAnn ? `<button type="button" class="sc-action-btn warning" onclick="app.toggleRimborsoStato('${esc(r.id)}', event)">🟢 Emetti</button>` : ''}
                                <button type="button" class="sc-action-btn primary" onclick="app.stampaModuloRimborso('${esc(r.id)}', true)">🖨️ Modulo</button>
                                ${(isBozza || app.state?.debugMode) && !isAnn ? `<button type="button" class="sc-action-btn" onclick="app.openEditRimborsoModal('${esc(r.id)}')">✏️</button>` : ''}
                                ${!isAnn ? `<button type="button" class="sc-action-btn danger" onclick="app.annullaRimborso('${esc(r.id)}')">🚫</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        _renderMagazzinoCards() {
            const table = document.querySelector('#main-content table.data-table');
            if (!table) return;
            const glassCard = table.closest('.glass-card');
            if (!glassCard) return;
            table.classList.add('m-cards-replaced-table');

            let container = document.getElementById('mobile-magazzino-cards');
            if (!container) {
                container = document.createElement('div');
                container.id = 'mobile-magazzino-cards';
                container.style.padding = '8px';
                glassCard.appendChild(container);
            }

            const items = app.state?.magazzino || [];
            if (items.length === 0) {
                container.innerHTML = `<div class="sc-empty">Nessun articolo in magazzino.</div>`;
                return;
            }

            container.innerHTML = items.map(m => {
                const isLow = m.quantita <= m.scorta_minima;
                return `
                    <div class="socio-card m-entity-card ${isLow ? 'sc-expired' : ''}" style="padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <div style="min-width:0; flex:1;">
                            <div style="font-weight:700; font-size:0.95rem; color:${isLow ? '#fca5a5' : '#f8fafc'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(m.nome)}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                                Scorta min: ${m.scorta_minima} ${isLow ? '· <strong style="color:#f87171;">In esaurimento</strong>' : ''}
                            </div>
                        </div>
                        <div class="m-qty-stepper">
                            <button type="button" class="m-qty-btn" onclick="app.updateMagazzinoQty(${m.id}, -1)" aria-label="Diminuisci">−</button>
                            <span class="m-qty-val">${m.quantita}</span>
                            <button type="button" class="m-qty-btn" onclick="app.updateMagazzinoQty(${m.id}, 1)" aria-label="Aumenta">+</button>
                        </div>
                        <button type="button" class="m-card-quick-btn" style="border-color:rgba(239,68,68,0.3); color:#f87171;" onclick="app.deleteMagazzinoItem(${m.id})" aria-label="Elimina">🗑️</button>
                    </div>
                `;
            }).join('');
        },

        // ====================================================================
        // QUICK ACTION SHEET & MOBILE POST-IT SHEET
        // ====================================================================
        openQuickActionSheet() {
            const title = document.getElementById('m-quick-sheet-title');
            const body = document.getElementById('m-quick-sheet-body');
            if (!body) return;
            if (title) title.textContent = 'Azioni Rapide';

            body.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
                    <button type="button" class="btn btn-primary" style="min-height:52px; justify-content:center;" onclick="MobileUX.closeSheets(); app.openAddSocioModal();">👤 + Nuovo Socio</button>
                    <button type="button" class="btn btn-primary" style="min-height:52px; justify-content:center; background:linear-gradient(135deg,#10b981,#059669);" onclick="MobileUX.closeSheets(); app.openAddRicevutaModal();">🧾 + Ricevuta</button>
                    <button type="button" class="btn btn-outline" style="min-height:48px; justify-content:center;" onclick="MobileUX.closeSheets(); app.showPrimaNotaForm();">💶 + Movimento</button>
                    <button type="button" class="btn btn-outline" style="min-height:48px; justify-content:center;" onclick="MobileUX.closeSheets(); app.openRimborsoModal();">💸 + Rimborso</button>
                </div>
                <button type="button" class="btn btn-outline" style="width:100%; min-height:46px; justify-content:center; margin-bottom:8px;" onclick="MobileUX.closeSheets(); MobileUX.openPostitSheet();">📌 Gestisci Note Post-it</button>
                <button type="button" class="btn btn-outline" style="width:100%; min-height:46px; justify-content:center;" onclick="MobileUX.closeSheets(); app.cloudSync.syncNow();">☁️ Sincronizza Google Drive</button>
            `;
            this._openSheet('quick');
        },

        openPostitSheet() {
            const title = document.getElementById('m-quick-sheet-title');
            const body = document.getElementById('m-quick-sheet-body');
            if (!body) return;
            if (title) title.textContent = '📌 Note Rapide (Post-it)';
            this._renderPostitSheetBody();
            this._openSheet('postit');
        },

        _renderPostitSheetBody() {
            const body = document.getElementById('m-quick-sheet-body');
            if (!body || typeof app === 'undefined') return;
            const list = (app.state?.postit || []).filter(p => !p.nascosto);

            body.innerHTML = `
                <button type="button" class="btn btn-primary" style="width:100%; min-height:44px; justify-content:center; margin-bottom:12px;" onclick="app.nuovoPostit(); MobileUX._renderPostitSheetBody();">
                    ➕ Nuovo Post-it
                </button>
                ${list.length === 0 ? `<div class="sc-empty" style="padding:1.5rem 0;">Nessuna nota attiva.</div>` : list.map(p => `
                    <div style="background:rgba(254,240,138,0.1); border:1px solid rgba(250,204,21,0.35); border-radius:14px; padding:10px 12px; margin-bottom:10px;">
                        <textarea class="form-control" rows="2" placeholder="Scrivi nota..." style="background:rgba(15,23,42,0.6); margin-bottom:8px; ${p.fatto ? 'text-decoration:line-through; opacity:0.6;' : ''}" oninput="app.updatePostitText('${esc(p.id)}', this.value)">${esc(p.testo || '')}</textarea>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button type="button" class="sc-action-btn ${p.fatto ? '' : 'success'}" onclick="app.togglePostitFatto('${esc(p.id)}'); MobileUX._renderPostitSheetBody();">${p.fatto ? '↩️ Da fare' : '☑️ Fatto'}</button>
                            <button type="button" class="sc-action-btn danger" onclick="app.deletePostit('${esc(p.id)}'); MobileUX._renderPostitSheetBody();">🗑️ Elimina</button>
                        </div>
                    </div>
                `).join('')}
            `;
        },

        _openSheet(mode) {
            this._sheetMode = mode;
            const prefix = mode === 'filter' ? 'mobile-filter-sheet' : 'mobile-quick-sheet';
            const sheet = document.getElementById(prefix);
            const backdrop = document.getElementById(prefix + '-backdrop');
            if (backdrop) backdrop.classList.add('open');
            if (sheet) sheet.classList.add('open');
            this._pushOverlayState('sheet');
            this._syncFabVisibility();
        },

        closeSheets(skipPop = false) {
            if (!this._sheetMode) return;
            ['mobile-filter-sheet', 'mobile-quick-sheet'].forEach(id => {
                document.getElementById(id)?.classList.remove('open');
                document.getElementById(id + '-backdrop')?.classList.remove('open');
            });
            this._sheetMode = null;
            if (!skipPop) this._popOverlayStateIfTop('sheet');
            this._syncFabVisibility();
        },

        // ====================================================================
        // ROLLBACK TOGGLE UI (Drawer + Impostazioni)
        // ====================================================================
        _injectDrawerRollbackRow() {
            const body = document.querySelector('#mobile-nav-drawer .mnd-body');
            if (!body || document.getElementById('mnd-rollback-wrap')) return;
            const wrap = document.createElement('div');
            wrap.id = 'mnd-rollback-wrap';
            wrap.innerHTML = `
                <div class="mnd-divider"></div>
                <div class="mnd-section-label">Interfaccia Mobile</div>
                <div class="mnd-action-row">
                    <button type="button" class="mnd-action-btn" id="mnd-toggle-v2-btn" onclick="mobileBottomNav.closeMenu(); MobileUX.toggleEnabled();">
                        ✨ Stile v2 Attivo (Passa a Classico)
                    </button>
                </div>
            `;
            body.appendChild(wrap);
            this._syncDrawerToggleRow();
        },

        _syncDrawerToggleRow() {
            const btn = document.getElementById('mnd-toggle-v2-btn');
            if (!btn) return;
            btn.textContent = this.isEnabled()
                ? '↩️ Torna a Interfaccia Mobile Classica'
                : '✨ Attiva Interfaccia Mobile v2';
        },

        _injectSettingsRollbackCard() {
            const grid = document.querySelector('#main-content .page-content > div[style*="grid-template-columns"]');
            if (!grid || document.getElementById('m-settings-v2-card')) return;
            const card = document.createElement('div');
            card.id = 'm-settings-v2-card';
            card.className = 'glass-card';
            card.style.cssText = 'border-left: 4px solid #8b5cf6; grid-column: 1 / -1;';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h3 style="margin:0 0 4px 0;">📱 Esperienza Mobile (v2 Moderna vs Classica)</h3>
                        <p style="margin:0; font-size:0.83rem; color:var(--text-muted);">Puoi attivare o disattivare in qualsiasi momento il nuovo layout mobile con Bottom Sheet, FAB rapido e Card unificate (rollback immediato).</p>
                    </div>
                    <button type="button" class="btn ${this.isEnabled() ? 'btn-outline' : 'btn-primary'}" onclick="MobileUX.toggleEnabled()">
                        ${this.isEnabled() ? '↩️ Ripristina Mobile Classico' : '✨ Attiva Mobile v2'}
                    </button>
                </div>
            `;
            grid.insertBefore(card, grid.firstChild);
        },

        // ====================================================================
        // INPUT ERGONOMICS, SCROLL FAB & POPSTATE BACK BUTTON
        // ====================================================================
        _enhanceInputs(root) {
            if (!root) return;
            root.querySelectorAll('input').forEach(inp => {
                if (inp.dataset.mEnhanced) return;
                inp.dataset.mEnhanced = '1';
                const step = inp.getAttribute('step') || '';
                const name = (inp.name || inp.id || '').toLowerCase();
                if (inp.type === 'number' && (step.includes('.') || name.includes('importo') || name.includes('commiss'))) {
                    inp.setAttribute('inputmode', 'decimal');
                } else if (inp.type === 'number') {
                    inp.setAttribute('inputmode', 'numeric');
                } else if (inp.type === 'tel' || name.includes('tel')) {
                    inp.setAttribute('inputmode', 'tel');
                }
            });
        },

        _setupScrollListeners() {
            const main = document.getElementById('main-content');
            if (!main) return;
            main.addEventListener('scroll', (e) => {
                if (!this.isEnabled() || !this.isMobileViewport()) return;
                const tgt = e.target;
                if (tgt !== main && !tgt.classList?.contains('page-content')) return;
                const fab = document.getElementById('mobile-fab');
                if (!fab || !document.body.classList.contains('has-mobile-fab')) return;
                const cur = tgt.scrollTop;
                if (cur > this._lastScrollY + 24 && cur > 80) {
                    fab.classList.add('fab-hidden');
                } else if (cur < this._lastScrollY - 12 || cur <= 40) {
                    this._syncFabVisibility();
                }
                this._lastScrollY = cur;
            }, { passive: true, capture: true });
        },

        _pushOverlayState(kind) {
            try {
                if (!history.state || history.state.mobileOverlay !== kind) {
                    history.pushState({ mobileOverlay: kind }, '');
                }
            } catch (e) {}
        },

        _popOverlayStateIfTop(kind) {
            if (this._popstateGuard) return;
            try {
                if (history.state && history.state.mobileOverlay === kind) {
                    this._popstateGuard = true;
                    history.back();
                    setTimeout(() => { this._popstateGuard = false; }, 60);
                }
            } catch (e) {}
        },

        _setupPopstate() {
            window.addEventListener('popstate', () => {
                if (!this.isEnabled() || !this.isMobileViewport() || this._popstateGuard) return;
                this._popstateGuard = true;
                try {
                    if (this._sheetMode) {
                        this.closeSheets(true);
                    } else if (document.getElementById('modal-overlay')?.style.display === 'flex') {
                        app.closeModal();
                    } else if (document.getElementById('mobile-nav-drawer')?.classList.contains('open')) {
                        mobileBottomNav.closeMenu();
                    }
                } finally {
                    setTimeout(() => { this._popstateGuard = false; }, 60);
                }
            });
        },

        _setupModalSwipe() {
            const modal = document.getElementById('modal-content');
            if (!modal) return;
            let startY = 0, startTime = 0, canSwipe = false;
            modal.addEventListener('touchstart', (e) => {
                if (!this.isEnabled() || !this.isMobileViewport()) return;
                canSwipe = modal.scrollTop <= 2;
                startY = e.touches[0].clientY;
                startTime = Date.now();
            }, { passive: true });
            modal.addEventListener('touchend', (e) => {
                if (!canSwipe || !this.isEnabled() || !this.isMobileViewport()) return;
                const dy = e.changedTouches[0].clientY - startY;
                const dt = Date.now() - startTime;
                if (dy > 90 && dt < 380 && typeof app !== 'undefined') {
                    app.closeModal();
                }
            }, { passive: true });
        }
    };

    window.MobileUX = MobileUX;

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => MobileUX.init(), 280);
    });
})();
