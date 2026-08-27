const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// header logic
const hSearch1 = `gridHtml += \`<div style="background:\${headerBg}; padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\`;`;

const hFix1 = `
                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const yearYY = d.getFullYear().toString().substring(2);
                const nextYearYY = (d.getFullYear() + 1).toString().substring(2);
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14; ' : '';
                const annoSportivoLabel = isNewSportsYear ? \`<div style="font-size:0.6rem; color:#39ff14; font-weight:800; text-transform:uppercase; margin-top:4px;">INIZIO ANNO SPORTIVO \${yearYY}/\${nextYearYY}</div>\` : '';
                
                gridHtml += \`<div style="background:\${headerBg}; \${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">
                        <div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\${annoSportivoLabel}\`;`;


// cell logic
const cSearch1 = `gridHtml += \`<div style="background:\${isToday ? 'rgba(59,130,246,0.03)' : 'rgba(15,23,42,0.6)'}; min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(\${d}, '\${hour}')">\`;`;

const cFix1 = `
                    const isNewSportsYear = weekDays[d - 1].getMonth() === 8 && weekDays[d - 1].getDate() === 1;
                    const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14; ' : '';
                    gridHtml += \`<div style="background:\${isToday ? 'rgba(59,130,246,0.03)' : 'rgba(15,23,42,0.6)'}; \${leftBorderStyle} min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(\${d}, '\${hour}')">\`;`;

let c1 = html.indexOf(hSearch1);
if (c1 > -1) {
    html = html.substring(0, c1) + hFix1 + html.substring(c1 + hSearch1.length);
    console.log("Header replaced");
} else {
    console.log("Header NOT found");
}

let c2 = html.indexOf(cSearch1);
if (c2 > -1) {
    html = html.substring(0, c2) + cFix1 + html.substring(c2 + cSearch1.length);
    console.log("Cell replaced");
} else {
    console.log("Cell NOT found");
}

fs.writeFileSync('index.html', html);
