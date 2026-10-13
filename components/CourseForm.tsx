'use client';

import { optionSubtextClass, optionTileClass } from "@/lib/selectable";
import React, { useEffect, useState } from "react";
import {
  Course,
  Hole,
  SUGGESTED_COURSE_TEMPLATES,
  generateDefaultHoles,
} from "@/lib/calculations";
import type { Tee } from "@/lib/types";
import { validateStrokeIndexes, validateTees } from "@/lib/tees";
import { generateId } from "@/lib/utils";

/** Editable tee row: numbers kept as strings while typing. */
interface TeeDraft {
  id: string;
  name: string;
  color: string;
  par: string;
  menRating: string;
  menSlope: string;
  womenRating: string;
  womenSlope: string;
}

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

function teeToDraft(t: Tee): TeeDraft {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    par: String(t.par),
    menRating: str(t.men?.rating),
    menSlope: str(t.men?.slope),
    womenRating: str(t.women?.rating),
    womenSlope: str(t.women?.slope),
  };
}

/** Draft → Tee plus errors for half-filled ratings. */
function draftToTee(d: TeeDraft): { tee: Tee; errors: string[] } {
  const errors: string[] = [];
  const label = d.name.trim() || "Tee";
  const pair = (gender: string, rating: string, slope: string) => {
    const hasR = rating.trim() !== "";
    const hasS = slope.trim() !== "";
    if (!hasR && !hasS) return undefined;
    if (hasR !== hasS) {
      errors.push(`${label}: enter both ${gender} rating and slope (or neither).`);
      return undefined;
    }
    return { rating: Number(rating), slope: Number(slope) };
  };
  const men = pair("men's", d.menRating, d.menSlope);
  const women = pair("women's", d.womenRating, d.womenSlope);
  const tee: Tee = {
    id: d.id,
    name: d.name.trim(),
    color: d.color,
    par: Number(d.par),
    ...(men ? { men } : {}),
    ...(women ? { women } : {}),
  };
  return { tee, errors };
}

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
  const [tees, setTees] = useState<TeeDraft[]>((initialCourse?.tees ?? []).map(teeToDraft));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!initialCourse) return;
    setName(initialCourse.name);
    setLocation(initialCourse.location);
    const count = initialCourse.holes.length <= 9 ? 9 : 18;
    setHoleCount(count);
    setHoles(initialCourse.holes.map((h) => ({ ...h })));
    setTees((initialCourse.tees ?? []).map(teeToDraft));
  }, [initialCourse]);

  const setHoleCountAndResize = (count: 9 | 18) => {
    setHoleCount(count);
    setHoles((prev) => {
      if (count === 9) {
        const front = prev.filter((h) => h.number <= 9);
        if (front.length === 9) return front.map((h, i) => ({ ...h, number: i + 1 }));
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
      ...(template.strokeIndex?.[index] ? { strokeIndex: template.strokeIndex[index] } : {}),
    }));
    setHoles(newHoles);
    setTees((template.tees ?? []).map(teeToDraft));
    setErrors([]);
  };

  const updateStrokeIndex = (holeNumber: number, raw: string) => {
    const v = raw.trim() === "" ? undefined : parseInt(raw, 10);
    setHoles((prev) =>
      prev.map((h) => {
        if (h.number !== holeNumber) return h;
        const next = { ...h };
        if (v === undefined || Number.isNaN(v)) delete next.strokeIndex;
        else next.strokeIndex = v;
        return next;
      })
    );
  };

  const updateTee = (id: string, patch: Partial<TeeDraft>) =>
    setTees((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTee = (id: string) => setTees((prev) => prev.filter((t) => t.id !== id));
  const addTee = () =>
    setTees((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        color: "#f5f5f0",
        par: String(holes.reduce((sum, h) => sum + h.par, 0)),
        menRating: "",
        menSlope: "",
        womenRating: "",
        womenSlope: "",
      },
    ]);

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
    const finalHoles = normalizedHoles.map((h, i) => ({
      number: i + 1,
      par: h.par,
      ...(h.strokeIndex !== undefined ? { strokeIndex: h.strokeIndex } : {}),
    }));
    const converted = tees.map(draftToTee);
    const finalTees = converted.map((c) => c.tee);
    const problems = [
      ...validateStrokeIndexes(finalHoles.map((h) => h.strokeIndex)),
      ...converted.flatMap((c) => c.errors),
      ...validateTees(finalTees),
    ];
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setErrors([]);
    onSave({
      name: name.trim(),
      location: location.trim(),
      holes: finalHoles,
      tees: finalTees,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-og-accent-text mb-1">Course Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-og-accent-text mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="golf-input w-full rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-og-accent-text mb-2">Hole Count</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHoleCountAndResize(9)}
            className={`p-4 rounded-2xl border text-left transition ${optionTileClass(holeCount === 9)}`}
          >
            <div className="font-medium">9 Holes</div>
            <div className={`text-xs mt-0.5 ${optionSubtextClass(holeCount === 9)}`}>True 9-hole layout</div>
          </button>
          <button
            type="button"
            onClick={() => setHoleCountAndResize(18)}
            className={`p-4 rounded-2xl border text-left transition ${optionTileClass(holeCount === 18)}`}
          >
            <div className="font-medium">18 Holes</div>
            <div className={`text-xs mt-0.5 ${optionSubtextClass(holeCount === 18)}`}>Full course</div>
          </button>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-og-accent-text mb-2">
            Quick Start Templates
          </label>
          <div className="space-y-2">
            {SUGGESTED_COURSE_TEMPLATES.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => loadTemplate(template)}
                className="w-full text-left p-4 rounded-2xl border border-og-border hover:border-og-accent-line hover:bg-og-raised transition-all"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-og-muted">
                  {template.location} • {template.holeCount} holes
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-og-accent-text mb-3">
          Hole Pars (adjust if needed)
        </label>
        <div className="grid grid-cols-6 gap-3">
          {holes.map((hole) => (
            <div key={hole.number} className="text-center">
              <div className="text-xs text-og-muted mb-1">H{hole.number}</div>
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

      <div data-control="si-section">
        <label className="block text-sm font-medium text-og-accent-text mb-1">
          Stroke Index (1 = hardest)
        </label>
        <div className="text-xs text-og-muted mb-3">From the scorecard. Each 1–18 once; leave all blank if unknown.</div>
        <div className="grid grid-cols-6 gap-3">
          {holes.map((hole) => (
            <div key={hole.number} className="text-center">
              <div className="text-xs text-og-muted mb-1">H{hole.number}</div>
              <input
                type="number"
                inputMode="numeric"
                value={hole.strokeIndex ?? ""}
                onChange={(e) => updateStrokeIndex(hole.number, e.target.value)}
                data-control={`si-${hole.number}`}
                className="golf-input w-full text-center rounded py-2 font-semibold"
                min="1"
                max="18"
              />
            </div>
          ))}
        </div>
      </div>

      <div data-control="tees-section">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-og-accent-text">Tees (rating / slope)</label>
          <button type="button" onClick={addTee} data-control="tee-add" className="text-sm text-og-accent-text hover:underline">
            + Add tee
          </button>
        </div>
        {tees.length === 0 && (
          <div className="text-xs text-og-muted">No tees yet. Add one with its men&apos;s and/or women&apos;s rating and slope.</div>
        )}
        <div className="space-y-3">
          {tees.map((t) => (
            <div key={t.id} className="rounded-2xl border border-og-border p-3 space-y-2" data-control="tee-row">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => updateTee(t.id, { color: e.target.value })}
                  aria-label="Tee color"
                  className="h-10 w-10 shrink-0 rounded-lg border border-og-border bg-transparent"
                />
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateTee(t.id, { name: e.target.value })}
                  placeholder="Tee name"
                  aria-label="Tee name"
                  data-control="tee-name"
                  className="golf-input min-w-0 flex-1 rounded-xl px-3 py-2"
                />
                <label className="flex items-center gap-1 text-xs text-og-muted">
                  Par
                  <input
                    type="number"
                    value={t.par}
                    onChange={(e) => updateTee(t.id, { par: e.target.value })}
                    aria-label="Tee par"
                    className="golf-input w-14 rounded-lg px-1 py-2 text-center"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeTee(t.id)}
                  aria-label={`Remove ${t.name || "tee"}`}
                  data-control="tee-remove"
                  className="shrink-0 px-2 py-2 text-xs text-og-danger"
                >
                  Remove
                </button>
              </div>
              {(
                [
                  ["Men's", "menRating", "menSlope"],
                  ["Women's", "womenRating", "womenSlope"],
                ] as const
              ).map(([label, rk, sk]) => (
                <div key={label} className="grid grid-cols-[64px_1fr_1fr] items-center gap-2 text-xs">
                  <span className="text-og-muted">{label}</span>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={t[rk]}
                    onChange={(e) => updateTee(t.id, { [rk]: e.target.value })}
                    placeholder="Rating"
                    aria-label={`${label} rating`}
                    data-control={`tee-${rk}`}
                    className="golf-input w-full rounded-lg px-2 py-2 text-center"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={t[sk]}
                    onChange={(e) => updateTee(t.id, { [sk]: e.target.value })}
                    placeholder="Slope"
                    aria-label={`${label} slope`}
                    data-control={`tee-${sk}`}
                    className="golf-input w-full rounded-lg px-2 py-2 text-center"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" data-control="course-errors" className="rounded-2xl border border-og-danger p-3 text-sm text-og-danger space-y-1">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-og-border font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-og-accent text-og-on-accent font-semibold"
        >
          {isEdit ? "Save Changes" : "Save Course"}
        </button>
      </div>
    </form>
  );
}
