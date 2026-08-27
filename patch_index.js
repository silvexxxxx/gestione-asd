const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add header border
const headerTarget = 'const isTodayHeader = d.toDateString() === new Date().toDateString();';
const headerReplace = 'const isTodayHeader = d.toDateString() === new Date().toDateString();\n                    const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;\n                    const leftBorderStyle = isNewSportsYear ? "border-left:3px solid #39ff14;" : "";\n                    const annoSportivoLabel = isNewSportsYear ? `<div style="background:#39ff14; color:black; font-size:0.6rem; margin-top:4px; padding:2px; border-radius:3px; font-weight:bold;">INIZIO ANNO SPORTIVO ${d.getFullYear().toString().slice(-2)}/${(d.getFullYear()+1).toString().slice(-2)}</div>` : "";';

html = html.replace(headerTarget, headerReplace);

const headerTarget2 = 'gridHtml += `<div style="background:${headerBg}; padding:6px 4px; text-align:center; font-weight:700; ${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">';
const headerReplace2 = 'gridHtml += `<div style="background:${headerBg}; ${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; ${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">';

html = html.replace(headerTarget2, headerReplace2);

const headerTarget3 = '<div>${day} ${isHoliday ? \'🎉\' : \'\'}</div><div style="font-size:0.7rem; opacity:0.8;">${dateStr}</div>`;';
const headerReplace3 = '<div>${day} ${isHoliday ? \'🎉\' : \'\'}</div><div style="font-size:0.7rem; opacity:0.8;">${dateStr}</div>${annoSportivoLabel}`;';

html = html.replace(headerTarget3, headerReplace3);

// 2. Add cell border
const cellTarget = 'const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();\n                    gridHtml += `<div style="background:${isToday ? \'rgba(59,130,246,0.05)\' : \'var(--bg-deep)\'}; min-height:36px; padding:2px; position:relative; cursor:pointer; border-bottom:1px solid var(--border); border-right:1px solid var(--border);" onclick="app.openNewCorsoModal(${d}, \'${hour}\')">`;';
const cellReplace = 'const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();\n                    const isNewSportsYearCell = weekDays[d - 1].getMonth() === 8 && weekDays[d - 1].getDate() === 1;\n                    const cellLeftBorder = isNewSportsYearCell ? "border-left:3px solid #39ff14;" : "";\n                    gridHtml += `<div style="background:${isToday ? \'rgba(59,130,246,0.05)\' : \'var(--bg-deep)\'}; ${cellLeftBorder} min-height:36px; padding:2px; position:relative; cursor:pointer; border-bottom:1px solid var(--border); border-right:1px solid var(--border);" onclick="app.openNewCorsoModal(${d}, \'${hour}\')">`;';

html = html.replace(cellTarget, cellReplace);

fs.writeFileSync('index.html', html);
console.log('index.html patched');
