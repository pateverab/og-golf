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
  if (score === null) return <span className="text-og-muted">—</span>;
  const kind = scoreMark(score - par);
  const rings = markRingCount(kind);
  if (rings === 0) return <span className="font-semibold">{score}</span>;
  const circle = isCircleMark(kind);
  const color = circle ? "border-og-success" : isSquareMark(kind) ? "border-og-danger" : "border-og-accent-line";
  return (
    <span
      style={{ minWidth: size, height: size }}
      className={`inline-flex items-center justify-center px-1 border-2 font-semibold ${color} ${
        circle ? "rounded-full" : "rounded-[3px]"
      } ${rings > 1 ? "outline outline-2 outline-offset-1 " + (circle ? "outline-og-success" : "outline-og-danger") : ""}`}
    >
      {score}
    </span>
  );
}
