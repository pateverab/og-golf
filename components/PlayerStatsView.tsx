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

  const chartColors = {
    line: "#c5a36f",
    grid: isDark ? "rgba(197, 163, 111, 0.12)" : "rgba(5, 27, 20, 0.08)",
    axis: isDark ? "rgba(197, 163, 111, 0.6)" : "rgba(5, 27, 20, 0.45)",
    tooltipBg: isDark ? "#1f4a3a" : "#ffffff",
    tooltipBorder: isDark ? "#2a5a48" : "#d4e8d4",
    tooltipText: isDark ? "#f5f3eb" : "#051b14",
  };

  if (sortedPlayers.length === 0) {
    return (
      <div>
        <div className="mb-6 px-1">
          <h2 className="text-2xl font-semibold">Player Statistics</h2>
          <p className="text-sm text-[#c5a36f]/80 mt-1">
            Track handicap trends and round performance over time.
          </p>
        </div>
        <div className="golf-card rounded-3xl p-10 text-center">
          <p className="text-[#c5a36f]/70 mb-6">
            Add players from the Home tab, or load sample data to explore statistics and handicap charts.
          </p>
          {onLoadTestData && (
            <button
              type="button"
              onClick={onLoadTestData}
              disabled={testDataLoaded}
              className="px-6 py-3 rounded-2xl border border-[#c5a36f] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-sm text-[#c5a36f]/80 mt-1">
            Track handicap trends and round performance over time.
          </p>
        </div>
        {onLoadTestData && !testDataLoaded && (
          <button
            type="button"
            onClick={onLoadTestData}
            className="shrink-0 px-4 py-2 rounded-xl border border-[#c5a36f]/60 text-sm text-[#c5a36f] font-medium hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition"
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
                ? "bg-golf-gold text-golf-green-900 font-semibold"
                : "bg-golf-green-100 dark:bg-[#153a2a] text-[#c5a36f] hover:border-[#c5a36f]/40 border border-transparent"
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
              <div className="text-xs uppercase tracking-wider text-[#c5a36f]/70">Rounds Played</div>
              <div className="text-3xl font-semibold tabular-nums mt-1">{stats.totalRounds}</div>
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-[#c5a36f]/70">Avg Score</div>
              <div className="text-3xl font-semibold tabular-nums mt-1">
                {stats.totalRounds > 0 ? stats.averageScore : "—"}
              </div>
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-[#c5a36f]/70">Best Round</div>
              <div className="text-3xl font-semibold tabular-nums mt-1 text-emerald-400">
                {stats.bestRound ? stats.bestRound.totalScore : "—"}
              </div>
              {stats.bestRound && (
                <div className="text-[10px] text-[#c5a36f]/60 mt-1 truncate">
                  {new Date(stats.bestRound.date).toLocaleDateString()} • {formatVsPar(stats.bestRound.scoreVsPar)}
                </div>
              )}
            </div>
            <div className="golf-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-[#c5a36f]/70">Worst Round</div>
              <div className="text-3xl font-semibold tabular-nums mt-1 text-red-400">
                {stats.worstRound ? stats.worstRound.totalScore : "—"}
              </div>
              {stats.worstRound && (
                <div className="text-[10px] text-[#c5a36f]/60 mt-1 truncate">
                  {new Date(stats.worstRound.date).toLocaleDateString()} • {formatVsPar(stats.worstRound.scoreVsPar)}
                </div>
              )}
            </div>
          </div>

          {/* Handicap history chart */}
          <div className="golf-card rounded-3xl p-6">
            <div className="flex items-baseline justify-between mb-4 px-1">
              <div>
                <h3 className="text-lg font-semibold">Handicap History</h3>
                <p className="text-xs text-[#c5a36f]/70 mt-0.5">
                  Current: <span className="font-semibold text-[#c5a36f]">{selectedPlayer.handicap}</span>
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
                      formatter={(value) => [value ?? "—", "Handicap"]}
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
              <div className="h-48 flex items-center justify-center text-[#c5a36f]/60 text-sm">
                Complete a round to start tracking handicap history.
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
}