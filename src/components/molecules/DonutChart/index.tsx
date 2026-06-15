export interface PieItem {
  label: string;
  amount: number;
  color: string;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number, r: number, innerR: number,
  startDeg: number, endDeg: number,
) {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.9999;
  const s  = polarToCartesian(cx, cy, r,      startDeg);
  const e  = polarToCartesian(cx, cy, r,      endDeg);
  const si = polarToCartesian(cx, cy, innerR, startDeg);
  const ei = polarToCartesian(cx, cy, innerR, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ');
}

export function DonutChart({ items, total }: { items: PieItem[]; total: number }) {
  const cx = 80, cy = 80, r = 72, innerR = 46;
  let cumDeg = 0;
  return (
    <svg viewBox="0 0 160 160" style={{ width: '11rem', height: '11rem' }}>
      {items.map((item, i) => {
        const deg = (item.amount / total) * 360;
        const path = donutSlicePath(cx, cy, r, innerR, cumDeg, cumDeg + deg);
        cumDeg += deg;
        return <path key={i} d={path} fill={item.color} />;
      })}
      <text x={cx} y={cy - 7} textAnchor="middle" fill="#78716c" fontSize="9">合計</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#1c1917" fontSize="12" fontWeight="bold">
        ¥{total.toLocaleString('ja-JP')}
      </text>
    </svg>
  );
}
