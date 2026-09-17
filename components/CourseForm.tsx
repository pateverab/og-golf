'use client';

import React, { useEffect, useState } from "react";
import {
  Course,
  Hole,
  SUGGESTED_COURSE_TEMPLATES,
  generateDefaultHoles,
} from "@/lib/calculations";

interface CourseFormProps {
  onSave: (course: Omit<Course, "id" | "createdAt">) => void;
  onCancel: () => void;
  /** When set, form is in edit mode and prefilled. */
  initialCourse?: Course | null;
}

export function CourseForm({ onSave, onCancel, initialCourse }: CourseFormProps) {
  const isEdit = !!initialCourse;
  const [name, setName] = useState(initialCourse?.name ?? "");
  const [location, setLocation] = useState(initialCourse?.location ?? "");
  const [holeCount, setHoleCount] = useState<9 | 18>(
    initialCourse && initialCourse.holes.length <= 9 ? 9 : 18
  );
  const [holes, setHoles] = useState<Hole[]>(
    initialCourse?.holes?.length
      ? initialCourse.holes.map((h) => ({ ...h }))
      : generateDefaultHoles(18)
  );

  useEffect(() => {
    if (!initialCourse) return;
    setName(initialCourse.name);
    setLocation(initialCourse.location);
    const count = initialCourse.holes.length <= 9 ? 9 : 18;
    setHoleCount(count);
    setHoles(initialCourse.holes.map((h) => ({ ...h })));
  }, [initialCourse]);

  const setHoleCountAndResize = (count: 9 | 18) => {
    setHoleCount(count);
    setHoles((prev) => {
      if (count === 9) {
        const front = prev.filter((h) => h.number <= 9);
        if (front.length === 9) return front.map((h, i) => ({ number: i + 1, par: h.par }));
        return generateDefaultHoles(9).map((h, i) => ({
          number: i + 1,
          par: front[i]?.par ?? h.par,
        }));
      }
      // Expand to 18, keep existing pars where possible
      const next = generateDefaultHoles(18);
      return next.map((h) => {
        const existing = prev.find((p) => p.number === h.number);
        return existing ? { ...existing } : h;
      });
    });
  };

  const loadTemplate = (template: (typeof SUGGESTED_COURSE_TEMPLATES)[number]) => {
    setName(template.name || "");
    setLocation(template.location || "");
    const count = template.holeCount === 9 ? 9 : 18;
    setHoleCount(count);
    const pars = template.suggestedPars || Array(count).fill(4);
    const newHoles = pars.slice(0, count).map((par: number, index: number) => ({
      number: index + 1,
      par: Number(par) || 4,
    }));
    setHoles(newHoles);
  };

  const updatePar = (holeNumber: number, newPar: number) => {
    setHoles((prev) =>
      prev.map((h) => (h.number === holeNumber ? { ...h, par: newPar } : h))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const normalizedHoles =
      holeCount === 9
        ? holes.filter((h) => h.number <= 9).slice(0, 9)
        : holes.length >= 18
          ? holes.slice(0, 18)
          : generateDefaultHoles(18).map((h) => {
              const existing = holes.find((p) => p.number === h.number);
              return existing ?? h;
            });
    onSave({
      name: name.trim(),
      location: location.trim(),
      holes: normalizedHoles.map((h, i) => ({ number: i + 1, par: h.par })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-1">Course Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-2">Hole Count</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHoleCountAndResize(9)}
            className={`p-4 rounded-2xl border text-left transition ${
              holeCount === 9
                ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]"
                : "border-golf-green-100 dark:border-[#2a5a48]"
            }`}
          >
            <div className="font-medium">9 Holes</div>
            <div className="text-xs text-[#c5a36f]/70 mt-0.5">True 9-hole layout</div>
          </button>
          <button
            type="button"
            onClick={() => setHoleCountAndResize(18)}
            className={`p-4 rounded-2xl border text-left transition ${
              holeCount === 18
                ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]"
                : "border-golf-green-100 dark:border-[#2a5a48]"
            }`}
          >
            <div className="font-medium">18 Holes</div>
            <div className="text-xs text-[#c5a36f]/70 mt-0.5">Full course</div>
          </button>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-[#c5a36f] mb-2">
            Quick Start Templates
          </label>
          <div className="space-y-2">
            {SUGGESTED_COURSE_TEMPLATES.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => loadTemplate(template)}
                className="w-full text-left p-4 rounded-2xl border border-golf-green-100 dark:border-[#2a5a48] hover:border-golf-gold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition-all"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-[#c5a36f]/70">
                  {template.location} • {template.holeCount} holes
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-3">
          Hole Pars (adjust if needed)
        </label>
        <div className="grid grid-cols-6 gap-3">
          {holes.map((hole) => (
            <div key={hole.number} className="text-center">
              <div className="text-xs text-[#c5a36f]/70 mb-1">H{hole.number}</div>
              <input
                type="number"
                value={hole.par}
                onChange={(e) => updatePar(hole.number, parseInt(e.target.value) || 4)}
                className="golf-input w-full text-center rounded py-2 font-semibold"
                min="3"
                max="6"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-golf-green-100 dark:border-[#2a5a48] font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-[#c5a36f] text-[#051b14] font-semibold"
        >
          {isEdit ? "Save Changes" : "Save Course"}
        </button>
      </div>
    </form>
  );
}
