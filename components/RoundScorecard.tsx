import type { RoundExportData } from "@/lib/roundExport";

interface RoundScorecardProps {
  data: RoundExportData;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
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
                    <th style={{ padding: 6, textAlign: "center", backgroundColor: "#c5a36f", color: "#051b14" }}>
                      OUT
                    </th>
                    {back.map((h) => (
                      <th key={h.number} style={{ padding: 6, textAlign: "center" }}>
                        {h.number}
                      </th>
                    ))}
                    <th style={{ padding: 6, textAlign: "center", backgroundColor: "#c5a36f", color: "#051b14" }}>
                      IN
                    </th>
                    <th style={{ padding: 6, textAlign: "center", backgroundColor: "#0f3d24", color: "#c5a36f" }}>
                      TOT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {front.map((h) => (
                      <td key={`par-${h.number}`} style={{ padding: 6, textAlign: "center", color: "#5a6b62" }}>
                        {h.par}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {front.reduce((s, h) => s + h.par, 0)}
                    </td>
                    {back.map((h) => (
                      <td key={`par-${h.number}`} style={{ padding: 6, textAlign: "center", color: "#5a6b62" }}>
                        {h.par}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {back.reduce((s, h) => s + h.par, 0)}
                    </td>
                    <td style={{ padding: 6, textAlign: "center", fontWeight: 600 }}>
                      {front.reduce((s, h) => s + h.par, 0) + back.reduce((s, h) => s + h.par, 0)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    {front.map((h) => (
                      <td key={`score-${h.number}`} style={{ padding: 6, textAlign: "center" }}>
                        {h.score ?? "—"}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center" }}>{player.frontTotal || "—"}</td>
                    {back.map((h) => (
                      <td key={`score-${h.number}`} style={{ padding: 6, textAlign: "center" }}>
                        {h.score ?? "—"}
                      </td>
                    ))}
                    <td style={{ padding: 6, textAlign: "center" }}>{player.backTotal || "—"}</td>
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
                        {hole.score ?? "—"}
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        {hole.vsPar !== null ? formatVsPar(hole.vsPar) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: "#5a6b62", textAlign: "center", marginTop: 16 }}>
        Generated by OG Golf
      </div>
    </div>
  );
}