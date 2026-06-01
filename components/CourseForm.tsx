"use client";

import React, { useState } from "react";
import { Course, Hole, SUGGESTED_COURSE_TEMPLATES, generateDefaultHoles } from "@/lib/calculations";

interface CourseFormProps {
  onSave: (course: Omit<Course, "id" | "createdAt">) => void;
  onCancel: () => void;
  initialCourse?: Course;
}

export function CourseForm({ onSave, onCancel, initialCourse }: CourseFormProps) {
  const [name, setName] = useState(initialCourse?.name || "");
  const [location, setLocation] = useState(initialCourse?.location || "");
  const [holeCount, setHoleCount] = useState(initialCourse ? initialCourse.holes.length : 18);
  const [holes, setHoles] = useState<Hole[]>(
    initialCourse?.holes || generateDefaultHoles(18)
  );

  // Apply a suggested template
  const applyTemplate = (template: (typeof SUGGESTED_COURSE_TEMPLATES)[0]) => {
    setName(template.name);
    setLocation(template.location);
    const newCount = template.holeCount;
    setHoleCount(newCount);
    setHoles(generateDefaultHoles(newCount));
  };

  const updateHolePar = (holeNumber: number, newPar: number) => {
    const clamped = Math.max(3, Math.min(6, newPar));
    setHoles((prev) =>
      prev.map((h) => (h.number === holeNumber ? { ...h, par: clamped } : h))
    );
  };

  const adjustHolePar = (holeNumber: number, delta: number) => {
    const current = holes.find((h) => h.number === holeNumber)?.par ?? 4;
    updateHolePar(holeNumber, current + delta);
  };

  const changeHoleCount = (newCount: 9 | 18) => {
    setHoleCount(newCount);
    setHoles(generateDefaultHoles(newCount));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      location: location.trim(),
      holes: [...holes],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Suggested templates - compact on mobile */}
      {!initialCourse && (
        <div>
          <div className="text-xs font-medium text-[#c5a36f] mb-1.5">Quick templates (optional)</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_COURSE_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="px-2.5 py-1 text-[12px] rounded-lg border border-[#2a5a48] bg-[#153a2a] active:bg-[#2a5a48] text-[#c5a36f] transition"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-[#c5a36f]">Course Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="golf-input w-full rounded-xl px-4 py-2.5 text-base"
            placeholder="Augusta National"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-[#c5a36f]">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="golf-input w-full rounded-xl px-4 py-2.5 text-base"
            placeholder="Augusta, Georgia"
          />
        </div>
      </div>

      {/* Hole count selector - compact */}
      <div>
        <label className="block text-xs font-medium mb-1.5 text-[#c5a36f]">Number of Holes</label>
        <div className="flex gap-2">
          {[9, 18].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => changeHoleCount(count as 9 | 18)}
              className={`flex-1 py-2.5 rounded-xl border text-base font-semibold transition ${
                holeCount === count
                  ? "bg-[#c5a36f] text-[#051b14] border-[#c5a36f]"
                  : "border-[#2a5a48] bg-[#153a2a] text-[#f5f3eb]"
              }`}
            >
              {count} Holes
            </button>
          ))}
        </div>
      </div>

      {/* Per-hole par editor - tighter on mobile */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-[#c5a36f]">Par per Hole</label>
          <span className="text-[10px] text-[#c5a36f]/70">Tap + / −</span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
          {holes.map((hole) => (
            <div key={hole.number} className="text-center">
              <div className="text-[9px] text-[#c5a36f]/60 mb-px">H{hole.number}</div>
              <div className="flex items-center justify-center gap-px">
                <button
                  type="button"
                  onClick={() => adjustHolePar(hole.number, -1)}
                  className="score-btn !w-6 !h-6 !text-xs !font-bold border-[#2a5a48] active:bg-[#c5a36f] active:text-[#051b14]"
                  aria-label={`Decrease par for hole ${hole.number}`}
                >
                  −
                </button>
                <div className="w-7 text-center font-bold text-lg tabular-nums leading-none pt-0.5">
                  {hole.par}
                </div>
                <button
                  type="button"
                  onClick={() => adjustHolePar(hole.number, 1)}
                  className="score-btn !w-6 !h-6 !text-xs !font-bold border-[#2a5a48] active:bg-[#c5a36f] active:text-[#051b14]"
                  aria-label={`Increase par for hole ${hole.number}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 text-right text-sm text-[#c5a36f]">
          Total Par: <span className="font-semibold">{holes.reduce((s, h) => s + h.par, 0)}</span>
        </div>
      </div>

      {/* Actions - compact but still very tappable */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-[#2a5a48] text-sm font-semibold active:bg-[#2a5a48]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="golf-btn flex-1 py-3 rounded-2xl text-base font-semibold disabled:opacity-50"
        >
          {initialCourse ? "Save Changes" : "Add Course"}
        </button>
      </div>
    </form>
  );
}
