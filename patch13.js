const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const pasteDayTarget = `            this.state.copiedDay.corsi.forEach((c, idx) => {
                const newCorso = {
                    ...c,
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    dayOfWeek: targetDayOfWeek,
                    schedule: \`\${giorniShort[targetDayOfWeek]} \${c.startTime}\`,
                    iscritti: [] // Reset iscrizioni per le nuove attività collegate
                };`;

const pasteDayFix = `            const weekDaysForPaste = this.getWeekDates(this.state.currentWeekOffset || 0);
            const targetDateStr = weekDaysForPaste[targetDayOfWeek - 1].toISOString().split('T')[0];
            
            this.state.copiedDay.corsi.forEach((c, idx) => {
                const newCorso = {
                    ...c,
                    id: Date.now() + idx + Math.floor(Math.random() * 1000),
                    dayOfWeek: targetDayOfWeek,
                    inizio: targetDateStr,
                    fine: targetDateStr,
                    schedule: \`\${giorniShort[targetDayOfWeek]} \${c.startTime}\`,
                    iscritti: [] // Reset iscrizioni per le nuove attività collegate
                };`;

html = html.replace(pasteDayTarget, pasteDayFix);
fs.writeFileSync('index.html', html);
console.log('Fixed pasteDay to reset inizio/fine.');
