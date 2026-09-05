
// ==UserScript==
// @name         FCLM Report TLC1+QYY7
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Rates/Plan redondeados + Cases/Vol en Case Receive y Pallet Receive
// @author       Jorge Gomez (Jrgmz)
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=QYY7*
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=TLC1*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js
// @downloadURL  https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = '2.8';

    const CURRENT_WH = new URLSearchParams(window.location.search).get('warehouseId') || '';

    const TLC1_CONFIG = {
        id: 'TLC1', color: '#0073bb',
        sections: [
            { name: 'INBOUND', processes: ['Receive - Total','Receive Support','IB Problem Solve'] },
            { name: 'OUTBOUND', processes: ['RC Sort - Total','Transfer Out','Transfer Out Dock'] }
        ],
        hiddenProcesses: ['Each Receive - Total','Case Receive','Pallet Receive','Prep Recorder - Total','IB Total','DA Bldg to Bldg Transfer TOTAL'],
        productivity: {
            name: 'PRODUCTIVIDAD TLC1',
            processes: [
                { name: 'Inbound', displayName: 'Inbound', customTarget: 190, customTargetKey: 'fclm_tlc1_inbound_target' },
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: ['Case Receive','Pallet Receive'],
        deltaHrsMap: { 'Inbound': 'IB Total', 'DA': 'DA Bldg to Bldg Transfer TOTAL' },
        processLinks: {
            'Each Receive - Total': '01003027',
            'Receive Support': '01003033',
            'IB Problem Solve': '01002980',
            'RC Sort - Total': '01003009',
            'Transfer Out': '01003021',
            'Transfer Out Dock': '01003022'
        },
        processDropdowns: {},
        customPlanConfig: {
            'Receive - Total': {
                key: 'fclm_tlc1_receive_plans',
                title: 'Receive',
                subProcesses: ['Each Receive - Total', 'Case Receive', 'Pallet Receive', 'Prep Recorder - Total']
            }
        },
        processSubMenu: {
            'Receive - Total': [
                { name: 'Each Receive - Total', processId: '01003027' },
                { name: 'Case Receive', processId: '01003025' },
                { name: 'Pallet Receive', processId: '01003032' },
                { name: 'Prep Recorder - Total', processId: '01003002' }
            ]
        },
        processLinkMenu: {
            'Transfer Out Dock': [
                { name: '\uD83D\uDE9A Cargas', url: 'https://prod-na.us-east-1.idx-website.aft.amazon.dev/en_US/TLC1/day-schedule?view=grid' },
                { name: '\uD83C\uDFED Yard', url: 'https://trans-logistics.amazon.com/yms/shipclerk/#/yard?availability=false' }
            ]
        },
        externalFetch: [
            { targetProcess: 'RC Sort - Total', processId: '01003009', warehouseId: 'TLC1', denOnly: true, valueIndex: 'caseUnit' },
            { targetProcess: 'Case Receive', processId: '01003025', warehouseId: 'TLC1', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'Pallet Receive', processId: '01003032', warehouseId: 'TLC1', denOnly: false, valueIndex: 'jobs' }
        ]
    };

    const QYY7_CONFIG = {
        id: 'QYY7', color: '#7b2d8b',
        sections: [
            { name: 'INBOUND', processes: ['Receive - Total','Case Transfer In','RSR - Total'] },
            { name: 'OUTBOUND', processes: ['Transfer Out Pick - Total','Transfer Out','Transfer Out Dock'] }
        ],
        hiddenProcesses: ['IB Total','DA Bldg to Bldg Transfer TOTAL'],
        productivity: {
            name: 'PRODUCTIVIDAD QYY7',
            processes: [
                { name: 'Inbound', displayName: 'Inbound' },
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: ['Case Transfer In','Transfer Out Pick - Total','Transfer Out'],
        deltaHrsMap: { 'Inbound': 'IB Total', 'DA': 'DA Bldg to Bldg Transfer TOTAL' },
        processLinks: {
            'Case Transfer In': '01003035',
            'RSR - Total': '01003012',
            'Transfer Out Pick - Total': '01003065',
            'Transfer Out': '01003021',
            'Transfer Out Dock': '01003022'
        },
        processDropdowns: {},
        processSubMenu: {},
        processLinkMenu: {
            'Case Transfer In': [
                { name: '\uD83D\uDDFA\uFE0F Mapa Estiba', url: 'https://stowmap-na.amazon.com/stowmap/loadFCAreaMap.htm?warehouseId=QYY7' }
            ],
            'Transfer Out Dock': [
                { name: '\uD83D\uDCE6 Descargas', url: 'https://trans-logistics.amazon.com/ssp/dock/hrz/ob?' },
                { name: '\uD83D\uDCFA OB Monitor', url: 'https://trans-logistics.amazon.com/ssp/dock/hrz/ob?' }
            ],
            'Transfer Out Pick - Total': [
                { name: '\uD83D\uDCE6 Rodeo', url: 'https://rodeo-iad.amazon.com/QYY7/ExSD?yAxis=PROCESS_PATH&zAxis=WORK_POOL&shipmentTypes=TRANSSHIPMENTS&exSDRange.quickRange=ALL&exSDRange.dailyStart=00%3A00&exSDRange.dailyEnd=00%3A00&giftOption=ALL&fulfillmentServiceClass=ALL&fracs=ALL&isEulerExSDMiss=ALL&isEulerPromiseMiss=ALL&isEulerUpgraded=ALL&isReactiveTransfer=ALL&_workPool=on&workPool=ReadyToPick&workPool=ReadyToPickHardCapped&workPool=ReadyToPickUnconstrained&workPool=PickingNotYetPicked&workPool=PickingNotYetPickedPrioritized&workPool=PickingNotYetPickedNotPrioritized&workPool=PickingNotYetPickedHardCapped&workPool=CrossdockNotYetPicked&_workPool=on&workPool=PickingPicked&workPool=PickingPickedInProgress&workPool=PickingPickedInTransit&workPool=PickingPickedRouting&workPool=PickingPickedAtDestination&workPool=Inducted&workPool=RebinBuffered&workPool=Sorted&workPool=GiftWrap&workPool=Packing&workPool=Scanned&workPool=ProblemSolving&workPool=ProcessPartial&workPool=SoftwareException&workPool=Crossdock&workPool=PreSort&workPool=TransshipSorted&workPool=Palletized&_workPool=on&workPool=ManifestPending&workPool=ManifestPendingVerification&workPool=Manifested&workPool=Loaded&workPool=TransshipManifested&_workPool=on&processPath=&minPickPriority=MIN_PRIORITY&shipMethod=&shipOption=&sortCode=&fnSku=' },
                { name: '\uD83D\uDC64 Elegir Pickers', url: 'https://fc-eligibility-website-iad.aka.amazon.com/#/picker-eligibilities/QYY7' },
                { name: '\uD83C\uDFAF Pick Console', url: 'https://picking-console.na.picking.aft.a2z.com/fc/QYY7/pick-workforce' }
            ]
        },
        externalFetch: [
            { targetProcess: 'Transfer Out Pick - Total', processId: '01003065', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'Transfer Out', processId: '1003021', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'RSR - Total', processId: '01003012', warehouseId: 'QYY7', denOnly: true, valueIndex: 'jobs' }
        ]
    };

    const DISPLAY_NAMES = { 'DA Bldg to Bldg Transfer TOTAL': 'DA Bldg to Bldg', 'Case Receive': '\uD83D\uDCE6 Case Receive', 'Pallet Receive': '\uD83D\uDCE6 Pallet Receive' };
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
                box-shadow: 0 6px 24px rgba(0,0,0,0.7), 0 0 15px rgba(16,185,129,0.3);
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
            .fclm-submenu-wrap { position: relative; z-index: 1; transition: z-index 0s; }
            .fclm-submenu-wrap:hover { z-index: 200; }
            .fclm-submenu-wrap:hover .fclm-submenu {
                max-height: 300px; opacity: 1;
                padding-top: 4px; padding-bottom: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    function getDateParams() {
        const p = new URLSearchParams(window.location.search);
        return {
            spanType: p.get('spanType')||'',
            startDateIntraday: p.get('startDateIntraday')||'',
            startHourIntraday: p.get('startHourIntraday')||'0',
            startMinuteIntraday: p.get('startMinuteIntraday')||'0',
            endDateIntraday: p.get('endDateIntraday')||'',
            endHourIntraday: p.get('endHourIntraday')||'0',
            endMinuteIntraday: p.get('endMinuteIntraday')||'0',
            startDateDay: p.get('startDateDay')||'',
            startDateWeek: p.get('startDateWeek')||'',
            startDateMonth: p.get('startDateMonth')||''
        };
    }

    function buildFunctionRollupURL(processId, warehouseId) {
        const dp = getDateParams(); let s='', e='';
        if (dp.spanType==='Intraday' && dp.startDateIntraday && dp.endDateIntraday) {
            const sd=dp.startDateIntraday.replace(/\//g,'-'), ed=dp.endDateIntraday.replace(/\//g,'-');
            s=`${sd}T${dp.startHourIntraday.padStart(2,'0')}:${dp.startMinuteIntraday.padStart(2,'0')}:00.000`;
            e=`${ed}T${dp.endHourIntraday.padStart(2,'0')}:${dp.endMinuteIntraday.padStart(2,'0')}:00.000`;
        } else if (dp.spanType==='Day' && dp.startDateDay) {
            const d=dp.startDateDay.replace(/\//g,'-'); s=`${d}T00:00:00.000`; e=`${d}T23:59:59.000`;
        } else if (dp.spanType==='Week' && dp.startDateWeek) {
            const d=dp.startDateWeek.replace(/\//g,'-'); s=`${d}T00:00:00.000`;
            const end=new Date(d); end.setDate(end.getDate()+6); e=`${end.toISOString().slice(0,10)}T23:59:59.000`;
        } else if (dp.spanType==='Month' && dp.startDateMonth) {
            const d=dp.startDateMonth.replace(/\//g,'-'); s=`${d}T00:00:00.000`;
            const pts=d.split('-'); const last=new Date(parseInt(pts[0]),parseInt(pts[1]),0);
            e=`${last.toISOString().slice(0,10)}T23:59:59.000`;
        }
        if (!s||!e) return null;
        return `https://fclm-portal.amazon.com/reports/functionRollup?warehouseId=${warehouseId}&spanType=Intraday&startDate=${s}&endDate=${e}&reportFormat=HTML&processId=${processId}`;
    }

    function buildRemotePPRUrl(wh) {
        const p=new URLSearchParams(window.location.search);
        p.set('warehouseId',wh); p.set('reportFormat','HTML');
        return `https://fclm-portal.amazon.com/reports/processPathRollup?${p.toString()}`;
    }

    function hasExactProcessMatch(cells, name) {
        for (let c of cells) if ((c.textContent||'').trim().toLowerCase()===name.toLowerCase()) return true;
        return false;
    }

    function extractRowData(cells, processName) {
        const ct=cells.map(c=>(typeof c==='string'?c:(c.textContent||'').trim()));
        let volume=null, actualRate=null, planRate=null, percentToPlan=null, deltaToPlanHrs=null;
        const ignore=['EACH','Case','Pallet','each','case','pallet','Package','RC Summary'];
        ct.forEach(t=>{ if(t.includes('%')&&!t.includes('---')){const v=parseFloat(t.replace('%','').replace(/,/g,'')); if(!isNaN(v)&&percentToPlan===null)percentToPlan=v;} });
        const nums=[];
        ct.forEach(t=>{ if(t.includes('%')||['---','-',''].includes(t))return; if(t.toLowerCase()===processName.toLowerCase())return; if(ignore.includes(t))return; const n=parseFloat(t.replace(/,/g,'')); if(!isNaN(n))nums.push(n); });
        if(nums.length>=6){volume=nums[0];actualRate=nums[2];planRate=nums[3];deltaToPlanHrs=nums[5];}
        else if(nums.length>=5){volume=nums[0];actualRate=nums[2];planRate=nums[3];deltaToPlanHrs=nums[4];}
        else if(nums.length>=4){volume=nums[0];actualRate=nums[2];planRate=nums[3];}
        if(actualRate!==null||percentToPlan!==null) return {name:processName,volume,actualRate,planRate,percentToPlan,deltaToPlanHrs};
        return null;
    }

    function extractMetricsFromDocument(doc, config) {
        const allProc=[...config.sections.flatMap(s=>s.processes), ...(config.hiddenProcesses||[])];
        const main=[], prod=[];
        doc.querySelectorAll('table tr').forEach(row=>{
            const cells=row.querySelectorAll('td, th'); if(!cells.length)return;
            allProc.forEach(p=>{ if(hasExactProcessMatch(cells,p)){const d=extractRowData(Array.from(cells),p); if(d&&!main.find(m=>m.name===p))main.push(d);} });
        });
        if(!main.length){
            doc.querySelectorAll('td,span,div').forEach(el=>{
                if(el.children.length)return;
                allProc.forEach(p=>{ if((el.textContent||'').trim().toLowerCase()===p.toLowerCase()){const row=el.closest('tr'); if(row){const d=extractRowData(Array.from(row.querySelectorAll('td,th')),p); if(d&&!main.find(m=>m.name===p))main.push(d);}} });
            });
        }
        const rows=Array.from(doc.querySelectorAll('table tr')); let inRC=false;
        for(let row of rows){
            const cells=row.querySelectorAll('td,th');
            for(let cell of cells){
                const t=(cell.textContent||'').trim(), cs=cell.getAttribute('colspan');
                if(t.match(/^RC\s*Summary\s*$/i))inRC=true;
                if(inRC&&cs&&parseInt(cs)>2){if(t.match(/^FC\s*Summary\s*$/i)||t.match(/^Outbound\s*$/i)||t.match(/^ICQA\s*$/i)||t.match(/^Other\s*$/i))inRC=false;}
            }
            if(inRC&&cells.length>3){
                const ca=Array.from(cells), ct2=ca.map(c=>(c.textContent||'').trim());
                config.productivity.processes.forEach(proc=>{
                    if(ct2.some(t=>t.toLowerCase()===proc.name.toLowerCase())){
                        const d=extractRowData(ca,proc.name);
                        if(d){const key='RC_'+proc.name; if(!prod.find(m=>m.key===key)){d.key=key;d.displayName=proc.displayName;prod.push(d);}}
                    }
                });
            }
        }
        return {main, productivity:prod};
    }

    function fetchValueFromFunctionRollup(processId, warehouseId, valueType) {
        return new Promise(resolve=>{
            const url=buildFunctionRollupURL(processId, warehouseId); if(!url){resolve(null);return;}
            fetch(url,{credentials:'include'}).then(r=>r.text()).then(html=>{
                const doc=new DOMParser().parseFromString(html,'text/html');
                for(let row of doc.querySelectorAll('table tr')){
                    const cells=Array.from(row.querySelectorAll('td,th')), ct=cells.map(c=>(c.textContent||'').trim());
                    if(!ct.some(t=>t==='Total'))continue;
                    if(ct.join(' ').toLowerCase().includes('grand total'))continue;
                    const nums=[];
                    for(let t of ct){
                        if(t==='Total'||t===''||t==='---')continue;
                        if(/[a-zA-Z]{3,}/.test(t)&&!/^\d/.test(t))continue;
                        const n=parseFloat(t.replace(/,/g,''));
                        if(!isNaN(n))nums.push(n);
                    }
                    if(valueType === 'caseUnit'){
                        if(nums.length>=6){resolve(nums[5]);return;}
                    } else {
                        if(nums.length>=2){resolve(nums[1]);return;}
                    }
                    break;
                }
                resolve(null);
            }).catch(()=>resolve(null));
        });
    }

    function fetchRemotePPR(whId,config){
        return new Promise(resolve=>{
            fetch(buildRemotePPRUrl(whId),{credentials:'include'}).then(r=>r.text()).then(html=>{
                resolve(extractMetricsFromDocument(new DOMParser().parseFromString(html,'text/html'),config));
            }).catch(()=>resolve({main:[],productivity:[]}));
        });
    }

    function applyExternalVols(whId, metrics, extVals){
        const config = whId === 'QYY7' ? QYY7_CONFIG : TLC1_CONFIG;

        for(let c of config.externalFetch){
            const cases = extVals[whId + '_' + c.targetProcess];
            if(cases != null){
                const m = metrics.find(m => m.name === c.targetProcess);
                if(m){
                    if(c.denOnly){
                        m.densityOnly = true;
                        m.densityCases = cases;
                        m.casesVolume = cases;
                        m.originalVolume = m.volume;
                        m.density = (m.volume != null && cases > 0) ? parseFloat((m.volume / cases).toFixed(1)) : null;
                    } else {
                        m.originalVolume = m.volume;
                        m.casesVolume = cases;
                        m.density = (m.volume != null && cases > 0) ? parseFloat((m.volume / cases).toFixed(1)) : null;
                        m.volume = cases;
                    }
                }
            }
        }

        if(whId === 'QYY7'){
            const caseTransferIn = metrics.find(m => m.name === 'Case Transfer In');
            const transferInTotal = metrics.find(m => m.name === 'Transfer In - Total');
            if(caseTransferIn && transferInTotal){
                caseTransferIn.casesVolume = caseTransferIn.volume;
                caseTransferIn.originalVolume = transferInTotal.volume;
                caseTransferIn.density = (transferInTotal.volume != null && caseTransferIn.volume != null && caseTransferIn.volume > 0)
                    ? parseFloat((transferInTotal.volume / caseTransferIn.volume).toFixed(1))
                    : null;
            }
        }
    }

    async function loadAllMetrics(){
        const localCfg=CURRENT_WH==='QYY7'?QYY7_CONFIG:TLC1_CONFIG;
        const remoteCfg=CURRENT_WH==='QYY7'?TLC1_CONFIG:QYY7_CONFIG;
        const remoteWH=CURRENT_WH==='QYY7'?'TLC1':'QYY7';
        metricsStore[CURRENT_WH]=extractMetricsFromDocument(document,localCfg);
        const promises=[], extVals={};
        promises.push(fetchRemotePPR(remoteWH,remoteCfg).then(m=>{metricsStore[remoteWH]=m;}));

        const allExternalFetches = [...TLC1_CONFIG.externalFetch, ...QYY7_CONFIG.externalFetch];
        for(let c of allExternalFetches){
            const wh = c.warehouseId;
            promises.push(fetchValueFromFunctionRollup(c.processId, wh, c.valueIndex).then(v=>{
                extVals[wh + '_' + c.targetProcess] = v;
            }));
        }

        await Promise.all(promises);
        applyExternalVols('QYY7', metricsStore.QYY7.main, extVals);
        applyExternalVols('TLC1', metricsStore.TLC1.main, extVals);
    }

    function getStatus(pct,rate,plan){
        if(plan!=null&&plan===0) return 'on';
        if(rate!=null&&plan!=null&&plan>0)return rate>=plan?'on':'off';
        if(pct!=null)return pct>=100?'on':'off';
        return 'na';
    }
    function getProdStatus(pct){ if(pct==null)return 'na'; if(pct>=100)return 'g'; if(pct>=90)return 'o'; return 'r'; }

    // Dark theme tokens (dark cards, colored status borders)
    const T = {
        on:  {bg:'#0f1419', border:'#10b981', accent:'#34d399', text:'#e5e7eb', arrow:'▲'},
        off: {bg:'#0f1419', border:'#ef4444', accent:'#f87171', text:'#e5e7eb', arrow:'▼'},
        na:  {bg:'#111820', border:'#374151', accent:'#6b7280', text:'#9ca3af', arrow:'●'},
        pg:  {bg:'#0f1419', border:'#10b981', accent:'#34d399', text:'#e5e7eb'},
        po:  {bg:'#0f1419', border:'#f59e0b', accent:'#fbbf24', text:'#e5e7eb'},
        pr:  {bg:'#0f1419', border:'#ef4444', accent:'#f87171', text:'#e5e7eb'},
        pna: {bg:'#111820', border:'#374151', accent:'#6b7280', text:'#9ca3af'}
    };

    function fmt(v){ return v!=null ? v.toLocaleString() : '—'; }
    function fmtRound(v){ return v!=null ? Math.round(v).toLocaleString() : '—'; }
    function fmtDelta(v){ if(v==null)return '—'; return (v>0?'+':'')+v.toLocaleString(); }
    function fmtPct(v){ return v!=null ? v.toFixed(1)+'%' : '—'; }


    function makeProcessCard(m, pn, isCase, whConfig) {
        const dn = DISPLAY_NAMES[pn] || pn;
        const processId = whConfig && whConfig.processLinks ? whConfig.processLinks[pn] : null;
        const linkURL = processId ? buildFunctionRollupURL(processId, whConfig.id) : null;
        const dropdown = whConfig && whConfig.processDropdowns ? whConfig.processDropdowns[pn] : null;
        const subMenu = whConfig && whConfig.processSubMenu ? whConfig.processSubMenu[pn] : null;
        let linkBtn = '';
        if (subMenu) {
            linkBtn = `<span style="font-size:9px;margin-left:3px;opacity:0.7;cursor:default;">▼</span>`;
        } else if (dropdown && dropdown.length > 0) {
            const ddId = 'fclm-dd-' + pn.replace(/[^a-zA-Z0-9]/g, '') + '-' + whConfig.id;
            let ddItems = '';
            dropdown.forEach(item => {
                const itemURL = buildFunctionRollupURL(item.processId, whConfig.id);
                if (itemURL) {
                    ddItems += `<a href="${itemURL}" target="_blank" style="display:block;padding:4px 10px;color:#e5e7eb;text-decoration:none;font-size:9px;font-weight:600;white-space:nowrap;transition:background 0.15s;" onmouseenter="this.style.background='#374151'" onmouseleave="this.style.background='transparent'">${item.label}</a>`;
                }
            });
            linkBtn = `<span style="position:relative;display:inline-block;margin-left:3px;cursor:pointer;" onmouseenter="this.querySelector('.fclm-dropdown').style.display='block'" onmouseleave="this.querySelector('.fclm-dropdown').style.display='none'"><span style="font-size:11px;opacity:0.7;transition:opacity 0.2s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">↗️</span><div class="fclm-dropdown" style="display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);background:#1a2332;border:1px solid #374151;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.5);z-index:100;min-width:70px;padding:4px 0;margin-top:2px;">${ddItems}</div></span>`;
        } else if (linkURL) {
            linkBtn = `<a href="${linkURL}" target="_blank" title="Ver detalle" style="text-decoration:none;font-size:11px;margin-left:3px;opacity:0.7;transition:opacity 0.2s;cursor:pointer;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">↗️</a>`;
        }
        const card = document.createElement('div');
        card.className = 'fclm-card';

        const hasCasesVol = m && m.originalVolume != null && m.casesVolume != null;
        const hasDenOnly = m && m.densityOnly === true;

        if (m) {
            const st = getStatus(m.percentToPlan, m.actualRate, m.planRate);
            const th = T[st];
            const pctVal = m.percentToPlan != null ? Math.min(m.percentToPlan, 150) : 0;
            const barW = Math.min((pctVal / 150) * 100, 100).toFixed(1);

            card.style.cssText = `
                background:${th.bg};
                border:1px solid ${th.border}40;
                border-left:3px solid ${th.border};
                border-radius:8px;
                padding:5px 7px;
                flex:1; min-width:0;
                display:flex; flex-direction:column; gap:3px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            `;

            let volHTML = '';
            if (hasCasesVol) {
                volHTML = `
                    <div style="text-align:center;flex:1.5;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Cases / Vol</div>
                        <div style="color:#e5e7eb;font-weight:600;font-size:9.5px;white-space:nowrap;">📦 ${fmt(m.casesVolume)} / ${fmt(m.originalVolume)}</div>
                    </div>
                    <div style="width:1px;background:#374151;align-self:stretch;"></div>
                    <div style="text-align:center;flex:0.8;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Den</div>
                        <div style="color:${th.accent};font-weight:700;font-size:9.5px;white-space:nowrap;">${m.density != null ? m.density : '—'}</div>
                    </div>
                `;
            } else if (hasDenOnly) {
                volHTML = `
                    <div style="text-align:center;flex:1.5;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Cases / Vol</div>
                        <div style="color:#e5e7eb;font-weight:600;font-size:9.5px;white-space:nowrap;">📦 ${fmt(m.casesVolume)} / ${fmt(m.originalVolume)}</div>
                    </div>
                    <div style="width:1px;background:#374151;align-self:stretch;"></div>
                    <div style="text-align:center;flex:0.8;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Den</div>
                        <div style="color:${th.accent};font-weight:700;font-size:9.5px;white-space:nowrap;">${m.density != null ? m.density : '—'}</div>
                    </div>
                `;
            } else {
                volHTML = `
                    <div style="text-align:center;flex:1;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Vol</div>
                        <div style="color:#e5e7eb;font-weight:600;font-size:9.5px;white-space:nowrap;">${isCase?'📦 ':''}${fmt(m.volume)}</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#e5e7eb;font-weight:700;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${dn}${linkBtn}</span>
                    <span style="color:${th.accent};font-weight:800;font-size:11px;white-space:nowrap;margin-left:4px;">${th.arrow} ${fmtPct(m.percentToPlan)}</span>
                </div>
                <div style="height:3px;background:#1f2937;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${barW}%;background:${th.border};border-radius:2px;transition:width 0.4s ease;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;gap:2px;">
                    ${volHTML}
                    <div style="width:1px;background:#374151;align-self:stretch;"></div>
                    <div style="text-align:center;flex:${(hasCasesVol || hasDenOnly) ? '1.5' : '2'};">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Rate / Plan</div>
                        <div style="font-size:9.5px;white-space:nowrap;">
                            <span style="color:${th.accent};font-weight:700;">${fmtRound(m.actualRate)}</span>
                            <span style="color:#4b5563;"> / </span>
                            <span style="color:#9ca3af;font-weight:600;">${fmtRound(m.planRate)}</span>
                        </div>
                    </div>
                    <div style="width:1px;background:#374151;align-self:stretch;"></div>
                    <div style="text-align:center;flex:0.8;">
                        <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Δ Hrs</div>
                        <div style="color:${th.accent};font-weight:600;font-size:9.5px;white-space:nowrap;">${fmtDelta(m.deltaToPlanHrs)}</div>
                    </div>
                </div>
            `;
        } else {
            card.style.cssText = `
                background:${T.na.bg};border:1px solid ${T.na.border}40;
                border-left:3px solid ${T.na.border};border-radius:8px;
                padding:5px 7px;flex:1;min-width:0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            `;
            card.innerHTML = `
                <div style="color:#9ca3af;font-weight:700;font-size:10px;text-align:center;">${dn}${linkBtn}</div>
                <div style="color:${T.na.accent};font-size:8px;">sin datos</div>
            `;
        }
        return card;
    }

    function makeProdCard(m, proc, deltaHrs, customTarget) {
        const card = document.createElement('div');
        card.className = 'fclm-card';

        if (m) {
            let displayRate = m.actualRate;
            let displayPlan = m.planRate;
            let displayPct = m.percentToPlan;
            if (customTarget != null && displayRate != null) {
                displayPlan = customTarget;
                displayPct = (displayRate / customTarget) * 100;
            }
            const ps = getProdStatus(displayPct);
            const th = T['p'+ps] || T.pna;
            const pctVal = displayPct != null ? Math.min(displayPct, 150) : 0;
            const barW = Math.min((pctVal / 150) * 100, 100).toFixed(1);

            card.style.cssText = `
                background:${th.bg};
                border:1px solid ${th.border}40;
                border-left:3px solid ${th.border};
                border-radius:8px;
                padding:5px 7px;
                flex:1; min-width:0;
                display:flex; flex-direction:column; gap:2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            `;
            card.innerHTML = `
                <div style="color:#e5e7eb;font-weight:700;font-size:10px;text-align:center;margin-bottom:1px;">${customTarget != null ? '<span class="fclm-edit-target" style="cursor:pointer;font-size:9px;margin-right:3px;opacity:0.6;transition:opacity 0.2s;" title="Editar target">\u2699\uFE0F</span>' : ''}${proc.displayName}</div>
                <div style="text-align:center;">
                    <div style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Rate / ${customTarget != null ? 'Target' : 'Plan'}</div>
                    <div style="font-size:10px;margin-top:1px;">
                        <span style="color:${th.accent};font-weight:700;">${fmtRound(displayRate)}</span>
                        <span style="color:#4b5563;"> / </span>
                        <span style="color:#9ca3af;font-weight:600;">${fmtRound(displayPlan)}</span>
                    </div>
                </div>
                <div style="color:${th.accent};font-weight:800;font-size:13px;text-align:center;margin-top:2px;">${displayPct != null ? Math.round(displayPct)+'%' : '—'}</div>
                <div style="height:3px;background:#1f2937;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${barW}%;background:${th.border};border-radius:2px;transition:width 0.4s ease;"></div>
                </div>
                ${deltaHrs != null ? '<div style="text-align:center;margin-top:2px;"><span style="color:#9ca3af;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">\u0394 Hrs</span><div style="color:' + (deltaHrs >= 0 ? '#10b981' : '#ef4444') + ';font-weight:700;font-size:9px;">' + fmtDelta(deltaHrs) + ' hrs</div></div>' : ''}
            `;
            if (customTarget != null && proc.customTargetKey) {
                const editEl = card.querySelector('.fclm-edit-target');
                if (editEl) {
                    editEl.addEventListener('mouseenter', () => { editEl.style.opacity = '1'; });
                    editEl.addEventListener('mouseleave', () => { editEl.style.opacity = '0.6'; });
                    editEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openPlanEditor({
                            key: proc.customTargetKey,
                            title: proc.displayName,
                            subProcesses: [proc.displayName],
                            isSingleTarget: true,
                            currentTarget: customTarget
                        }, [], null);
                    });
                }
            }
        } else {
            card.style.cssText = `
                background:${T.pna.bg};border:1px solid ${T.pna.border}40;
                border-left:3px solid ${T.pna.border};border-radius:8px;
                padding:5px 7px;flex:1;min-width:0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            `;
            card.innerHTML = `
                <div style="color:#9ca3af;font-weight:700;font-size:10px;">${proc.displayName}</div>
                <div style="color:${T.pna.accent};font-size:8px;">sin datos</div>
            `;
        }
        return card;
    }

    function exportToCSV(){
        const now=new Date(), ts=now.toISOString().slice(0,19).replace(/[T:]/g,'-');
        const rows=['FCLM Report TLC1+QYY7 - '+now.toLocaleString(),'','Warehouse,Seccion,Proceso,Volume,Rate,Plan Rate,% to Plan,Delta Hrs'];
        [TLC1_CONFIG,QYY7_CONFIG].forEach(wc=>{
            const mm=metricsStore[wc.id].main, pm=metricsStore[wc.id].productivity;
            rows.push('',`===== ${wc.id} =====`);
            wc.sections.forEach(sec=>{
                rows.push('--- '+sec.name+' '+wc.id+' ---');
                sec.processes.forEach(pn=>{
                    const m=mm.find(x=>x.name===pn), dn=DISPLAY_NAMES[pn]||pn;
                    if(m){
                        let vol;
                        if(m.casesVolume != null){
                            vol = m.casesVolume;
                        } else {
                            vol = m.volume;
                        }
                        rows.push([wc.id,sec.name,dn,vol||'',m.actualRate||'',m.planRate||'',m.percentToPlan!=null?m.percentToPlan+'%':'',m.deltaToPlanHrs||''].join(','));
                    }
                    else rows.push([wc.id,sec.name,dn,'','','','',''].join(','));
                });
            });
            rows.push(`--- ${wc.productivity.name} ---`);
            wc.productivity.processes.forEach(proc=>{
                const m=pm.find(x=>x.key==='RC_'+proc.name);
                if(m) rows.push([wc.id,wc.productivity.name,proc.displayName,'',m.actualRate||'',m.planRate||'',m.percentToPlan!=null?m.percentToPlan+'%':'',''].join(','));
                else rows.push([wc.id,wc.productivity.name,proc.displayName,'','','','',''].join(','));
            });
        });
        const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`FCLM_TLC1_QYY7_${ts}.csv`; a.click();
    }


    function getPillOrigin() {
        const savedPos = JSON.parse(localStorage.getItem('fclm-pill-pos') || 'null');
        const x = savedPos ? savedPos.x + 22 : 42;
        const y = savedPos ? savedPos.y + 22 : 42;
        return `${x}px ${y}px`;
    }

    function createMinPill() {
        document.getElementById('fclm-pill')?.remove();
        const pill = document.createElement('div');
        pill.id = 'fclm-pill';
        const savedPos = JSON.parse(localStorage.getItem('fclm-pill-pos') || 'null');
        const posX = savedPos ? savedPos.x : 20;
        const posY = savedPos ? savedPos.y : 20;
        pill.style.cssText = `
            position:fixed;left:${posX}px;top:${posY}px;z-index:99999;
            width:44px;height:44px;
            background:linear-gradient(135deg, #059669, #10b981);
            border:2px solid rgba(16, 185, 129, 0.6);
            border-radius:10px;
            display:flex;align-items:center;justify-content:center;
            cursor:grab;
            box-shadow:0 2px 12px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2);
            font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select:none;
            animation: fclmGlow 2s ease-in-out infinite alternate;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        `;
        pill.innerHTML = `<span style="font-size:20px;line-height:1;">📲</span>`;
        pill.classList.add('appearing');
        setTimeout(()=> pill.classList.remove('appearing'), 350);

        pill.addEventListener('mouseenter',()=>{
            pill.style.transform='scale(1.15)';
            pill.style.boxShadow='0 4px 20px rgba(16, 185, 129, 0.7), 0 0 35px rgba(16, 185, 129, 0.4)';
        });
        pill.addEventListener('mouseleave',()=>{
            pill.style.transform='scale(1)';
            pill.style.boxShadow='0 2px 12px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2)';
        });

        let isDragging=false, startX, startY, origX, origY, moved=false;
        pill.addEventListener('mousedown',(e)=>{isDragging=true;moved=false;pill.style.cursor='grabbing';startX=e.clientX;startY=e.clientY;origX=pill.offsetLeft;origY=pill.offsetTop;e.preventDefault();});
        document.addEventListener('mousemove',(e)=>{if(!isDragging)return;moved=true;const dx=e.clientX-startX,dy=e.clientY-startY;let nX=origX+dx,nY=origY+dy;nX=Math.max(0,Math.min(nX,window.innerWidth-pill.offsetWidth));nY=Math.max(0,Math.min(nY,window.innerHeight-pill.offsetHeight));pill.style.left=nX+'px';pill.style.top=nY+'px';});
        document.addEventListener('mouseup',()=>{if(!isDragging)return;isDragging=false;pill.style.cursor='grab';if(moved)localStorage.setItem('fclm-pill-pos',JSON.stringify({x:pill.offsetLeft,y:pill.offsetTop}));});
        pill.addEventListener('click',(e)=>{
            if(moved){moved=false;return;}
            e.stopPropagation();
            pill.classList.add('disappearing');
            setTimeout(()=>{
                isMinimized=false;
                pill.remove();
                createBanner();
            },300);
        });
        document.body.appendChild(pill);
        document.body.style.paddingTop='0px';
    }

    function createBanner() {
        document.getElementById('fclm-banner')?.remove();
        document.getElementById('fclm-pill')?.remove();
        injectStyles();
        if (isMinimized) { createMinPill(); return; }

        const banner = document.createElement('div');
        banner.id = 'fclm-banner';
        banner.style.cssText = `
            position:fixed;top:0;left:0;right:0;z-index:99999;
            background:#07070d;
            display:flex;flex-direction:column;
            box-shadow:0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3), 0 4px 15px rgba(16, 185, 129, 0.15), 0 2px 8px rgba(16, 185, 129, 0.1);
            border-bottom:1px solid rgba(16, 185, 129, 0.3);
            font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        const origin = getPillOrigin();
        banner.style.transformOrigin = origin;
        banner.style.transform = 'scale(0.05)';
        banner.style.opacity = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                banner.style.transform = 'scale(1)';
                banner.style.opacity = '1';
            });
        });

        const titleBar = document.createElement('div');
        titleBar.id = 'fclm-title-bar';
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const dateStr = now.toLocaleDateString('es-MX', {weekday:'short',year:'numeric',month:'short',day:'numeric'});
        titleBar.style.cssText = `
            display:flex;justify-content:space-between;align-items:center;
            padding:5px 12px;
            background:linear-gradient(135deg, #059669, #10b981);
            border-bottom:1px solid rgba(255,255,255,0.15);
            cursor:default;
        `;
        titleBar.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">📲</span>
                <span style="color:#ffffff;font-weight:800;font-size:12px;letter-spacing:0.5px;">FCLM Report TLC1+QYY7</span>
                <span style="color:rgba(255,255,255,0.45);font-size:9px;font-weight:500;letter-spacing:0.3px;">v${SCRIPT_VERSION}</span>
                <span id="fclm-version-status-btn" style="
                    font-size:10px;font-weight:700;letter-spacing:0.3px;
                    padding:3px 12px;border-radius:5px;
                    background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
                    color:rgba(255,255,255,0.5);cursor:default;
                    transition:all 0.2s ease;
                ">\u23F3 Verificando...</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="color:rgba(255,255,255,0.85);font-size:10px;font-weight:500;">⚡ ${dateStr} — ${timeStr}</span>
                <div id="fclm-min-btn" title="Minimizar" style="
                    width:24px;height:24px;display:flex;align-items:center;justify-content:center;
                    background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);
                    border-radius:6px;color:#ffffff;font-size:15px;font-weight:700;line-height:1;
                    cursor:pointer;transition:all 0.2s;
                ">−</div>
            </div>
        `;
        banner.appendChild(titleBar);

        const contentWrap = document.createElement('div');
        contentWrap.id = 'fclm-content-wrap';
        contentWrap.style.cssText = 'padding:6px 8px 5px 8px;display:flex;flex-direction:column;gap:6px;overflow:visible;';

        [TLC1_CONFIG, QYY7_CONFIG].forEach((wc, wi) => {
            const mm = metricsStore[wc.id].main;
            const pm = metricsStore[wc.id].productivity;

            const whBlock = document.createElement('div');
            whBlock.style.cssText = 'display:flex;align-items:stretch;gap:6px;';

            const badge = document.createElement('div');
            badge.style.cssText = `
                display:flex;align-items:center;justify-content:center;
                width:30px;min-width:30px;flex-shrink:0;
                background:linear-gradient(180deg,#1a2332,#232f3e);
                border:1px solid ${wc.color}44;border-radius:6px;
                color:${wc.color};font-weight:800;font-size:10px;
                letter-spacing:1.5px;writing-mode:vertical-rl;transform:rotate(180deg);
            `;
            badge.textContent = wc.id;
            whBlock.appendChild(badge);

            const secPanel = document.createElement('div');
            secPanel.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;';

            wc.sections.forEach((sec, si) => {
                const secRow = document.createElement('div');
                secRow.style.cssText = 'display:flex;align-items:stretch;gap:4px;';
                const tag = document.createElement('div');
                tag.style.cssText = `
                    display:flex;align-items:center;justify-content:center;
                    width:16px;min-width:16px;flex-shrink:0;border-radius:4px;
                    background:#111820;border:1px solid #374151;
                    color:#9ca3af;font-size:7px;font-weight:700;
                    writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:0.5px;
                `;
                tag.textContent = sec.name;
                secRow.appendChild(tag);
                sec.processes.forEach(pn => {
                    const m = mm.find(x => x.name === pn);
                    const isCase = wc.casesBlocks.includes(pn);
                    const subMenuCfg = wc.processSubMenu ? wc.processSubMenu[pn] : null;

                    const linkMenuCfg = wc.processLinkMenu ? wc.processLinkMenu[pn] : null;

                    if (subMenuCfg) {
                        const wrap = document.createElement('div');
                        wrap.className = 'fclm-submenu-wrap';
                        wrap.style.cssText = 'position:relative;flex:1;min-width:0;display:flex;flex-direction:column;';

                        const mainCard = makeProcessCard(m, pn, isCase, wc);
                        // Add gear icon for customPlanConfig processes
                        const cpc = wc.customPlanConfig ? wc.customPlanConfig[pn] : null;
                        if (cpc) {
                            // Inject gear into the card's title text
                            const titleEl = mainCard.querySelector('div > div:first-child');
                            if (titleEl) {
                                const gear = document.createElement('span');
                                gear.textContent = ' \u2699\uFE0F';
                                gear.title = 'Editar Plan';
                                gear.style.cssText = 'cursor:pointer;font-size:9px;opacity:0.5;transition:opacity 0.2s;vertical-align:middle;';
                                gear.addEventListener('mouseenter', () => { gear.style.opacity='1'; });
                                gear.addEventListener('mouseleave', () => { gear.style.opacity='0.5'; });
                                gear.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    openPlanEditor(cpc, mm, wc);
                                });
                                titleEl.appendChild(gear);
                            }
                        }
                        wrap.appendChild(mainCard);

                        const subPanel = document.createElement('div');
                        subPanel.className = 'fclm-submenu';
                        subMenuCfg.forEach(sp => {
                            const sm = mm.find(x => x.name === sp.name);
                            // Apply custom plan override if set
                            if (cpc && sm) {
                                const saved = JSON.parse(localStorage.getItem(cpc.key) || '{}');
                                if (saved.mode === 'manual' && saved.plans && saved.plans[sp.name] != null) {
                                    sm.planRate = saved.plans[sp.name];
                                    sm.percentToPlan = sm.planRate > 0 ? (sm.actualRate / sm.planRate) * 100 : 0;
                                }
                            }
                            if (!wc.processLinks[sp.name]) wc.processLinks[sp.name] = sp.processId;
                            const subCard = makeProcessCard(sm, sp.name, false, wc);
                            subPanel.appendChild(subCard);
                        });
                        wrap.appendChild(subPanel);
                        secRow.appendChild(wrap);
                    } else if (linkMenuCfg) {
                        const wrap = document.createElement('div');
                        wrap.className = 'fclm-submenu-wrap';
                        wrap.style.cssText = 'position:relative;flex:1;min-width:0;display:flex;flex-direction:column;';
                        wrap.appendChild(makeProcessCard(m, pn, isCase, wc));

                        const linkPanel = document.createElement('div');
                        linkPanel.className = 'fclm-submenu';
                        linkMenuCfg.forEach(lnk => {
                            const linkBtn = document.createElement('a');
                            linkBtn.href = lnk.url;
                            linkBtn.target = '_blank';
                            linkBtn.textContent = lnk.name;
                            linkBtn.style.cssText = 'display:block;padding:7px 10px;background:#0f1419;border:1px solid rgba(16,185,129,0.2);border-radius:4px;color:#e5e7eb;font-size:11px;font-weight:600;text-decoration:none;cursor:pointer;transition:all 0.15s ease;text-align:center;';
                            linkBtn.addEventListener('mouseenter', () => { linkBtn.style.background='linear-gradient(135deg,#059669,#10b981)'; linkBtn.style.borderColor='#10b981'; linkBtn.style.color='#ffffff'; linkBtn.style.transform='translateX(2px)'; });
                            linkBtn.addEventListener('mouseleave', () => { linkBtn.style.background='#0f1419'; linkBtn.style.borderColor='rgba(16,185,129,0.2)'; linkBtn.style.color='#e5e7eb'; linkBtn.style.transform='translateX(0)'; });
                            linkPanel.appendChild(linkBtn);
                        });
                        wrap.appendChild(linkPanel);
                        secRow.appendChild(wrap);
                    } else {
                        secRow.appendChild(makeProcessCard(m, pn, isCase, wc));
                    }
                });
                secPanel.appendChild(secRow);
                if (si === 0) {
                    const div = document.createElement('div');
                    div.style.cssText = 'border-bottom:1px solid #1f2937;margin:0 20px;';
                    secPanel.appendChild(div);
                }
            });

            whBlock.appendChild(secPanel);

            const vSep = document.createElement('div');
            vSep.style.cssText = 'width:1px;flex-shrink:0;align-self:stretch;background:#1f2937;margin:0 2px;';
            whBlock.appendChild(vSep);

            const prodPanel = document.createElement('div');
            prodPanel.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex-shrink:0;width:310px;justify-content:center;';
            const prodTitle = document.createElement('div');
            prodTitle.style.cssText = `color:${wc.color};font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;text-align:center;padding-bottom:3px;border-bottom:1px solid ${wc.color}55;`;
            prodTitle.textContent = wc.productivity.name;
            prodPanel.appendChild(prodTitle);
            const prodRow = document.createElement('div');
            prodRow.style.cssText = 'display:flex;gap:4px;flex:1;';
            wc.productivity.processes.forEach(proc => {
                const m = pm.find(x => x.key === 'RC_' + proc.name);
                let dHrs = null;
                if (wc.deltaHrsMap && wc.deltaHrsMap[proc.name]) {
                    const srcProc = mm.find(x => x.name === wc.deltaHrsMap[proc.name]);
                    if (srcProc) dHrs = srcProc.deltaToPlanHrs;
                }
                // Custom target override (e.g. TLC1 Inbound vs 190)
                let customTarget = null;
                if (proc.customTarget) {
                    const saved = localStorage.getItem(proc.customTargetKey);
                    customTarget = saved ? parseFloat(saved) : proc.customTarget;
                }
                prodRow.appendChild(makeProdCard(m, proc, dHrs, customTarget));
            });
            prodPanel.appendChild(prodRow);
            whBlock.appendChild(prodPanel);
            contentWrap.appendChild(whBlock);

            if (wi === 0) {
                const hSep = document.createElement('div');
                hSep.style.cssText = 'border-bottom:1px solid #1f2937;margin:2px 30px;';
                contentWrap.appendChild(hSep);
            }
        });

        const footerRow = document.createElement('div');
        footerRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;flex:1;flex-wrap:wrap;';
        const footerBtnStyle = 'background:linear-gradient(135deg,#1a2332,#232f3e);border:1px solid #374151;color:#ffffff;border-radius:6px;padding:5px 16px;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;transition:all 0.2s ease;white-space:nowrap;';
        function addHover(b){ b.addEventListener('mouseenter',()=>{b.style.background='linear-gradient(135deg,#059669,#10b981)';b.style.borderColor='#10b981';}); b.addEventListener('mouseleave',()=>{b.style.background='linear-gradient(135deg,#1a2332,#232f3e)';b.style.borderColor='#374151';}); }
        function mkBtn(txt,action){
            const b=document.createElement('button');
            b.textContent=txt;
            b.style.cssText=footerBtnStyle;
            addHover(b);
            if(typeof action==='function') b.addEventListener('click',action);
            else b.addEventListener('click',()=>{window.open(action,'_blank');});
            return b;
        }

        footerRow.appendChild(mkBtn('\uD83D\uDC65 Asistencia AA','https://fclm-portal.amazon.com/reports/ppaAttendance?&warehouseId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDD52 Time Card','https://atoz.amazon.work/timecard/managerView/'));
        footerRow.appendChild(mkBtn('\u23F1\uFE0F Tiempo Muerto','https://fclm-portal.amazon.com/reports/timeOnTask?&warehouseId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDCCA Rates','https://fclm-portal.amazon.com/reports/multiProcessInspector?&warehouseId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDD00 Transfers','https://fclm-portal.amazon.com/laborTransfer/schedule?&warehouseId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDD0D FC Research','https://fc-research.amazon.com'));

        const footerWrap = document.createElement('div');
        footerWrap.style.cssText = 'display:flex;align-items:center;padding-top:3px;gap:6px;';

        const btnDL = document.createElement('button');
        btnDL.textContent = '\u2B07\uFE0F  Descargar Excel';
        btnDL.style.cssText = 'background:linear-gradient(135deg,#059669,#10b981);border:1px solid #10b981;color:#ffffff;border-radius:6px;padding:5px 24px;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:0.5px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;transition:all 0.2s ease;white-space:nowrap;flex-shrink:0;';
        btnDL.addEventListener('mouseenter',()=>{btnDL.style.background='linear-gradient(135deg,#047857,#059669)';btnDL.style.borderColor='#047857';});
        btnDL.addEventListener('mouseleave',()=>{btnDL.style.background='linear-gradient(135deg,#059669,#10b981)';btnDL.style.borderColor='#10b981';});
        btnDL.addEventListener('click', exportToCSV);

        footerWrap.appendChild(btnDL);
        footerWrap.appendChild(footerRow);

        contentWrap.appendChild(footerWrap);
        banner.appendChild(contentWrap);

        // Minimize button in title bar
        const minBtn = banner.querySelector('#fclm-min-btn');
        if (minBtn) {
            minBtn.addEventListener('mouseenter', () => { minBtn.style.background='rgba(255,255,255,0.3)'; });
            minBtn.addEventListener('mouseleave', () => { minBtn.style.background='rgba(255,255,255,0.15)'; });
            minBtn.addEventListener('click', () => {
                const origin = getPillOrigin();
                banner.style.transformOrigin = origin;
                banner.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
                banner.style.transform = 'scale(0.02)';
                banner.style.opacity = '0';
                setTimeout(()=>{
                    isMinimized = true;
                    banner.remove();
                    createMinPill();
                },450);
            });
        }

        document.body.insertBefore(banner, document.body.firstChild);
        document.body.style.paddingTop = (banner.offsetHeight + 4) + 'px';

        const versionBtn = document.getElementById('fclm-version-status-btn');
        if (versionBtn) checkVersionStatus(versionBtn);
    }

    function initBanner(){ loadAllMetrics().then(createBanner); }

    function waitForData(){
        let att=0;
        const iv=setInterval(()=>{
            att++;
            const t=document.body.textContent||'';
            if(t.includes('Transfer In - Total')||t.includes('Receive - Total')||t.includes('IB Total')||t.includes('RC Summary')||att>=30){
                clearInterval(iv); setTimeout(initBanner,1000);
            }
        },1000);
    }
    waitForData();

    const obs=new MutationObserver(()=>{
        clearTimeout(window._fclmT);
        window._fclmT=setTimeout(()=>{
            const t=document.body.textContent||'';
            if(t.includes('Transfer In - Total')||t.includes('Receive - Total')||t.includes('IB Total')||t.includes('RC Summary'))initBanner();
        },3000);
    });
    obs.observe(document.body,{childList:true,subtree:true});

    let lastURL=window.location.href;
    setInterval(()=>{ if(window.location.href!==lastURL){lastURL=window.location.href; initBanner();} },2000);



    // ============= PLAN EDITOR MODAL =============
    function openPlanEditor(cpc, mm, wc) {
        // Remove existing modal
        const existing = document.getElementById('fclm-plan-editor');
        if (existing) existing.remove();

        // Single target mode (e.g. Inbound productivity)
        if (cpc.isSingleTarget) {
            const current = localStorage.getItem(cpc.key) || cpc.currentTarget;
            const overlay = document.createElement('div');
            overlay.id = 'fclm-plan-editor';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:100000;display:flex;align-items:center;justify-content:center;';
            const modal = document.createElement('div');
            modal.style.cssText = 'background:#0f1419;border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:20px;min-width:300px;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.5),0 0 20px rgba(16,185,129,0.1);';
            modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><span style="font-weight:700;font-size:13px;color:#10b981;white-space:nowrap;">\u2699\uFE0F Rates de ' + cpc.title + '</span><span id="fclm-plan-close" style="cursor:pointer;font-size:18px;color:#6b7280;">\u2715</span></div><div style="display:flex;align-items:center;gap:10px;padding:10px 0;"><span style="font-size:12px;color:#9ca3af;">Target Rate:</span><input id="fclm-single-target" type="number" value="' + current + '" style="width:100px;background:#1a2332;border:1px solid #374151;border-radius:4px;color:#e5e7eb;padding:6px 8px;font-size:13px;text-align:center;" /></div><div style="display:flex;gap:8px;margin-top:14px;"><button id="fclm-plan-save" style="flex:1;padding:8px;background:linear-gradient(135deg,#059669,#10b981);border:none;border-radius:6px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">Guardar</button><button id="fclm-plan-cancel" style="flex:1;padding:8px;background:#1a2332;border:1px solid #374151;border-radius:6px;color:#9ca3af;font-weight:600;font-size:12px;cursor:pointer;">Cancelar</button></div>';
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            overlay.querySelector('#fclm-plan-close').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#fclm-plan-cancel').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelector('#fclm-plan-save').addEventListener('click', () => {
                const val = overlay.querySelector('#fclm-single-target').value;
                if (val && !isNaN(parseFloat(val))) { localStorage.setItem(cpc.key, parseFloat(val)); overlay.remove(); initBanner(); }
            });
            return;
        }

        const saved = JSON.parse(localStorage.getItem(cpc.key) || '{}');
        const isManual = saved.mode === 'manual';

        const overlay = document.createElement('div');
        overlay.id = 'fclm-plan-editor';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:100000;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:#0f1419;border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:20px;min-width:340px;max-width:420px;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.5),0 0 20px rgba(16,185,129,0.1);';

        let inputsHTML = '';
        cpc.subProcesses.forEach(sp => {
            const m = mm.find(x => x.name === sp);
            const autoPlan = m ? (m._origPlanRate != null ? m._origPlanRate : m.planRate) : 0;
            const manualVal = (saved.plans && saved.plans[sp] != null) ? saved.plans[sp] : '';
            const dn = (typeof DISPLAY_NAMES !== 'undefined' && DISPLAY_NAMES[sp]) ? DISPLAY_NAMES[sp] : sp;
            inputsHTML += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1f2937;">';
            inputsHTML += '<span style="font-size:11px;font-weight:600;flex:1;">' + dn + '</span>';
            inputsHTML += '<span style="color:#6b7280;font-size:10px;margin-right:8px;">Auto: ' + (autoPlan != null ? Math.round(autoPlan) : '—') + '</span>';
            inputsHTML += '<input type="number" class="fclm-plan-input" data-proc="' + sp + '" placeholder="Plan" value="' + manualVal + '" style="width:70px;background:#1a2332;border:1px solid #374151;border-radius:4px;color:#e5e7eb;padding:4px 6px;font-size:11px;text-align:center;' + (isManual ? '' : 'opacity:0.3;pointer-events:none;') + '" />';
            inputsHTML += '</div>';
        });

        modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
            '<span style="font-weight:700;font-size:13px;color:#10b981;white-space:nowrap;">\u2699\uFE0F Rates de ' + (cpc.title || 'Proceso') + '</span>' +
            '<span id="fclm-plan-close" style="cursor:pointer;font-size:18px;color:#6b7280;transition:color 0.2s;" title="Cerrar">\u2715</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px;background:#1a2332;border-radius:6px;">' +
            '<span style="font-size:11px;color:#9ca3af;">Modo:</span>' +
            '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:600;color:' + (!isManual ? '#10b981' : '#6b7280') + ';"><input type="radio" name="fclm-plan-mode" value="auto" ' + (!isManual ? 'checked' : '') + ' style="accent-color:#10b981;" /> Auto</label>' +
            '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:600;color:' + (isManual ? '#10b981' : '#6b7280') + ';"><input type="radio" name="fclm-plan-mode" value="manual" ' + (isManual ? 'checked' : '') + ' style="accent-color:#10b981;" /> Manual</label>' +
            '</div>' +
            '<div id="fclm-plan-inputs">' + inputsHTML + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:14px;">' +
            '<button id="fclm-plan-save" style="flex:1;padding:8px;background:linear-gradient(135deg,#059669,#10b981);border:none;border-radius:6px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;transition:all 0.2s;">Guardar</button>' +
            '<button id="fclm-plan-cancel" style="flex:1;padding:8px;background:#1a2332;border:1px solid #374151;border-radius:6px;color:#9ca3af;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s;">Cancelar</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Mode toggle
        overlay.querySelectorAll('input[name="fclm-plan-mode"]').forEach(r => {
            r.addEventListener('change', () => {
                const isM = r.value === 'manual';
                overlay.querySelectorAll('.fclm-plan-input').forEach(inp => {
                    inp.style.opacity = isM ? '1' : '0.3';
                    inp.style.pointerEvents = isM ? 'auto' : 'none';
                });
                overlay.querySelectorAll('label').forEach(l => { l.style.color = '#6b7280'; });
                r.parentElement.style.color = '#10b981';
            });
        });

        // Close handlers
        overlay.querySelector('#fclm-plan-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#fclm-plan-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // Save handler
        overlay.querySelector('#fclm-plan-save').addEventListener('click', () => {
            const mode = overlay.querySelector('input[name="fclm-plan-mode"]:checked').value;
            const plans = {};
            overlay.querySelectorAll('.fclm-plan-input').forEach(inp => {
                const val = inp.value.trim();
                if (val !== '') plans[inp.dataset.proc] = parseFloat(val);
            });
            localStorage.setItem(cpc.key, JSON.stringify({ mode, plans }));
            overlay.remove();
            initBanner();
        });
    }

    // ============= VERSION STATUS BADGE =============
    async function checkVersionStatus(btnEl) {
        try {
            const rawUrl = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js';
            const response = await fetch(rawUrl, { cache: 'no-store' });
            if (!response.ok) { btnEl.textContent = '\u26A0\uFE0F Error al verificar'; btnEl.style.color = '#fbbf24'; return; }
            const text = await response.text();
            const vMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            const remoteVersion = vMatch ? vMatch[1] : null;
            if (!remoteVersion) { btnEl.textContent = '\u26A0\uFE0F Sin versi\u00F3n'; btnEl.style.color = '#fbbf24'; return; }
            const cmp = compareVersions(remoteVersion, SCRIPT_VERSION);
            if (cmp > 0) {
                btnEl.textContent = '\u2B06\uFE0F Actualizar v' + remoteVersion;
                btnEl.style.color = '#ffffff';
                btnEl.style.fontWeight = '700';
                btnEl.style.background = 'linear-gradient(135deg, #2563eb, #60a5fa)';
                btnEl.style.borderColor = '#3b82f6';
                btnEl.style.cursor = 'pointer';
                btnEl.style.padding = '3px 14px';
                btnEl.style.fontSize = '10px';
                btnEl.style.boxShadow = '0 0 10px rgba(59,130,246,0.3)';
                btnEl.addEventListener('mouseenter', () => { btnEl.style.background = 'linear-gradient(135deg, #1d4ed8, #3b82f6)'; btnEl.style.borderColor = '#2563eb'; btnEl.style.boxShadow = '0 0 15px rgba(59,130,246,0.5)'; });
                btnEl.addEventListener('mouseleave', () => { btnEl.style.background = 'linear-gradient(135deg, #2563eb, #60a5fa)'; btnEl.style.borderColor = '#3b82f6'; btnEl.style.boxShadow = '0 0 10px rgba(59,130,246,0.3)'; });
                btnEl.addEventListener('click', () => { window.open('https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js','_blank'); });
            } else {
                btnEl.textContent = '\u2705 \u00DAltima Versi\u00F3n Instalada';
                btnEl.style.color = 'rgba(255,255,255,0.6)';
                btnEl.style.background = 'rgba(255,255,255,0.08)';
                btnEl.style.borderColor = 'rgba(255,255,255,0.15)';
                btnEl.addEventListener('mouseenter', () => { btnEl.style.background = 'linear-gradient(135deg,#059669,#10b981)'; btnEl.style.color = '#ffffff'; btnEl.style.borderColor = '#10b981'; });
                btnEl.addEventListener('mouseleave', () => { btnEl.style.background = 'rgba(255,255,255,0.08)'; btnEl.style.color = 'rgba(255,255,255,0.6)'; btnEl.style.borderColor = 'rgba(255,255,255,0.15)'; });
            }
        } catch (e) {
            btnEl.textContent = '\u26A0\uFE0F Sin conexi\u00F3n';
            btnEl.style.color = '#fbbf24';
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

    // ============= AUTO-UPDATE CHECKER =============
    const UPDATE_NOTIFICATION_KEY = 'fclm_update_notified_version';

    async function checkForUpdates() {
        try {
            const currentVersion = SCRIPT_VERSION;
            const rawUrl = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js';
            const response = await fetch(rawUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error('No se pudo obtener el script');
            const text = await response.text();
            const versionMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            const remoteVersion = versionMatch ? versionMatch[1] : null;
            if (!remoteVersion) return;
            console.log(`[FCLM] Versi\u00F3n local: ${currentVersion}, Versi\u00F3n remota: ${remoteVersion}`);
            if (compareVersions(remoteVersion, currentVersion) > 0) {
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

    function showUpdateNotification(newVersion, currentVersion) {
        if (!document.getElementById('fclm-update-styles')) {
            const style = document.createElement('style');
            style.id = 'fclm-update-styles';
            style.textContent = `.fclm-update-banner{position:fixed;top:10px;right:10px;background:linear-gradient(135deg,#059669 0%,#10b981 100%);border-radius:8px;padding:12px 16px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.3),0 0 20px rgba(16,185,129,0.3);z-index:99999;display:flex;align-items:center;gap:12px;animation:fclmSlideIn 0.3s ease-out forwards;max-width:350px}.fclm-update-banner.hide{animation:fclmSlideOut 0.3s ease-out forwards}@keyframes fclmSlideIn{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes fclmSlideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(400px);opacity:0}}.fclm-update-content{flex:1;line-height:1.4}.fclm-update-title{font-weight:600;font-size:13px;margin-bottom:2px}.fclm-update-version{font-size:12px;opacity:0.95}.fclm-update-buttons{display:flex;gap:6px;white-space:nowrap}.fclm-update-btn{padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;transition:all 0.2s ease}.fclm-update-btn.update{background:rgba(255,255,255,0.2);color:#fff}.fclm-update-btn.update:hover{background:rgba(255,255,255,0.3);transform:translateY(-1px)}.fclm-update-btn.dismiss{background:transparent;color:rgba(255,255,255,0.8);padding:0;margin-left:auto;font-size:18px;line-height:1}.fclm-update-btn.dismiss:hover{color:#fff}`;
            document.head.appendChild(style);
        }
        const banner = document.createElement('div');
        banner.className = 'fclm-update-banner';
        banner.innerHTML = `<div class="fclm-update-content"><div class="fclm-update-title">FCLM Report TLC1+QYY7</div><div style="font-size:12px;font-weight:600;margin-bottom:2px;">\uD83D\uDE80 Actualizaci\u00F3n disponible</div><div class="fclm-update-version">v${currentVersion} \u2192 v${newVersion}</div></div><div class="fclm-update-buttons"><button class="fclm-update-btn update" onclick="window.open('https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/FCLM%20Report%20TLC1%2BQYY7.user.js');this.closest('.fclm-update-banner').classList.add('hide');setTimeout(()=>this.closest('.fclm-update-banner').remove(),300);">Instalar</button><button class="fclm-update-btn dismiss" onclick="this.closest('.fclm-update-banner').classList.add('hide');setTimeout(()=>this.closest('.fclm-update-banner').remove(),300);">\u2715</button></div>`;
        document.body.appendChild(banner);
        setTimeout(() => { if (banner.parentNode) { banner.classList.add('hide'); setTimeout(() => banner.remove(), 300); } }, 8000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { setTimeout(checkForUpdates, 2000); });
    } else {
        setTimeout(checkForUpdates, 2000);
    }

})();
