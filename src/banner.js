import { formatDate, getReadableMonth } from './dates.js';

export function downloadMonthBanner({ weekGroups, currentMonth }) {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1350;
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#fff8f2';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, width, 210);

    ctx.fillStyle = '#ff8c42';
    ctx.fillRect(0, 210, width, 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 60px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Lanchinho Miner', width / 2, 82);

    ctx.font = '500 34px Segoe UI, Arial';
    ctx.fillText(`Grupos de ${getReadableMonth(currentMonth)}`, width / 2, 138);

    ctx.font = '400 25px Segoe UI, Arial';
    ctx.fillText('Cafe de sexta-feira da equipe', width / 2, 180);

    let y = 285;
    let groupCounter = 1;

    weekGroups.forEach(week => {
        ctx.fillStyle = '#ff8c42';
        roundRect(ctx, 70, y, width - 140, 58, 16);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 27px Segoe UI, Arial';
        ctx.textAlign = 'left';
        ctx.fillText(formatDate(week.date, { weekday: 'long', day: '2-digit', month: 'long' }), 100, y + 38);
        y += 90;

        week.groups.forEach(group => {
            ctx.fillStyle = '#ffffff';
            roundRect(ctx, 90, y, width - 180, 118, 18);
            ctx.fill();

            ctx.strokeStyle = '#f2d1b8';
            ctx.lineWidth = 2;
            roundRect(ctx, 90, y, width - 180, 118, 18);
            ctx.stroke();

            ctx.fillStyle = '#242424';
            ctx.font = '700 28px Segoe UI, Arial';
            ctx.fillText(`Grupo ${groupCounter++}`, 120, y + 42);

            ctx.fillStyle = '#505050';
            ctx.font = '500 26px Segoe UI, Arial';
            wrapText(ctx, group.join('  |  '), 120, y + 82, width - 240, 31);
            y += 146;
        });
    });

    ctx.fillStyle = '#242424';
    ctx.font = '500 23px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Bom cafe e boa conversa!', width / 2, height - 70);

    const link = document.createElement('a');
    link.download = `lanchinho-miner-${currentMonth}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    words.forEach((word, index) => {
        const testLine = line ? `${line} ${word}` : word;

        if (ctx.measureText(testLine).width > maxWidth && line) {
            ctx.fillText(line, x, y);
            line = word;
            y += lineHeight;
        } else {
            line = testLine;
        }

        if (index === words.length - 1 && line) ctx.fillText(line, x, y);
    });
}
