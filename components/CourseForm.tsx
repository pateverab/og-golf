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
  const [holes, setHoles] = useState<Hole[]>(
    Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }))
  );

  const loadFullTemplate = (template: any) => {
    setName(template.name);
    setLocation(template.location);

    if (template.suggestedPars) {
      const newHoles = template.suggestedPars.map((par: number, i: number) => ({
        number: i + 1,
        par: Number(par)
      }));
      setHoles(newHoles);
    }
  };

  const updatePar = (holeNumber: number, newPar: number) => {
    setHoles(prev => prev.map(h => h.number === holeNumber ? { ...h, par: newPar } : h));
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
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0c3326] border border-[#2a5a48] rounded-xl px-4 py-3 text-white" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-1">Location</label>
        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-[#0c3326] border border-[#2a5a48] rounded-xl px-4 py-3 text-white" />
      </div>

      {/* Templates with Load Button */}
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-2">Quick Start Templates</label>
        <div className="space-y-3">
          {SUGGESTED_COURSE_TEMPLATES.map((t, i) => (
            <div key={i} className="flex gap-3 items-center p-4 border border-[#2a5a48] rounded-2xl">
              <div className="flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-[#c5a36f]/70">{t.location}</div>
              </div>
              <button
                type="button"
                onClick={() => loadFullTemplate(t)}
                className="px-5 py-2 bg-[#c5a36f] text-[#051b14] rounded-xl font-medium hover:bg-white transition"
              >
                Load Pars
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hole Pars */}
      <div>
        <label className="block text-sm font-medium text-[#c5a36f] mb-3">Hole Pars (adjust if needed)</label>
        <div className="grid grid-cols-6 gap-3">
          {holes.map((hole) => (
            <div key={hole.number} className="text-center">
              <div className="text-xs text-[#c5a36f]/70 mb-1">H{hole.number}</div>
              <input 
                type="number" 
                value={hole.par} 
                onChange={(e) => updatePar(hole.number, parseInt(e.target.value) || 4)}
                className="w-full text-center bg-[#0c3326] border border-[#2a5a48] rounded py-2 font-semibold"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[#2a5a48]">Cancel</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-[#c5a36f] text-black font-semibold">Save Course</button>
      </div>
    </form>
  );
}