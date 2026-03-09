/**
 * Utility functions for URL-based state sharing without external dependencies.
 * Uses native btoa/atob with UTF-8 support.
 */

export const encodeShareData = (data: any): string => {
    try {
        const jsonStr = JSON.stringify(data);
        const utf8Str = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode(parseInt(p1, 16))
        );
        const base64 = btoa(utf8Str);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (err) {
        console.error("Failed to encode share data", err);
        return "";
    }
};

export const decodeShareData = (encodedData: string): any => {
    try {
        let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const utf8Str = atob(base64);
        const jsonStr = decodeURIComponent(utf8Str.split('').map((c) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("Failed to decode share data", err);
        return null;
    }
};

// --- Canvas-based share card renderer ---
// Draws the summary card directly to a Canvas element -- no hidden DOM node,
// no html2canvas, no cross-origin issues, no reflow.

const COLOR_HEX: Record<string, string> = {
    'bg-indigo-500': '#6366f1',
    'bg-emerald-500': '#10b981',
    'bg-rose-500': '#f43f5e',
    'bg-amber-500': '#f59e0b',
    'bg-violet-500': '#8b5cf6',
    'bg-cyan-500': '#06b6d4',
    'bg-orange-500': '#f97316',
    'bg-fuchsia-500': '#d946ef',
};

const ANIMALS = ['\uD83D\uDC16', '\uD83D\uDC31', '\uD83D\uDC30', '\uD83E\uDD8A', '\uD83D\uDC3B', '\uD83D\uDC3C', '\uD83D\uDC28', '\uD83D\uDC2F', '\uD83E\uDD81', '\uD83D\uDC2E'];

interface PersonTotal {
    id: string;
    name: string;
    color: string;
    total: number;
    paid: number;
    balance: number;
}

interface Settlement {
    from: string;
    to: string;
    amount: number;
}

function calculateSettlements(totals: PersonTotal[]): Settlement[] {
    const debtors = totals.filter(t => t.balance < -0.01).map(t => ({ ...t, balance: Math.abs(t.balance) }));
    const creditors = totals.filter(t => t.balance > 0.01).map(t => ({ ...t }));
    const settlements: Settlement[] = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(debtors[d].balance, creditors[c].balance);
        settlements.push({ from: debtors[d].name, to: creditors[c].name, amount });
        debtors[d].balance -= amount;
        creditors[c].balance -= amount;
        if (debtors[d].balance < 0.01) d++;
        if (creditors[c].balance < 0.01) c++;
    }
    return settlements;
}

export async function renderSummaryCanvas(
    totals: PersonTotal[],
    formatCurrency: (n: number) => string,
    totalBill: number
): Promise<Blob> {
    const DPR = 2;
    const W = 360;
    const PADDING = 24;
    const ROW_H = 52;
    const settlements = calculateSettlements(totals);

    // Calculate canvas height dynamically
    const sectionHeaderH = 28;
    const cardPad = 16;
    const settleRows = Math.max(settlements.length, 1);
    const personRows = totals.length;
    const height =
        PADDING +
        sectionHeaderH + cardPad + settleRows * ROW_H + cardPad +
        16 + // gap
        sectionHeaderH + cardPad + personRows * ROW_H + cardPad +
        16 + // gap
        40 + // total row
        PADDING;

    const canvas = document.createElement('canvas');
    canvas.width = W * DPR;
    canvas.height = height * DPR;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, height);

    let y = PADDING;

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    // Settlements section
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('PENYELESAIAN', PADDING, y + 14);
    y += sectionHeaderH;

    const settleCardH = cardPad * 2 + settleRows * ROW_H;
    ctx.fillStyle = '#f9fafb';
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    drawRoundRect(PADDING, y, W - PADDING * 2, settleCardH, 16);
    ctx.fill();
    ctx.stroke();

    if (settlements.length === 0) {
        ctx.font = '500 13px system-ui, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('Semua sudah lunas! \uD83C\uDF89', W / 2, y + cardPad + ROW_H / 2 + 5);
        ctx.textAlign = 'left';
    } else {
        settlements.forEach((s, i) => {
            const rowY = y + cardPad + i * ROW_H;
            ctx.fillStyle = '#eef2ff';
            drawRoundRect(PADDING + 8, rowY + 6, W - PADDING * 2 - 16, ROW_H - 12, 12);
            ctx.fill();

            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillStyle = '#1f2937';
            ctx.fillText(s.from, PADDING + 16, rowY + ROW_H / 2 + 4);

            ctx.font = '500 10px system-ui, sans-serif';
            ctx.fillStyle = '#818cf8';
            ctx.fillText('\u2192', PADDING + 16 + ctx.measureText(s.from).width + 6, rowY + ROW_H / 2 + 4);

            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.fillStyle = '#1f2937';
            const arrowW = ctx.measureText('\u2192').width;
            ctx.fillText(s.to, PADDING + 16 + ctx.measureText(s.from).width + arrowW + 14, rowY + ROW_H / 2 + 4);

            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.fillStyle = '#4f46e5';
            ctx.textAlign = 'right';
            ctx.fillText(formatCurrency(s.amount), W - PADDING - 16, rowY + ROW_H / 2 + 4);
            ctx.textAlign = 'left';
        });
    }
    y += settleCardH + 16;

    // Per-person section
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('RINGKASAN PER ORANG', PADDING, y + 14);
    y += sectionHeaderH;

    totals.forEach((person, i) => {
        const rowY = y;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        drawRoundRect(PADDING, rowY, W - PADDING * 2, ROW_H - 4, 16);
        ctx.fill();
        ctx.stroke();

        const cx = PADDING + 20, cy = rowY + (ROW_H - 4) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_HEX[person.color] || '#6366f1';
        ctx.fill();

        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText(ANIMALS[i % ANIMALS.length], cx, cy + 5);
        ctx.textAlign = 'left';

        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.fillText(person.name, PADDING + 42, cy + 5);

        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(person.total), W - PADDING - 8, cy + 5);
        ctx.textAlign = 'left';

        y += ROW_H;
    });

    y += 16;

    // Total row
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(W - PADDING, y);
    ctx.stroke();
    y += 12;

    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('TOTAL', PADDING, y + 14);

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(totalBill), W - PADDING, y + 14);
    ctx.textAlign = 'left';

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
        }, 'image/png');
    });
}
