"use client";

export function ScoreDonut({
  score,
  size = 34,
}: {
  score: number;
  size?: number;
}) {
  const value = Math.max(0, Math.min(100, score || 0));
  const stroke = size * 0.12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      title={`Lead score: ${value}/100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeOpacity={0.18}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreDonutGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
        <defs>
          <linearGradient id="scoreDonutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--color-secondary)" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-primary)" }} />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="absolute font-semibold"
        style={{
          fontSize: Math.max(9, size * 0.3),
          color: "var(--color-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
