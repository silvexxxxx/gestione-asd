const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s1 = 'gridHtml += `<div style="background:${headerBg}; padding:6px 4px; text-align:center; font-weight:700; ${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">';
const s2 = 'gridHtml += `<div style="background:${isToday ? \\'rgba(59,130,246,0.03)\\' : \\'rgba(15,23,42,0.6)\\'}; min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(${d}, \\'${hour}\\')">`;';

console.log(html.indexOf(s1));
console.log(html.indexOf(s2));

if (html.indexOf(s1) !== -1) {
    let out = html.replace(s1, `
                const isNewSportsYear = d.getMonth() === 8 && d.getDate() === 1;
                const yearYY = d.getFullYear().toString().substring(2);
                const nextYearYY = (d.getFullYear() + 1).toString().substring(2);
                const leftBorderStyle = isNewSportsYear ? 'border-left:3px solid #39ff14; ' : '';
                const annoSportivoLabel = isNewSportsYear ? \`<div style="font-size:0.6rem; color:#39ff14; font-weight:800; text-transform:uppercase; margin-top:4px;">INIZIO ANNO SPORTIVO \${yearYY}/\${nextYearYY}</div>\` : '';
                
                gridHtml += \\\`<div style="background:\${headerBg}; \${leftBorderStyle} padding:6px 4px; text-align:center; font-weight:700; \${colorStyle} position:sticky; top:0; z-index:10; border-bottom:1px solid var(--border); border-right:1px solid var(--border);">\\\``);
    
    // We must also inject annoSportivoLabel after the dateStr
    out = out.replace(`<div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\`;`, `<div>\${day} \${isHoliday ? '🎉' : ''}</div><div style="font-size:0.7rem; opacity:0.8;">\${dateStr}</div>\${annoSportivoLabel}\`;`);
    
    out = out.replace(s2, `
                    const isNewSportsYearCell = weekDays[d - 1].getMonth() === 8 && weekDays[d - 1].getDate() === 1;
                    const cellLeftBorder = isNewSportsYearCell ? 'border-left:3px solid #39ff14; ' : '';
                    gridHtml += \\\`<div style="background:\${isToday ? 'rgba(59,130,246,0.03)' : 'rgba(15,23,42,0.6)'}; \${cellLeftBorder} min-height:36px; padding:2px; border-bottom:1px solid var(--border); border-right:1px solid var(--border); cursor:pointer;" onclick="app.openNewCorsoModal(\${d}, '\${hour}')">\\\`;`);
    
    fs.writeFileSync('index.html', out);
    console.log("Patched successfully");
}
