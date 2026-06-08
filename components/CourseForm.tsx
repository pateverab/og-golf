'use client';

import React, { useState } from "react";
import { Course, Hole, SUGGESTED_COURSE_TEMPLATES } from "@/lib/calculations";

interface CourseFormProps {
  onSave: (course: Omit<Course, "id" | "createdAt">) => void;
  onCancel: () => void;
}

export function CourseForm({ onSave, onCancel }: CourseFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [holeCount, setHoleCount] = useState(18);
  const [holes, setHoles] = useState<Hole[]>(
    Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }))
  );

  const loadTemplate = (template: any) => {
    setName(template.name);
    setLocation(template.location);
    setHoleCount(template.holeCount);

    if (template.suggestedPars?.length > 0) {
      const newHoles = template.suggestedPars.map((par: number, index: number) => ({
        number: index + 1,
        par: par,
      }));
      setHoles(newHoles);
    } else {
      setHoles(Array.from({ length: template.holeCount }, (_, i) => ({
        number: i + 1,
        par: 4,
      })));
    }
  };

  const updatePar = (holeNumber: number, newPar: number) => {
    setHoles(prev => prev.map(h => 
      h.number === holeNumber ? { ...h, par: newPar } : h
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({ name: name.trim(), location: location.trim(), holes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-1">Course Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0c3326] border border-[#2a5a48] rounded-xl px-4 py-3 text-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-[#0c3326] border border-[#2a5a48] rounded-xl px-4 py-3 text-white"
        />
      </div>

      {/* Templates */}
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-2">Quick Start Templates</label>
        <div className="grid grid-cols-1 gap-2">
          {SUGGESTED_COURSE_TEMPLATES.map((template, index) => (
            <button
              key={index}
              type="button"
              onClick={() => loadTemplate(template)}
              className="text-left p-4 rounded-2xl border border-[#2a5a48] hover:border-[#c5a36f] hover:bg-[#1f4a3a] transition-all"
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-[#c5a36f]/70">{template.location} • Par {template.suggestedPars?.reduce((a, b) => a + b, 0) || template.holeCount * 4}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hole Pars */}
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-3">Adjust Hole Pars</label>
        <div className="grid grid-cols-6 gap-3 max-h-80 overflow-y-auto p-1">
          {holes.map((hole) => (
            <div key={hole.number} className="flex flex-col items-center">
              <div className="text-xs text-[#c5a36f]/70 mb-1">H{hole.number}</div>
              <input
                type="number"
                value={hole.par}
                onChange={(e) => updatePar(hole.number, parseInt(e.target.value) || 4)}
                className="w-14 text-center bg-[#0c3326] border border-[#2a5a48] rounded-lg py-2 font-semibold text-lg"
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
          className="flex-1 py-3.5 rounded-2xl border border-[#2a5a48] font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 rounded-2xl bg-[#c5a36f] text-[#051b14] font-semibold hover:bg-white transition"
        >
          Save Course
        </button>
      </div>
    </form>
  );
}