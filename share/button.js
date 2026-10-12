// Draws a simulated button the same way app/_components/alignment-cell.tsx does:
// the content area (ascent + |descent|) is centered in the line box and the text sits on
// the resulting baseline. Metrics are illustrative, in 1000 units/em, with Inter's cap height.
const CAP = 727;

function buttonSvg({ ascent, descent, width = 360, fontSize = 40, tone = 'before', text = 'Button', guides = true, arrow = true, band = false }) {
  const lineHeight = fontSize * 1.2;
  const padY = fontSize * 0.45;
  const margin = 10;
  const boxH = lineHeight + padY * 2;
  const h = boxH + margin * 2;
  const s = fontSize / 1000;
  const boxTop = margin;
  const baseline = boxTop + padY + (lineHeight - (ascent - descent) * s) / 2 + ascent * s;
  const capTop = baseline - CAP * s;
  const boxCenter = boxTop + boxH / 2;
  const glyphCenter = boxCenter + ((ascent + descent - CAP) / 2) * s;
  const centered = Math.abs(glyphCenter - boxCenter) < 0.4;
  const color = centered ? '#788c5d' : '#c6613f';
  const gx1 = width * 0.1, gx2 = width * 0.9;
  const sw = Math.max(1, fontSize / 30);
  const uid = ++buttonSvg.n;
  return `<svg viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="${boxTop}" width="${width - 16}" height="${boxH}" rx="${boxH / 2}"
      fill="${tone === 'before' ? '#f0eee6' : '#ffffff'}" stroke="${tone === 'before' ? '#d1cfc5' : '#141413'}" stroke-width="${sw}"/>
    ${band ? `<clipPath id="c${uid}"><rect x="8" y="${boxTop}" width="${width - 16}" height="${boxH}" rx="${boxH / 2}"/></clipPath>
    <rect clip-path="url(#c${uid})" x="0" y="${capTop}" width="${width}" height="${baseline - capTop}" fill="${centered ? '#e3e8da' : '#f3ddd3'}"/>` : ''}
    ${guides ? `
    <line x1="${gx1}" x2="${gx2}" y1="${capTop}" y2="${capTop}" stroke="#6a9bcc" stroke-width="${sw}" stroke-dasharray="${sw} ${sw * 3}"/>
    <line x1="${gx1}" x2="${gx2}" y1="${baseline}" y2="${baseline}" stroke="#6a9bcc" stroke-width="${sw}" stroke-dasharray="${sw} ${sw * 3}"/>` : ''}
    <text x="${width / 2}" y="${baseline}" text-anchor="middle" font-size="${fontSize}" font-family="Inter" font-weight="500" fill="#141413">${text}</text>
    <line x1="0" x2="${width}" y1="${boxCenter}" y2="${boxCenter}" stroke="#141413" stroke-opacity="0.45" stroke-width="${sw}" stroke-dasharray="${sw * 5} ${sw * 4}"/>
    ${band ? '' : `<line x1="${gx1}" x2="${gx2}" y1="${glyphCenter}" y2="${glyphCenter}" stroke="${color}" stroke-width="${sw * 2}"/>`}
    ${!centered && arrow ? `<g stroke="${color}" stroke-width="${sw * 2}">
      <line x1="${width - 26}" x2="${width - 26}" y1="${boxCenter}" y2="${glyphCenter}"/>
      <line x1="${width - 33}" x2="${width - 19}" y1="${glyphCenter}" y2="${glyphCenter}"/>
      <line x1="${width - 33}" x2="${width - 19}" y1="${boxCenter}" y2="${boxCenter}"/></g>` : ''}
  </svg>`;
}

buttonSvg.n = 0;

// Exaggerated so the offset reads at thumbnail size. Fixed: ascent - |descent| = cap height.
const METRICS = {
  mac: { ascent: 1207, descent: -140 },     // +170 units: sits low
  windows: { ascent: 940, descent: -473 },  // -130 units: sits high
  linux: { ascent: 1080, descent: -233 },   // +60 units: slightly low
  fixed: { ascent: 1000, descent: -273 },   // 0: centered
};

document.querySelectorAll('[data-button]').forEach((el) => {
  const m = METRICS[el.dataset.button];
  el.innerHTML = buttonSvg({
    ...m,
    width: Number(el.dataset.width || 360),
    fontSize: Number(el.dataset.size || 40),
    tone: el.dataset.button === 'fixed' || el.dataset.tone === 'after' ? 'after' : 'before',
    text: el.dataset.text || 'Button',
    guides: el.dataset.guides !== 'off',
    band: el.dataset.band === 'on',
  });
});
