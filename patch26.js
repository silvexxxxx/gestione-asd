const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Patch 1: Header
const headerStartIdx = html.indexOf('const isCopied = !!this.state.copiedDay;');
const headerEndIdx = html.indexOf('gridHtml += `<div style="background:${headerBg}; padding:6px 4px; text-align:center; font-weight:700; ${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">\\n                        <div>${day} ${isHoliday ? \\'🎉\\' : \\'\\'}</div><div style="font-size:0.7rem; opacity:0.8;">${dateStr}</div>`;');

if (headerStartIdx > -1) {
    const fixedHeader = `const isCopied = !!this.state.copiedDay;
                
                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const yearYY = d.getFullYear().toString().substring(2);
                const nextYearYY = (d.getFullYear() + 1).toString().substring(2);
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14; ' : '';
                const annoSportivoLabel = isNewSportsYear ? \`<div style="font-size:0.6rem; color:#39ff14; font-weight:800; text-transform:uppercase; margin-top:4px;">INIZIO ANNO SPORTIVO \${yearYY}/\${nextYearYY}</div>\` : '';
                
                let headerBg = 'rgba(30,41,59,0.95)';
                let colorStyle = '';
                if (isHoliday) {
                    headerBg = 'rgba(239,68,68,0.2)'; // Sfondo rosso chiaro per festività
                    colorStyle = 'color: #ef4444;';
                } else if (isToday) {
                    headerBg = 'rgba(59,130,246,0.25)';
                    colorStyle = 'color: var(--primary);';
                }

                gridHtml += \`<div style="background:\${headerBg}; \${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\${annoSportivoLabel}\`;`;
    
    // Manual substring replace
    const blockEnd = headerStartIdx + html.substring(headerStartIdx).indexOf('</div>`;') + 8;
    html = html.substring(0, headerStartIdx) + fixedHeader + html.substring(blockEnd);
    console.log("Patched Header");
}

// Patch 2: Cells
const cellStartStr = 'const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();';
const cellStartIdx = html.indexOf(cellStartStr);

if (cellStartIdx > -1) {
    const fixedCell = `const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();
                    const isNewSportsYearCell = weekDays[d - 1].getMonth() === 8 && weekDays[d - 1].getDate() === 1;
                    const cellLeftBorder = isNewSportsYearCell ? 'border-left:3px solid #39ff14; ' : '';
                    gridHtml += \`<div style="background:\${isToday ? 'rgba(59,130,246,0.03)' : 'rgba(15,23,42,0.6)'}; \${cellLeftBorder} min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(\${d}, '\${hour}')">\`;`;
    
    const blockEnd = cellStartIdx + html.substring(cellStartIdx).indexOf(')">`;') + 5;
    html = html.substring(0, cellStartIdx) + fixedCell + html.substring(blockEnd);
    console.log("Patched Cells");
}

fs.writeFileSync('index.html', html);
