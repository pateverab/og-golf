'use client';

import React from 'react';
import { Modal } from './Modal';
import {
  getPlayerHoleBreakdown,
  getTotalScoreForPlayerInRound,
  getScoreVsParForPlayerInRound,
  getRoundFormatLabel,
} from '@/lib/calculations';
import type { Player, Round, Course, PlayerRoundScore } from '@/lib/types';

interface PlayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  round: Round | null;
  course: Course | null;
  playerScore: PlayerRoundScore | null;
}

export function PlayerDetailModal({
  isOpen,
  onClose,
  player,
  round,
  course,
  playerScore,
}: PlayerDetailModalProps) {
  if (!isOpen || !player || !course || !playerScore) return null;

  const roundConfig = round
    ? {
        roundLength: round.roundLength,
        nineSide: round.nineSide,
        startingHole: round.startingHole,
      }
    : undefined;
  const breakdown = getPlayerHoleBreakdown(playerScore, course, roundConfig);
  const totalScore = getTotalScoreForPlayerInRound(playerScore, course);
  const vsPar = getScoreVsParForPlayerInRound(playerScore, course);
  const formatLabel = getRoundFormatLabel(course, roundConfig);

  const getScoreColor = (vsPar: number | null) => {
    if (vsPar === null) return 'text-og-muted';
    if (vsPar < -1) return 'text-og-success font-bold'; // Eagle or better
    if (vsPar === -1) return 'text-og-success';           // Birdie
    if (vsPar === 0) return 'text-og-text';               // Par
    if (vsPar === 1) return 'text-og-danger';             // Bogey
    return 'text-og-danger';                                 // Double bogey or worse
  };

  const getScoreEmoji = (vsPar: number | null) => {
    if (vsPar === null) return '';
    if (vsPar < -1) return '🦅';
    if (vsPar === -1) return '🐦';
    if (vsPar === 0) return '⭕';
    if (vsPar === 1) return '⛳';
    return '💥';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Round Details - ${player.name}`}>
      <div className="space-y-6">
        <div className="text-sm text-og-muted">{formatLabel}</div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-og-surface p-4 rounded-xl text-center">
            <div className="text-sm text-og-muted">Total Score</div>
            <div className="text-3xl font-bold text-og-text">{totalScore}</div>
          </div>
          <div className="bg-og-surface p-4 rounded-xl text-center">
            <div className="text-sm text-og-muted">Vs Par</div>
            <div className={`text-3xl font-bold ${vsPar >= 0 ? 'text-og-danger' : 'text-og-success'}`}>
              {vsPar >= 0 ? '+' : ''}{vsPar}
            </div>
          </div>
          <div className="bg-og-surface p-4 rounded-xl text-center">
            <div className="text-sm text-og-muted">OG Index</div>
            <div className="text-3xl font-bold text-og-text">{player.handicap}</div>
            <div className="text-[10px] text-og-muted mt-1">Not USGA</div>
          </div>
        </div>

        {/* Hole by Hole Breakdown */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Hole by Hole</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-og-border">
                  <th className="py-2 text-left font-medium">Hole</th>
                  <th className="py-2 text-center font-medium">Par</th>
                  <th className="py-2 text-center font-medium">Score</th>
                  <th className="py-2 text-center font-medium">Vs Par</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((hole) => (
                  <tr key={hole.holeNumber} className="border-b border-og-border hover:bg-og-surface/50">
                    <td className="py-3 font-medium">#{hole.holeNumber}</td>
                    <td className="py-3 text-center">{hole.par}</td>
                    <td className="py-3 text-center font-semibold">
                      {hole.score !== null ? hole.score : '-'}
                    </td>
                    <td className={`py-3 text-center font-medium ${getScoreColor(hole.vsPar)}`}>
                      {hole.vsPar !== null ? (
                        <>
                          {getScoreEmoji(hole.vsPar)} {hole.vsPar >= 0 ? '+' : ''}{hole.vsPar}
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="golf-btn px-6 py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}