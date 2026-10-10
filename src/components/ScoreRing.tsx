"use client";

import React from "react";

interface ScoreRingProps {
  score: number;
  modelLabel: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, modelLabel }) => {
  // SVG circle calculation
  const size = 160;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine stroke color based on score
  let strokeColor = "#38bdf8"; // Sky blue default
  if (score < 40) strokeColor = "#ef4444"; // Red
  else if (score < 75) strokeColor = "#f59e0b"; // Amber

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#262b37"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${strokeColor}88)`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
            {score}%
          </span>
        </div>
      </div>

      {/* Model label beneath the ring */}
      <span className="mt-4 text-xs font-medium text-slate-400 tracking-wider">
        {modelLabel}
      </span>
    </div>
  );
};
