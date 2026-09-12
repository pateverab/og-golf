"use client";

import React, { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import { getPlayerStartingHandicap } from "@/lib/calculations";

interface PlayerFormProps {
  onSave: (name: string, nickname: string, startingHandicap: number) => void;
  onCancel: () => void;
  /** When set, form is in edit mode and prefilled. */
  initialPlayer?: Player | null;
  /** True when OG index is already calculated from rounds (starting HCP is fallback only). */
  hasCalculatedIndex?: boolean;
}

export function PlayerForm({
  onSave,
  onCancel,
  initialPlayer,
  hasCalculatedIndex = false,
}: PlayerFormProps) {
  const isEdit = !!initialPlayer;
  const [name, setName] = useState(initialPlayer?.name ?? "");
  const [nickname, setNickname] = useState(initialPlayer?.nickname ?? "");
  const [handicap, setHandicap] = useState(
    initialPlayer ? getPlayerStartingHandicap(initialPlayer) : 0
  );

  useEffect(() => {
    if (!initialPlayer) return;
    setName(initialPlayer.name);
    setNickname(initialPlayer.nickname ?? "");
    setHandicap(getPlayerStartingHandicap(initialPlayer));
  }, [initialPlayer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), nickname.trim(), handicap);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-[#c5a36f]">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3 text-lg"
          placeholder="Patrick Aguilar"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-[#c5a36f]">
          Nickname (optional)
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3"
          placeholder="Pat"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-[#c5a36f]">
          Starting OG Index
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={-10}
            max={40}
            step={0.5}
            value={handicap}
            onChange={(e) => setHandicap(parseFloat(e.target.value))}
            className="flex-1 accent-[#c5a36f]"
          />
          <div className="w-20">
            <input
              type="number"
              step={0.5}
              value={handicap}
              onChange={(e) => setHandicap(parseFloat(e.target.value) || 0)}
              className="golf-input w-full rounded-xl px-3 py-2 text-center text-xl font-semibold"
            />
          </div>
        </div>
        {isEdit && hasCalculatedIndex ? (
          <p className="text-xs text-[#c5a36f]/70 mt-1.5">
            Current OG index is {initialPlayer!.handicap} (from rounds). Editing updates the
            stored starting/fallback value; displayed index stays calculated until rounds change.
          </p>
        ) : (
          <p className="text-xs text-[#c5a36f]/70 mt-1.5">
            Kept until this player finishes ≥1 full round, then replaced by their OG index (not
            USGA).
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl border border-golf-green-200 dark:border-[#0f3d24] font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="golf-btn flex-1 py-3.5 rounded-xl disabled:opacity-50"
        >
          {isEdit ? "Save Changes" : "Add Player"}
        </button>
      </div>
    </form>
  );
}
