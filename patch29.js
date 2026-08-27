const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const findTargetHeader = 'const isCopied = !!this.state.copiedDay;';
const replaceTargetHeaderEnd = '</div><div style="font-size:0.7rem; opacity:0.8;">${dateStr}</div>`;';

const findTargetCell = 'const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();';
const replaceTargetCellEndSmall = ' cursor:pointer;" onclick="app.openNewCorsoModal(';
const replaceTargetCellVeryEnd = '})">`;';

// 1. Header
const hStart = html.indexOf(findTargetHeader);
const hEnd = html.indexOf(replaceTargetHeaderEnd, hStart);
if (hStart !== -1 && hEnd !== -1) {
    const newHeader = `const isCopied = !!this.state.copiedDay;
                
                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const yearYY = d.getFullYear().toString().substring(2);
                const nextYearYY = (d.getFullYear() + 1).toString().substring(2);
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14; ' : '';
                const annoSportivoLabel = isNewSportsYear ? \`<div style="font-size:0.65rem; color:#39ff14; font-weight:900; text-transform:uppercase; margin-top:4px;">Inizio Anno Sportivo \${yearYY}/\${nextYearYY}</div>\` : '';
                
                let headerBg = 'rgba(30,41,59,0.95)';
                let colorStyle = '';
                if (isHoliday) {
                    headerBg = 'rgba(239,68,68,0.2)';
                    colorStyle = 'color: #ef4444;';
                } else if (isToday) {
                    headerBg = 'rgba(59,130,246,0.25)';
                    colorStyle = 'color: var(--primary);';
                }

                gridHtml += \`<div style="background:\${headerBg}; \${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\${annoSportivoLabel}\`;`;
                        
    html = html.substring(0, hStart) + newHeader + html.substring(hEnd + replaceTargetHeaderEnd.length);
    console.log("Header replaced");
}

// 2. Cell
const cStart = html.indexOf(findTargetCell);
const cEnd = html.indexOf(replaceTargetCellEndSmall, cStart);
if (cStart !== -1 && cEnd !== -1) {
    const endBlock = html.indexOf(replaceTargetCellVeryEnd, cEnd) + replaceTargetCellVeryEnd.length;
    
    const newCell = `const isToday = weekDays[d - 1].toDateString() === new Date().toDateString();
                    const isNewSportsYearCell = weekDays[d - 1].getMonth() === 8 && weekDays[d - 1].getDate() === 1;
                    const cellLeftBorder = isNewSportsYearCell ? 'border-left:3px solid #39ff14; ' : '';
                    gridHtml += \`<div style="background:\${isToday ? 'rgba(59,130,246,0.03)' : 'rgba(15,23,42,0.6)'}; \${cellLeftBorder} min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(\${d}, '\${hour}')">\`;`;
                    
    html = html.substring(0, cStart) + newCell + html.substring(endBlock);
    console.log("Cell replaced");
}

fs.writeFileSync('index.html', html);
