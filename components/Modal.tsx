"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        className={`w-full ${sizeClasses[size]} flex flex-col rounded-t-3xl sm:rounded-2xl bg-og-raised border border-og-border shadow-2xl modal max-h-[92dvh] sm:max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-og-border px-5 py-4 flex-shrink-0 sticky top-0 bg-og-raised z-10 rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-lg font-semibold text-og-text pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="text-og-accent-text hover:text-og-accent-hover text-4xl leading-none pb-1 -mr-1"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div
          data-og-scroll="1"
          className="flex-1 overflow-y-auto overscroll-contain p-5 pb-6 space-y-5 text-og-text
                     [-webkit-overflow-scrolling:touch] touch-pan-y"
        >
          {children}
        </div>
      </div>
    </div>
  );
}