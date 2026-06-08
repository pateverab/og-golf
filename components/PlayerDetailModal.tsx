'use client';

import React from 'react';
import { Modal } from './Modal';
import { getPlayerHoleBreakdown, getTotalScoreForPlayerInRound, getScoreVsParForPlayerInRound } from '@/lib/calculations';
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

  const breakdown = getPlayerHoleBreakdown(playerScore, course);
  const totalScore = getTotalScoreForPlayerInRound(playerScore, course);
  const vsPar = getScoreVsParForPlayerInRound(playerScore, course);

  const getScoreColor = (vsPar: number | null) => {
    if (vsPar === null) return 'text-gray-400';
    if (vsPar < -1) return 'text-emerald-600 font-bold'; // Eagle or better
    if (vsPar === -1) return 'text-emerald-600';           // Birdie
    if (vsPar === 0) return 'text-gray-800';               // Par
    if (vsPar === 1) return 'text-orange-600';             // Bogey
    return 'text-red-600';                                 // Double bogey or worse
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
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <div className="text-sm text-gray-500">Total Score</div>
            <div className="text-3xl font-bold text-gray-900">{totalScore}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <div className="text-sm text-gray-500">Vs Par</div>
            <div className={`text-3xl font-bold ${vsPar >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {vsPar >= 0 ? '+' : ''}{vsPar}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <div className="text-sm text-gray-500">Handicap</div>
            <div className="text-3xl font-bold text-gray-900">{player.handicap}</div>
          </div>
        </div>

        {/* Hole by Hole Breakdown */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Hole by Hole</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Hole</th>
                  <th className="py-2 text-center font-medium">Par</th>
                  <th className="py-2 text-center font-medium">Score</th>
                  <th className="py-2 text-center font-medium">Vs Par</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((hole) => (
                  <tr key={hole.holeNumber} className="border-b hover:bg-gray-50">
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
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}