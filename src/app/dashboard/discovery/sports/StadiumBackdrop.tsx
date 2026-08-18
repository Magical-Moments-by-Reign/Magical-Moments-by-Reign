// A literal stadium illustration (floodlight towers + a tiered seating bowl)
// drawn in inline SVG — not a licensed photo, not a CSS-gradient abstraction
// that reads as random blur. Pure decoration behind the hero/header copy.

export default function StadiumBackdrop() {
  const towerX = [90, 290, 490, 690, 890, 1090];
  const seatRows = Array.from({ length: 7 }, (_, r) => 210 + r * 16);

  return (
    <svg className="stadium-backdrop" viewBox="0 0 1200 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="mm-glow" cx="50%" cy="0%" r="75%">
          <stop offset="0%" stopColor="#ffe9b0" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#e0b651" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e0b651" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* tiered seating bowl */}
      <g opacity="0.9">
        {seatRows.map((y, i) => {
          const inset = i * 34;
          const seatW = 22, gap = 6, count = Math.max(4, Math.round((1200 - inset * 2) / (seatW + gap)));
          const rowStart = (1200 - count * (seatW + gap)) / 2;
          return (
            <g key={y}>
              {Array.from({ length: count }, (_, s) => (
                <rect
                  key={s}
                  x={rowStart + s * (seatW + gap)}
                  y={y}
                  width={seatW}
                  height={10}
                  rx={2}
                  fill={s % 2 === 0 ? "#caa24a" : "#a9832f"}
                  opacity={0.22 + i * 0.05}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* floodlight towers */}
      {towerX.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="120" rx="130" ry="200" fill="url(#mm-glow)" />
          <rect x={x - 2.5} y="46" width="5" height="90" fill="#4a3f2c" />
          <rect x={x - 34} y="18" width="68" height="30" rx="4" fill="#100d09" stroke="#caa24a" strokeWidth="1.5" />
          {[0, 1, 2].map((col) =>
            [0, 1].map((row) => (
              <circle key={`${col}-${row}`} cx={x - 22 + col * 22} cy={26 + row * 14} r="3.4" fill="#ffe9b0" />
            ))
          )}
        </g>
      ))}
    </svg>
  );
}
