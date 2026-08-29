
// ==UserScript==
// @name         FCLM Report TLC1+QYY7
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Banner unificado dark para TLC1 y QYY7 + Auto-update automático
// @author       Jorge Gomez (Jrgmz)
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=QYY7*
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=TLC1*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1+QYY7.js
// @downloadURL  https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1+QYY7.js
// ==/UserScript==

(function() {
    'use strict';

    const CURRENT_WH = new URLSearchParams(window.location.search).get('warehouseId') || '';

    const TLC1_CONFIG = {
        id: 'TLC1', color: '#0073bb',
        sections: [
            { name: 'INBOUND', processes: ['Receive - Total','Receive Support','IB Problem Solve','IB Total'] },
            { name: 'OUTBOUND', processes: ['RC Sort - Total','Transfer Out','Transfer Out Dock','DA Bldg to Bldg Transfer TOTAL'] }
        ],
        hiddenProcesses: ['Each Receive - Total','Case Receive','Pallet Receive','Prep Recorder - Total'],
        productivity: {
            name: 'PRODUCTIVIDAD TLC1',
            processes: [
                { name: 'Inbound', displayName: 'Inbound' },
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: [],
        processLinks: {
            'Each Receive - Total': '01003027',
            'Receive Support': '01003033',
            'IB Problem Solve': '01002980',
            'RC Sort - Total': '01003009',
            'Transfer Out': '01003021',
            'Transfer Out Dock': '01003022'
        },
        processDropdowns: {},
        processSubMenu: {
            'Receive - Total': [
                { name: 'Each Receive - Total', processId: '01003027' },
                { name: 'Case Receive', processId: '01003025' },
                { name: 'Pallet Receive', processId: '01003032' },
                { name: 'Prep Recorder - Total', processId: '01003002' }
            ]
        },
        externalFetch: [
            { targetProcess: 'RC Sort - Total', processId: '01003009', warehouseId: 'TLC1', denOnly: true, valueIndex: 'caseUnit' }
        ]
    };

    const QYY7_CONFIG = {
        id: 'QYY7', color: '#7b2d8b',
        sections: [
            { name: 'INBOUND', processes: ['Case Transfer In','Transfer In - Total','RSR - Total','IB Total'] },
            { name: 'OUTBOUND', processes: ['Transfer Out Pick - Total','Transfer Out','Transfer Out Dock','DA Bldg to Bldg Transfer TOTAL'] }
        ],
        productivity: {
            name: 'PRODUCTIVIDAD QYY7',
            processes: [
                { name: 'Inbound', displayName: 'Inbound' },
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: ['Case Transfer In','Transfer Out Pick - Total','Transfer Out'],
        processLinks: {
            'Case Transfer In': '01003035',
            'RSR - Total': '01003012',
            'Transfer Out Pick - Total': '01003065',
            'Transfer Out': '01003021',
            'Transfer Out Dock': '01003022'
        },
        processDropdowns: {},
        processSubMenu: {},
        externalFetch: [
            { targetProcess: 'Transfer Out Pick - Total', processId: '01003065', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'Transfer Out', processId: '1003021', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'RSR - Total', processId: '01003012', warehouseId: 'QYY7', denOnly: true, valueIndex: 'jobs' }
        ]
    };

    const DISPLAY_NAMES = { 'DA Bldg to Bldg Transfer TOTAL': 'DA Bldg to Bldg' };
    let metricsStore = { TLC1: { main: [], productivity: [] }, QYY7: { main: [], productivity: [] } };
    let isMinimized = false;

    function injectStyles() {
        if (document.getElementById('fclm-hover-styles')) return;
        const style = document.createElement('style');
        style.id = 'fclm-hover-styles';
        style.textContent = `
            .fclm-card {
                transition: transform 0.2s ease, box-shadow 0.2s ease, z-index 0s;
                position: relative;
                z-index: 1;
            }
            .fclm-card:hover {
                transform: scale(1.08);
                z-index: 10;
                box-shadow: 0 6px 24px rgba(0,0,0,0.7), 0 0 15px rgba(0,115,187,0.3);
            }
            #fclm-banner {
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
            }
            #fclm-pill {
                transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #fclm-pill.appearing {
                animation: pillAppear 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            @keyframes pillAppear {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
            #fclm-pill.disappearing {
                animation: pillDisappear 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            @keyframes pillDisappear {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
            }
            @keyframes fclmGlow {
                0% { box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2); }
                100% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.7), 0 0 35px rgba(16, 185, 129, 0.4); }
            }
            .fclm-submenu {
                position: absolute; top: 100%; left: 0; right: 0;
                background: #141b24;
                border: 1px solid rgba(16, 185, 129, 0.3);
                border-top: none;
                border-radius: 0 0 8px 8px; padding: 4px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.6), 0 0 12px rgba(16, 185, 129, 0.1);
                z-index: 50; gap: 4px;
                flex-direction: column;
                max-height: 0; overflow: hidden; opacity: 0;
                display: flex;
                transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, padding 0.3s ease;
                padding-top: 0; padding-bottom: 0;
            }
            .fclm-submenu-wrap { position: relative; }
            .fclm-submenu-wrap:hover .fclm-submenu {
                max-height: 300px; opacity: 1;
                padding-top: 4px; padding-bottom: 4px;
            }
            .fclm-submenu-card {
                padding: 6px 8px;
                background: #0f1419;
                border: 1px solid rgba(16, 185, 129, 0.2);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.15s ease;
                font-size: 11px;
                color: #e5e7eb;
            }
            .fclm-submenu-card:hover {
                background: #1a2332;
                border-color: rgba(16, 185, 129, 0.4);
                transform: translateX(2px);
            }
            #fclm-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #07070d;
                border-bottom: 1px solid #1f2937;
                z-index: 9999;
                box-shadow: 0 2px 12px rgba(0,0,0,0.8);
                padding: 0;
                margin: 0;
                width: 100%;
                max-width: none;
                border-radius: 0;
            }
            #fclm-title-bar {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                padding: 6px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(16, 185, 129, 0.2);
            }
            .fclm-title-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            .fclm-title-text {
                color: white;
                font-weight: 600;
                font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .fclm-timestamp {
                color: rgba(255,255,255,0.85);
                font-size: 11px;
                font-family: monospace;
            }
            .fclm-minimize-btn {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
                padding: 2px 4px;
                transition: all 0.2s ease;
                opacity: 0.8;
            }
            .fclm-minimize-btn:hover {
                opacity: 1;
                transform: scale(1.1);
            }
            #fclm-content-wrap {
                overflow-y: auto;
                max-height: calc(100vh - 60px);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
                transform-origin: top left;
            }
            #fclm-content-wrap.minimize {
                transform: scaleY(0);
                opacity: 0;
                pointer-events: none;
            }
            .fclm-section {
                padding: 8px 12px;
                border-bottom: 1px solid #1f2937;
            }
            .fclm-section-name {
                color: #9ca3af;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                text-transform: uppercase;
            }
            .fclm-card {
                background: #0f1419;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 4px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 11px;
            }
            .fclm-card-name {
                color: #e5e7eb;
                font-weight: 600;
                margin-bottom: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .fclm-process-link {
                text-decoration: none;
                color: inherit;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.15s ease;
            }
            .fclm-process-link:hover {
                opacity: 1;
            }
            .fclm-metrics {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px;
                color: #d1d5db;
                font-size: 10px;
            }
            .fclm-metric {
                display: flex;
                flex-direction: column;
            }
            .fclm-metric-label {
                color: #9ca3af;
                font-size: 9px;
                margin-bottom: 1px;
            }
            .fclm-metric-value {
                font-weight: 600;
            }
            .fclm-metric-value.green { color: #10b981; }
            .fclm-metric-value.red { color: #ef4444; }
            .fclm-metric-value.orange { color: #f97316; }
            .fclm-productivity-card {
                background: #0f1419;
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 4px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .fclm-productivity-name {
                color: #e5e7eb;
                font-weight: 600;
                font-size: 11px;
                margin-bottom: 4px;
            }
            .fclm-productivity-bars {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .fclm-productivity-row {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #d1d5db;
            }
            .fclm-productivity-label {
                color: #9ca3af;
            }
            .fclm-productivity-value {
                font-weight: 600;
                color: #e5e7eb;
            }
            #fclm-pill {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 24px;
                box-shadow: 0 2px 12px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2);
                z-index: 9998;
                animation: fclmGlow 1.5s ease-in-out infinite;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            #fclm-pill:active {
                cursor: grabbing;
            }
        `;
        document.head.appendChild(style);
    }

    function getDateParams() {
        const now = new Date();
        const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
        const h=String(now.getHours()).padStart(2,'0'), min=String(now.getMinutes()).padStart(2,'0');
        return { year: y, month: m, day: d, hour: h, minute: min };
    }

    function buildFunctionRollupURL(processId, warehouseId) {
        const {year,month,day,hour,minute}=getDateParams();
        return `https://fclm-portal.amazon.com/reports/functionRollup?processId=${processId}&warehouseId=${warehouseId}&date=${year}-${month}-${day}&startTime=${hour}:${minute}&endTime=${hour}:59`;
    }

    function buildRemotePPRUrl(wh) { return `https://fclm-portal.amazon.com/api/ppr?warehouse=${wh}`; }
    function hasExactProcessMatch(cells, name) { return Array.from(cells).some(c=>c.textContent.trim()===name); }
    function extractRowData(cells, processName) {
        const data={name:processName};
        const pattern=/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*([A-Za-z\/]*)\s*-\s*([\d.]+)%\s*([-\d.]+)\s*hrs?\s*\((\d+(?:\.\d+)?)\)/;
        const text=Array.from(cells).map(c=>c.textContent.trim()).join(' ');
        const m=text.match(pattern);
        if(m){
            data.rate=parseFloat(m[1]); data.planRate=parseFloat(m[2]); data.unit=m[3]||''; data.pctToPlan=parseFloat(m[4]); data.deltaHrs=parseFloat(m[5]); data.density=parseFloat(m[6]);
        }
        return data;
    }

    function extractMetricsFromDocument(doc, config) {
        const rows=doc.querySelectorAll('tbody tr');
        const allProc=[...config.sections.flatMap(s=>s.processes), ...(config.hiddenProcesses||[])];
        const extracted={};
        rows.forEach(row=>{
            const cells=row.querySelectorAll('td');
            allProc.forEach(name=>{
                if(hasExactProcessMatch(cells,name)&&!extracted[name]){
                    extracted[name]=extractRowData(cells,name);
                }
            });
        });
        return extracted;
    }

    function fetchValueFromFunctionRollup(processId, warehouseId, denOnly=false, valueIndex='') {
        return new Promise(resolve => {
            const url=buildFunctionRollupURL(processId, warehouseId);
            fetch(url).then(r=>r.text()).then(html=>{
                const parser=new DOMParser();
                const doc=parser.parseFromString(html,'text/html');
                const table=doc.querySelector('table');
                if(!table) { resolve(null); return; }
                const rows=table.querySelectorAll('tbody tr');
                if(rows.length===0) { resolve(null); return; }
                const firstRow=rows[0];
                const cells=firstRow.querySelectorAll('td');
                if(denOnly){
                    const densityMatch=Array.from(cells).find(c=>c.textContent.includes('.'))?.textContent.trim();
                    if(densityMatch){
                        const den=parseFloat(densityMatch);
                        if(!isNaN(den)) {
                            resolve({density:den, caseUnit:den, jobs:den});
                            return;
                        }
                    }
                }
                const dataText=Array.from(cells).map(c=>c.textContent.trim()).join(' ');
                let val=null;
                if(valueIndex==='caseUnit'||valueIndex==='jobs'){
                    const pattern=/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*([A-Za-z\/]*)\s*-\s*([\d.]+)%/;
                    const m=dataText.match(pattern);
                    if(m){
                        val={caseUnit:parseFloat(m[1]), jobs:parseFloat(m[1]), casesVolume:parseFloat(m[2]), originalVolume:parseFloat(m[2])};
                    }
                }
                resolve(val);
            }).catch(e=>{
                console.error('Error fetching:',e);
                resolve(null);
            });
        });
    }

    function fetchRemotePPR(whId,config){
        return new Promise(resolve=>{
            fetch(buildRemotePPRUrl(whId)).then(r=>r.json()).then(d=>{
                const metrics=extractMetricsFromDocument(new DOMParser().parseFromString(d.html||'','text/html'),config);
                resolve(metrics);
            }).catch(e=>{resolve(null);});
        });
    }

    function applyExternalVols(whId, metrics, extVals){
        (config.externalFetch||[]).forEach(cfg=>{
            if(cfg.targetProcess && extVals[cfg.targetProcess]){
                const v=extVals[cfg.targetProcess];
                const m=metrics[cfg.targetProcess];
                if(m){
                    if(v.caseUnit) m.rate=v.caseUnit;
                    if(v.casesVolume) m.planRate=v.casesVolume;
                    if(v.originalVolume) m.planRate=v.originalVolume;
                    if(v.density!==undefined) m.density=v.density;
                    if(v.jobs) m.rate=v.jobs;
                }
            }
        });
    }

    async function loadAllMetrics(){
        const config=CURRENT_WH==='TLC1'?TLC1_CONFIG:QYY7_CONFIG;
        const promises=[];
        promises.push(fetchRemotePPR(CURRENT_WH,config).then(m=>{metricsStore[CURRENT_WH].main=Object.values(m); return m;}));
        (config.externalFetch||[]).forEach(c=>{
            promises.push(fetchValueFromFunctionRollup(c.processId, c.warehouseId, c.denOnly, c.valueIndex).then(v=>{return {[c.targetProcess]:v};}));
        });
        Promise.all(promises).then(results=>{
            const extVals=results.slice(1).reduce((a,b)=>({...a,...b}),{});
            const mainMetrics=results[0]||{};
            applyExternalVols(CURRENT_WH, mainMetrics, extVals);
            metricsStore[CURRENT_WH].main=Object.values(mainMetrics);
            renderBanner();
        });
    }

    function getStatus(pct,rate,plan){
        if(pct>=100) return 'green';
        if(pct>=90) return 'orange';
        return 'red';
    }

    function renderBanner() {
        const config=CURRENT_WH==='TLC1'?TLC1_CONFIG:QYY7_CONFIG;
        const metrics=metricsStore[CURRENT_WH].main;
        const metricsMap=Object.fromEntries(metrics.map(m=>[m.name,m]));

        let content='';
        config.sections.forEach(sec=>{
            content+=`<div class="fclm-section"><div class="fclm-section-name">${sec.name}</div>`;
            sec.processes.forEach(procName=>{
                const m=metricsMap[procName];
                if(!m) return;
                const status=getStatus(m.pctToPlan, m.rate, m.planRate);
                let cardHtml=`<div class="fclm-card"><div class="fclm-card-name">`;
                
                if(config.processSubMenu && config.processSubMenu[procName]){
                    cardHtml+=`<span class="fclm-submenu-wrap"><span>${procName}</span><span style="cursor:pointer; opacity:0.6;">▼</span>`;
                    cardHtml+=`<div class="fclm-submenu">`;
                    config.processSubMenu[procName].forEach(sub=>{
                        const subM=metricsMap[sub.name];
                        if(subM){
                            const subStatus=getStatus(subM.pctToPlan, subM.rate, subM.planRate);
                            cardHtml+=`<div class="fclm-submenu-card"><strong>${sub.name}</strong>: ${subM.rate}/${subM.planRate} (${subM.pctToPlan.toFixed(0)}%) <a href="${buildFunctionRollupURL(sub.processId, CURRENT_WH)}" target="_blank" class="fclm-process-link">↗️</a></div>`;
                        }
                    });
                    cardHtml+=`</div></span>`;
                } else {
                    cardHtml+=procName;
                }
                
                if(config.processLinks && config.processLinks[procName]){
                    cardHtml+=` <a href="${buildFunctionRollupURL(config.processLinks[procName], CURRENT_WH)}" target="_blank" class="fclm-process-link">↗️</a>`;
                }
                cardHtml+=`</div>`;
                cardHtml+=`<div class="fclm-metrics">`;
                cardHtml+=`<div class="fclm-metric"><div class="fclm-metric-label">Rate / Plan</div><div class="fclm-metric-value ${status}">${m.rate.toFixed(1)} / ${m.planRate.toFixed(1)}</div></div>`;
                cardHtml+=`<div class="fclm-metric"><div class="fclm-metric-label">% to Plan</div><div class="fclm-metric-value ${status}">${m.pctToPlan.toFixed(0)}%</div></div>`;
                if(config.casesBlocks && config.casesBlocks.includes(procName)){
                    cardHtml+=`<div class="fclm-metric"><div class="fclm-metric-label">📦 Cases / Vol</div><div class="fclm-metric-value">${m.casesVolume ? m.casesVolume.toFixed(0) : '—'}</div></div>`;
                }
                if(m.density!==undefined){
                    cardHtml+=`<div class="fclm-metric"><div class="fclm-metric-label">Den</div><div class="fclm-metric-value">${m.density.toFixed(2)}</div></div>`;
                }
                cardHtml+=`</div></div>`;
                content+=cardHtml;
            });
            content+='</div>';
        });

        const now=new Date();
        const locale='es-MX';
        const dateStr=now.toLocaleDateString(locale);
        const timeStr=now.toLocaleTimeString(locale, {hour:'2-digit', minute:'2-digit'});

        let bannerHtml=`
            <div id="fclm-title-bar">
                <div class="fclm-title-left">
                    <span class="fclm-title-text">📲 FCLM Report TLC1+QYY7</span>
                </div>
                <div style="flex:1; text-align:right; margin-right:8px;">
                    <span class="fclm-timestamp">⚡ ${dateStr} — ${timeStr}</span>
                </div>
                <button class="fclm-minimize-btn" onclick="document.getElementById('fclm-content-wrap').classList.toggle('minimize'); document.getElementById('fclm-pill').classList.remove('disappearing'); document.getElementById('fclm-pill').classList.add('appearing');">−</button>
            </div>
            <div id="fclm-content-wrap">${content}</div>
        `;

        let banner=document.getElementById('fclm-banner');
        if(!banner){
            banner=document.createElement('div');
            banner.id='fclm-banner';
            document.body.insertBefore(banner, document.body.firstChild);
            document.body.style.marginTop='60px';
        }
        banner.innerHTML=bannerHtml;
    }

    function getPillOrigin(){
        const stored=localStorage.getItem('fclm_pill_origin');
        return stored ? JSON.parse(stored) : {x:0.95, y:0.95};
    }

    function savePillOrigin(x,y){
        localStorage.setItem('fclm_pill_origin',JSON.stringify({x,y}));
    }

    function initPill() {
        if(document.getElementById('fclm-pill')) return;
        
        const pill=document.createElement('div');
        pill.id='fclm-pill';
        pill.textContent='📲';
        document.body.appendChild(pill);
        
        const origin=getPillOrigin();
        pill.style.bottom=(window.innerHeight*(1-origin.y))+'px';
        pill.style.right=(window.innerWidth*(1-origin.x))+'px';

        let isDragging=false, startX, startY, offsetX, offsetY;

        pill.addEventListener('mousedown',(e)=>{
            isDragging=true;
            startX=e.clientX;
            startY=e.clientY;
            offsetX=pill.offsetLeft-e.clientX;
            offsetY=pill.offsetTop-e.clientY;
            pill.style.cursor='grabbing';
        });

        document.addEventListener('mousemove',(e)=>{
            if(!isDragging) return;
            pill.style.left=(e.clientX+offsetX)+'px';
            pill.style.right='auto';
            pill.style.top=(e.clientY+offsetY)+'px';
            pill.style.bottom='auto';
        });

        document.addEventListener('mouseup',(e)=>{
            if(!isDragging) return;
            isDragging=false;
            pill.style.cursor='pointer';
            const finalX=(e.clientX+offsetX)+(pill.offsetWidth/2);
            const finalY=(e.clientY+offsetY)+(pill.offsetHeight/2);
            savePillOrigin(finalX/window.innerWidth, finalY/window.innerHeight);
        });

        pill.addEventListener('click',()=>{
            if(isDragging) return;
            const banner=document.getElementById('fclm-banner');
            if(!banner) return;
            const contentWrap=banner.querySelector('#fclm-content-wrap');
            if(!contentWrap) return;
            
            if(contentWrap.classList.contains('minimize')){
                contentWrap.classList.remove('minimize');
                pill.classList.add('disappearing');
                setTimeout(()=>{
                    pill.classList.remove('disappearing');
                }, 300);
            } else {
                contentWrap.classList.add('minimize');
                const origin=getPillOrigin();
                const bannerRect=banner.getBoundingClientRect();
                const pillRect=pill.getBoundingClientRect();
                const scaleOriginX=(pillRect.left+pillRect.width/2-bannerRect.left)/bannerRect.width*100;
                const scaleOriginY=(pillRect.top+pillRect.height/2-bannerRect.top)/bannerRect.height*100;
                contentWrap.style.transformOrigin=`${scaleOriginX}% ${scaleOriginY}%`;
                pill.classList.add('appearing');
                setTimeout(()=>pill.classList.remove('appearing'), 350);
            }
        });
    }

    function initBanner(){
        if(!CURRENT_WH) return;
        injectStyles();
        initPill();
        loadAllMetrics();
    }

    window.addEventListener('load',()=>{
        setTimeout(initBanner, 100);
    });

    let lastURL=window.location.href;
    setInterval(()=>{ if(window.location.href!==lastURL){lastURL=window.location.href; initBanner();} },2000);

    // ============= AUTO-UPDATE CHECKER =============
    const UPDATE_CHECK_KEY = 'fclm_last_update_check';
    const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
    const UPDATE_NOTIFICATION_KEY = 'fclm_update_notified_version';
    
    async function checkForUpdates() {
        try {
            // No verificar si ya lo hizo hace menos de 24 horas
            const lastCheck = localStorage.getItem(UPDATE_CHECK_KEY);
            if (lastCheck && Date.now() - parseInt(lastCheck) < UPDATE_INTERVAL_MS) {
                console.log('[FCLM] Última verificación reciente, saltando...');
                return;
            }
            
            // Obtener la versión actual del script
            const currentVersion = '2.6';
            
            // Obtener el archivo raw de GitHub
            const rawUrl = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1+QYY7-2.6.js';
            const response = await fetch(rawUrl, { cache: 'no-store' });
            
            if (!response.ok) throw new Error('No se pudo obtener el script');
            
            const text = await response.text();
            const versionMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            const remoteVersion = versionMatch ? versionMatch[1] : null;
            
            // Guardar último check
            localStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
            
            if (!remoteVersion) {
                console.log('[FCLM] No se pudo extraer versión remota');
                return;
            }
            
            console.log(`[FCLM] Versión local: ${currentVersion}, Versión remota: ${remoteVersion}`);
            
            // Comparar versiones
            if (compareVersions(remoteVersion, currentVersion) > 0) {
                // Hay versión más nueva
                const notifiedVersion = localStorage.getItem(UPDATE_NOTIFICATION_KEY);
                if (notifiedVersion !== remoteVersion) {
                    showUpdateNotification(remoteVersion, currentVersion);
                    localStorage.setItem(UPDATE_NOTIFICATION_KEY, remoteVersion);
                }
            }
        } catch (error) {
            console.error('[FCLM] Error checking updates:', error);
        }
    }
    
    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }
    
    function showUpdateNotification(newVersion, currentVersion) {
        // Inyectar estilos para la notificación
        if (!document.getElementById('fclm-update-styles')) {
            const style = document.createElement('style');
            style.id = 'fclm-update-styles';
            style.textContent = `
                .fclm-update-banner {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 20px rgba(16, 185, 129, 0.3);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: slideIn 0.3s ease-out forwards;
                    max-width: 350px;
                }
                .fclm-update-banner.hide {
                    animation: slideOut 0.3s ease-out forwards;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                .fclm-update-content {
                    flex: 1;
                    line-height: 1.4;
                }
                .fclm-update-title {
                    font-weight: 600;
                    font-size: 13px;
                    margin-bottom: 2px;
                }
                .fclm-update-version {
                    font-size: 12px;
                    opacity: 0.95;
                }
                .fclm-update-buttons {
                    display: flex;
                    gap: 6px;
                    white-space: nowrap;
                }
                .fclm-update-btn {
                    padding: 4px 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                .fclm-update-btn.update {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }
                .fclm-update-btn.update:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }
                .fclm-update-btn.dismiss {
                    background: transparent;
                    color: rgba(255, 255, 255, 0.8);
                    padding: 0;
                    margin-left: auto;
                    font-size: 18px;
                    line-height: 1;
                }
                .fclm-update-btn.dismiss:hover {
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Crear el banner
        const banner = document.createElement('div');
        banner.className = 'fclm-update-banner';
        banner.innerHTML = `
            <div class="fclm-update-content">
                <div class="fclm-update-title">🚀 Actualización disponible</div>
                <div class="fclm-update-version">v${currentVersion} → v${newVersion}</div>
            </div>
            <div class="fclm-update-buttons">
                <button class="fclm-update-btn update" onclick="window.open('https://github.com/JGArzate/tampermonkey-scripts#readme'); this.closest('.fclm-update-banner').classList.add('hide'); setTimeout(() => this.closest('.fclm-update-banner').remove(), 300);">Actualizar</button>
                <button class="fclm-update-btn dismiss" onclick="this.closest('.fclm-update-banner').classList.add('hide'); setTimeout(() => this.closest('.fclm-update-banner').remove(), 300);">✕</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Auto-remover después de 8 segundos si el usuario no hace nada
        setTimeout(() => {
            if (banner.parentNode) {
                banner.classList.add('hide');
                setTimeout(() => banner.remove(), 300);
            }
        }, 8000);
    }
    
    // Iniciar verificación de actualizaciones cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(checkForUpdates, 2000); // Esperar 2 segundos después de cargar
        });
    } else {
        setTimeout(checkForUpdates, 2000);
    }

})();
