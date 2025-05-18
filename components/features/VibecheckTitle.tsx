import React from 'react';

export default function VibecheckTitle() {
  return (
    <div className="relative inline-block">
      <h1 className="text-5xl font-bold text-blue-600 mb-4">Vibecheck</h1>
      <div className="relative w-full h-16">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 900 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 100 C 150 80, 250 120, 350 100 S 450 60, 550 100 Q 600 140, 650 100 Q 700 60, 750 100 T 800 40"
            stroke="#2563EB"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
