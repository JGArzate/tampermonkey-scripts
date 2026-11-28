
// ==UserScript==
// @name         OB FCLM Report
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  v3.9: Se quita Detalle RC Sort, Δ de Avance al Plan en verde/rojo con fondo y nueva sección AVERY (Dashboard y Routing) en QYY7
// @author       Jorge Gomez (Jrgmz)
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=QYY7*
// @match        https://fclm-portal.amazon.com/reports/processPathRollup*warehouseId=TLC1*
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      github.com
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20FCLM%20Report.user.js
// @downloadURL  https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20FCLM%20Report.user.js
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_VERSION = '3.9';

    const CURRENT_WH = new URLSearchParams(window.location.search).get('warehouseId') || '';

    // Procesos de apoyo que no tienen plan en FCLM: se muestran en gris, solo con Vol, Rate y Hrs
    const NO_PLAN_PROCESSES = ['RC Sort Support'];

    const TLC1_CONFIG = {
        id: 'TLC1', color: '#0073bb',
        sections: [
            { name: 'OUTBOUND', processes: ['Manual Sort -Total','RC Sort Support','TO Palletize','TO RWC','Transfer Out - Total'] },
            { name: 'OUTBOUND2', processes: ['TO Lead/PA','TO Problem Solve','Transfer Out Support','Transfer Out Dock'] }
        ],
        hiddenProcesses: ['DA Bldg to Bldg Transfer TOTAL','Pallet Receive'],
        productivity: {
            name: 'PRODUCTIVIDAD TLC1',
            processes: [
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: ['TO RWC'],
        toteBlocks: ['TO RWC'],
        noDenBlocks: ['TO RWC'],
        jphConfig: {
            'Manual Sort -Total': { processId: '01785143512767', defaultPlan: 220, key: 'fclm_jph_tlc1_rc_sort', fetchType: 'uph', label: 'UPH' },
            'TO Palletize': { processId: '01785143645486', defaultPlan: 55, key: 'fclm_jph_tlc1_transfer_out' },
            'TO RWC': { processId: '01785143680335', defaultPlan: 60, key: 'fclm_jph_tlc1_to_rwc' }
        },
        deltaHrsMap: { 'DA': 'DA Bldg to Bldg Transfer TOTAL' },
        processLinks: {
            'Manual Sort -Total': '01785143512767',
            'RC Sort Support': '01785143618796',
            'TO Palletize': '01785143645486',
            'TO RWC': '01785143680335',
            'Transfer Out Dock': '01003022',
            'Transfer Out Support': '01785144518570',
            'TO Lead/PA': '01003023',
            'TO Problem Solve': '01003018'
        },
        processDropdowns: {},
        customPlanConfig: {},
        processSubMenu: {},
        processLinkMenu: {
            'Transfer Out Dock': [
                { name: '\uD83D\uDE9A Cargas', url: 'https://prod-na.us-east-1.idx-website.aft.amazon.dev/en_US/TLC1/day-schedule?view=grid' },
                { name: '\uD83C\uDFED Yard', url: 'https://trans-logistics.amazon.com/yms/shipclerk/#/yard?availability=false' },
                { name: '\uD83D\uDEE5\uFE0F IB Dock Tracker', url: 'https://ib-dock-tracker.beta.harmony.a2z.com/' }
            ]
        },
        externalFetch: [
            { targetProcess: 'Manual Sort -Total', processId: '01785143512767', warehouseId: 'TLC1', denOnly: true, valueIndex: 'caseUnit' },
            { targetProcess: 'Pallet Receive', processId: '01003032', warehouseId: 'TLC1', denOnly: false, valueIndex: 'units' },
            { targetProcess: 'TO RWC', processId: '01785143680335', warehouseId: 'TLC1', denOnly: false, valueIndex: 'units' }
        ]
    };

    const QYY7_CONFIG = {
        id: 'QYY7', color: '#7b2d8b',
        sections: [
            { name: 'OUTBOUND', processes: ['Transfer Out Pick - Total','TO Palletize','Transfer Out Support','Transfer Out Dock'] },
            { name: 'OUTBOUND2', processes: ['TO Lead/PA','TO Problem Solve','DA Bldg to Bldg Transfer TOTAL'] }
        ],
        hiddenProcesses: [],
        productivity: {
            name: 'PRODUCTIVIDAD QYY7',
            processes: [
                { name: 'DA', displayName: 'Outbound' },
                { name: 'THROUGHPUT', displayName: 'Throughput' }
            ]
        },
        casesBlocks: ['Transfer Out Pick - Total','TO Palletize'],
        jphConfig: {
            'Transfer Out Pick - Total': { processId: '01003065', defaultPlan: 60, key: 'fclm_jph_qyy7_to_pick' },
            'TO Palletize': { processId: '01785143645486', defaultPlan: 60, key: 'fclm_jph_qyy7_transfer_out' }
        },
        rcSummaryTargets: {
            'DA': { key: 'fclm_target_qyy7_da', defaultPlan: 141, label: 'Outbound (DA)' },
            'THROUGHPUT': { key: 'fclm_target_qyy7_throughput', defaultPlan: 131, label: 'Throughput' }
        },
        deltaHrsMap: { 'DA': 'DA Bldg to Bldg Transfer TOTAL' },
        processLinks: {
            'Transfer Out Pick - Total': '01003065',
            'TO Palletize': '01785143645486',
            'Transfer Out Support': '01785144518570',
            'TO Lead/PA': '01003023',
            'TO Problem Solve': '01003018',
            'Transfer Out Dock': '01003022'
        },
        processDropdowns: {},
        customPlanConfig: {},
        processSubMenu: {},
        processLinkMenu: {
            'Transfer Out Dock': [
                { name: '\uD83D\uDCE6 Descargas', url: 'https://trans-logistics.amazon.com/ssp/dock/hrz/ob?' },
                { name: '\uD83D\uDCFA OB Monitor', url: 'https://rxd-mx.beta.harmony.a2z.com/' }
            ],
            'Transfer Out Pick - Total': [
                { name: '\uD83D\uDCCA Rodeo', url: 'https://rodeo-iad.amazon.com/QYY7/ExSD?yAxis=PROCESS_PATH&zAxis=WORK_POOL&shipmentTypes=TRANSSHIPMENTS&exSDRange.quickRange=ALL&exSDRange.dailyStart=00%3A00&exSDRange.dailyEnd=00%3A00&giftOption=ALL&fulfillmentServiceClass=ALL&fracs=ALL&isEulerExSDMiss=ALL&isEulerPromiseMiss=ALL&isEulerUpgraded=ALL&isReactiveTransfer=ALL&_workPool=on&workPool=ReadyToPick&workPool=ReadyToPickHardCapped&workPool=ReadyToPickUnconstrained&workPool=PickingNotYetPicked&workPool=PickingNotYetPickedPrioritized&workPool=PickingNotYetPickedNotPrioritized&workPool=PickingNotYetPickedHardCapped&workPool=CrossdockNotYetPicked&_workPool=on&workPool=PickingPicked&workPool=PickingPickedInProgress&workPool=PickingPickedInTransit&workPool=PickingPickedRouting&workPool=PickingPickedAtDestination&workPool=Inducted&workPool=RebinBuffered&workPool=Sorted&workPool=GiftWrap&workPool=Packing&workPool=Scanned&workPool=ProblemSolving&workPool=ProcessPartial&workPool=SoftwareException&workPool=Crossdock&workPool=PreSort&workPool=TransshipSorted&workPool=Palletized&_workPool=on&workPool=ManifestPending&workPool=ManifestPendingVerification&workPool=Manifested&workPool=Loaded&workPool=TransshipManifested&_workPool=on&processPath=&minPickPriority=MIN_PRIORITY&shipMethod=&shipOption=&sortCode=&fnSku=' },
                { name: '\uD83D\uDC64 Elegir Pickers', url: 'https://eligibility.us-east-1-prod.picking.aft.amazon.dev/QYY7/picker-eligibilities' },
                { name: '\uD83C\uDFAF Pick Console', url: 'https://picking-console.na.picking.aft.a2z.com/fc/QYY7/pick-workforce' }
            ]
        },
        externalFetch: [
            { targetProcess: 'Transfer Out Pick - Total', processId: '01003065', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' },
            { targetProcess: 'TO Palletize', processId: '01785143645486', warehouseId: 'QYY7', denOnly: false, valueIndex: 'jobs' }
        ]
    };

    const DISPLAY_NAMES = { 'DA Bldg to Bldg Transfer TOTAL': 'DA Bldg to Bldg', 'Manual Sort -Total': 'RC Sort - Total' };
    let metricsStore = { TLC1: { main: [], productivity: [] }, QYY7: { main: [], productivity: [] } };
    let isMinimized = false;

    function injectStyles() {
        if (document.getElementById('fclm-hover-styles')) return;
        const style = document.createElement('style');
        style.id = 'fclm-hover-styles';
        style.textContent = `
            #fclm-banner, #fclm-banner * { box-sizing:border-box; -webkit-font-smoothing:antialiased; }
            .fclm-card { transition: transform .18s ease, background .18s ease; position:relative; z-index:1; }
            .fclm-card:hover { transform: translateY(-1px); background: rgba(255,255,255,0.09) !important; z-index:10; }
            #fclm-banner { transition: transform .4s cubic-bezier(.4,0,.2,1), opacity .35s ease; }
            #fclm-pill { transition: all .35s cubic-bezier(.4,0,.2,1); }
            #fclm-pill.appearing { animation: pillAppear .35s cubic-bezier(.4,0,.2,1) forwards; }
            @keyframes pillAppear { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
            #fclm-pill.disappearing { animation: pillDisappear .3s cubic-bezier(.4,0,.2,1) forwards; }
            @keyframes pillDisappear { 0%{transform:scale(1);opacity:1} 100%{transform:scale(0);opacity:0} }
            @keyframes fclmGlow { 0%{box-shadow:0 2px 12px rgba(48,209,88,.35)} 100%{box-shadow:0 4px 20px rgba(48,209,88,.6)} }
            .fclm-submenu {
                position:absolute; top:100%; left:0; right:0; margin-top:4px;
                background:rgba(10,10,12,0.96); backdrop-filter:blur(24px) saturate(180%); -webkit-backdrop-filter:blur(24px) saturate(180%);
                border:1px solid rgba(255,255,255,0.10); border-radius:12px; padding:4px;
                box-shadow:0 12px 32px rgba(0,0,0,0.5);
                z-index:50; gap:4px; flex-direction:column; display:flex;
                max-height:0; overflow:hidden; opacity:0; pointer-events:none;
                transition:max-height .3s cubic-bezier(.4,0,.2,1), opacity .2s ease, padding .3s ease;
                padding-top:0; padding-bottom:0;
            }
            .fclm-submenu-wrap { position:relative; z-index:1; }
            .fclm-submenu-wrap:hover { z-index:200; }
            .fclm-submenu-wrap:hover .fclm-submenu { max-height:340px; opacity:1; pointer-events:auto; padding-top:4px; padding-bottom:4px; }
            .fclm-btn { transition: background .15s ease, color .15s ease; }
        `;
        document.head.appendChild(style);
    }

    function getDateParams() {
        const p = new URLSearchParams(window.location.search);
        const now = new Date();
        const todayStr = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0');
        return {
            spanType: p.get('spanType') || 'Intraday',
            startDateIntraday: p.get('startDateIntraday') || todayStr,
            startHourIntraday: p.get('startHourIntraday') || '7',
            startMinuteIntraday: p.get('startMinuteIntraday') || '0',
            endDateIntraday: p.get('endDateIntraday') || todayStr,
            endHourIntraday: p.get('endHourIntraday') || '19',
            endMinuteIntraday: p.get('endMinuteIntraday') || '0',
            startDateDay: p.get('startDateDay') || '',
            startDateWeek: p.get('startDateWeek') || '',
            startDateMonth: p.get('startDateMonth') || ''
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
            const pw=d.split('-').map(Number); const end=new Date(pw[0],pw[1]-1,pw[2]+6); const fm=n=>String(n).padStart(2,'0'); e=`${end.getFullYear()}-${fm(end.getMonth()+1)}-${fm(end.getDate())}T23:59:59.000`;
        } else if (dp.spanType==='Month' && dp.startDateMonth) {
            const d=dp.startDateMonth.replace(/\//g,'-'); s=`${d}T00:00:00.000`;
            const pts=d.split('-'); const last=new Date(parseInt(pts[0]),parseInt(pts[1]),0);
            const fm2=n=>String(n).padStart(2,'0'); e=`${last.getFullYear()}-${fm2(last.getMonth()+1)}-${fm2(last.getDate())}T23:59:59.000`;
        }
        if (!s||!e) return null;
        return `https://fclm-portal.amazon.com/reports/functionRollup?warehouseId=${warehouseId}&spanType=Intraday&startDate=${s}&endDate=${e}&reportFormat=HTML&processId=${processId}`;
    }

    // Liga de Function Rollup en el formato que usa FCLM al abrir un proceso desde el menú (startDateIntraday/Hour/Minute)
    function buildFunctionRollupIntradayURL(processId, warehouseId) {
        const dp = getDateParams();
        const pid = String(processId).replace(/^0+/, '');
        const q = [
            'reportFormat=HTML', 'warehouseId=' + warehouseId, 'processId=' + pid, 'maxIntradayDays=1', 'spanType=Intraday',
            'startDateIntraday=' + encodeURIComponent(dp.startDateIntraday), 'startHourIntraday=' + dp.startHourIntraday, 'startMinuteIntraday=' + dp.startMinuteIntraday,
            'endDateIntraday=' + encodeURIComponent(dp.endDateIntraday), 'endHourIntraday=' + dp.endHourIntraday, 'endMinuteIntraday=' + dp.endMinuteIntraday,
            'startHourIntraday1=0', 'startMinuteIntraday1=0', 'startHourIntraday2=0', 'startMinuteIntraday2=0',
            'startHourIntraday3=0', 'startMinuteIntraday3=0', 'startHourIntraday4=0', 'startMinuteIntraday4=0'
        ];
        return 'https://fclm-portal.amazon.com/reports/functionRollup?' + q.join('&');
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
        let hoursUsed=null;
        if(NO_PLAN_PROCESSES.includes(processName) && nums.length>=3){ volume=nums[0]; hoursUsed=nums[1]; actualRate=nums[2]; planRate=null; percentToPlan=null; deltaToPlanHrs=null; }
        if(actualRate!==null||percentToPlan!==null) return {name:processName,volume,actualRate,planRate,percentToPlan,deltaToPlanHrs,hoursUsed};
        return null;
    }

    // Fila del RC Summary de QYY7: [..., Unit, Vol, 0, 0, Horas, Rate, Rate]  (no trae plan ni %)
    // El rate se toma como el último número NO CERO de la fila; las horas, el número anterior a ese rate.
    function extractRCSummaryRow(cells, processName, targetPlan) {
        const ct = cells.map(c => (c.textContent || '').trim());
        let unitIdx = ct.findIndex(t => ['EACH','Case','Pallet','Package'].includes(t));
        const nums = [];
        ct.forEach((t, i) => {
            if (unitIdx >= 0 && i <= unitIdx) return;
            if (t.toLowerCase() === processName.toLowerCase()) return;
            if (t.includes('%') || ['---','-',''].includes(t)) return;
            const n = parseFloat(t.replace(/,/g, '')); if (!isNaN(n)) nums.push(n);
        });
        if (nums.length < 3) { console.warn('[OB FCLM] RC Summary fila corta', processName, ct); return null; }
        const volume = nums[0];
        // último valor distinto de cero = rate; el valor anterior distinto de cero = horas
        let ri = -1;
        for (let i = nums.length - 1; i >= 1; i--) { if (nums[i] > 0) { ri = i; break; } }
        if (ri < 0) { console.warn('[OB FCLM] RC Summary sin rate', processName, ct); return null; }
        const actualRate = nums[ri];
        let hours = null;
        for (let i = ri - 1; i >= 1; i--) { if (nums[i] > 0 && Math.abs(nums[i] - actualRate) > 1e-9) { hours = nums[i]; break; } }
        const planRate = (targetPlan && targetPlan > 0) ? targetPlan : null;
        const percentToPlan = planRate ? (actualRate / planRate) * 100 : null;
        const deltaToPlanHrs = (planRate && hours != null) ? (volume / planRate) - hours : null;
        console.log('[OB FCLM] RC Summary', processName, { volume, hours, actualRate, planRate, percentToPlan, deltaToPlanHrs, celdas: ct });
        return { name: processName, volume, actualRate, planRate, percentToPlan, deltaToPlanHrs, hours };
    }

    function getRCTarget(config, procName) {
        const t = config.rcSummaryTargets && config.rcSummaryTargets[procName]; if (!t) return null;
        const saved = localStorage.getItem(t.key);
        const v = saved != null ? parseFloat(saved) : t.defaultPlan;
        return isNaN(v) ? null : v;
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
            // En QYY7 las filas DA / THROUGHPUT se buscan en toda la página (no solo dentro del bloque RC Summary)
            if((inRC||config.rcSummaryTargets)&&cells.length>3){
                const ca=Array.from(cells), ct2=ca.map(c=>(c.textContent||'').trim());
                config.productivity.processes.forEach(proc=>{
                    if(ct2.some(t=>t.toLowerCase()===proc.name.toLowerCase())&&(!config.rcSummaryTargets||ct2.some(t=>['EACH','Case','Pallet','Package'].includes(t)))){
                        const d=(config.rcSummaryTargets?extractRCSummaryRow(ca,proc.name,getRCTarget(config,proc.name)):null)||extractRowData(ca,proc.name);
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
                    } else if(valueType === 'jobsAndUnits'){
                        if(nums.length>=4){resolve({jobs:nums[1], units:nums[3]});return;}
                    } else if(valueType === 'units' || valueType === 'unitsAsVol'){
                        if(nums.length>=4){resolve(nums[3]);return;}
                    } else if(valueType === 'jph'){
                        if(nums.length>=3){resolve(nums[2]);return;}
                    } else if(valueType === 'uph'){
                        if(nums.length>=5){resolve(nums[4]);return;}
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
                    } else if(typeof cases === 'object' && cases.jobs != null && cases.units != null){
                        m.casesVolume = cases.jobs;
                        m.originalVolume = cases.units;
                        m.density = (cases.units != null && cases.jobs > 0) ? parseFloat((cases.units / cases.jobs).toFixed(1)) : null;
                        m.volume = cases.jobs;
                    } else if(c.valueIndex === 'unitsAsVol'){
                        m.volume = cases;
                    } else if(c.valueIndex === 'units'){
                        m.casesVolume = m.volume;
                        m.originalVolume = cases;
                        m.density = (cases != null && m.volume > 0) ? parseFloat((cases / m.volume).toFixed(1)) : null;
                    } else {
                        m.originalVolume = m.volume;
                        m.casesVolume = cases;
                        m.density = (m.volume != null && cases > 0) ? parseFloat((m.volume / cases).toFixed(1)) : null;
                        m.volume = cases;
                    }
                }
            }
        }

        // Apply JPH values
        const jphCfg = config.jphConfig || {};
        for(let [procName, cfg] of Object.entries(jphCfg)){
            const jphVal = extVals[whId + '_jph_' + procName];
            const m = metrics.find(m => m.name === procName);
            if(m && jphVal != null){
                const savedPlan = localStorage.getItem(cfg.key);
                const plan = savedPlan ? parseFloat(savedPlan) : cfg.defaultPlan;
                m.jph = Math.round(jphVal * 100) / 100;
                m.jphPlan = plan;
                m.jphKey = cfg.key;
                m.jphDefault = cfg.defaultPlan;
                m.jphLabel = cfg.label || 'JPH';
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

        // Fetch JPH for configured processes
        const allJphConfigs = [
            ...(TLC1_CONFIG.jphConfig ? Object.entries(TLC1_CONFIG.jphConfig).map(([k,v])=>({...v, name:k, wh:'TLC1'})) : []),
            ...(QYY7_CONFIG.jphConfig ? Object.entries(QYY7_CONFIG.jphConfig).map(([k,v])=>({...v, name:k, wh:'QYY7'})) : [])
        ];
        for(let j of allJphConfigs){
            promises.push(fetchValueFromFunctionRollup(j.processId, j.wh, j.fetchType || 'jph').then(v=>{
                extVals[j.wh + '_jph_' + j.name] = v;
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
        on:  {bg:'rgba(255,255,255,0.06)', border:'#30d158', accent:'#30d158', text:'#f5f5f7', arrow:'\u25B2'},
        off: {bg:'rgba(255,255,255,0.06)', border:'#ff453a', accent:'#ff453a', text:'#f5f5f7', arrow:'\u25BC'},
        na:  {bg:'rgba(255,255,255,0.03)', border:'#636366', accent:'#8e8e93', text:'#aeaeb2', arrow:'\u25CF'},
        pg:  {bg:'rgba(255,255,255,0.06)', border:'#30d158', accent:'#30d158', text:'#f5f5f7'},
        po:  {bg:'rgba(255,255,255,0.06)', border:'#ff9f0a', accent:'#ff9f0a', text:'#f5f5f7'},
        pr:  {bg:'rgba(255,255,255,0.06)', border:'#ff453a', accent:'#ff453a', text:'#f5f5f7'},
        pna: {bg:'rgba(255,255,255,0.03)', border:'#636366', accent:'#8e8e93', text:'#aeaeb2'}
    };

    function fmt(v){ return v!=null ? v.toLocaleString() : '—'; }
    function fmtRound(v){ return v!=null ? Math.round(v).toLocaleString() : '—'; }
    function fmtDelta(v){ if(v==null)return '—'; return (v>0?'+':'')+v.toLocaleString(); }
    function fmtPct(v){ return v!=null ? v.toFixed(1)+'%' : '—'; }


    function buildLinkButtons(pn, whConfig) {
        const items = (whConfig && whConfig.processLinkMenu && whConfig.processLinkMenu[pn]) ? whConfig.processLinkMenu[pn] : [];
        if (!items.length) return null;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;width:100%;';
        items.forEach(function(lnk) {
            const href = (lnk.processId ? buildFunctionRollupURL(lnk.processId, whConfig.id) : lnk.url) || '';
            if (!href) return;
            const a = document.createElement('a');
            a.href = href; a.target = '_blank'; a.textContent = lnk.name;
            a.style.cssText = 'flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:7px 10px;border-radius:980px;background:rgba(255,255,255,0.08);color:#f5f5f7;font-size:11.5px;font-weight:600;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background .15s ease;';
            a.addEventListener('mouseenter', function() { a.style.background = '#0a84ff'; a.style.color = '#ffffff'; });
            a.addEventListener('mouseleave', function() { a.style.background = 'rgba(255,255,255,0.08)'; a.style.color = '#f5f5f7'; });
            row.appendChild(a);
        });
        return row.childNodes.length ? row : null;
    }

    const INTRADAY_LINK_PROCESSES = ['TO Problem Solve'];

    function makeProcessCard(m, pn, isCase, whConfig) {
        const dn = DISPLAY_NAMES[pn] || pn;
        const processId = whConfig && whConfig.processLinks ? whConfig.processLinks[pn] : null;
        const linkURL = processId ? (INTRADAY_LINK_PROCESSES.includes(pn) ? buildFunctionRollupIntradayURL(processId, whConfig.id) : buildFunctionRollupURL(processId, whConfig.id)) : null;
        const dropdown = whConfig && whConfig.processDropdowns ? whConfig.processDropdowns[pn] : null;
        const subMenu = whConfig && whConfig.processSubMenu ? whConfig.processSubMenu[pn] : null;
        let linkBtn = '';
        if (false && subMenu && linkURL) {
            linkBtn = `<a href="${linkURL}" target="_blank" title="Ver detalle" style="text-decoration:none;font-size:11px;margin-left:4px;opacity:0.5;transition:opacity 0.2s;">\u2197\uFE0F</a><span style="font-size:9px;margin-left:2px;opacity:0.7;cursor:default;">\u25BC</span>`;
        } else if (false && subMenu) {
            linkBtn = `<span style="font-size:8px;margin-left:4px;opacity:0.5;cursor:default;">\u25BC</span>`;
        } else if (dropdown && dropdown.length > 0) {
            const ddId = 'fclm-dd-' + pn.replace(/[^a-zA-Z0-9]/g, '') + '-' + whConfig.id;
            let ddItems = '';
            dropdown.forEach(item => {
                const itemURL = buildFunctionRollupURL(item.processId, whConfig.id);
                if (itemURL) {
                    ddItems += `<a href="${itemURL}" target="_blank" style="display:block;padding:4px 10px;color:#f5f5f7;text-decoration:none;font-size:10px;font-weight:500;white-space:nowrap;transition:background 0.15s;" onmouseenter="this.style.background='#374151'" onmouseleave="this.style.background='transparent'">${item.label}</a>`;
                }
            });
            linkBtn = `<span style="position:relative;display:inline-block;margin-left:3px;cursor:pointer;" onmouseenter="this.querySelector('.fclm-dropdown').style.display='block'" onmouseleave="this.querySelector('.fclm-dropdown').style.display='none'"><span style="font-size:11px;opacity:0.7;transition:opacity 0.2s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">↗️</span><div class="fclm-dropdown" style="display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);background:#1a2332;border:1px solid #374151;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,0.5);z-index:100;min-width:70px;padding:4px 0;margin-top:2px;">${ddItems}</div></span>`;
        } else if (linkURL) {
            linkBtn = `<a href="${linkURL}" target="_blank" title="Ver detalle" style="text-decoration:none;font-size:11px;margin-left:4px;opacity:0.5;transition:opacity 0.2s;cursor:pointer;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.7'">↗️</a>`;
        }
        const card = document.createElement('div');
        card.className = 'fclm-card';

        const hasCasesVol = m && m.originalVolume != null && m.casesVolume != null;
        const isPallet = whConfig && whConfig.palletBlocks && whConfig.palletBlocks.includes(pn);
        const noDen = whConfig && whConfig.noDenBlocks && whConfig.noDenBlocks.includes(pn);
        const hasDenOnly = m && m.densityOnly === true;

        if (m) {
            const noPlan = NO_PLAN_PROCESSES.includes(pn);
            const st = noPlan ? 'na' : getStatus(m.percentToPlan, m.actualRate, m.planRate);
            const th = T[st];
            const pctVal = m.percentToPlan != null ? Math.min(m.percentToPlan, 150) : 0;
            const barW = Math.min((pctVal / 150) * 100, 100).toFixed(1);

            card.style.cssText = `
                background:${th.bg};
                border:1px solid rgba(255,255,255,0.08);
                border-radius:12px;
                padding:6px 9px;
                flex:1 1 0; min-width:0;
                display:flex; flex-direction:column; gap:4px;
            `;

            let volHTML = '';
            const lbl = 'color:#8e8e93;font-size:9.5px;font-weight:500;letter-spacing:0.2px;text-align:center;line-height:1.2;';
            const val = 'color:#f5f5f7;font-weight:600;font-size:12px;white-space:nowrap;text-align:center;line-height:1.25;';
            if (hasCasesVol) {
                const isTote = whConfig && whConfig.toteBlocks && whConfig.toteBlocks.includes(pn);
                const cLabel = isTote ? 'Totes / Vol' : (isPallet ? 'Pallets / Vol' : 'Cases / Vol');
                const denBlock = noDen ? '' : '<div style="text-align:center;min-width:0;"><div style="' + lbl + '">Den</div><div style="color:' + th.accent + ';font-weight:600;font-size:12px;white-space:nowrap;text-align:center;">' + (m.density != null ? m.density : '\u2014') + '</div></div>';
                volHTML = `
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">${cLabel}</div>
                        <div style="${val}">${fmt(m.casesVolume)} / ${fmt(m.originalVolume)}</div>
                    </div>
                    ${denBlock}
                `;
            } else if (hasDenOnly) {
                volHTML = `
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">Cases / Vol</div>
                        <div style="${val}">${fmt(m.casesVolume)} / ${fmt(m.originalVolume)}</div>
                    </div>
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">Den</div>
                        <div style="color:${th.accent};font-weight:600;font-size:12px;white-space:nowrap;text-align:center;">${m.density != null ? m.density : '\u2014'}</div>
                    </div>
                `;
            } else {
                volHTML = `
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">Vol</div>
                        <div style="${val}">${fmt(m.volume)}</div>
                    </div>
                `;
            }

            const jphBlock = m.jph != null
                ? '<div style="text-align:center;min-width:0;"><div style="' + lbl + '">' + (m.jphLabel || 'JPH') + '</div><div style="font-size:12px;white-space:nowrap;text-align:center;"><span style="color:' + (m.jph >= m.jphPlan ? '#30d158' : '#ff453a') + ';font-weight:600;">' + fmtRound(m.jph) + '</span><span style="color:#636366;"> / </span><span style="color:#aeaeb2;font-weight:500;">' + fmtRound(m.jphPlan) + '</span></div></div>'
                : '';
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
                    <span style="display:flex;align-items:center;gap:5px;min-width:0;flex:1;">
                        <span style="width:6px;height:6px;border-radius:50%;background:${th.border};flex-shrink:0;"></span>
                        <span style="color:#f5f5f7;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">${dn}${linkBtn}</span>
                    </span>
                    <span style="color:${th.accent};font-weight:700;font-size:13px;white-space:nowrap;">${noPlan ? 'Sin plan' : fmtPct(m.percentToPlan)}</span>
                </div>
                <div style="height:2px;background:rgba(255,255,255,0.10);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${barW}%;background:${th.border};border-radius:2px;transition:width .4s ease;"></div>
                </div>
                <div style="display:flex;justify-content:space-around;align-items:flex-start;gap:8px;text-align:center;">
                    ${volHTML}
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">${noPlan ? 'Rate' : 'Rate / Plan'}</div>
                        <div style="font-size:12px;white-space:nowrap;text-align:center;">
                            <span style="color:${noPlan ? '#f5f5f7' : th.accent};font-weight:600;">${fmtRound(m.actualRate)}</span>${noPlan ? '' : '<span style="color:#636366;"> / </span><span style="color:#aeaeb2;font-weight:500;">' + fmtRound(m.planRate) + '</span>'}
                        </div>
                    </div>
                    <div style="text-align:center;min-width:0;">
                        <div style="${lbl}">${noPlan ? 'Hrs' : '\u0394 Hrs'}</div>
                        <div style="color:${noPlan ? '#f5f5f7' : th.accent};font-weight:600;font-size:12px;white-space:nowrap;text-align:center;">${noPlan ? fmtRound(m.hoursUsed) : fmtDelta(m.deltaToPlanHrs)}</div>
                    </div>
                    ${jphBlock}
                </div>
            `;
        } else {
            card.style.cssText = `
                background:${T.na.bg};border:1px solid rgba(255,255,255,0.06);border-radius:12px;
                padding:6px 9px;flex:1 1 0;min-width:0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;
            `;
            card.innerHTML = `
                <div style="color:#aeaeb2;font-weight:600;font-size:13px;">${dn}${linkBtn}</div>
                <div style="color:#636366;font-size:9px;">sin datos</div>
            `;
        }

        const linkRow = buildLinkButtons(pn, whConfig);
        if (linkRow) card.appendChild(linkRow);

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
                border:1px solid rgba(255,255,255,0.08);
                border-radius:12px;
                padding:7px 9px;
                flex:1; min-width:0;
                display:flex; flex-direction:column; align-items:center; gap:3px;
            `;
            const pl = 'color:#8e8e93;font-size:9.5px;font-weight:500;letter-spacing:0.2px;';
            const dh = (deltaHrs != null)
                ? '<div style="font-size:11px;font-weight:600;color:' + (deltaHrs >= 0 ? '#30d158' : '#ff453a') + ';">\u0394 ' + fmtDelta(deltaHrs) + ' hrs</div>'
                : '';
            card.innerHTML = `
                <div style="color:#aeaeb2;font-weight:500;font-size:12px;">${proc.displayName}</div>
                <div style="color:${th.accent};font-weight:700;font-size:20px;line-height:1.05;letter-spacing:-0.5px;">${displayPct != null ? Math.round(displayPct)+'%' : '\u2014'}</div>
                <div style="width:100%;height:2px;background:rgba(255,255,255,0.10);border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${barW}%;background:${th.border};border-radius:2px;transition:width .4s ease;"></div>
                </div>
                <div style="font-size:12px;white-space:nowrap;">
                    <span style="${pl}">Rate / ${customTarget != null ? 'Target' : 'Plan'}&nbsp;</span><span style="color:${th.accent};font-weight:600;">${fmtRound(displayRate)}</span><span style="color:#636366;"> / </span><span style="color:#aeaeb2;font-weight:500;">${fmtRound(displayPlan)}</span>
                </div>
                ${dh}
            `;

        } else {
            card.style.cssText = `
                background:${T.pna.bg};border:1px solid rgba(255,255,255,0.06);border-radius:12px;
                padding:7px 9px;flex:1;min-width:0;
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
            `;
            card.innerHTML = `
                <div style="color:#aeaeb2;font-weight:500;font-size:12px;">${proc.displayName}</div>
                <div style="color:#636366;font-size:9px;">sin datos</div>
            `;
        }
        return card;
    }

    function exportToCSV(){
        const now=new Date(), ts=now.toISOString().slice(0,19).replace(/[T:]/g,'-');
        const rows=['OB FCLM Report - '+now.toLocaleString(),'','Warehouse,Seccion,Proceso,Volume,Rate,Plan Rate,% to Plan,Delta Hrs'];
        [TLC1_CONFIG,QYY7_CONFIG].forEach(wc=>{
            const mm=metricsStore[wc.id].main, pm=metricsStore[wc.id].productivity;
            rows.push('',`===== ${wc.id} =====`);
            wc.sections.forEach(sec=>{
                rows.push('--- '+sec.name.replace('OUTBOUND2','OUTBOUND')+' '+wc.id+' ---');
                sec.processes.forEach(pn=>{
                    const m=mm.find(x=>x.name===pn), dn=DISPLAY_NAMES[pn]||pn;
                    if(m){
                        let vol = m.volume;
                        let extraCols = '';
                        if(m.casesVolume != null && m.originalVolume != null){
                            extraCols = ',' + m.casesVolume + ',' + m.originalVolume;
                        }
                        rows.push([wc.id,sec.name.replace('OUTBOUND2','OUTBOUND'),dn,vol||'',m.actualRate||'',m.planRate||'',m.percentToPlan!=null?m.percentToPlan+'%':'',m.deltaToPlanHrs||''].join(','));
                    }
                    else rows.push([wc.id,sec.name.replace('OUTBOUND2','OUTBOUND'),dn,'','','','',''].join(','));
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
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`OB_FCLM_${ts}.csv`; a.click();
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
            width:40px;height:40px;
            background:rgba(0,0,0,0.88);
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,0.12);
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            cursor:grab;
            box-shadow:0 6px 20px rgba(0,0,0,0.4);
            font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;
            user-select:none;
            transition:transform .2s ease, box-shadow .2s ease;
        `;
        pill.innerHTML = `<span style="font-size:11px;font-weight:700;color:#f5f5f7;letter-spacing:0.3px;">OB</span>`;
        pill.classList.add('appearing');
        setTimeout(()=> pill.classList.remove('appearing'), 350);

        pill.addEventListener('mouseenter',()=>{
            pill.style.transform='scale(1.15)';
            pill.style.boxShadow='0 8px 26px rgba(0,0,0,0.55)';
        });
        pill.addEventListener('mouseleave',()=>{
            pill.style.transform='scale(1)';
            pill.style.boxShadow='0 6px 20px rgba(0,0,0,0.4)';
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
        const _prevBanner=document.getElementById('fclm-banner');
        window._fclmRedraw=!!_prevBanner;
        _prevBanner?.remove();
        document.getElementById('fclm-pill')?.remove();
        injectStyles();
        if (isMinimized) { createMinPill(); return; }

        const banner = document.createElement('div');
        banner.id = 'fclm-banner';
        banner.style.cssText = `
            position:fixed;top:0;left:0;right:0;z-index:99999;
            background:rgba(0,0,0,0.92);
            backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);
            display:flex;flex-direction:column;
            box-shadow:0 8px 30px rgba(0,0,0,0.35);
            border-bottom:1px solid rgba(255,255,255,0.08);
            font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Inter,Roboto,sans-serif;
            color:#f5f5f7;
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
            padding:6px 14px;
            background:transparent;
            border-bottom:1px solid rgba(255,255,255,0.06);
            cursor:default;
        `;
        const iconBtn = 'width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:none;border-radius:50%;color:#f5f5f7;font-size:12px;cursor:pointer;transition:background .15s ease;';
        titleBar.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#f5f5f7;font-weight:600;font-size:12px;letter-spacing:-0.1px;">OB FCLM Report</span>
                <span style="color:#636366;font-size:10px;font-weight:500;">v${SCRIPT_VERSION}</span>
                <span id="fclm-version-status-btn" style="
                    font-size:10px;font-weight:500;
                    padding:2px 10px;border-radius:980px;
                    background:rgba(255,255,255,0.08);border:none;
                    color:#8e8e93;cursor:default;
                    transition:all .2s ease;
                ">Verificando…</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span id="fclm-ar-chip" style="font-size:10px;font-weight:600;padding:2px 10px;border-radius:980px;background:rgba(255,255,255,0.08);color:#8e8e93;cursor:pointer;white-space:nowrap;transition:background .15s ease;user-select:none;">\u21BB \u2026</span>
                <span style="color:#8e8e93;font-size:10px;font-weight:500;">${dateStr} · ${timeStr}</span>
                <div id="fclm-settings-btn" title="Configuración de JPH/UPH" style="${iconBtn}">\u2699\uFE0F</div>
                <div id="fclm-min-btn" title="Minimizar" style="${iconBtn}font-size:14px;font-weight:600;line-height:1;">\u2212</div>
            </div>
        `;
        banner.appendChild(titleBar);

        const contentWrap = document.createElement('div');
        contentWrap.id = 'fclm-content-wrap';
        contentWrap.style.cssText = 'padding:8px 12px 8px 12px;display:flex;flex-direction:column;gap:8px;overflow:visible;';

        [TLC1_CONFIG, QYY7_CONFIG].forEach((wc, wi) => {
            const mm = metricsStore[wc.id].main;
            const pm = metricsStore[wc.id].productivity;

            const whBlock = document.createElement('div');
            whBlock.style.cssText = 'display:flex;align-items:stretch;gap:10px;';

            const badge = document.createElement('div');
            badge.style.cssText = `
                display:flex;align-items:center;justify-content:center;
                width:22px;min-width:22px;flex-shrink:0;
                background:transparent;border-radius:8px;
                color:#f5f5f7;font-weight:700;font-size:10px;
                letter-spacing:1.5px;writing-mode:vertical-rl;transform:rotate(180deg);
                border-right:2px solid ${wc.color};padding-right:4px;
            `;
            badge.textContent = wc.id;
            whBlock.appendChild(badge);

            const secPanel = document.createElement('div');
            secPanel.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;';

            wc.sections.forEach((sec, si) => {
                const secRow = document.createElement('div');
                secRow.style.cssText = 'display:flex;flex-wrap:nowrap;align-items:stretch;gap:6px;flex:1;min-width:0;';

                sec.processes.forEach(pn => {
                    const m = mm.find(x => x.name === pn);
                    const isCase = wc.casesBlocks.includes(pn);
                    secRow.appendChild(makeProcessCard(m, pn, isCase, wc));
                });
                secPanel.appendChild(secRow);
                if (si === 0) {
                    const div = document.createElement('div');
                    div.style.cssText = 'display:none;';
                    secPanel.appendChild(div);
                }
            });

            whBlock.appendChild(secPanel);

            const vSep = document.createElement('div');
            vSep.style.cssText = 'width:1px;flex-shrink:0;align-self:stretch;background:rgba(255,255,255,0.07);margin:2px 0;';
            whBlock.appendChild(vSep);

            const prodPanel = document.createElement('div');
            prodPanel.style.cssText = 'display:flex;flex-direction:column;gap:5px;flex-shrink:0;width:280px;justify-content:center;';
            const prodTitle = document.createElement('div');
            prodTitle.style.cssText = `color:#8e8e93;font-size:9px;font-weight:600;letter-spacing:0.6px;text-align:left;text-transform:uppercase;`;
            prodTitle.textContent = wc.productivity.name;
            prodPanel.appendChild(prodTitle);
            const prodRow = document.createElement('div');
            prodRow.style.cssText = 'display:flex;gap:6px;flex:1;';
            wc.productivity.processes.forEach(proc => {
                const m = pm.find(x => x.key === 'RC_' + proc.name);
                let dHrs = (m && m.deltaToPlanHrs != null && wc.rcSummaryTargets) ? m.deltaToPlanHrs : null;
                if (dHrs == null && wc.deltaHrsMap && wc.deltaHrsMap[proc.name]) {
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
            if (wc.id === 'TLC1') {
                const pr = mm.find(x => x.name === 'Pallet Receive');
                const pallets = pr ? pr.volume : null;
                const units = (pr && pr.originalVolume != null) ? pr.originalVolume : null;
                const lb = 'color:#8e8e93;font-size:9.5px;font-weight:500;letter-spacing:0.2px;';
                const vl = 'color:#f5f5f7;font-weight:600;font-size:15px;line-height:1.1;';
                const pc = document.createElement('div');
                pc.className = 'fclm-card';
                pc.id = 'fclm-pallet-info';
                pc.style.cssText = 'align-self:center;width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:6px 10px;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;';
                pc.innerHTML = '<div style="color:#aeaeb2;font-weight:500;font-size:12px;">Pallet Receive</div>'
                    + '<div style="display:flex;gap:14px;align-items:flex-end;">'
                    + '<div style="text-align:center;"><div style="' + vl + '">' + fmt(pallets) + '</div><div style="' + lb + '">Pallets</div></div>'
                    + '<div style="text-align:center;"><div style="' + vl + '">' + fmt(units) + '</div><div style="' + lb + '">Units</div></div>'
                    + '</div>';
                prodPanel.appendChild(pc);
            }

            if (wc.id === 'QYY7') {
                const av = document.createElement('div');
                av.id = 'fclm-avery-info';
                av.className = 'fclm-card';
                av.style.cssText = 'align-self:center;width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:6px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;';
                const ttl = document.createElement('div');
                ttl.style.cssText = 'color:#aeaeb2;font-weight:500;font-size:12px;';
                ttl.textContent = 'AVERY';
                av.appendChild(ttl);
                const btnRow = document.createElement('div');
                btnRow.style.cssText = 'display:flex;gap:6px;width:100%;';
                [
                    { ico: '\uD83D\uDCCA', txt: 'Dashboard', url: 'https://routing-dashboard-tlc1.beta.harmony.a2z.com/' },
                    { ico: '\uD83D\uDD00', txt: 'Routing', url: 'https://routing-tool-iad.aka.amazon.com/tote-route?jobName=CheckDestination' }
                ].forEach(function(b) {
                    const a = document.createElement('a');
                    a.href = b.url; a.target = '_blank'; a.rel = 'noopener';
                    a.innerHTML = '<span style="font-size:12px;">' + b.ico + '</span><span>' + b.txt + '</span>';
                    a.style.cssText = 'flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;border-radius:980px;background:rgba(255,255,255,0.08);color:#f5f5f7;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap;transition:background .15s ease,color .15s ease;';
                    a.addEventListener('mouseenter', function() { a.style.background = '#0a84ff'; a.style.color = '#ffffff'; });
                    a.addEventListener('mouseleave', function() { a.style.background = 'rgba(255,255,255,0.08)'; a.style.color = '#f5f5f7'; });
                    btnRow.appendChild(a);
                });
                av.appendChild(btnRow);
                prodPanel.appendChild(av);
            }

            whBlock.appendChild(prodPanel);
            contentWrap.appendChild(whBlock);

            if (wi === 0) {
                const hSep = document.createElement('div');
                hSep.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.07);margin:0 4px;';
                contentWrap.appendChild(hSep);
            }
        });

        const footerRow = document.createElement('div');
        footerRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;flex:1;flex-wrap:wrap;';
        const footerBtnStyle = 'background:rgba(255,255,255,0.07);border:none;color:#f5f5f7;border-radius:980px;padding:6px 14px;cursor:pointer;font-size:11px;font-weight:500;font-family:inherit;white-space:nowrap;';
        function addHover(b){ b.className='fclm-btn'; b.addEventListener('mouseenter',()=>{b.style.background='#0a84ff';b.style.color='#ffffff';}); b.addEventListener('mouseleave',()=>{b.style.background='rgba(255,255,255,0.07)';b.style.color='#f5f5f7';}); }
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
        footerRow.appendChild(mkBtn('\uD83D\uDCAC Engage','https://atoz.amazon.work/engage/conversation-hub?f=NrBEHkDkH0AUCUCiBZAkgZUaANAb1AG4CGANgK4CmoAXKAC4BOloAvgLptA'));
        footerRow.appendChild(mkBtn('\uD83D\uDD27 Troubleshoot','https://trans-logistics.amazon.com/sortcenter/tantei?nodeId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDD00 Transfers','https://fclm-portal.amazon.com/laborTransfer/schedule?&warehouseId=TLC1'));
        footerRow.appendChild(mkBtn('\uD83D\uDD0D FC Research','https://qi-fcresearch-na.corp.amazon.com/TLC1/results?s='));
        footerRow.appendChild(mkBtn('\uD83D\uDCF1 Escanear','https://fcmenu-iad-regionalized.corp.amazon.com/TLC1/laborTrackingKiosk'));
        footerRow.appendChild(mkBtn('\uD83E\uDDFE ASIN Profile','https://rno-tools.corp.amazon.com/kiosk/asin_profile/?fc=TLC1'));


        // Botones Avance al Plan / Performance (integrados)
        const footerWrap = document.createElement('div');
        footerWrap.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px;padding-top:2px;width:100%;';
        footerWrap.appendChild(ptButton('avance', '\uD83D\uDCC8', 'Avance al Plan'));
        footerWrap.appendChild(ptButton('perf', '\u26A1', 'Performance'));
        footerWrap.appendChild(footerRow);

        // Botón grande TLC1 Flow (esquina inferior derecha del footer)
        const flowBtn = document.createElement('button');
        flowBtn.id = 'fclm-flow-btn';
        flowBtn.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:rgba(255,255,255,0.14);font-size:13px;">\uD83D\uDD04</span><span>TLC1 Flow</span>';
        flowBtn.style.cssText = 'display:inline-flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0;background:rgba(255,255,255,0.07);border:1px solid rgba(10,132,255,0.55);color:#f5f5f7;border-radius:980px;padding:8px 20px 8px 8px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;white-space:nowrap;transition:background .18s ease,color .18s ease,transform .18s ease,box-shadow .18s ease;';
        flowBtn.addEventListener('mouseenter', () => { flowBtn.style.background = '#0a84ff'; flowBtn.style.color = '#ffffff'; flowBtn.style.transform = 'translateY(-1px)'; flowBtn.style.boxShadow = '0 8px 20px rgba(10,132,255,0.40)'; });
        flowBtn.addEventListener('mouseleave', () => { flowBtn.style.background = 'rgba(255,255,255,0.07)'; flowBtn.style.color = '#f5f5f7'; flowBtn.style.transform = 'none'; flowBtn.style.boxShadow = 'none'; });
        flowBtn.addEventListener('click', () => { window.open('https://tlc1-flow.beta.harmony.a2z.com/?sitio=TLC1', '_blank'); });
        footerWrap.appendChild(flowBtn);

        contentWrap.appendChild(footerWrap);
        banner.appendChild(contentWrap);

        // Minimize button in title bar
        // Settings button
        const settingsBtn = banner.querySelector('#fclm-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('mouseenter', () => { settingsBtn.style.background='#0a84ff'; });
            settingsBtn.addEventListener('mouseleave', () => { settingsBtn.style.background='rgba(255,255,255,0.08)'; });
            settingsBtn.addEventListener('click', () => { openSettingsPanel(); });
        }

        const minBtn = banner.querySelector('#fclm-min-btn');
        if (minBtn) {
            minBtn.addEventListener('mouseenter', () => { minBtn.style.background='#0a84ff'; });
            minBtn.addEventListener('mouseleave', () => { minBtn.style.background='rgba(255,255,255,0.08)'; });
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


        const arChip = document.getElementById('fclm-ar-chip');
        if (arChip) {
            arChip.addEventListener('mouseenter', () => { arChip.style.background = 'rgba(10,132,255,0.35)'; });
            arChip.addEventListener('mouseleave', () => { arChip.style.background = 'rgba(255,255,255,0.08)'; });
            arChip.addEventListener('click', arToggle);
            arUpdateLabel();
        }
        ptSyncButtons();
        const ptp = document.getElementById('ob-pt-panel');
        if (ptp && ptView) ptPlace(ptp);
        const versionBtn = document.getElementById('fclm-version-status-btn');
        if (versionBtn) checkVersionStatus(versionBtn);
    }

    // Firma del contenido de FCLM (sin los elementos del tamper) para detectar cambios reales
    function pageSignature(){
        let txt='';
        document.querySelectorAll('table').forEach(t=>{ if(!t.closest('#fclm-banner,#ob-pt-panel,#fclm-settings-overlay,#fclm-plan-editor')) txt+=t.textContent.length+'|'+t.textContent.slice(0,400); });
        return txt;
    }
    // ============= AUTO-REFRESH GLOBAL (banner + panel) =============
    const AR_KEY = 'obfclm_autorefresh';           // { on: true|false, minutes: n }
    const AR_DEFAULT = { on: true, minutes: 5 };
    function arLoad() {
        try {
            const v = JSON.parse(localStorage.getItem(AR_KEY) || 'null');
            const m = v && Number(v.minutes);
            return { on: v ? v.on !== false : AR_DEFAULT.on, minutes: (m >= 1 && m <= 240) ? Math.round(m) : AR_DEFAULT.minutes };
        } catch (e) { return { on: AR_DEFAULT.on, minutes: AR_DEFAULT.minutes }; }
    }
    function arSave(cfg) { try { localStorage.setItem(AR_KEY, JSON.stringify({ on: !!cfg.on, minutes: cfg.minutes })); } catch (e) {} }
    let arTimer = null, arNext = 0, arTick = null;
    function arFmt(sec) { const m = Math.floor(sec / 60), s2 = sec % 60; return m + ':' + String(s2).padStart(2, '0'); }
    function arUpdateLabel() {
        const el = document.getElementById('fclm-ar-chip'); if (!el) return;
        const cfg = arLoad();
        if (!cfg.on) { el.textContent = '\u23F8 Auto-refresh apagado'; el.style.color = '#8e8e93'; el.title = 'Clic para encender'; return; }
        const left = Math.max(0, Math.round((arNext - Date.now()) / 1000));
        el.textContent = '\u21BB ' + arFmt(left) + ' \u00B7 cada ' + cfg.minutes + ' min';
        el.style.color = '#30d158'; el.title = 'Clic para apagar';
    }
    function arRunNow() {
        initBanner();                                  // banner + productividad (solo se redibuja si cambian los datos)
        if (typeof ptView !== 'undefined' && ptView && !ptEditing) ptRefresh();   // panel Avance/Performance si está abierto
    }
    function arStart() {
        if (arTimer) { clearInterval(arTimer); arTimer = null; }
        if (arTick) { clearInterval(arTick); arTick = null; }
        const cfg = arLoad();
        if (cfg.on) {
            arNext = Date.now() + cfg.minutes * 60000;
            arTimer = setInterval(function() { arNext = Date.now() + cfg.minutes * 60000; arRunNow(); }, cfg.minutes * 60000);
        }
        arTick = setInterval(arUpdateLabel, 1000);
        arUpdateLabel();
    }
    function arToggle() { const c = arLoad(); c.on = !c.on; arSave(c); arStart(); }

    let _bannerBusy=false, _lastDataSig='';
    function initBanner(force){
        if(_bannerBusy)return;
        _bannerBusy=true;
        loadAllMetrics().then(()=>{
            const sig=JSON.stringify(metricsStore)+'|'+isMinimized;
            const existe=document.getElementById('fclm-banner')||document.getElementById('fclm-pill');
            if(force===true||!existe||sig!==_lastDataSig){ _lastDataSig=sig; createBanner(); }
        }).finally(()=>{ _bannerBusy=false; });
    }

    function waitForData(){
        let att=0;
        const iv=setInterval(()=>{
            att++;
            const t=document.body.textContent||'';
            if(t.includes('Transfer Out')||t.includes('Manual Sort')||t.includes('RC Summary')||att>=30){
                clearInterval(iv); setTimeout(initBanner,1000);
            }
        },1000);
    }
    waitForData();

    // Ignora cambios hechos por el propio tamper (banner, píldora, panel, modales, estilos) para evitar el ciclo de redibujo
    const OWN_IDS=['fclm-banner','fclm-pill','ob-pt-panel','obpt-styles','fclm-settings-overlay','fclm-plan-editor','fclm-update-banner'];
    const isOwnNode=(n)=>{
        let el=n&&n.nodeType===1?n:(n&&n.parentElement);
        while(el){ if(el.id&&(OWN_IDS.includes(el.id)||el.id.indexOf('fclm-')===0||el.id.indexOf('obpt')===0||el.id.indexOf('ob-pt')===0))return true; el=el.parentElement; }
        return false;
    };
    const obs=new MutationObserver((muts)=>{
        const externo=muts.some(m=>{
            if(isOwnNode(m.target)&&m.target!==document.body&&m.target!==document.head)return false;
            const nodos=[...m.addedNodes,...m.removedNodes];
            if(!nodos.length)return !isOwnNode(m.target);
            return nodos.some(n=>!isOwnNode(n)&&!(n.nodeType===1&&(n.tagName==='STYLE'||n.tagName==='SCRIPT')));
        });
        if(!externo)return;
        const firma=pageSignature();
        if(firma===window._fclmPageSig)return;
        window._fclmPageSig=firma;
        clearTimeout(window._fclmT);
        window._fclmT=setTimeout(()=>{
            const t=document.body.textContent||'';
            if(t.includes('Transfer Out')||t.includes('Manual Sort')||t.includes('RC Summary'))initBanner();
        },3000);
    });
    obs.observe(document.body,{childList:true,subtree:true});

    let lastURL=window.location.href;
    setInterval(()=>{ if(window.location.href!==lastURL){lastURL=window.location.href; initBanner();} },2000);





    // ═══════════════════════════════════════════════════════════════
    //  AVANCE AL PLAN + PERFORMANCE  (integrado desde "FCLM Plan Tracker" v4.2 de varxjos)
    // ═══════════════════════════════════════════════════════════════
    const PT = {
        timezone: 'America/Mexico_City',
        refreshIntervals: [5, 10, 15, 30],
        defaultRefreshMin: 15,
        semaforo: { verde: 95, amarillo: 85 },
        turnos: {
            night: { nombre: 'Night Shift', inicio: { h: 19, m: 0 }, fin: { h: 5, m: 30, nextDay: true }, horasBrutas: 10.5,
                breaks: [ { inicio: { h: 23, m: 30 }, fin: { h: 0, m: 0, nextDay: true }, nombre: 'Break 1' },
                          { inicio: { h: 3, m: 0 },   fin: { h: 3, m: 30 }, nombre: 'Break 2' } ] },
            day:   { nombre: 'Day Shift', inicio: { h: 7, m: 0 }, fin: { h: 19, m: 0 }, horasBrutas: 12.0,
                breaks: [ { inicio: { h: 10, m: 30 }, fin: { h: 11, m: 0 }, nombre: 'Break 1' },
                          { inicio: { h: 15, m: 0 },  fin: { h: 15, m: 30 }, nombre: 'Break 2' } ] }
        },
        nodos: {
            TLC1: { nombre: 'TLC1', flujos: [
                { id: 'recibo', label: 'Recibo', buscar: [{ texto: 'Receive - Total', operacion: 'single' }] },
                { id: 'sort', label: 'Sort', buscar: [{ texto: 'Manual Sort -Total', operacion: 'single' }] },
                { id: 'dock_tlc1', label: 'Dock TLC1', buscar: [{ texto: 'Transfer Out - Total', operacion: 'single' }] }
            ]},
            QYY7: { nombre: 'QYY7', flujos: [
                { id: 'stow', label: 'Stow', unidad: 'cases', buscar: [{ texto: 'Case Stow to Reserve', operacion: 'sum' }, { texto: 'Case Transfer In', operacion: 'sum' }] },
                { id: 'pick', label: 'Pick', unidad: 'cases', usarFunctionRollup: true, processId: '01003065' },
                { id: 'dock_qyy7', label: 'Dock QYY7', unidad: 'cases', usarFunctionRollup: true, processId: '01785143645486' }
            ]}
        }
    };
    const PT_KEY_PLAN = 'obpt_plan', PT_KEY_CFG = 'obpt_config';
    const ptPad = function(n) { return String(n).padStart(2, '0'); };

    // ---------- almacenamiento (localStorage, sin permisos GM) ----------
    function ptLoad(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
    function ptSave(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
    function ptCargarPlan() { return ptLoad(PT_KEY_PLAN, {}); }
    function ptCargarConfig() {
        const cfg = Object.assign({ refreshMinutes: PT.defaultRefreshMin, breaks: null, turnoManual: false, manualTurnoTipo: 'day',
                                    manualInicio: '', manualFin: '', semaforoVerde: 95, semaforoAmarillo: 85 }, ptLoad(PT_KEY_CFG, {}));
        if (cfg.breaks) { ['night', 'day'].forEach(function(k) { if (cfg.breaks[k]) PT.turnos[k].breaks = cfg.breaks[k]; }); }
        PT.semaforo.verde = Number(cfg.semaforoVerde) || 95;
        PT.semaforo.amarillo = Number(cfg.semaforoAmarillo) || 85;
        return cfg;
    }

    // ---------- tiempo ----------
    function ptAhora() { return new Date(new Date().toLocaleString('en-US', { timeZone: PT.timezone })); }
    function ptFecha(d) { const dt = d || ptAhora(); return dt.getFullYear() + '-' + ptPad(dt.getMonth() + 1) + '-' + ptPad(dt.getDate()); }
    function ptSumarDias(fecha, dias) { const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + dias); return ptFecha(d); }
    function ptHM(f, h, m) { return new Date(f + 'T' + ptPad(h) + ':' + ptPad(m) + ':00'); }

    function ptTurnoManual() {
        const cfg = ptCargarConfig();
        if (!cfg.turnoManual || !cfg.manualInicio || !cfg.manualFin) return { activo: false };
        const inicio = new Date(cfg.manualInicio), fin = new Date(cfg.manualFin);
        if (isNaN(inicio) || isNaN(fin) || fin <= inicio) return { activo: false };
        return { activo: true, tipo: cfg.manualTurnoTipo === 'night' ? 'night' : 'day', inicio: inicio, fin: fin };
    }
    function ptDetectarTurno() {
        const man = ptTurnoManual(); if (man.activo) return man.tipo;
        const a = ptAhora(), min = a.getHours() * 60 + a.getMinutes();
        if (min >= 19 * 60 || min <= 5 * 60 + 29) return 'night';
        if (min >= 7 * 60 && min <= 18 * 60 + 59) return 'day';
        return null;
    }
    function ptBreakActual(tk) {
        if (!tk) return null;
        const a = ptAhora(), min = a.getHours() * 60 + a.getMinutes();
        for (const b of PT.turnos[tk].breaks) {
            const ini = b.inicio.h * 60 + b.inicio.m; let fin = b.fin.h * 60 + b.fin.m;
            if (fin === 0 || b.fin.nextDay) fin = 24 * 60;
            if (min >= ini && min < fin) return b;
        }
        return null;
    }
    function ptBreakEnRango(tk, rIni, rFin) {
        const t = PT.turnos[tk]; if (!t) return 0;
        const base = ptFecha(rIni), man = ptSumarDias(base, 1); let total = 0;
        for (const b of t.breaks) {
            const bIni = ptHM(base, b.inicio.h, b.inicio.m);
            const bFin = (b.fin.nextDay || b.fin.h === 0) ? ptHM(man, b.fin.h, b.fin.m) : ptHM(base, b.fin.h, b.fin.m);
            const i = Math.max(bIni.getTime(), rIni.getTime()), f = Math.min(bFin.getTime(), rFin.getTime());
            if (f > i) total += (f - i) / 60000;
        }
        return total;
    }
    function ptHorasTotales(tk) {
        const man = ptTurnoManual();
        if (man.activo) return Math.max(0, ((man.fin - man.inicio) / 60000 - ptBreakEnRango(man.tipo, man.inicio, man.fin)) / 60);
        const t = PT.turnos[tk]; if (!t) return 0; let brk = 0;
        t.breaks.forEach(function(b) { const i = b.inicio.h * 60 + b.inicio.m; let f = b.fin.h * 60 + b.fin.m; if (f === 0 || b.fin.nextDay) f = 24 * 60; brk += f - i; });
        return (t.horasBrutas * 60 - brk) / 60;
    }
    function ptTranscurrido(tk) {
        const man = ptTurnoManual();
        if (man.activo) {
            const tope = Math.min(ptAhora().getTime(), man.fin.getTime());
            if (tope <= man.inicio.getTime()) return 0;
            const rFin = new Date(tope);
            return Math.max(0, ((rFin - man.inicio) / 60000 - ptBreakEnRango(man.tipo, man.inicio, rFin)) / 60);
        }
        const t = PT.turnos[tk]; if (!t) return 0;
        const ahora = ptAhora(), hoy = ptFecha(ahora), manana = ptSumarDias(hoy, 1);
        const tIni = ptHM(hoy, t.inicio.h, t.inicio.m);
        const ahoraNorm = new Date(ahora.getTime());
        if (ahoraNorm < tIni) ahoraNorm.setDate(ahoraNorm.getDate() + 1);
        const minTrans = Math.floor((ahoraNorm - tIni) / 60000);
        if (minTrans < 0) return 0;
        let pasados = 0;
        for (const b of t.breaks) {
            const bIni = ptHM(hoy, b.inicio.h, b.inicio.m);
            const bFin = (b.fin.nextDay || b.fin.h === 0) ? ptHM(manana, b.fin.h, b.fin.m) : ptHM(hoy, b.fin.h, b.fin.m);
            if (ahoraNorm >= bFin) pasados += (bFin - bIni) / 60000;
            else if (ahoraNorm >= bIni) pasados += (ahoraNorm - bIni) / 60000;
        }
        return Math.max(0, (minTrans - pasados) / 60);
    }
    function ptHoras(h) { const hh = Math.floor(h); return hh + 'h ' + Math.round((h - hh) * 60) + 'min'; }
    function ptFechaInicioTurno(tk) {
        const a = ptAhora(), min = a.getHours() * 60 + a.getMinutes();
        if (tk === 'night' && min < 7 * 60) { const ay = new Date(a); ay.setDate(ay.getDate() - 1); return ptFecha(ay); }
        return ptFecha(a);
    }
    function ptRango(tk) {
        const man = ptTurnoManual();
        if (man.activo) return { sD: ptFecha(man.inicio), sH: man.inicio.getHours(), sM: man.inicio.getMinutes(), eD: ptFecha(man.fin), eH: man.fin.getHours(), eM: man.fin.getMinutes() };
        const t = PT.turnos[tk], sD = ptFechaInicioTurno(tk);
        return { sD: sD, sH: t.inicio.h, sM: t.inicio.m, eD: t.fin.nextDay ? ptSumarDias(sD, 1) : sD, eH: t.fin.h, eM: t.fin.m };
    }
    function ptRangoQS(r) {
        return '&maxIntradayDays=1&spanType=Intraday&startDateIntraday=' + r.sD + '&startHourIntraday=' + r.sH + '&startMinuteIntraday=' + r.sM +
               '&endDateIntraday=' + r.eD + '&endHourIntraday=' + r.eH + '&endMinuteIntraday=' + r.eM;
    }
    function ptURL(wh, tk) {
        return 'https://fclm-portal.amazon.com/reports/processPathRollup?reportFormat=HTML&warehouseId=' + wh + ptRangoQS(ptRango(tk)) +
               '&_adjustPlanHours=on&_hideEmptyLineItems=on&_rememberViewForWarehouse=on&employmentType=AllEmployees';
    }
    function ptURLFR(wh, pid, tk) {
        return 'https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=' + wh + '&processId=' + pid + ptRangoQS(ptRango(tk));
    }
    function ptURL4h(wh) {
        const a = ptAhora(), h = a.getHours(), m = a.getMinutes(), min = h * 60 + m; let r;
        if (min >= 330 && min < 420) r = { sD: ptFecha(a), eD: ptFecha(a), sH: 1, sM: 30, eH: 5, eM: 30 };
        else if (min >= 420 && min < 660) { const ay = new Date(a); ay.setDate(ay.getDate() - 1); r = { sD: ptFecha(ay), eD: ptFecha(a), sH: 1, sM: 30, eH: 5, eM: 30 }; }
        else if (min >= 1140 && min < 1380) r = { sD: ptFecha(a), eD: ptFecha(a), sH: 15, sM: 0, eH: 19, eM: 0 };
        else { const h4 = new Date(a.getTime() - 4 * 3600000); r = { sD: ptFecha(h4), eD: ptFecha(a), sH: h4.getHours(), sM: h4.getMinutes(), eH: h, eM: m }; }
        return 'https://fclm-portal.amazon.com/reports/processPathRollup?reportFormat=HTML&warehouseId=' + wh + ptRangoQS(r) +
               '&_adjustPlanHours=on&_hideEmptyLineItems=on&_rememberViewForWarehouse=on&employmentType=AllEmployees';
    }

    // ---------- extracción ----------
    function ptFetch(url) {
        return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now(), { credentials: 'include', cache: 'no-store' }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
    }
    function ptParsePPR(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html'), res = {};
        const limpiar = function(s) { return s.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim(); };
        doc.querySelectorAll('tr').forEach(function(fila) {
            const nc = fila.querySelector('td.lineItemName'), vc = fila.querySelector('td.actualVolume');
            if (!nc || !vc) return;
            const link = nc.querySelector('a');
            const nombre = link ? limpiar(link.textContent) : limpiar(nc.textContent.split('\n')[0]);
            const vol = parseFloat(vc.textContent.trim().replace(/,/g, ''));
            const uc = fila.querySelector('td.actualProductivity');
            const uph = uc ? parseFloat(uc.textContent.trim().replace(/,/g, '')) : 0;
            if (nombre && !isNaN(vol) && !(nombre in res)) res[nombre] = { vol: vol, uph: isNaN(uph) ? 0 : uph };
        });
        return res;
    }
    function ptParseFR(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const num = function(s) { const v = parseFloat((s || '').trim().replace(/,/g, '')); return isNaN(v) ? NaN : v; };
        const tr = doc.querySelector('tr.total.empl-all');
        if (tr) {
            const cc = tr.querySelector('td[data-column="21"]'), cu = tr.querySelector('td[data-column="22"]');
            if (cc) { const v = num(cc.textContent), u = cu ? num(cu.textContent) : NaN; if (!isNaN(v) && v > 0) return { vol: v, uph: isNaN(u) ? 0 : u }; }
            const c = tr.querySelectorAll('td');
            if (c.length >= 7) {
                const cv = num(c[5].textContent), cuph = num(c[6].textContent);
                if (!isNaN(cv) && cv > 0) return { vol: cv, uph: isNaN(cuph) ? 0 : cuph };
                const ev = num(c[3].textContent), euph = num(c[4].textContent);
                if (!isNaN(ev) && ev > 0) return { vol: ev, uph: isNaN(euph) ? 0 : euph };
            }
        }
        return { vol: 0, uph: 0 };
    }
    function ptExtraer(tabla, buscar) {
        let vol = 0, uph = 0;
        for (const b of buscar) {
            let e = tabla[b.texto];
            if (e === undefined) {
                const q = b.texto.toLowerCase();
                for (const k of Object.keys(tabla)) { const kl = k.toLowerCase(); if (kl.includes(q) || q.includes(kl)) { e = tabla[k]; break; } }
            }
            const v = e ? e.vol : 0, u = e ? e.uph : 0;
            vol = b.operacion === 'sum' ? vol + (v || 0) : (v || 0);
            if (u > uph) uph = u;
        }
        return { vol: vol, uph: uph };
    }
    async function ptDatosNodo(nk, tk) {
        const nodo = PT.nodos[nk], d = {};
        try {
            const ppr = nodo.flujos.filter(function(f) { return !f.usarFunctionRollup; });
            const fr = nodo.flujos.filter(function(f) { return f.usarFunctionRollup; });
            let tabla = {};
            if (ppr.length) tabla = ptParsePPR(await ptFetch(ptURL(nk, tk)));
            ppr.forEach(function(f) { const r = ptExtraer(tabla, f.buscar); d[f.id] = r.vol; d[f.id + '_uph'] = r.uph; });
            await Promise.all(fr.map(async function(f) {
                try { const r = ptParseFR(await ptFetch(ptURLFR(nk, f.processId, tk))); d[f.id] = r.vol; d[f.id + '_uph'] = r.uph; }
                catch (e) { d[f.id] = null; d[f.id + '_uph'] = 0; }
            }));
            try {
                const t4 = ptParsePPR(await ptFetch(ptURL4h(nk)));
                ppr.forEach(function(f) { const r = ptExtraer(t4, f.buscar); if (r.uph > 0) d[f.id + '_uph'] = r.uph; });
            } catch (e) {}
        } catch (e) { nodo.flujos.forEach(function(f) { d[f.id] = null; }); }
        return d;
    }

    // ---------- cálculos ----------
    function ptAvance(plan, actual, tk, uph) {
        if (!plan || plan <= 0) return {};
        const tot = ptHorasTotales(tk), tr = ptTranscurrido(tk), rest = Math.max(0, tot - tr);
        const ratePlan = plan / tot, esperado = ratePlan * tr, faltante = plan - actual;
        return { esperado: esperado, delta: actual - esperado, pct: actual / plan * 100,
                 pctVsEsperado: esperado > 0 ? actual / esperado * 100 : null,
                 rateRequerido: rest > 0 ? faltante / rest : null, ratePlan: ratePlan,
                 hc: (uph > 0 && rest > 0) ? Math.max(0, Math.ceil(faltante / (uph * rest))) : null };
    }
    function ptSem(p) { if (p === null || p === undefined) return 'n'; if (p >= PT.semaforo.verde) return 'g'; if (p >= PT.semaforo.amarillo) return 'y'; return 'r'; }

    // ---------- performance ----------
    const PT_PERF = {
        thresholds: { red: 90, yellow: 95 },
        nombres: { 'Manual Sort -Total': 'RC Sort - Total', 'DA Bldg to Bldg Transfer TOTAL': 'DA Bldg to Bldg' },
        // Estructura: dos bloques grandes (Inbound / Outbound); cada uno con un nodo por columna
        bloques: [
            { id: 'ib', titulo: 'INBOUND', icono: '\uD83D\uDCE5', color: '#0a84ff', subt: 'Recibo y transferencias de entrada', nodos: [
                { wh: 'TLC1', procesos: ['Each Receive - Total', 'Receive - Total', 'Receive Support', 'IB Problem Solve', 'IB Total'] },
                { wh: 'QYY7', procesos: ['Case Transfer In', 'Transfer In - Total', 'RSR - Total', 'IB Total'] }
            ]},
            { id: 'ob', titulo: 'OUTBOUND', icono: '\uD83D\uDCE4', color: '#ff9f0a', subt: 'Sort, transferencias de salida y dock', nodos: [
                { wh: 'TLC1', procesos: ['Manual Sort -Total', 'Transfer Out - Total', 'Transfer Out Dock', 'DA Bldg to Bldg Transfer TOTAL'] },
                { wh: 'QYY7', procesos: ['Transfer Out Pick - Total', 'TO Palletize', 'Transfer Out Dock', 'DA Bldg to Bldg Transfer TOTAL'] }
            ]}
        ]
    };
    const PT_PERF_SECCIONES = PT_PERF.bloques.reduce(function(acc, b) { b.nodos.forEach(function(n) { acc.push({ wh: n.wh, procesos: n.procesos }); }); return acc; }, []);
    function ptPerfNum(t) { if (!t) return null; const n = parseFloat(t.replace(/[,%$\s]/g, '')); return isNaN(n) ? null : n; }
    function ptPerfEntry(name, v) {
        if (v.length >= 7) return { name: name, actual: v[2], plan: v[3], variance: v[5], pct: v[6] };
        if (v.length >= 4) return { name: name, actual: v[0], plan: v[1], variance: v[2], pct: v[3] };
        if (v.length >= 2) return { name: name, actual: v[0], plan: v[1], variance: 0, pct: v[1] > 0 ? v[0] / v[1] * 100 : 0 };
        return null;
    }
    function ptPerfExtract(html, nombres) {
        const doc = new DOMParser().parseFromString(html, 'text/html'), out = {};
        const norm = function(s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
        const lista = nombres.map(function(n) { return [norm(n), n]; });
        doc.querySelectorAll('tr').forEach(function(fila) {
            const nc = fila.querySelector('td.lineItemName'); if (!nc) return;
            const a = nc.querySelector('a'), txt = norm(a ? a.textContent : nc.textContent);
            const hit = lista.find(function(x) { return x[0] === txt; }); if (!hit || out[hit[1]]) return;
            const vals = [];
            fila.querySelectorAll('td.numeric, td.actualVolume').forEach(function(td) { const v = ptPerfNum(td.textContent); if (v !== null) vals.push(v); });
            if (vals.length >= 2) { const e = ptPerfEntry(hit[1], vals); if (e) out[hit[1]] = e; }
        });
        return out;
    }

    // ---------- estilos ----------
    function ptInjectStyles() {
        if (document.getElementById('obpt-styles')) return;
        const st = document.createElement('style'); st.id = 'obpt-styles';
        st.textContent =
            '#ob-pt-panel *{box-sizing:border-box;-webkit-font-smoothing:antialiased;}' +
            '#ob-pt-panel table{width:100%;border-collapse:separate;border-spacing:0;font-size:11.5px;}' +
            '#ob-pt-panel th{color:#8e8e93;font-weight:500;font-size:10px;text-align:center;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,0.08);}' +
            '#ob-pt-panel th:first-child,#ob-pt-panel td:first-child{text-align:left;}' +
            '#ob-pt-panel td{color:#f5f5f7;text-align:center;padding:5px 6px;border-bottom:1px solid rgba(255,255,255,0.05);white-space:nowrap;font-variant-numeric:tabular-nums;}' +
            '#ob-pt-panel tr:last-child td{border-bottom:none;}' +
            '#ob-pt-panel tbody tr{transition:background .15s ease;} #ob-pt-panel tbody tr:hover{background:rgba(255,255,255,0.04);}' +
            '.obpt-pill{display:inline-block;min-width:58px;padding:2px 8px;border-radius:980px;font-weight:600;font-size:11px;}' +
            '.obpt-g{background:rgba(48,209,88,0.16);color:#30d158;} .obpt-y{background:rgba(255,159,10,0.16);color:#ff9f0a;}' +
            '.obpt-r{background:rgba(255,69,58,0.16);color:#ff453a;} .obpt-n{background:rgba(255,255,255,0.06);color:#8e8e93;}' +
            '.obpt-tg{color:#30d158;} .obpt-tr{color:#ff453a;} .obpt-tn{color:#8e8e93;}' +
            '#ob-pt-panel td.obpt-dg{color:#30d158;font-weight:700;background:rgba(48,209,88,0.12);}' +
            '#ob-pt-panel td.obpt-dr{color:#ff453a;font-weight:700;background:rgba(255,69,58,0.12);}' +
            '#ob-pt-panel td.obpt-dn{color:#8e8e93;}' +
            '.obpt-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:6px 10px;}' +
            '.obpt-node{display:flex;align-items:center;gap:6px;color:#f5f5f7;font-weight:700;font-size:12.5px;margin:2px 0 5px;}' +
            '.obpt-node i{display:inline-block;width:3px;height:12px;border-radius:2px;}' +
            '.obpt-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}' +
            '@media (max-width:820px){.obpt-grid{grid-template-columns:1fr;}}' +
            '.obpt-block{position:relative;border-radius:16px;padding:10px 10px 10px;background:linear-gradient(180deg,color-mix(in srgb,var(--bc) 10%,transparent),rgba(255,255,255,0.02) 60%);border:1px solid color-mix(in srgb,var(--bc) 35%,rgba(255,255,255,0.08));box-shadow:inset 3px 0 0 var(--bc);}' +
            '.obpt-bhead{display:flex;align-items:center;gap:12px;padding:2px 4px 10px;}' +
            '.obpt-bicon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:21px;background:color-mix(in srgb,var(--bc) 22%,transparent);box-shadow:0 6px 18px color-mix(in srgb,var(--bc) 30%,transparent);}' +
            '.obpt-btitle{flex:1;min-width:0;}' +
            '.obpt-bname{font-size:20px;font-weight:800;letter-spacing:1.4px;color:#f5f5f7;line-height:1.1;}' +
            '.obpt-bsub{font-size:11px;color:#8e8e93;margin-top:2px;}' +
            '.obpt-bsum{display:flex;gap:5px;}' +
            '.obpt-bsum .obpt-pill{min-width:26px;padding:3px 8px;text-align:center;}' +
            '.obpt-sep{display:flex;align-items:center;gap:12px;margin:14px 6px;}' +
            '.obpt-sep span{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);}' +
            '.obpt-sep i{font-style:normal;color:#636366;font-size:10px;}' +
            '.obpt-bar{height:3px;border-radius:3px;background:rgba(255,255,255,0.07);margin:4px auto 0;width:58px;overflow:hidden;}' +
            '.obpt-bar b{display:block;height:100%;border-radius:3px;transition:width .5s ease;}' +
            '.obpt-fg{background:#30d158;} .obpt-fy{background:#ff9f0a;} .obpt-fr{background:#ff453a;} .obpt-fn{background:#636366;}' +
            '.obpt-loading{color:#8e8e93;font-size:12px;text-align:center;padding:18px 0;}' +
            '.obpt-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:980px;background:rgba(255,255,255,0.06);color:#aeaeb2;font-size:10.5px;}' +
            '.obpt-shimmer{background:linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.10),rgba(255,255,255,0.04));background-size:200% 100%;animation:obptSh 1.2s ease-in-out infinite;border-radius:8px;height:14px;margin:6px 0;}' +
            '@keyframes obptSh{0%{background-position:200% 0}100%{background-position:-200% 0}}';
        document.head.appendChild(st);
    }

    // ---------- panel flotante con animación ----------
    let ptView = null, ptTimer = null, ptBusy = false, ptEditing = false;
    function ptOpenEditor() {
        const p = document.getElementById('ob-pt-panel'); if (!p) return;
        const body = p.querySelector('#obpt-body');
        ptEditing = true;
        const eb = p.querySelector('#obpt-edit'); if (eb) eb.style.color = '#0a84ff';
        body.style.opacity = '0';
        setTimeout(function() {
            body.innerHTML = '<div id="obpt-editor">' + ptSettingsHTML() +
                '<div style="display:flex;gap:8px;margin-top:6px;">' +
                '<button id="obpt-ed-save" style="flex:1;padding:8px;background:#0a84ff;border:none;border-radius:980px;color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;">Guardar</button>' +
                '<button id="obpt-ed-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.08);border:none;border-radius:980px;color:#f5f5f7;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;">Cancelar</button></div></div>';
            body.dataset.view = 'editor';
            const ed = body.querySelector('#obpt-editor');
            ptBindSettings(ed);
            ['#obpt-ed-save', '#obpt-ed-cancel'].forEach(function(id) {
                const b = ed.querySelector(id);
                b.addEventListener('mouseenter', function() { b.style.background = '#409cff'; b.style.color = '#fff'; });
                b.addEventListener('mouseleave', function() { b.style.background = id === '#obpt-ed-save' ? '#0a84ff' : 'rgba(255,255,255,0.08)'; b.style.color = id === '#obpt-ed-save' ? '#fff' : '#f5f5f7'; });
            });
            ed.querySelector('#obpt-ed-save').addEventListener('click', function() { ptSaveSettings(ed); ptCloseEditor(); });
            ed.querySelector('#obpt-ed-cancel').addEventListener('click', ptCloseEditor);
            body.style.opacity = '1';
        }, 180);
    }
    function ptCloseEditor() {
        ptEditing = false;
        const p = document.getElementById('ob-pt-panel'); if (!p) return;
        const eb = p.querySelector('#obpt-edit'); if (eb) eb.style.color = '#f5f5f7';
        const body = p.querySelector('#obpt-body');
        body.innerHTML = ''; body.dataset.view = '';
        ptRefresh();
    }
    function ptPanel() {
        let p = document.getElementById('ob-pt-panel');
        if (p) return p;
        ptInjectStyles();
        p = document.createElement('div');
        p.id = 'ob-pt-panel';
        p.style.cssText = 'position:fixed;left:12px;width:min(760px,calc(100vw - 24px));z-index:99999;display:none;' +
            'background:rgba(10,10,12,0.94);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);' +
            'border:1px solid rgba(255,255,255,0.10);border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,0.55);color:#f5f5f7;' +
            'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,sans-serif;overflow:hidden;' +
            'transform-origin:top left;will-change:transform,opacity,filter;';
        p.innerHTML =
            '<div id="obpt-head" title="Arrastra para mover \u00B7 doble clic para regresar a su lugar" style="cursor:grab;user-select:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.07);">' +
              '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
                '<span id="obpt-icon" style="width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;background:linear-gradient(135deg,#0a84ff,#5e5ce6);box-shadow:0 4px 14px rgba(10,132,255,0.35);"></span>' +
                '<div style="min-width:0;"><div id="obpt-title" style="font-weight:600;font-size:13.5px;letter-spacing:-0.1px;"></div>' +
                '<div id="obpt-sub" style="color:#8e8e93;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div></div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<button id="obpt-edit" title="Editar plan y opciones" style="width:26px;height:26px;border:none;border-radius:50%;background:rgba(255,255,255,0.08);color:#f5f5f7;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s ease;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>' +
                '<button id="obpt-refresh" title="Actualizar" style="width:26px;height:26px;border:none;border-radius:50%;background:rgba(255,255,255,0.08);color:#f5f5f7;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s ease,transform .45s cubic-bezier(.4,0,.2,1);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg></button>' +
                '<button id="obpt-close" title="Cerrar" style="width:26px;height:26px;border:none;border-radius:50%;background:rgba(255,255,255,0.08);color:#f5f5f7;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background .15s ease;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" style="display:block;"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
              '</div>' +
            '</div>' +
            '<div id="obpt-body" style="padding:10px 12px 12px;overflow:auto;transition:opacity .2s ease;"></div>';
        document.body.appendChild(p);
        const hov = function(b) { b.addEventListener('mouseenter', function() { b.style.background = '#0a84ff'; }); b.addEventListener('mouseleave', function() { b.style.background = 'rgba(255,255,255,0.08)'; }); };
        const rb = p.querySelector('#obpt-refresh'), cb = p.querySelector('#obpt-close'), eb = p.querySelector('#obpt-edit');
        hov(rb); hov(cb); hov(eb);
        eb.addEventListener('click', function() { if (ptEditing) ptCloseEditor(); else ptOpenEditor(); });
        let giro = 0;
        rb.addEventListener('click', function() { giro += 360; rb.style.transform = 'rotate(' + giro + 'deg)'; ptRefresh(); });
        cb.addEventListener('click', ptClose);
        ptEnableDrag(p);
        return p;
    }
    const PT_KEY_POS = 'obpt_pos';
    function ptDefaultPos() {
        const ban = document.getElementById('fclm-banner');
        const r = ban ? ban.getBoundingClientRect() : null;
        return { left: r ? Math.max(8, Math.round(r.left)) : 12, top: r ? Math.round(r.bottom + 8) : 56 };
    }
    function ptClamp(p, pos) {
        const w = p.offsetWidth || 760, maxL = Math.max(0, window.innerWidth - Math.min(w, window.innerWidth) );
        return { left: Math.min(Math.max(0, pos.left), maxL), top: Math.min(Math.max(0, pos.top), Math.max(0, window.innerHeight - 60)) };
    }
    function ptApplyPos(p, pos) {
        p.style.left = pos.left + 'px'; p.style.top = pos.top + 'px'; p.style.right = 'auto';
        p.querySelector('#obpt-body').style.maxHeight = 'calc(100vh - ' + (pos.top + 70) + 'px)';
    }
    function ptPlace(p) {
        const saved = ptLoad(PT_KEY_POS, null);
        ptApplyPos(p, ptClamp(p, saved && typeof saved.left === 'number' ? saved : ptDefaultPos()));
    }
    function ptEnableDrag(p) {
        const head = p.querySelector('#obpt-head');
        let drag = null;
        head.addEventListener('mousedown', function(e) {
            if (e.button !== 0 || e.target.closest('button')) return;
            const r = p.getBoundingClientRect();
            drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
            head.style.cursor = 'grabbing';
            p.style.transition = 'box-shadow .2s ease';
            p.style.boxShadow = '0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(10,132,255,0.45)';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!drag) return;
            ptApplyPos(p, ptClamp(p, { left: e.clientX - drag.dx, top: e.clientY - drag.dy }));
        });
        document.addEventListener('mouseup', function() {
            if (!drag) return;
            drag = null;
            head.style.cursor = 'grab';
            p.style.boxShadow = '0 24px 60px rgba(0,0,0,0.55)';
            document.body.style.userSelect = '';
            ptSave(PT_KEY_POS, { left: parseInt(p.style.left, 10) || 0, top: parseInt(p.style.top, 10) || 0 });
        });
        head.addEventListener('dblclick', function(e) {
            if (e.target.closest('button')) return;
            try { localStorage.removeItem(PT_KEY_POS); } catch (er) {}
            p.style.transition = 'left .35s cubic-bezier(.34,1.56,.64,1), top .35s cubic-bezier(.34,1.56,.64,1)';
            ptApplyPos(p, ptClamp(p, ptDefaultPos()));
        });
        window.addEventListener('resize', function() { if (p.style.display !== 'none') ptPlace(p); });
    }
    function ptOpen(view) {
        const p = ptPanel();
        const body = p.querySelector('#obpt-body');
        ptEditing = false; const _eb = p.querySelector('#obpt-edit'); if (_eb) _eb.style.color = '#f5f5f7';
        const yaAbierto = p.style.display !== 'none' && ptView;
        ptView = view;
        p.querySelector('#obpt-icon').textContent = view === 'perf' ? '\u26A1' : '\uD83D\uDCC8';
        p.querySelector('#obpt-title').textContent = view === 'perf' ? 'Performance' : 'Avance al Plan';
        ptPlace(p);
        if (yaAbierto) {
            body.style.opacity = '0';
            setTimeout(function() { body.innerHTML = ''; body.dataset.view = ''; body.style.opacity = '1'; ptRefresh(); }, 180);
        } else {
            p.style.transition = 'none';
            p.style.display = 'block';
            p.style.opacity = '0';
            p.style.transform = 'translateY(-14px) scale(0.92)';
            p.style.filter = 'blur(8px)';
            void p.offsetWidth;
            p.style.transition = 'opacity .32s ease, transform .5s cubic-bezier(.34,1.56,.64,1), filter .32s ease';
            p.style.opacity = '1';
            p.style.transform = 'translateY(0) scale(1)';
            p.style.filter = 'blur(0)';
            ptRefresh();
            ptStartTimer();
        }
        ptSyncButtons();
    }
    function ptClose() {
        const p = document.getElementById('ob-pt-panel');
        ptView = null;
        ptSyncButtons();
        if (ptTimer) { clearInterval(ptTimer); ptTimer = null; }
        if (!p || p.style.display === 'none') return;
        p.style.transition = 'opacity .22s ease, transform .26s cubic-bezier(.4,0,1,1), filter .22s ease';
        p.style.opacity = '0';
        p.style.transform = 'translateY(-10px) scale(0.95)';
        p.style.filter = 'blur(6px)';
        setTimeout(function() { if (!ptView) p.style.display = 'none'; }, 270);
    }
    function ptToggle(view) { if (ptView === view) ptClose(); else ptOpen(view); }
    function ptStartTimer() { /* el refresco lo maneja el auto-refresh global (arStart) */ }
    function ptSyncButtons() {
        ['avance', 'perf'].forEach(function(v) {
            const b = document.getElementById('obpt-btn-' + v);
            if (!b) return;
            const on = ptView === v;
            b.dataset.on = on ? '1' : '0';
            b.style.background = on ? '#0a84ff' : 'rgba(255,255,255,0.07)';
            b.style.color = on ? '#ffffff' : '#f5f5f7';
            b.style.boxShadow = on ? '0 6px 16px rgba(10,132,255,0.35)' : 'none';
        });
    }
    function ptButton(view, icono, texto) {
        const b = document.createElement('button');
        b.id = 'obpt-btn-' + view;
        b.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:6px;background:rgba(255,255,255,0.10);font-size:11px;">' + icono + '</span><span>' + texto + '</span>';
        b.style.cssText = 'display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.07);border:1px solid rgba(10,132,255,0.45);color:#f5f5f7;border-radius:980px;padding:5px 14px 5px 6px;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:background .18s ease,color .18s ease,transform .18s ease,box-shadow .18s ease;';
        b.addEventListener('mouseenter', function() { b.style.background = '#0a84ff'; b.style.color = '#ffffff'; b.style.transform = 'translateY(-1px)'; b.style.boxShadow = '0 6px 16px rgba(10,132,255,0.35)'; });
        b.addEventListener('mouseleave', function() { b.style.transform = 'none'; ptSyncButtons(); });
        b.addEventListener('click', function() { ptToggle(view); });
        return b;
    }

    // ---------- render ----------
    function ptFmt(n) { return (n === null || n === undefined || isNaN(n)) ? '\u2014' : Math.round(n).toLocaleString('en-US'); }
    function ptFmtD(d) { return (d === null || d === undefined || isNaN(d)) ? '\u2014' : (d >= 0 ? '+' : '') + Math.round(d).toLocaleString('en-US'); }
    function ptLoadingHTML() { return '<div class="obpt-shimmer"></div><div class="obpt-shimmer" style="width:80%"></div><div class="obpt-shimmer" style="width:60%"></div>'; }

    // Cada actualización lleva un número; solo la más reciente pinta resultados (evita mezclar pestañas)
    let ptReqId = 0;
    async function ptRefresh() {
        const p = document.getElementById('ob-pt-panel'); if (!p || !ptView || ptEditing) return;
        const body = p.querySelector('#obpt-body'), sub = p.querySelector('#obpt-sub');
        const rb = p.querySelector('#obpt-refresh');
        const myId = ++ptReqId;
        const view = ptView;
        ptBusy = true;
        if (body.dataset.view !== view || !body.innerHTML) body.innerHTML = ptLoadingHTML();
        else body.style.opacity = '0.45';
        sub.textContent = 'Actualizando\u2026';
        if (rb) { rb.disabled = true; rb.style.opacity = '0.6'; }
        try {
            ptCargarConfig();
            const tkReal = ptDetectarTurno(), tk = tkReal || 'night';
            const html = view === 'perf' ? await ptRenderPerf(tk) : await ptRenderAvance(tk, tkReal);
            if (myId !== ptReqId || ptView !== view || ptEditing) return;
            const hora = ptAhora().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            body.innerHTML = html; body.dataset.view = view;
            const man = ptTurnoManual().activo ? ' \u00B7 Manual' : '';
            sub.textContent = (tkReal ? PT.turnos[tk].nombre : 'Fuera de turno \u00B7 corte Night Shift') + man + ' \u00B7 Actualizado ' + hora;
        } catch (e) {
            if (myId !== ptReqId) return;
            body.innerHTML = '<div class="obpt-loading">No se pudieron obtener los datos (' + (e && e.message ? e.message : 'error') + ').</div>';
            body.dataset.view = '';
            sub.textContent = 'Error al actualizar';
        } finally {
            if (myId === ptReqId) {
                ptBusy = false;
                body.style.opacity = '1';
                if (rb) { rb.disabled = false; rb.style.opacity = '1'; }
            }
        }
    }

    async function ptRenderAvance(tk, tkReal) {
        const plan = ptCargarPlan();
        const datos = { TLC1: await ptDatosNodo('TLC1', tk), QYY7: await ptDatosNodo('QYY7', tk) };
        const tr = ptTranscurrido(tk), rest = Math.max(0, ptHorasTotales(tk) - tr), brk = tkReal ? ptBreakActual(tk) : null;
        let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' +
                '<span class="obpt-chip">\u23F1 Efectivo ' + ptHoras(tr) + '</span>' +
                '<span class="obpt-chip">\u23F3 Restante ' + ptHoras(rest) + '</span>' +
                '<span class="obpt-chip"><span style="color:#30d158;">\u25CF</span> \u2265 ' + PT.semaforo.verde + '% <span style="color:#ff9f0a;margin-left:4px;">\u25CF</span> \u2265 ' + PT.semaforo.amarillo + '% <span style="color:#ff453a;margin-left:4px;">\u25CF</span> menor</span>' +
                (brk ? '<span class="obpt-chip" style="color:#ff9f0a;">\u23F8 ' + brk.nombre + '</span>' : '') +
                '</div><div class="obpt-grid">';
        let sinPlan = true;
        Object.keys(PT.nodos).forEach(function(nk) {
            const color = nk === 'TLC1' ? '#0073bb' : '#7b2d8b';
            h += '<div class="obpt-card"><div class="obpt-node"><i style="background:' + color + ';"></i>' + nk + '</div>' +
                 '<table><thead><tr><th>Flujo</th><th>Plan</th><th>Esperado</th><th>Actual</th><th>\u0394</th><th>Status</th></tr></thead><tbody>';
            PT.nodos[nk].flujos.forEach(function(f) {
                const pf = plan[nk] && plan[nk][f.id] ? plan[nk][f.id] : null;
                const act = datos[nk][f.id];
                const uph = datos[nk][f.id + '_uph'] || 0;
                const c = (pf && act !== null && act !== undefined) ? ptAvance(pf, act, tk, uph) : {};
                if (pf) sinPlan = false;
                const sem = ptSem(c.pctVsEsperado);
                const dcls = (c.delta === undefined || c.delta === null || isNaN(c.delta)) ? 'obpt-dn' : (Math.round(c.delta) > 0 ? 'obpt-dg' : (Math.round(c.delta) < 0 ? 'obpt-dr' : 'obpt-dn'));
                h += '<tr><td>' + f.label + '</td><td>' + (pf ? ptFmt(pf) : '\u2014') + '</td><td>' + ptFmt(c.esperado) + '</td><td>' + ptFmt(act) + '</td>' +
                     '<td class="' + dcls + '">' + ptFmtD(c.delta) + '</td>' +
                     '<td><span class="obpt-pill obpt-' + sem + '">' + (c.pct !== undefined && c.pct !== null ? c.pct.toFixed(1) + '%' : 'N/A') + '</span></td></tr>';
            });
            h += '</tbody></table></div>';
        });
        h += '</div>';
        if (sinPlan) h += '<div class="obpt-loading" style="padding:10px 0 0;">Captura el plan con el l\u00E1piz \u270E de arriba o en \u2699\uFE0F Configuraci\u00F3n.</div>';
        return h;
    }

    async function ptRenderPerf(tk) {
        const nombres = {}; PT_PERF_SECCIONES.forEach(function(x) { (nombres[x.wh] = nombres[x.wh] || []).push.apply(nombres[x.wh], x.procesos); });
        const data = {};
        for (const wh of ['TLC1', 'QYY7']) { try { data[wh] = ptPerfExtract(await ptFetch(ptURL(wh, tk)), nombres[wh]); } catch (e) { data[wh] = {}; } }
        const cls = function(p) { if (p === null || p === undefined || isNaN(p) || p === 0) return 'n'; if (p < PT_PERF.thresholds.red) return 'r'; if (p < PT_PERF.thresholds.yellow) return 'y'; return 'g'; };
        const T = PT_PERF.thresholds;
        let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;"><span class="obpt-chip"><span style="color:#30d158;">\u25CF</span> \u2265 ' + T.yellow +
                '% <span style="color:#ff9f0a;margin-left:4px;">\u25CF</span> ' + T.red + '\u2013' + T.yellow + '% <span style="color:#ff453a;margin-left:4px;">\u25CF</span> &lt; ' + T.red + '%</span></div>';
        PT_PERF.bloques.forEach(function(bq, bi) {
            // Resumen del bloque: cuántos procesos en cada color
            const cont = { g: 0, y: 0, r: 0 };
            bq.nodos.forEach(function(n) { n.procesos.forEach(function(pn) { const e = data[n.wh][pn]; if (e) { const c = cls(e.pct); if (cont[c] !== undefined) cont[c]++; } }); });
            if (bi > 0) h += '<div class="obpt-sep"><span></span><i>\u25C6</i><span></span></div>';
            h += '<section class="obpt-block" style="--bc:' + bq.color + ';">' +
                 '<header class="obpt-bhead">' +
                   '<div class="obpt-bicon">' + bq.icono + '</div>' +
                   '<div class="obpt-btitle"><div class="obpt-bname">' + bq.titulo + '</div><div class="obpt-bsub">' + bq.subt + '</div></div>' +
                   '<div class="obpt-bsum">' +
                     '<span class="obpt-pill obpt-g" title="Sobre plan">' + cont.g + '</span>' +
                     '<span class="obpt-pill obpt-y" title="Cerca del plan">' + cont.y + '</span>' +
                     '<span class="obpt-pill obpt-r" title="Bajo plan">' + cont.r + '</span>' +
                   '</div>' +
                 '</header><div class="obpt-grid">';
            bq.nodos.forEach(function(n) {
                const color = n.wh === 'TLC1' ? '#0073bb' : '#7b2d8b';
                h += '<div class="obpt-card"><div class="obpt-node"><i style="background:' + color + ';"></i>' + n.wh + '</div>' +
                     '<table><thead><tr><th>Proceso</th><th>Rate</th><th>Plan</th><th>Var (h)</th><th>% Plan</th></tr></thead><tbody>';
                n.procesos.forEach(function(pn) {
                    const e = data[n.wh][pn], dn = PT_PERF.nombres[pn] || pn;
                    if (!e) { h += '<tr style="opacity:.45;"><td>' + dn + '</td><td>\u2014</td><td>\u2014</td><td>\u2014</td><td>\u2014</td></tr>'; return; }
                    const v = e.variance || 0, c = cls(e.pct), w = Math.max(0, Math.min(100, ((e.pct || 0) / 120) * 100));
                    h += '<tr><td>' + dn + '</td><td>' + ptFmt(e.actual) + '</td><td>' + ptFmt(e.plan) + '</td><td class="' + (v >= 0 ? 'obpt-tg' : 'obpt-tr') + '">' + (v >= 0 ? '+' : '') + v.toFixed(2) + '</td>' +
                         '<td><span class="obpt-pill obpt-' + c + '">' + (e.pct || 0).toFixed(1) + '%</span><div class="obpt-bar"><b class="obpt-f' + c + '" style="width:' + w.toFixed(0) + '%;"></b></div></td></tr>';
                });
                h += '</tbody></table></div>';
            });
            h += '</div></section>';
        });
        return h;
    }

    // ---------- integración con ⚙️ Configuración del OB ----------
    function ptSettingsHTML() {
        const plan = ptCargarPlan(), cfg = ptCargarConfig();
        const sec = function(t, c) { return '<div style="margin-bottom:12px;"><div style="color:' + (c || '#8e8e93') + ';font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:6px;">' + t + '</div>'; };
        const inp = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#f5f5f7;padding:4px 7px;font-size:11px;text-align:center;font-family:inherit;color-scheme:dark;';
        const fila = function(lbl, ctrl) { return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:11px;font-weight:600;">' + lbl + '</span>' + ctrl + '</div>'; };
        const hm = function(o) { return ptPad(o.h) + ':' + ptPad(o.m); };
        let h = '';
        Object.keys(PT.nodos).forEach(function(nk) {
            h += sec('Avance al Plan \u00B7 ' + nk, nk === 'TLC1' ? '#0073bb' : '#7b2d8b');
            PT.nodos[nk].flujos.forEach(function(f) {
                const v = plan[nk] && plan[nk][f.id] ? plan[nk][f.id] : '';
                h += fila(f.label + ' <span style="color:#8e8e93;font-weight:500;">(' + (f.unidad || 'units') + ')</span>', '<input type="number" min="0" step="1" data-pt-plan="' + nk + ':' + f.id + '" value="' + v + '" placeholder="Plan" style="width:90px;' + inp + '">');
            });
            h += '</div>';
        });
        h += sec('Turno');
        h += fila('Detecci\u00F3n autom\u00E1tica', '<input type="checkbox" id="obpt-auto" ' + (!cfg.turnoManual ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:#0a84ff;cursor:pointer;">');
        h += '<div id="obpt-manual" style="' + (cfg.turnoManual ? '' : 'display:none;') + '">';
        h += fila('Tipo de turno', '<select id="obpt-tipo" style="' + inp + '"><option value="day"' + (cfg.manualTurnoTipo === 'day' ? ' selected' : '') + '>Day Shift</option><option value="night"' + (cfg.manualTurnoTipo === 'night' ? ' selected' : '') + '>Night Shift</option></select>');
        h += fila('Inicio', '<input type="datetime-local" id="obpt-ini" value="' + (cfg.manualInicio || '') + '" style="' + inp + '">');
        h += fila('Fin', '<input type="datetime-local" id="obpt-fin" value="' + (cfg.manualFin || '') + '" style="' + inp + '">');
        h += '</div></div>';
        h += sec('Auto-refresh y sem\u00E1foro');
        const ar = arLoad();
        h += fila('Auto-refresh (todo el tamper)', '<input type="checkbox" id="obpt-ar-on" ' + (ar.on ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:#0a84ff;cursor:pointer;">');
        h += fila('Actualizar cada (minutos)', '<span style="display:flex;align-items:center;gap:6px;"><input type="number" id="obpt-ar-min" min="1" max="240" step="1" value="' + ar.minutes + '" style="width:70px;' + inp + '"><span style="color:#8e8e93;font-size:10px;">min</span></span>');
        h += fila('<span style="color:#30d158;">\u25CF</span> Verde \u2265 (% del esperado)', '<input type="number" id="obpt-verde" min="1" max="200" value="' + PT.semaforo.verde + '" style="width:70px;' + inp + '">');
        h += fila('<span style="color:#ff9f0a;">\u25CF</span> Amarillo \u2265 (% del esperado)', '<input type="number" id="obpt-amarillo" min="1" max="200" value="' + PT.semaforo.amarillo + '" style="width:70px;' + inp + '">');
        h += '</div>';
        ['night', 'day'].forEach(function(k) {
            const b = PT.turnos[k].breaks;
            h += sec('Breaks \u00B7 ' + PT.turnos[k].nombre);
            [0, 1].forEach(function(i) {
                h += fila('Break ' + (i + 1), '<span style="display:flex;gap:6px;align-items:center;"><input type="time" id="obpt-' + k + '-b' + i + '-ini" value="' + hm(b[i].inicio) + '" style="' + inp + '"><span style="color:#8e8e93;">\u2192</span><input type="time" id="obpt-' + k + '-b' + i + '-fin" value="' + hm(b[i].fin) + '" style="' + inp + '"></span>');
            });
            h += '</div>';
        });
        return h;
    }
    function ptBindSettings(ov) {
        const auto = ov.querySelector('#obpt-auto'), box = ov.querySelector('#obpt-manual');
        if (auto && box) auto.addEventListener('change', function() { box.style.display = auto.checked ? 'none' : ''; });
    }
    function ptSaveSettings(ov) {
        if (!ov.querySelector('#obpt-auto')) return;
        const plan = {};
        ov.querySelectorAll('input[data-pt-plan]').forEach(function(i) {
            const kk = i.dataset.ptPlan.split(':'), v = parseInt(i.value, 10);
            plan[kk[0]] = plan[kk[0]] || {};
            plan[kk[0]][kk[1]] = (isNaN(v) || v <= 0) ? null : v;
        });
        ptSave(PT_KEY_PLAN, plan);
        const t = function(id) { const v = (ov.querySelector('#' + id) || {}).value || '00:00'; const p = v.split(':').map(Number); return { h: p[0] || 0, m: p[1] || 0 }; };
        const br = {};
        ['night', 'day'].forEach(function(k) {
            br[k] = [0, 1].map(function(i) {
                const ini = t('obpt-' + k + '-b' + i + '-ini'), fin = t('obpt-' + k + '-b' + i + '-fin');
                if (fin.h < ini.h || (fin.h === 0 && fin.m === 0)) fin.nextDay = true;
                return { inicio: ini, fin: fin, nombre: 'Break ' + (i + 1) };
            });
        });
        ptSave(PT_KEY_CFG, {
            refreshMinutes: parseInt(ov.querySelector('#obpt-ar-min').value, 10) || AR_DEFAULT.minutes,
            breaks: br,
            turnoManual: !ov.querySelector('#obpt-auto').checked,
            manualTurnoTipo: ov.querySelector('#obpt-tipo').value,
            manualInicio: ov.querySelector('#obpt-ini').value,
            manualFin: ov.querySelector('#obpt-fin').value,
            semaforoVerde: parseInt(ov.querySelector('#obpt-verde').value, 10) || 95,
            semaforoAmarillo: parseInt(ov.querySelector('#obpt-amarillo').value, 10) || 85
        });
        const arMin = parseInt(ov.querySelector('#obpt-ar-min').value, 10);
        arSave({ on: ov.querySelector('#obpt-ar-on').checked, minutes: (arMin >= 1 && arMin <= 240) ? arMin : AR_DEFAULT.minutes });
        arStart();
        ptCargarConfig();
        if (ptView && !ptEditing) ptRefresh();
    }


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
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:center;justify-content:center;';
            const modal = document.createElement('div');
            modal.style.cssText = 'background:rgba(10,10,12,0.97);border:1px solid rgba(255,255,255,0.10);border-radius:16px;padding:18px;min-width:300px;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,0.55);';
            modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><span style="font-weight:600;font-size:14px;color:#f5f5f7;white-space:nowrap;">\u2699\uFE0F Rates de ' + cpc.title + '</span><span id="fclm-plan-close" style="cursor:pointer;font-size:18px;color:#6b7280;">\u2715</span></div><div style="display:flex;align-items:center;gap:10px;padding:10px 0;"><span style="font-size:12px;color:#9ca3af;">Target Rate:</span><input id="fclm-single-target" type="number" value="' + current + '" style="width:100px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#f5f5f7;padding:6px 8px;font-size:13px;text-align:center;" /></div><div style="display:flex;gap:8px;margin-top:14px;"><button id="fclm-plan-save" style="flex:1;padding:8px;background:#0a84ff;border:none;border-radius:980px;color:#fff;font-weight:600;font-size:12px;cursor:pointer;">Guardar</button><button id="fclm-plan-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.08);border:none;border-radius:980px;color:#aeaeb2;font-weight:600;font-size:12px;cursor:pointer;">Cancelar</button></div>';
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            overlay.querySelector('#fclm-plan-close').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#fclm-plan-cancel').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelector('#fclm-plan-save').addEventListener('click', () => {
                const val = overlay.querySelector('#fclm-single-target').value;
                if (val && !isNaN(parseFloat(val))) { localStorage.setItem(cpc.key, parseFloat(val)); overlay.remove(); initBanner(true); }
            });
            return;
        }

        const saved = JSON.parse(localStorage.getItem(cpc.key) || '{}');
        const isManual = saved.mode === 'manual';

        const overlay = document.createElement('div');
        overlay.id = 'fclm-plan-editor';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:rgba(10,10,12,0.97);border:1px solid rgba(255,255,255,0.10);border-radius:16px;padding:18px;min-width:340px;max-width:420px;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,0.55);';

        let inputsHTML = '';
        cpc.subProcesses.forEach(sp => {
            const m = mm.find(x => x.name === sp);
            const autoPlan = m ? (m._origPlanRate != null ? m._origPlanRate : m.planRate) : 0;
            const manualVal = (saved.plans && saved.plans[sp] != null) ? saved.plans[sp] : '';
            const dn = (typeof DISPLAY_NAMES !== 'undefined' && DISPLAY_NAMES[sp]) ? DISPLAY_NAMES[sp] : sp;
            inputsHTML += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">';
            inputsHTML += '<span style="font-size:11px;font-weight:600;flex:1;">' + dn + '</span>';
            inputsHTML += '<span style="color:#6b7280;font-size:10px;margin-right:8px;">Auto: ' + (autoPlan != null ? Math.round(autoPlan) : '—') + '</span>';
            inputsHTML += '<input type="number" class="fclm-plan-input" data-proc="' + sp + '" placeholder="Plan" value="' + manualVal + '" style="width:70px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#f5f5f7;padding:4px 6px;font-size:11px;text-align:center;' + (isManual ? '' : 'opacity:0.3;pointer-events:none;') + '" />';
            inputsHTML += '</div>';
        });

        modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
            '<span style="font-weight:600;font-size:14px;color:#f5f5f7;white-space:nowrap;">\u2699\uFE0F Rates de ' + (cpc.title || 'Proceso') + '</span>' +
            '<span id="fclm-plan-close" style="cursor:pointer;font-size:18px;color:#8e8e93;transition:color 0.2s;" title="Cerrar">\u2715</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px;background:#1a2332;border-radius:6px;">' +
            '<span style="font-size:11px;color:#9ca3af;">Modo:</span>' +
            '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:600;color:' + (!isManual ? '#f5f5f7' : '#8e8e93') + ';"><input type="radio" name="fclm-plan-mode" value="auto" ' + (!isManual ? 'checked' : '') + ' style="accent-color:#0a84ff;" /> Auto</label>' +
            '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;font-weight:600;color:' + (isManual ? '#f5f5f7' : '#8e8e93') + ';"><input type="radio" name="fclm-plan-mode" value="manual" ' + (isManual ? 'checked' : '') + ' style="accent-color:#0a84ff;" /> Manual</label>' +
            '</div>' +
            '<div id="fclm-plan-inputs">' + inputsHTML + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:14px;">' +
            '<button id="fclm-plan-save" style="flex:1;padding:8px;background:#0a84ff;border:none;border-radius:980px;color:#fff;font-weight:600;font-size:12px;cursor:pointer;transition:background .15s ease;">Guardar</button>' +
            '<button id="fclm-plan-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.08);border:none;border-radius:980px;color:#aeaeb2;font-weight:600;font-size:12px;cursor:pointer;">Cancelar</button>' +
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
                overlay.querySelectorAll('label').forEach(l => { l.style.color = '#8e8e93'; });
                r.parentElement.style.color = '#f5f5f7';
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
            initBanner(true);
        });
    }


    // ============= CENTRALIZED SETTINGS PANEL =============
    function openSettingsPanel() {
        const existing = document.getElementById('fclm-settings-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'fclm-settings-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:100000;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:rgba(10,10,12,0.97);border:1px solid rgba(255,255,255,0.10);border-radius:16px;padding:18px;width:480px;max-height:80vh;overflow-y:auto;color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,0.55);';

        // Build config sections
        const allConfigs = [
            { wh: 'TLC1', title: 'JPH / UPH (TLC1)', items: [
                { label: 'RC Sort UPH', key: 'fclm_jph_tlc1_rc_sort', defaultVal: 220, type: 'single' },
                { label: 'TO Palletize JPH', key: 'fclm_jph_tlc1_transfer_out', defaultVal: 55, type: 'single' },
                { label: 'TO RWC JPH', key: 'fclm_jph_tlc1_to_rwc', defaultVal: 60, type: 'single' }
            ]},
            { wh: 'QYY7', title: 'Objetivo de rate · Productividad (QYY7)', items: [
                { label: 'Outbound (DA) – rate objetivo', key: 'fclm_target_qyy7_da', defaultVal: 141, type: 'single' },
                { label: 'Throughput – rate objetivo', key: 'fclm_target_qyy7_throughput', defaultVal: 131, type: 'single' }
            ]},
            { wh: 'QYY7', title: 'JPH (QYY7)', items: [
                { label: 'Transfer Out Pick', key: 'fclm_jph_qyy7_to_pick', defaultVal: 60, type: 'single' },
                { label: 'Transfer Out (TO Palletize)', key: 'fclm_jph_qyy7_transfer_out', defaultVal: 60, type: 'single' }
            ]}
        ];

        let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><span style="font-weight:600;font-size:15px;color:#f5f5f7;">\u2699\uFE0F Configuraci\u00F3n de JPH/UPH</span><span id="fclm-settings-close" style="cursor:pointer;font-size:20px;color:#8e8e93;transition:color 0.2s;">\u2715</span></div>';

        allConfigs.forEach(section => {
            const whColor = section.wh === 'TLC1' ? '#0073bb' : '#7b2d8b';
            html += '<div style="margin-bottom:12px;"><div style="color:' + whColor + ';font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:6px;">' + section.title + '</div>';

            section.items.forEach(item => {
                let currentVal = '';
                let isManual = false;

                if (item.type === 'single') {
                    const saved = localStorage.getItem(item.key);
                    currentVal = saved || item.defaultVal || '';
                    isManual = saved != null;
                } else if (item.type === 'subplan') {
                    const saved = JSON.parse(localStorage.getItem(item.key) || '{}');
                    isManual = saved.mode === 'manual';
                    currentVal = (saved.plans && saved.plans[item.subKey] != null) ? saved.plans[item.subKey] : (item.defaultVal || '');
                }

                const inputId = 'fclm-cfg-' + item.key.replace(/[^a-zA-Z0-9]/g, '') + '-' + (item.subKey || '').replace(/[^a-zA-Z0-9]/g, '');

                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);">';
                html += '<span style="font-size:11px;font-weight:600;flex:1;">' + item.label + '</span>';
                html += '<div style="display:flex;align-items:center;gap:6px;">';
                html += '<label style="display:flex;align-items:center;gap:3px;font-size:9px;color:' + (isManual ? '#8e8e93' : '#f5f5f7') + ';cursor:pointer;"><input type="radio" name="mode-' + inputId + '" value="auto" ' + (!isManual ? 'checked' : '') + ' class="fclm-cfg-mode" data-input="' + inputId + '" style="accent-color:#0a84ff;width:12px;height:12px;" />Auto</label>';
                html += '<label style="display:flex;align-items:center;gap:3px;font-size:9px;color:' + (isManual ? '#f5f5f7' : '#8e8e93') + ';cursor:pointer;"><input type="radio" name="mode-' + inputId + '" value="manual" ' + (isManual ? 'checked' : '') + ' class="fclm-cfg-mode" data-input="' + inputId + '" style="accent-color:#0a84ff;width:12px;height:12px;" />Manual</label>';
                html += '<input type="number" id="' + inputId + '" value="' + currentVal + '" data-key="' + item.key + '" data-subkey="' + (item.subKey || '') + '" data-type="' + item.type + '" data-default="' + (item.defaultVal || '') + '" style="width:65px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#f5f5f7;padding:4px 7px;font-size:11px;text-align:center;' + (!isManual ? 'opacity:0.3;pointer-events:none;' : '') + '" />';
                html += '</div></div>';
            });

            html += '</div>';
        });

        html += ptSettingsHTML();
        html += '<div style="display:flex;gap:8px;margin-top:14px;"><button id="fclm-settings-save" style="flex:1;padding:8px;background:#0a84ff;border:none;border-radius:980px;color:#fff;font-weight:600;font-size:12px;cursor:pointer;transition:background .15s ease;">Guardar</button><button id="fclm-settings-reset" style="padding:8px 16px;background:rgba(255,255,255,0.08);border:none;border-radius:980px;color:#ff9f0a;font-weight:600;font-size:12px;cursor:pointer;">Resetear</button><button id="fclm-settings-cancel" style="flex:1;padding:8px;background:rgba(255,255,255,0.08);border:none;border-radius:980px;color:#aeaeb2;font-weight:600;font-size:12px;cursor:pointer;">Cancelar</button></div>';

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Mode toggles
        ptBindSettings(overlay);
        overlay.querySelectorAll('.fclm-cfg-mode').forEach(r => {
            r.addEventListener('change', () => {
                const inputEl = document.getElementById(r.dataset.input);
                if (inputEl) {
                    const isM = r.value === 'manual';
                    inputEl.style.opacity = isM ? '1' : '0.3';
                    inputEl.style.pointerEvents = isM ? 'auto' : 'none';
                }
                r.closest('div').querySelectorAll('label').forEach(l => l.style.color = '#8e8e93');
                r.parentElement.style.color = '#f5f5f7';
            });
        });

        // Close
        overlay.querySelector('#fclm-settings-close').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#fclm-settings-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // Save
        overlay.querySelector('#fclm-settings-save').addEventListener('click', () => {
            const inputs = overlay.querySelectorAll('input[type="number"]');
            const subplanGroups = {};

            inputs.forEach(inp => {
                const key = inp.dataset.key;
                const subKey = inp.dataset.subkey;
                const type = inp.dataset.type;
                const modeRadio = overlay.querySelector('input[name="mode-' + inp.id + '"]:checked');
                const isManual = modeRadio && modeRadio.value === 'manual';
                const val = inp.value.trim();

                if (type === 'single') {
                    if (isManual && val !== '') {
                        localStorage.setItem(key, parseFloat(val));
                    } else {
                        localStorage.removeItem(key);
                    }
                } else if (type === 'subplan') {
                    if (!subplanGroups[key]) subplanGroups[key] = { mode: 'auto', plans: {} };
                    if (isManual) {
                        subplanGroups[key].mode = 'manual';
                        if (val !== '') subplanGroups[key].plans[subKey] = parseFloat(val);
                    }
                }
            });

            for (let [key, data] of Object.entries(subplanGroups)) {
                if (data.mode === 'manual') {
                    localStorage.setItem(key, JSON.stringify(data));
                } else {
                    localStorage.removeItem(key);
                }
            }

            ptSaveSettings(overlay);
            overlay.remove();
            initBanner(true);
        });

        // Reset
        overlay.querySelector('#fclm-settings-reset').addEventListener('click', () => {
            if (confirm('\u00BFResetear todos los planes a valores autom\u00E1ticos?')) {
                ['fclm_jph_tlc1_rc_sort','fclm_jph_tlc1_transfer_out','fclm_jph_tlc1_to_rwc','fclm_jph_qyy7_to_pick','fclm_jph_qyy7_transfer_out','fclm_target_qyy7_da','fclm_target_qyy7_throughput'].forEach(k => localStorage.removeItem(k));
                overlay.remove();
                initBanner(true);
            }
        });
    }

    // Descarga el script de GitHub: usa GM_xmlhttpRequest (evita CSP/CORS de FCLM) y si no, fetch
    function fetchRemoteScript(url) {
        const u = url + '?t=' + Date.now();
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({ method: 'GET', url: u, nocache: true, timeout: 15000,
                    headers: { 'Cache-Control': 'no-cache' },
                    onload: (r) => (r.status >= 200 && r.status < 300) ? resolve(r.responseText) : reject(new Error('HTTP ' + r.status)),
                    onerror: () => reject(new Error('Error de red')), ontimeout: () => reject(new Error('Timeout')) });
            } else {
                fetch(u, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(resolve, reject);
            }
        });
    }

    // ============= VERSION STATUS BADGE =============
    async function checkVersionStatus(btnEl) {
        const URL_RAW = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20FCLM%20Report.user.js';
        if (!btnEl || !btnEl.isConnected) return;
        const setOk = (txt) => { btnEl.onclick = null; btnEl.style.cursor = 'default'; btnEl.textContent = txt; btnEl.style.color = '#8e8e93'; btnEl.style.background = 'rgba(255,255,255,0.08)'; };
        try {
            let text;
            try { text = await fetchRemoteScript(URL_RAW); } catch (er) { console.warn('[OB FCLM] Badge update:', er); setOk('No se pudo verificar'); return; }
            const vMatch = text.match(/\/\/ @version\s+([\d.]+)/);
            const remoteVersion = vMatch ? vMatch[1] : null;
            if (!remoteVersion) { setOk('Sin versi\u00F3n'); return; }
            if (compareVersions(remoteVersion, SCRIPT_VERSION) > 0) {
                btnEl.textContent = 'Actualizar a v' + remoteVersion;
                btnEl.style.color = '#ffffff';
                btnEl.style.fontWeight = '600';
                btnEl.style.background = '#0a84ff';
                btnEl.style.cursor = 'pointer';
                btnEl.onmouseenter = () => { btnEl.style.background = '#409cff'; };
                btnEl.onmouseleave = () => { btnEl.style.background = '#0a84ff'; };
                btnEl.onclick = () => { window.open(URL_RAW + '?t=' + Date.now(), '_blank'); };
            } else {
                setOk('Actualizado');
            }
        } catch (e) {
            setOk('Sin conexi\u00F3n');
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
    const UPDATE_NOTIFICATION_KEY = 'obfclm_update_notified_version';

    async function checkForUpdates() {
        try {
            const currentVersion = SCRIPT_VERSION;
            const rawUrl = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20FCLM%20Report.user.js';
            const text = await fetchRemoteScript(rawUrl);
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
        document.getElementById('obfclm-update-pop')?.remove();
        const URL_INSTALL = 'https://raw.githubusercontent.com/JGArzate/tampermonkey-scripts/main/OB%20FCLM%20Report.user.js';
        // Estilos en línea (inmunes a CSP) + transiciones estilo Apple
        const wrap = document.createElement('div');
        wrap.id = 'obfclm-update-pop';
        wrap.style.cssText = 'position:fixed;top:24px;left:50%;z-index:2147483000;width:min(440px,calc(100vw - 32px));' +
            'background:rgba(18,18,22,0.82);backdrop-filter:blur(40px) saturate(190%);-webkit-backdrop-filter:blur(40px) saturate(190%);' +
            'border:1px solid rgba(255,255,255,0.14);border-radius:22px;padding:22px 22px 18px;color:#f5f5f7;' +
            'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,sans-serif;' +
            'box-shadow:0 30px 80px rgba(0,0,0,0.55),0 0 0 0.5px rgba(255,255,255,0.06) inset;' +
            'opacity:0;transform:translate(-50%,-28px) scale(0.86);filter:blur(10px);' +
            'transition:opacity .45s ease,transform .7s cubic-bezier(.34,1.56,.64,1),filter .45s ease,box-shadow .3s ease;';
        wrap.innerHTML =
            '<div style="display:flex;align-items:center;gap:16px;">' +
              '<div style="flex-shrink:0;width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a84ff,#5e5ce6);box-shadow:0 8px 22px rgba(10,132,255,0.45);">' +
                '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:17px;font-weight:700;letter-spacing:-0.3px;">Nueva versi\u00F3n disponible</div>' +
                '<div style="font-size:13px;color:#aeaeb2;margin-top:3px;">OB FCLM Report</div>' +
                '<div style="display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:4px 12px;border-radius:980px;background:rgba(255,255,255,0.08);font-size:12.5px;font-weight:600;">' +
                  '<span style="color:#8e8e93;">v' + currentVersion + '</span><span style="color:#636366;">\u2192</span><span style="color:#30d158;">v' + newVersion + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:18px;">' +
              '<button data-act="later" style="flex:1;padding:11px 0;border:none;border-radius:980px;background:rgba(255,255,255,0.10);color:#f5f5f7;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .2s ease,transform .2s ease;">M\u00E1s tarde</button>' +
              '<button data-act="install" style="flex:1.4;padding:11px 0;border:none;border-radius:980px;background:#0a84ff;color:#fff;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;box-shadow:0 6px 18px rgba(10,132,255,0.40);transition:background .2s ease,transform .2s ease,box-shadow .2s ease;">Instalar ahora</button>' +
            '</div>' +
            '<div data-bar style="height:3px;border-radius:3px;background:rgba(255,255,255,0.08);margin-top:14px;overflow:hidden;"><div style="height:100%;width:100%;background:#0a84ff;transform-origin:left;transition:transform 15s linear;"></div></div>';
        document.body.appendChild(wrap);

        const bar = wrap.querySelector('[data-bar] > div');
        let timer = null, cerrado = false;
        const cerrar = () => {
            if (cerrado) return; cerrado = true; clearTimeout(timer);
            wrap.style.transition = 'opacity .3s ease,transform .38s cubic-bezier(.4,0,1,1),filter .3s ease';
            wrap.style.opacity = '0';
            wrap.style.transform = 'translate(-50%,-20px) scale(0.92)';
            wrap.style.filter = 'blur(8px)';
            setTimeout(() => wrap.remove(), 400);
        };
        const arrancar = () => { bar.style.transition = 'transform 15s linear'; bar.style.transform = 'scaleX(0)'; timer = setTimeout(cerrar, 15000); };
        const pausar = () => { clearTimeout(timer); const w = bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width; bar.style.transition = 'transform .3s ease'; bar.style.transform = 'scaleX(1)'; return w; };

        // Aparición
        requestAnimationFrame(() => requestAnimationFrame(() => {
            wrap.style.opacity = '1';
            wrap.style.transform = 'translate(-50%,0) scale(1)';
            wrap.style.filter = 'blur(0)';
            setTimeout(arrancar, 500);
        }));

        // Hover del popup: se eleva un poco y pausa el cierre automático
        wrap.addEventListener('mouseenter', () => {
            if (cerrado) return; pausar();
            wrap.style.transform = 'translate(-50%,2px) scale(1.025)';
            wrap.style.boxShadow = '0 40px 100px rgba(0,0,0,0.65),0 0 0 1px rgba(10,132,255,0.45)';
        });
        wrap.addEventListener('mouseleave', () => {
            if (cerrado) return;
            wrap.style.transform = 'translate(-50%,0) scale(1)';
            wrap.style.boxShadow = '0 30px 80px rgba(0,0,0,0.55),0 0 0 0.5px rgba(255,255,255,0.06) inset';
            setTimeout(() => { if (!cerrado) arrancar(); }, 50);
        });

        // Botones (sin onclick inline: CSP)
        const bLater = wrap.querySelector('[data-act="later"]'), bInst = wrap.querySelector('[data-act="install"]');
        bLater.addEventListener('mouseenter', () => { bLater.style.background = 'rgba(255,255,255,0.18)'; bLater.style.transform = 'translateY(-1px)'; });
        bLater.addEventListener('mouseleave', () => { bLater.style.background = 'rgba(255,255,255,0.10)'; bLater.style.transform = 'none'; });
        bInst.addEventListener('mouseenter', () => { bInst.style.background = '#409cff'; bInst.style.transform = 'translateY(-1px) scale(1.02)'; bInst.style.boxShadow = '0 10px 26px rgba(10,132,255,0.55)'; });
        bInst.addEventListener('mouseleave', () => { bInst.style.background = '#0a84ff'; bInst.style.transform = 'none'; bInst.style.boxShadow = '0 6px 18px rgba(10,132,255,0.40)'; });
        bLater.addEventListener('click', cerrar);
        bInst.addEventListener('click', () => { window.open(URL_INSTALL + '?t=' + Date.now(), '_blank'); cerrar(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { setTimeout(checkForUpdates, 2000); });
    } else {
        setTimeout(checkForUpdates, 2000);
    }
    arStart();   // auto-refresh global (ya están declaradas todas las variables del panel)

    // Revisa GitHub cada 5 minutos (antes dependía de que el banner se redibujara)
    setInterval(() => {
        checkForUpdates();
        const vb = document.getElementById('fclm-version-status-btn');
        if (vb) checkVersionStatus(vb);
    }, 5 * 60 * 1000);

})();
