"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Player, Round, Course } from "@/lib/types";
import { getPlayerStats } from "@/lib/calculations";
import { resolveTheme } from "@/lib/theme";

/** rgb()/rgba() string for an og-* theme token (see app/globals.css). */
function themeColor(varName: string, alpha = 1): string {
  if (typeof document === "undefined") return "currentColor";
  const channels = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!channels) return "currentColor";
  return alpha < 1 ? `rgb(${channels} / ${alpha})` : `rgb(${channels})`;
}

interface PlayerStatsViewProps {
  players: Player[];
  rounds: Round[];
  courses: Course[];
  onLoadTestData?: () => void;
  testDataLoaded?: boolean;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

export function PlayerStatsView({
  players,
  rounds,
  courses,
  onLoadTestData,
  testDataLoaded = false,
}: PlayerStatsViewProps) {
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setSelectedPlayerId((prev) => {
      if (prev && sortedPlayers.some((p) => p.id === prev)) return prev;
      return sortedPlayers[0]?.id ?? "";
    });
  }, [sortedPlayers]);

  useEffect(() => {
    const updateTheme = () => setIsDark(resolveTheme() === "dark");
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const completedRounds = useMemo(() => rounds.filter((r) => r.completed), [rounds]);
  const selectedPlayer = sortedPlayers.find((p) => p.id === selectedPlayerId);
  const stats = selectedPlayer
    ? getPlayerStats(selectedPlayer, completedRounds, courses)
    : null;

  // Recharts takes plain color strings: read the active scheme's tokens (re-read when the theme flips).
  const chartColors = {
    line: themeColor("--og-accent-line"),
    grid: themeColor("--og-border", isDark ? 0.35 : 0.25),
    axis: themeColor("--og-muted"),
    tooltipBg: themeColor("--og-raised"),
    tooltipBorder: themeColor("--og-border"),
    tooltipText: themeColor("--og-text"),
  };

  if (sortedPlayers.length === 0) {
    return (
      <div>
        <div className="mb-6 px-1">
          <h2 className="text-2xl font-semibold">Player Statistics</h2>
          <p className="text-sm text-og-muted mt-1">
            Track OG index trends and round performance over time. OG index is a simplified score — not USGA.
          </p>
        </div>
        <div className="golf-card rounded-3xl p-10 text-center">
          <p className="text-og-muted mb-6">
            Add players from the Home tab, or load sample data to explore stats, history, and the Live Leaderboard.
          </p>
          {onLoadTestData && (
            <button
              type="button"
              onClick={onLoadTestData}
              disabled={testDataLoaded}
              className="px-6 py-3 rounded-2xl border border-og-accent-line text-og-accent-text font-semibold hover:bg-og-raised transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testDataLoaded ? "Test Data Loaded" : "Load Test Data"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 px-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Player Statistics</h2>
          <p className="text-sm text-og-muted mt-1">
            Track OG index trends and round performance over time. OG index is a simplified score — not USGA.
          </p>
        </div>
        {onLoadTestData && !testDataLoaded && (
          <button
            type="button"
            onClick={onLoadTestData}
            className="shrink-0 px-4 py-2 rounded-xl border border-og-border text-sm text-og-accent-text font-medium hover:bg-og-raised transition"
          >
            Load Test Data
          </button>
        )}
      </div>

      {/* Player selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {sortedPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedPlayerId === player.id
                ? "bg-og-accent text-og-on-accent font-semibold"
                : "bg-og-surface text-og-accent-text hover:border-og-accent-line/40 border border-transparent"
            }`}
          >
            {player.name}
          </button>
        ))}
      </div>

      {selectedPlayer && stats && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-og-muted">Rounds Played</div>
              <div className="text-3xl font-semibold tabular-nums mt-1">{stats.totalRounds}</div>
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-og-muted">Avg Score</div>
              <div className="text-3xl font-semibold tabular-nums mt-1">
                {stats.totalRounds > 0 ? stats.averageScore : "—"}
              </div>
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-og-muted">Best Round</div>
              <div className="text-3xl font-semibold tabular-nums mt-1 text-og-success">
                {stats.bestRound ? stats.bestRound.totalScore : "—"}
              </div>
              {stats.bestRound && (
                <div className="text-[10px] text-og-muted mt-1 truncate">
                  {new Date(stats.bestRound.date).toLocaleDateString()} • {formatVsPar(stats.bestRound.scoreVsPar)}
                </div>
              )}
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-og-muted">Worst Round</div>
              <div className="text-3xl font-semibold tabular-nums mt-1 text-og-danger">
                {stats.worstRound ? stats.worstRound.totalScore : "—"}
              </div>
              {stats.worstRound && (
                <div className="text-[10px] text-og-muted mt-1 truncate">
                  {new Date(stats.worstRound.date).toLocaleDateString()} • {formatVsPar(stats.worstRound.scoreVsPar)}
                </div>
              )}
            </div>
          </div>

          {/* Handicap history chart */}
          <div className="golf-card rounded-3xl p-6">
            <div className="flex items-baseline justify-between mb-4 px-1">
              <div>
                <h3 className="text-lg font-semibold">OG Index History</h3>
                <p className="text-xs text-og-muted mt-0.5">
                  Current OG index: <span className="font-semibold text-og-accent-text">{selectedPlayer.handicap}</span>
                  <span className="text-og-muted"> · not USGA</span>
                </p>
              </div>
            </div>

            {stats.handicapHistory.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.handicapHistory}
                    margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      axisLine={{ stroke: chartColors.grid }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: chartColors.axis, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <ReferenceLine y={0} stroke={chartColors.grid} strokeDasharray="4 4" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: "12px",
                        fontSize: "13px",
                        color: chartColors.tooltipText,
                      }}
                      formatter={(value) => [value ?? "—", "OG Index"]}
                      labelFormatter={(_, payload) => {
                        const point = payload?.[0]?.payload;
                        if (!point?.date) return "";
                        return new Date(point.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="handicap"
                      stroke={chartColors.line}
                      strokeWidth={2.5}
                      dot={{ fill: chartColors.line, strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: chartColors.line, stroke: chartColors.tooltipBg, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-og-muted text-sm">
                Complete a round to start tracking OG index history.
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}