import { isCircleMark, isSquareMark, markRingCount, scoreMark } from "@/lib/scoreMarks";

/** Score digit with the scorecard mark (○ under par, □ over par), sized for compact grids. */
export function MarkedScore({
  score,
  par,
  size = 26,
}: {
  score: number | null;
  par: number;
  size?: number;
}) {
  if (score === null) return <span className="text-[#c5a36f]/40">—</span>;
  const kind = scoreMark(score - par);
  const rings = markRingCount(kind);
  if (rings === 0) return <span className="font-semibold">{score}</span>;
  const circle = isCircleMark(kind);
  const color = circle ? "border-emerald-500" : isSquareMark(kind) ? "border-red-400" : "border-[#c5a36f]";
  return (
    <span
      style={{ minWidth: size, height: size }}
      className={`inline-flex items-center justify-center px-1 border-2 font-semibold ${color} ${
        circle ? "rounded-full" : "rounded-[3px]"
      } ${rings > 1 ? "outline outline-2 outline-offset-1 " + (circle ? "outline-emerald-500/60" : "outline-red-400/60") : ""}`}
    >
      {score}
    </span>
  );
}
