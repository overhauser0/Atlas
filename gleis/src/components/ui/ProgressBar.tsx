interface ProgressBarProps {
  percent: number;
  fromColor: string;
  toColor: string;
  className?: string;
  fillClassName?: string;
}

export default function ProgressBar({
  percent,
  fromColor,
  toColor,
  className = '',
  fillClassName = '',
}: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div
      aria-hidden="true"
      className={`h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 ${className}`}
    >
      <div
        className={`h-full transition-all ${fillClassName}`}
        style={{
          width: `${clampedPercent}%`,
          backgroundImage: `linear-gradient(to right, ${fromColor}, ${toColor})`,
        }}
      />
    </div>
  );
}
