"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="mt-6 rounded bg-slate-800 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700"
    >
      Print / Save as PDF
    </button>
  );
}
