// ==UserScript==
// @name         OB Dock Loads
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  v8.0 — Agregado sistema de auto-update desde GitHub
// @author       Jorge Gomez (jrgmz)
// @match        https://trans-logistics.amazon.com/ssp/dock/hrz/ob*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20Dock%20Loads.user.js
// @downloadURL  https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20Dock%20Loads.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = '8.0';
    const SCRIPT_NAME = 'OB Dock Loads';
    const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20Dock%20Loads.user.js';

    const STORAGE_KEY = 'dock_panel_position';
    const STORAGE_MINIMIZED = 'dock_panel_minimized';

    // ==================== ESTATUS DEFINIDOS ====================
    const STATUS_MAP = {
        'completed': { label: 'Completado', emoji: '✅', class: 'stat-completed' },
        'scheduled': { label: 'Agendado', emoji: '📋', class: 'stat-scheduled' },
        'loading in progress': { label: 'En Proceso', emoji: '⏳', class: 'stat-inprogress' },
        'loading': { label: 'En Proceso', emoji: '⏳', class: 'stat-inprogress' },
        'ready for loading': { label: 'Para Irse', emoji: '🚀', class: 'stat-readytodepart' },
        'ready to depart': { label: 'Para Irse', emoji: '🚀', class: 'stat-readytodepart' }
    };

    function getStatusInfo(rawStatus) {
        if (!rawStatus) return { label: 'Desconocido', emoji: '❓', class: 'stat-unknown' };
        const key = rawStatus.toLowerCase().trim();
        if (STATUS_MAP[key]) return STATUS_MAP[key];
        // Buscar coincidencia parcial
        for (const [mapKey, mapVal] of Object.entries(STATUS_MAP)) {
            if (key.includes(mapKey) || mapKey.includes(key)) return mapVal;
        }
        return { label: rawStatus, emoji: '❓', class: 'stat-unknown' };
    }

    // ==================== ESTILOS ====================
    // Función alternativa: crear <style> tag directamente para evitar CSP unsafe-inline
    function injectStyles(css) {
        try {
            const style = document.createElement('style');
            style.textContent = css;
            style.nonce = (window.__webpack_nonce__ || window.__CSP_NONCE__); // Intenta usar nonce si existe
            document.head.appendChild(style);
        } catch (e) {
            console.error('[OB Dock] Error inyectando estilos:', e);
            // Fallback: agregar estilos inline si falla el método anterior
            try {
                const style2 = document.createElement('style');
                style2.innerHTML = css;
                document.documentElement.appendChild(style2);
            } catch (e2) { /* ignorar */ }
        }
    }

    const stylesCss = `
        /* ===== PANEL EXPANDIDO ===== */
        #dock-panel-container {
            position: fixed;
            width: 680px;
            max-height: 85vh;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ===== MINIATURA ===== */
        #dock-panel-container.minimized {
            width: 44px !important;
            height: 44px !important;
            max-height: 44px !important;
            min-height: 44px !important;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(56, 189, 248, 0.4), 0 0 20px rgba(56, 189, 248, 0.2);
            background: linear-gradient(135deg, #0ea5e9, #38bdf8);
            border: 2px solid rgba(56, 189, 248, 0.6);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #dock-panel-container.minimized:hover {
            transform: scale(1.15);
            box-shadow: 0 4px 20px rgba(56, 189, 248, 0.6), 0 0 30px rgba(56, 189, 248, 0.35);
        }
        #dock-panel-container.minimized #dock-panel-header,
        #dock-panel-container.minimized #dock-panel-filters,
        #dock-panel-container.minimized #dock-panel-stats,
        #dock-panel-container.minimized #dock-panel-body {
            display: none !important;
        }
        #dock-mini-icon {
            display: none;
            font-size: 20px;
            line-height: 1;
        }
        #dock-panel-container.minimized #dock-mini-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
        }

        /* ===== HEADER ===== */
        #dock-panel-header {
            background: linear-gradient(135deg, #1a2332, #232f3e);
            color: #fff;
            padding: 10px 16px;
            font-weight: 600;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }
        #dock-panel-header .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #dock-panel-header .header-actions {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        #dock-panel-header .header-actions button {
            background: rgba(255,255,255,0.1);
            border: none;
            color: #fff;
            font-size: 12px;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 6px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 500;
        }
        #dock-panel-header .header-actions button:hover {
            background: rgba(255,255,255,0.25);
        }
        #dock-panel-header .header-actions .btn-hdr-copy {
            background: rgba(0, 115, 187, 0.5);
        }
        #dock-panel-header .header-actions .btn-hdr-excel {
            background: rgba(33, 115, 70, 0.5);
        }
        #dock-panel-header .header-actions .btn-hdr-minimize {
            font-size: 16px;
            padding: 4px 8px;
        }

        /* ===== FILTROS ===== */
        #dock-panel-filters {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f0;
            display: none;
            flex-direction: column;
            gap: 8px;
        }
        #dock-panel-filters.visible {
            display: flex;
        }
        .dock-filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
        .dock-filter-row-label {
            font-size: 10px;
            font-weight: 700;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-right: 4px;
            min-width: 50px;
        }
        .dock-filter-btn {
            padding: 4px 10px;
            border: 1.5px solid #e0e0e0;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 500;
            background: #fff;
            cursor: pointer;
            transition: all 0.2s;
            color: #555;
        }
        .dock-filter-btn:hover {
            border-color: #5b21b6;
            color: #5b21b6;
            background: #f5f3ff;
        }
        .dock-filter-btn.active {
            background: #5b21b6;
            color: #fff;
            border-color: #5b21b6;
            box-shadow: 0 2px 8px rgba(91, 33, 182, 0.3);
        }

        /* ===== STATS/CONTADOR - CLICKEABLE COMO FILTROS ===== */
        #dock-panel-stats {
            padding: 10px 16px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            border-bottom: 1px solid #f0f0f0;
            background: #fafbfc;
        }
        .dock-stat-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 8px 16px;
            border-radius: 24px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            border: 2.5px solid transparent;
            user-select: none;
        }
        .dock-stat-chip:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .dock-stat-chip.active {
            transform: translateY(-2px);
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        }
        .dock-stat-chip.stat-total { background: #232f3e; color: #fff; }
        .dock-stat-chip.stat-total.active { border-color: #ff9900; box-shadow: 0 4px 14px rgba(35,47,62,0.4); }
        .dock-stat-chip.stat-completed { background: #d4edda; color: #155724; }
        .dock-stat-chip.stat-completed.active { border-color: #155724; }
        .dock-stat-chip.stat-scheduled { background: #cce5ff; color: #004085; }
        .dock-stat-chip.stat-scheduled.active { border-color: #004085; }
        .dock-stat-chip.stat-inprogress { background: #fff3cd; color: #856404; }
        .dock-stat-chip.stat-inprogress.active { border-color: #856404; }
        .dock-stat-chip.stat-readytodepart { background: #e2e3f1; color: #383d6e; }
        .dock-stat-chip.stat-readytodepart.active { border-color: #383d6e; }
        .dock-stat-chip.stat-unknown { background: #f0f0f0; color: #666; }
        .dock-stat-chip.stat-unknown.active { border-color: #666; }

        /* ===== BODY / LISTADO ===== */
        #dock-panel-body {
            overflow-y: auto;
            max-height: calc(85vh - 200px);
            padding: 0;
        }
        .dock-table-header {
            display: grid;
            grid-template-columns: 30px 1fr 100px 80px 70px 45px;
            gap: 4px;
            padding: 6px 12px;
            background: #f0f3f5;
            border-bottom: 1px solid #e0e0e0;
            font-size: 10px;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            position: sticky;
            top: 0;
            z-index: 2;
        }
        .dock-date-separator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 12px;
            background: linear-gradient(90deg, #eef2ff, #f5f3ff);
            border-top: 1px solid #ddd6fe;
            border-bottom: 1px solid #ddd6fe;
            font-size: 12px;
            font-weight: 700;
            color: #5b21b6;
            position: sticky;
            top: 28px;
            z-index: 1;
        }
        .dock-date-separator::before {
            content: '📅';
        }
        .dock-load-row {
            display: grid;
            grid-template-columns: 30px 1fr 100px 80px 70px 45px;
            gap: 4px;
            align-items: center;
            padding: 5px 12px;
            border-bottom: 1px solid #f5f5f5;
            font-size: 12px;
            transition: background 0.15s;
        }
        .dock-load-row:hover {
            background: #f5f8fa;
        }
        .dock-col-status {
            text-align: center;
            font-size: 13px;
        }
        .dock-col-route {
            color: #0073bb;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .dock-col-time {
            color: #444;
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 11px;
            text-align: center;
        }
        .dock-col-carrier {
            color: #7c3aed;
            font-size: 11px;
            text-align: center;
            font-weight: 500;
        }
        .dock-col-location {
            color: #666;
            font-size: 11px;
            text-align: center;
        }
        .dock-col-pallets {
            color: #333;
            font-weight: 600;
            font-size: 11px;
            text-align: center;
        }

        .dock-no-results {
            text-align: center;
            color: #888;
            padding: 30px 20px;
            font-style: italic;
        }

        /* ===== UPDATE SYSTEM ===== */
        #dock-update-popup {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(56, 189, 248, 0.15);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #fff;
            overflow: hidden;
            animation: dock-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #dock-update-popup.closing {
            animation: dock-slide-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes dock-slide-in {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes dock-slide-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
        }
        .dock-popup-header {
            padding: 14px 16px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .dock-popup-header span {
            font-size: 13px;
            font-weight: 600;
        }
        .dock-popup-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.5);
            font-size: 16px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .dock-popup-close:hover {
            color: #fff;
            background: rgba(255,255,255,0.1);
        }
        .dock-popup-body {
            padding: 4px 16px 14px;
        }
        .dock-popup-body .update-badge {
            display: inline-block;
            background: linear-gradient(90deg, #22d3ee, #3b82f6);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 10px;
            margin-bottom: 8px;
        }
        .dock-popup-body .version-info {
            font-size: 13px;
            color: rgba(255,255,255,0.7);
            margin-bottom: 10px;
        }
        .dock-popup-install {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(90deg, #22d3ee, #3b82f6);
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .dock-popup-install:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(34, 211, 238, 0.4);
        }
        .dock-hdr-version {
            font-size: 10px;
            font-weight: 400;
            opacity: 0.6;
            margin-left: 4px;
        }
        .dock-hdr-update-btn {
            background: linear-gradient(90deg, #22d3ee, #3b82f6) !important;
            color: #fff !important;
            font-weight: 600 !important;
            animation: dock-pulse 2s infinite;
        }
        @keyframes dock-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); }
            50% { box-shadow: 0 0 12px 3px rgba(34, 211, 238, 0.3); }
        }
        .dock-hdr-uptodate {
            font-size: 10px;
            opacity: 0.5;
            padding: 4px 8px;
        }
    `;

    // Inyectar estilos al iniciar
    injectStyles(stylesCss);

    // ==================== FUNCIONES DE EXTRACCIÓN ====================

    function detectColumnIndexes() {
        // Buscar la fila de encabezados de la tabla y contar el offset
        const headerRow = document.querySelector('thead tr') || document.querySelector('tr:has(th)');
        if (!headerRow) return { status: -1, sortRoute: -1, location: -1, vrId: -1, pallets: -1, carrier: -1, offset: 0 };

        const headerCells = headerRow.querySelectorAll('th');
        const indexes = { status: -1, sortRoute: -1, location: -1, vrId: -1, pallets: -1, carrier: -1, offset: 0 };

        // Calcular offset: las filas de datos (td) pueden tener un checkbox extra al inicio
        // Comparar cantidad de th vs td en una fila de datos
        const sampleDataRow = document.querySelector('tr:has(td)');
        if (sampleDataRow) {
            const tdCount = sampleDataRow.querySelectorAll('td').length;
            const thCount = headerCells.length;
            if (tdCount > thCount) {
                indexes.offset = tdCount - thCount;
            }
        }

        headerCells.forEach((th, thIdx) => {
            const txt = th.textContent.trim().toLowerCase();
            // El índice real en td = thIdx + offset
            const tdIdx = thIdx + indexes.offset;
            if (txt === 'status') indexes.status = tdIdx;
            if (txt === 'sort/route' || txt === 'sort' || txt === 'route') indexes.sortRoute = tdIdx;
            if (txt === 'location') indexes.location = tdIdx;
            if (txt === 'vr id' || txt === 'vrid') indexes.vrId = tdIdx;
            if (txt === 'c') indexes.pallets = tdIdx;
            if (txt === 'carrier') indexes.carrier = tdIdx;
        });

        console.log('[OB Dock] Column indexes detected:', indexes);
        return indexes;
    }

    function extractLoads() {
        const loads = [];
        const colIndexes = detectColumnIndexes();

        // Buscar todas las filas de la tabla principal
        const allRows = document.querySelectorAll('tr');
        let currentWindow = '';

        allRows.forEach(row => {
            const rowText = row.textContent.trim();

            // Detectar encabezado de ventana de salida
            const windowMatch = rowText.match(/Scheduled Departure Window:\s*(\d{2}-\w{3}-\d{2})\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (windowMatch) {
                const dateStr = windowMatch[1];
                const startTime = windowMatch[2];
                const endTime = windowMatch[3];
                currentWindow = `${dateStr} ${startTime} - ${endTime}`;
                return;
            }

            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return;

            let route = '';
            let vrId = '';
            let status = '';
            let location = '';
            let pallets = '';
            let node = '';
            let carrier = '';

            // Recorrer TODAS las celdas y extraer info por contenido + índice
            cells.forEach((cell, idx) => {
                const cellText = cell.textContent.trim();

                // === STATUS: buscar por contenido conocido en cualquier celda ===
                if (!status) {
                    const cleanText = cellText.split('\n')[0].trim().replace(/Since.*$/i, '').trim();
                    const knownStatuses = ['Completed', 'Scheduled', 'Loading In Progress', 'Loading', 'Ready For Loading', 'Ready to Depart', 'Cancelled', 'Not Started', 'In Progress', 'In progress'];
                    if (knownStatuses.includes(cleanText)) {
                        status = cleanText;
                    }
                }

                // === ROUTE: patrón NODO->DESTINO (quitar WT) ===
                if (!route) {
                    const routeMatch = cellText.match(/(?:WT\s*)?([A-Z][A-Z0-9]{2,4}->[\w]+)/);
                    if (routeMatch) {
                        route = routeMatch[1];
                        const nodeMatch = route.match(/^([A-Z][A-Z0-9]+)->/);
                        if (nodeMatch) node = nodeMatch[1];
                    }
                }

                // === VR ID: patrón alfanumérico ===
                if (!vrId) {
                    const vrMatch = cellText.match(/\b(\d{2,3}[A-Z0-9]{4,10})\b/);
                    if (vrMatch && cellText.length < 25 && !cellText.includes('->')) {
                        vrId = vrMatch[1];
                    }
                }

                // === LOCATION por índice ===
                if (!location && colIndexes.location >= 0 && idx === colIndexes.location) {
                    if (cellText && cellText !== '-') location = cellText;
                }

                // === LOCATION por patrón DD + número (dock door) ===
                if (!location) {
                    const locMatch = cellText.match(/\b(DD\d{1,4})\b/i);
                    if (locMatch) {
                        location = locMatch[1].toUpperCase();
                    }
                }

                // === PALLETS (C) por índice ===
                if (!pallets && colIndexes.pallets >= 0 && idx === colIndexes.pallets) {
                    if (cellText && cellText !== '-') pallets = cellText;
                }

                // === CARRIER por índice ===
                if (!carrier && colIndexes.carrier >= 0 && idx === colIndexes.carrier) {
                    if (cellText && cellText !== '-') carrier = cellText;
                }
            });

            // Si detectamos por índice de status pero no matcheó arriba, intentar de nuevo
            if (!status && colIndexes.status >= 0 && cells[colIndexes.status]) {
                const statusCell = cells[colIndexes.status].textContent.trim().split('\n')[0].replace(/Since.*$/i, '').trim();
                if (statusCell) status = statusCell;
            }

            if (route && vrId) {
                let day = '';
                let timeRange = '';
                if (currentWindow) {
                    const parts = currentWindow.match(/(\d{2}-\w{3}-\d{2})\s+(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})/);
                    if (parts) {
                        day = parts[1];
                        timeRange = parts[2];
                    }
                }

                const statusInfo = getStatusInfo(status);

                loads.push({
                    route: route,
                    vrId: vrId,
                    rawStatus: status || 'Unknown',
                    statusLabel: statusInfo.label,
                    statusEmoji: statusInfo.emoji,
                    statusClass: statusInfo.class,
                    node: node,
                    day: day,
                    timeRange: timeRange,
                    window: currentWindow,
                    location: location || '-',
                    pallets: pallets || '-',
                    carrier: carrier || '-',
                    label: `Route ${route} - ${vrId}`
                });
            }
        });

        console.log('[OB Dock] Extracted loads:', loads.length, loads.slice(0, 3));
        return loads;
    }

    function getTodayStr() {
        const now = new Date();
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dd = String(now.getDate()).padStart(2, '0');
        const mmm = months[now.getMonth()];
        const yy = String(now.getFullYear()).slice(-2);
        return `${dd}-${mmm}-${yy}`;
    }

    // ==================== POSICIÓN GUARDADA ====================

    function savePosition(left, top) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    }

    function loadPosition() {
        try {
            const pos = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (pos && pos.left !== undefined && pos.top !== undefined) return pos;
        } catch(e) {}
        return { left: window.innerWidth - 700, top: 10 };
    }

    function saveMinimizedState(isMinimized) {
        localStorage.setItem(STORAGE_MINIMIZED, isMinimized ? '1' : '0');
    }

    function loadMinimizedState() {
        return localStorage.getItem(STORAGE_MINIMIZED) === '1';
    }

    // ==================== UI ====================

    let allLoads = [];
    let activeStatusFilter = 'all';
    let remoteVersion = null;

    // ==================== AUTO-UPDATE SYSTEM ====================

    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const len = Math.max(parts1.length, parts2.length);
        for (let i = 0; i < len; i++) {
            const a = parts1[i] || 0;
            const b = parts2[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
        }
        return 0;
    }

    function checkForUpdates() {
        fetch(GITHUB_RAW_URL, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('Fetch failed: ' + res.status);
                return res.text();
            })
            .then(text => {
                const match = text.match(/@version\s+([\d.]+)/);
                if (!match) return;
                remoteVersion = match[1].trim();
                console.log(`[OB Dock] Local: v${SCRIPT_VERSION} | Remote: v${remoteVersion}`);

                if (compareVersions(remoteVersion, SCRIPT_VERSION) > 0) {
                    showUpdatePopup(remoteVersion);
                    showHeaderUpdateBtn(remoteVersion);
                } else {
                    showHeaderUpToDate();
                }
            })
            .catch(err => {
                console.warn('[OB Dock] Update check failed:', err.message);
                showHeaderUpToDate();
            });
    }

    function showUpdatePopup(newVersion) {
        // Remover popup anterior si existe
        const existing = document.getElementById('dock-update-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'dock-update-popup';
        popup.innerHTML = `
            <div class="dock-popup-header">
                <span>🚛 ${SCRIPT_NAME}</span>
                <button class="dock-popup-close" id="dock-popup-close">✕</button>
            </div>
            <div class="dock-popup-body">
                <div class="update-badge">🚀 Actualización disponible</div>
                <div class="version-info">v${SCRIPT_VERSION} → v${newVersion}</div>
                <button class="dock-popup-install" id="dock-popup-install">⬆️ Instalar actualización</button>
            </div>
        `;
        document.body.appendChild(popup);

        const closePopup = () => {
            popup.classList.add('closing');
            setTimeout(() => popup.remove(), 300);
        };

        document.getElementById('dock-popup-close').addEventListener('click', closePopup);
        document.getElementById('dock-popup-install').addEventListener('click', () => {
            window.open(GITHUB_RAW_URL, '_blank');
            closePopup();
        });

        // Auto-cerrar en 10 segundos
        setTimeout(() => {
            if (document.getElementById('dock-update-popup')) closePopup();
        }, 10000);
    }

    function showHeaderUpdateBtn(newVersion) {
        const slot = document.getElementById('dock-hdr-update-slot');
        if (!slot) return;
        slot.innerHTML = `<button class="dock-hdr-update-btn" id="dock-hdr-update-action" title="Actualizar a v${newVersion}">⬆️ Actualizar v${newVersion}</button>`;
        const btn = document.getElementById('dock-hdr-update-action');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(GITHUB_RAW_URL, '_blank');
            });
        }
    }

    function showHeaderUpToDate() {
        const slot = document.getElementById('dock-hdr-update-slot');
        if (!slot) return;
        slot.innerHTML = `<span class="dock-hdr-uptodate">✅ Última versión</span>`;
    }

    function createPanel() {
        const container = document.createElement('div');
        container.id = 'dock-panel-container';
        
        try {
            const pos = loadPosition();
            container.style.left = pos.left + 'px';
            container.style.top = pos.top + 'px';

            container.innerHTML = `
                <div id="dock-mini-icon">🚛</div>
                <div id="dock-panel-header">
                    <div class="header-left">
                        <span>🚛 OB Dock Cargas <span class="dock-hdr-version">v${SCRIPT_VERSION}</span></span>
                    </div>
                    <div class="header-actions">
                        <span id="dock-hdr-update-slot"></span>
                        <button class="btn-hdr-copy" id="dock-btn-copy" title="Copiar listado">📋 Copiar</button>
                        <button class="btn-hdr-excel" id="dock-btn-excel" title="Exportar Excel">📊 Excel</button>
                        <button id="dock-panel-refresh" title="Refrescar">🔄</button>
                        <button class="btn-hdr-minimize" id="dock-panel-minimize" title="Minimizar">−</button>
                    </div>
                </div>
                <div id="dock-panel-filters">
                    <div class="dock-filter-row" id="dock-filter-date-row">
                        <span class="dock-filter-row-label">FECHA:</span>
                    </div>
                </div>
                <div id="dock-panel-stats"></div>
                <div id="dock-panel-body">
                    <div class="dock-no-results">Cargando datos...</div>
                </div>
            `;
            document.body.appendChild(container);

            const refreshBtn = document.getElementById('dock-panel-refresh');
            const minimizeBtn = document.getElementById('dock-panel-minimize');
            const copyBtn = document.getElementById('dock-btn-copy');
            const excelBtn = document.getElementById('dock-btn-excel');

            if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
            if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleMinimize();
            });
            if (copyBtn) copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard();
            });
            if (excelBtn) excelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                exportToExcel();
            });

            makeDraggable(container, document.getElementById('dock-panel-header'), container);
        } catch (e) {
            console.error('[OB Dock] Error creando panel:', e);
        }

        if (loadMinimizedState()) {
            container.classList.add('minimized');
        }

        setTimeout(refreshData, 2500);

        // Verificar actualizaciones desde GitHub
        setTimeout(checkForUpdates, 3000);

        // Auto-refresh cada 10 minutos (600000 ms)
        setInterval(refreshData, 600000);
    }

    function refreshData() {
        allLoads = extractLoads();
        activeStatusFilter = 'all';
        updateDateFilters();
        applyFilters();
    }

    function updateDateFilters() {
        const dates = [...new Set(allLoads.map(l => l.day).filter(d => d))];
        dates.sort();

        const filtersContainer = document.getElementById('dock-panel-filters');
        const dateRow = document.getElementById('dock-filter-date-row');

        if (dates.length > 1) {
            filtersContainer.classList.add('visible');
            dateRow.innerHTML = '<span class="dock-filter-row-label">FECHA:</span>';

            const allBtn = document.createElement('button');
            allBtn.className = 'dock-filter-btn active';
            allBtn.setAttribute('data-date', 'all');
            allBtn.textContent = '📅 Todas';
            allBtn.addEventListener('click', () => {
                dateRow.querySelectorAll('.dock-filter-btn').forEach(b => b.classList.remove('active'));
                allBtn.classList.add('active');
                applyFilters();
            });
            dateRow.appendChild(allBtn);

            dates.forEach(date => {
                const btn = document.createElement('button');
                btn.className = 'dock-filter-btn';
                btn.setAttribute('data-date', date);
                btn.textContent = `📅 ${date}`;
                btn.addEventListener('click', () => {
                    dateRow.querySelectorAll('.dock-filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    applyFilters();
                });
                dateRow.appendChild(btn);
            });
        } else {
            filtersContainer.classList.remove('visible');
        }
    }

    function getActiveDate() {
        const active = document.querySelector('#dock-filter-date-row .dock-filter-btn.active');
        return active ? active.getAttribute('data-date') : 'all';
    }

    function getFilteredLoads() {
        const dateFilter = getActiveDate();

        return allLoads.filter(load => {
            if (activeStatusFilter !== 'all') {
                if (load.statusClass !== activeStatusFilter) return false;
            }
            if (dateFilter !== 'all') {
                if (load.day !== dateFilter) return false;
            }
            return true;
        });
    }

    function applyFilters() {
        renderStats();
        const filtered = getFilteredLoads();
        renderLoads(filtered);
    }

    function renderStats() {
        const stats = document.getElementById('dock-panel-stats');
        const dateFilter = getActiveDate();

        const dateFiltered = allLoads.filter(load => {
            if (dateFilter !== 'all' && load.day !== dateFilter) return false;
            return true;
        });

        const counts = {};
        let total = dateFiltered.length;

        dateFiltered.forEach(load => {
            const cls = load.statusClass;
            if (!counts[cls]) {
                counts[cls] = { count: 0, emoji: load.statusEmoji, label: load.statusLabel };
            }
            counts[cls].count++;
        });

        let html = '';

        const totalActive = activeStatusFilter === 'all' ? 'active' : '';
        html += `<span class="dock-stat-chip stat-total ${totalActive}" data-filter="all">📦 Total: ${total}</span>`;

        const knownOrder = ['stat-completed', 'stat-scheduled', 'stat-inprogress', 'stat-readytodepart'];
        const knownEmojis = { 'stat-completed': '✅', 'stat-scheduled': '📋', 'stat-inprogress': '⏳', 'stat-readytodepart': '🚀' };
        const knownLabels = { 'stat-completed': 'Completado', 'stat-scheduled': 'Agendado', 'stat-inprogress': 'En Proceso', 'stat-readytodepart': 'Para Irse' };

        knownOrder.forEach(cls => {
            const c = counts[cls] ? counts[cls].count : 0;
            const isActive = activeStatusFilter === cls ? 'active' : '';
            html += `<span class="dock-stat-chip ${cls} ${isActive}" data-filter="${cls}">${knownEmojis[cls]} ${knownLabels[cls]}: ${c}</span>`;
        });

        if (counts['stat-unknown'] && counts['stat-unknown'].count > 0) {
            const isActive = activeStatusFilter === 'stat-unknown' ? 'active' : '';
            html += `<span class="dock-stat-chip stat-unknown ${isActive}" data-filter="stat-unknown">❓ Otro: ${counts['stat-unknown'].count}</span>`;
        }

        stats.innerHTML = html;

        stats.querySelectorAll('.dock-stat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const filter = chip.getAttribute('data-filter');
                activeStatusFilter = filter;
                applyFilters();
            });
        });
    }

    function renderLoads(loads) {
        const body = document.getElementById('dock-panel-body');

        if (loads.length === 0) {
            body.innerHTML = '<div class="dock-no-results">No se encontraron cargas con los filtros seleccionados</div>';
            return;
        }

        let html = `
            <div class="dock-table-header">
                <span>ST</span>
                <span>RUTA / VRID</span>
                <span>HORA</span>
                <span>CARRIER</span>
                <span>UBIC.</span>
                <span>PLTS</span>
            </div>
        `;

        let currentDay = '';

        loads.forEach(load => {
            if (load.day && load.day !== currentDay) {
                currentDay = load.day;
                html += `<div class="dock-date-separator">${load.day}</div>`;
            }

            html += `
                <div class="dock-load-row">
                    <span class="dock-col-status" title="${load.statusLabel} (${load.rawStatus})">${load.statusEmoji}</span>
                    <span class="dock-col-route" title="${load.label}">${load.label}</span>
                    <span class="dock-col-time">${load.timeRange}</span>
                    <span class="dock-col-carrier" title="${load.carrier}">${load.carrier}</span>
                    <span class="dock-col-location">${load.location}</span>
                    <span class="dock-col-pallets">${load.pallets}</span>
                </div>
            `;
        });

        body.innerHTML = html;
    }

    // ==================== COPIAR ====================

    function copyToClipboard() {
        const filtered = getFilteredLoads();

        if (filtered.length === 0) {
            showBtnFeedback('dock-btn-copy', '⚠️ Sin datos');
            return;
        }

        let text = `🚛 OB Dock Cargas\n`;
        text += `─────────────────────────────\n\n`;

        let currentDay = '';
        filtered.forEach(load => {
            if (load.day && load.day !== currentDay) {
                currentDay = load.day;
                text += `📅 ${load.day}\n`;
            }
            text += `${load.statusEmoji} ${load.label} | ${load.timeRange} | ${load.carrier} | Loc: ${load.location} | Plts: ${load.pallets}\n`;
        });

        text += `\n─────────────────────────────\n`;
        text += `📦 Total: ${filtered.length} carga(s)`;

        navigator.clipboard.writeText(text).then(() => {
            showBtnFeedback('dock-btn-copy', '✅ Copiado');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showBtnFeedback('dock-btn-copy', '✅ Copiado');
        });
    }

    // ==================== EXPORTAR EXCEL ====================

    function exportToExcel() {
        const filtered = getFilteredLoads();

        if (filtered.length === 0) {
            showBtnFeedback('dock-btn-excel', '⚠️ Sin datos');
            return;
        }

        let csv = '\uFEFF';
        csv += 'Status,Ruta,VR ID,Nodo,Horario,Carrier,Ubicación,Pallets,Día\n';

        filtered.forEach(load => {
            csv += `"${load.statusLabel}","${load.route}","${load.vrId}","${load.node}","${load.timeRange}","${load.carrier}","${load.location}","${load.pallets}","${load.day}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `OB_Dock_Cargas_${getTodayStr()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showBtnFeedback('dock-btn-excel', '✅ Descargado');
    }

    // ==================== HELPERS ====================

    function showBtnFeedback(btnId, msg) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const original = btn.innerHTML;
        btn.innerHTML = msg;
        setTimeout(() => { btn.innerHTML = original; }, 2000);
    }

    function toggleMinimize() {
        const container = document.getElementById('dock-panel-container');
        if (!container) return;
        container.classList.toggle('minimized');
        const isMin = container.classList.contains('minimized');
        saveMinimizedState(isMin);
    }

    function makeDraggable(element, handle, container) {
        let offsetX, offsetY, isDragging = false;
        let dragMoved = false;

        const startDrag = (e) => {
            isDragging = true;
            dragMoved = false;
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            element.style.transition = 'none';
            e.preventDefault();
        };

        handle.addEventListener('mousedown', (e) => {
            // No iniciar drag si se clickeó un botón
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            startDrag(e);
        });

        container.addEventListener('mousedown', (e) => {
            if (!container.classList.contains('minimized')) return;
            startDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            dragMoved = true;
            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                if (dragMoved) {
                    const rect = element.getBoundingClientRect();
                    savePosition(rect.left, rect.top);
                }
                isDragging = false;
                element.style.transition = '';
            }
        });

        container.addEventListener('click', (e) => {
            if (container.classList.contains('minimized') && !dragMoved) {
                e.stopPropagation();
                toggleMinimize();
            }
            setTimeout(() => { dragMoved = false; }, 50);
        });
    }

    // ==================== INIT ====================
    if (document.readyState === 'complete') {
        createPanel();
    } else {
        window.addEventListener('load', () => {
            setTimeout(createPanel, 1500);
        });
    }

})();

