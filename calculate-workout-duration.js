const fs = require('fs');

const content = fs.readFileSync('public/fitness.ics', 'utf8');
const events = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

let totalMinutes = 0;
let workoutCount = 0;
const workoutEvents = [];

events.forEach(event => {
  const summaryMatch = event.match(/SUMMARY:(.+)/);
  if (summaryMatch && summaryMatch[1].trim() === 'Workout') {
    const dtstartMatch = event.match(/DTSTART[^:]*:([^\r\n]+)/i);
    const dtendMatch = event.match(/DTEND[^:]*:([^\r\n]+)/i);
    if (dtstartMatch && dtendMatch) {
      const startStr = dtstartMatch[1].trim();
      const endStr = dtendMatch[1].trim();
      
      // Parse ICS date format: 20250103T005700Z
      const parseICSDate = (str) => {
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        const hour = parseInt(str.substring(9, 11));
        const minute = parseInt(str.substring(11, 13));
        const second = parseInt(str.substring(13, 15) || '0');
        return new Date(Date.UTC(year, month, day, hour, minute, second));
      };
      
      const start = parseICSDate(startStr);
      const end = parseICSDate(endStr);
      const minutes = Math.round((end - start) / (1000 * 60));
      
      totalMinutes += minutes;
      workoutCount++;
      workoutEvents.push({ start, end, minutes });
    }
  }
});

const hours = Math.floor(totalMinutes / 60);
const mins = totalMinutes % 60;

console.log('=== Workout Duration Calculation ===');
console.log('Total "Workout" events:', workoutCount);
console.log('Total duration:', totalMinutes, 'minutes');
console.log('Total duration:', hours, 'hours', mins, 'minutes');
console.log('\nFirst event:', workoutEvents[0]?.start.toISOString());
console.log('Last event:', workoutEvents[workoutEvents.length - 1]?.start.toISOString());

