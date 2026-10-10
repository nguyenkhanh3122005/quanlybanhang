"use client";

import React from "react";
import { ModelFingerprintScore } from "@/types/detector";

interface FingerprintCardProps {
  title: string;
  subDescription: string;
  attributionText: string;
  scores: ModelFingerprintScore[];
}

export const FingerprintCard: React.FC<FingerprintCardProps> = ({
  title,
  subDescription,
  attributionText,
  scores,
}) => {
  return (
    <div className="w-full bg-[#181a24] border border-[#232736] rounded-xl p-4 sm:p-5 shadow-lg shadow-black/30">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-white tracking-wide">
          {title}
        </h3>
        <p className="text-[12px] text-slate-400 font-normal">
          {subDescription}
        </p>
      </div>

      {/* Attribution detail label */}
      <div className="mt-2 text-[12px] text-slate-400 font-normal">
        {attributionText}
      </div>

      {/* Probability Badges / Pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {scores.map((item, idx) => {
          const isHighest = item.percentage > 0;
          return (
            <div
              key={idx}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isHighest
                  ? "bg-[#16273f] text-[#38bdf8] border border-[#1e4976] shadow-sm shadow-sky-950"
                  : "bg-[#1b1f2b] text-slate-400 border border-[#262c3e]"
              }`}
            >
              <span>{item.modelName}</span>
              <span className="mx-1.5 text-slate-500">-</span>
              <span className={isHighest ? "text-[#38bdf8]" : "text-slate-400"}>
                {item.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
