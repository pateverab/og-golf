import type { CSSProperties, ReactNode } from "react";
import type { RoundExportData } from "@/lib/roundExport";
import {
  SCORE_MARK_LEGEND,
  isCircleMark,
  markRingCount,
  scoreMark,
  type ScoreMarkKind,
} from "@/lib/scoreMarks";

interface RoundScorecardProps {
  data: RoundExportData;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

const STROKE_UNDER = "#0f3d24";
const STROKE_OVER = "#8b2942";
const STROKE_GOLD = "#c5a36f";

function markStroke(kind: ScoreMarkKind): string {
  if (isCircleMark(kind)) return STROKE_UNDER;
  if (kind === "bogey" || kind === "double") return STROKE_OVER;
  return STROKE_GOLD;
}

/** Nested concentric circle/square around the score digit. */
function MarkedScore({
  score,
  vsPar,
}: {
  score: number | null;
  vsPar: number | null;
}) {
  if (score === null || vsPar === null) {
    return <span style={{ color: "#5a6b62" }}>—</span>;
  }

  const kind = scoreMark(vsPar);
  const rings = markRingCount(kind);
  if (rings === 0) {
    return <span>{score}</span>;
  }

  const circle = isCircleMark(kind);
  const stroke = markStroke(kind);
  const radius = circle ? 999 : 2;

  let node: ReactNode = (
    <span
      style={{
        fontWeight: 700,
        fontSize: 11,
        lineHeight: 1,
        color: "#051b14",
        padding: "0 1px",
      }}
    >
      {score}
    </span>
  );

  // Innermost → outermost: each ring adds border + padding
  for (let i = 0; i < rings; i++) {
    node = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          border: `1.5px solid ${stroke}`,
          borderRadius: radius,
          padding: i === 0 ? "2px 4px" : "1.5px",
          minWidth: i === rings - 1 ? 22 : undefined,
          minHeight: i === rings - 1 ? 22 : undefined,
        }}
      >
        {node}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 26,
      }}
    >
      {node}
    </span>
  );
}

function Legend({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "#5a6b62",
        letterSpacing: "0.02em",
        marginTop: 8,
        ...style,
      }}
    >
      {SCORE_MARK_LEGEND}
    </div>
  );
}

export function RoundScorecard({ data }: RoundScorecardProps) {
  return (
    <div
      style={{
        width: 720,
        backgroundColor: "#ffffff",
        color: "#051b14",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: 32,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "#0f3d24",
          color: "#c5a36f",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>OG Golf</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Official Scorecard</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{data.courseName}</div>
        <div style={{ fontSize: 13, color: "#5a6b62", marginTop: 4 }}>{data.courseLocation}</div>
        <div style={{ fontSize: 13, color: "#5a6b62", marginTop: 2 }}>{data.dateLabel}</div>
        <div style={{ fontSize: 12, color: "#c5a36f", marginTop: 6, fontWeight: 600 }}>
          {data.formatLabel}
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 28,
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#0f3d24", color: "#c5a36f" }}>
            <th style={{ padding: "10px 12px", textAlign: "left" }}>Player</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Total</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>vs Par</th>
          </tr>
        </thead>
        <tbody>
          {data.players.map((player, index) => (
            <tr
              key={player.name}
              style={{ backgroundColor: index % 2 === 0 ? "#f0f7f0" : "#ffffff" }}
            >
              <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                {player.name}
                {player.nickname ? ` (${player.nickname})` : ""}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>
                {player.total}
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontWeight: 600,
                  color: player.vsPar < 0 ? "#059669" : player.vsPar > 0 ? "#dc2626" : "#5a6b62",
                }}
              >
                {formatVsPar(player.vsPar)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.players.map((player) => {
        const is18 = player.holes.length > 9;
        const front = player.holes.filter((h) => h.number <= 9);
        const back = player.holes.filter((h) => h.number > 9);

        return (
          <div key={player.name} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 8,
                borderBottom: "2px solid #c5a36f",
                paddingBottom: 6,
              }}
            >
              {player.name} — {player.total} ({formatVsPar(player.vsPar)})
            </div>

            {is18 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ backgroundColor: "#d4e8d4" }}>
                    {front.map((h) => (
                      <th key={h.number} style={{ padding: 6, textAlign: "center" }}>
                        {h.number}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: 6,
                        textAlign: "center",
                        backgroundColor: "#c5a36f",
                        color: "#051b14",
                      }}
                    >
                      OUT
                    </th>
                    {back.map((h) => (
                      <th key={h.number} style={{ padding: 6, textAlign: "center" }}>
                        {h.number}
                      </th>
                    ))}
                    <th
                      style={{
                        padding: 6,
                        textAlign: "center",
                        backgroundColor: "#c5a36f",
                        color: "#051b14",
                      }}
                    >
                      IN
                    </th>
                    <th
                      style={{
                        padding: 6,
                        textAlign: "center",
                        backgroundColor: "#0f3d24",
                        color: "#c5a36f",
                      }}
                    >
                      TOT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {front.map((h) => (
                      <td
                        key={`par-${h.number}`}
                        style={{ padding: 6, textAlign: "center", color: "#5a6b62" }}
                      >
                        {h.par}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {front.reduce((s, h) => s + h.par, 0)}
                    </td>
                    {back.map((h) => (
                      <td
                        key={`par-${h.number}`}
                        style={{ padding: 6, textAlign: "center", color: "#5a6b62" }}
                      >
                        {h.par}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {back.reduce((s, h) => s + h.par, 0)}
                    </td>
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {front.reduce((s, h) => s + h.par, 0) +
                        back.reduce((s, h) => s + h.par, 0)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    {front.map((h) => (
                      <td key={`score-${h.number}`} style={{ padding: 4, textAlign: "center" }}>
                        <MarkedScore score={h.score} vsPar={h.vsPar} />
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center" }}>
                      {player.frontTotal || "—"}
                    </td>
                    {back.map((h) => (
                      <td key={`score-${h.number}`} style={{ padding: 4, textAlign: "center" }}>
                        <MarkedScore score={h.score} vsPar={h.vsPar} />
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center" }}>
                      {player.backTotal || "—"}
                    </td>
                    <td style={{ padding: 6, textAlign: "center" }}>{player.total}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#d4e8d4" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>Hole</th>
                    <th style={{ padding: 8, textAlign: "center" }}>Par</th>
                    <th style={{ padding: 8, textAlign: "center" }}>Score</th>
                    <th style={{ padding: 8, textAlign: "center" }}>vs Par</th>
                  </tr>
                </thead>
                <tbody>
                  {player.holes.map((hole, index) => (
                    <tr
                      key={hole.number}
                      style={{ backgroundColor: index % 2 === 0 ? "#f0f7f0" : "#ffffff" }}
                    >
                      <td style={{ padding: 8 }}>#{hole.number}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{hole.par}</td>
                      <td style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>
                        <MarkedScore score={hole.score} vsPar={hole.vsPar} />
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        {hole.vsPar !== null ? formatVsPar(hole.vsPar) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <Legend />
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: "#5a6b62", textAlign: "center", marginTop: 16 }}>
        Generated by OG Golf · {SCORE_MARK_LEGEND}
      </div>
    </div>
  );
}
