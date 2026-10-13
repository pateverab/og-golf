"use client";

import React, { useEffect, useState } from "react";
import type { Player, TeeGender } from "@/lib/types";
import { optionTileClass } from "@/lib/selectable";
import { getPlayerStartingHandicap } from "@/lib/calculations";
import { WHS_MAX_INDEX } from "@/lib/whs";

interface PlayerFormProps {
  onSave: (name: string, nickname: string, startingHandicap: number, gender: TeeGender) => void;
  /** Omit to hide Cancel (first-run Me setup has nothing to cancel to). */
  onCancel?: () => void;
  /** Overrides the submit label for a new player. */
  submitLabel?: string;
  /** When set, form is in edit mode and prefilled. */
  initialPlayer?: Player | null;
  /** True when OG index is already calculated from rounds (starting HCP is fallback only). */
  hasCalculatedIndex?: boolean;
}

export function PlayerForm({
  onSave,
  onCancel,
  submitLabel,
  initialPlayer,
  hasCalculatedIndex = false,
}: PlayerFormProps) {
  const isEdit = !!initialPlayer;
  const [name, setName] = useState(initialPlayer?.name ?? "");
  const [nickname, setNickname] = useState(initialPlayer?.nickname ?? "");
  const [handicap, setHandicap] = useState(
    initialPlayer ? getPlayerStartingHandicap(initialPlayer) : 0
  );

  const [gender, setGender] = useState<TeeGender>(initialPlayer?.gender ?? "men");

  useEffect(() => {
    if (!initialPlayer) return;
    setGender(initialPlayer.gender ?? "men");
    setName(initialPlayer.name);
    setNickname(initialPlayer.nickname ?? "");
    setHandicap(getPlayerStartingHandicap(initialPlayer));
  }, [initialPlayer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), nickname.trim(), handicap, gender);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5 text-og-accent-text">Full Name</label>
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
        <label className="block text-sm font-medium mb-1.5 text-og-accent-text">
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
        <label className="block text-sm font-medium mb-1.5 text-og-accent-text">
          Starting OG Index
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={-10}
            max={WHS_MAX_INDEX}
            step={0.5}
            value={handicap}
            onChange={(e) => setHandicap(parseFloat(e.target.value))}
            className="flex-1 accent-og-accent"
          />
          <div className="w-20">
            <input
              type="number"
              step={0.5}
              value={handicap}
              min={-10}
              max={WHS_MAX_INDEX}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                setHandicap(Math.min(WHS_MAX_INDEX, Math.max(-10, v)));
              }}
              className="golf-input w-full rounded-xl px-3 py-2 text-center text-xl font-semibold"
            />
          </div>
        </div>
        {isEdit && hasCalculatedIndex ? (
          <p className="text-xs text-og-muted mt-1.5">
            Current OG index is {initialPlayer!.handicap} (from rounds). Editing updates the
            stored starting/fallback value; displayed index stays calculated until rounds change.
          </p>
        ) : (
          <p className="text-xs text-og-muted mt-1.5">
            Kept until this player finishes ≥1 full round, then replaced by their OG index (not
            USGA).
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5 text-og-accent-text">Tee ratings</label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tee ratings">
          {(["men", "women"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              data-control={`gender-${g}`}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition ${optionTileClass(gender === g)}`}
            >
              {g === "men" ? "Men's" : "Women's"}
            </button>
          ))}
        </div>
        <p className="text-xs text-og-muted mt-1.5">Which course rating and slope to use by default. You can change it per round.</p>
      </div>

      <div className="flex gap-3 pt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border border-og-border font-semibold"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!name.trim()}
          className="golf-btn flex-1 py-3.5 rounded-xl disabled:opacity-50"
        >
          {isEdit ? "Save Changes" : submitLabel ?? "Add Player"}
        </button>
      </div>
    </form>
  );
}
