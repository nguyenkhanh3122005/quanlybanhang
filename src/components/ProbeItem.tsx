"use client";

import React from "react";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { ProbeResult } from "@/types/detector";

interface ProbeItemProps {
  probe: ProbeResult;
  onClick?: () => void;
}

export const ProbeItem: React.FC<ProbeItemProps> = ({ probe, onClick }) => {
  const isFailed = probe.status === "failed";
  const isPassed = probe.status === "passed";
  const isRunning = probe.status === "running";

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-150 cursor-pointer hover:bg-[#1f2430]/70 select-none border border-transparent ${
        isFailed ? "hover:border-red-950/40" : "hover:border-slate-800/60"
      }`}
    >
      {/* Left side: Icon + Name */}
      <div className="flex items-center space-x-2.5 min-w-0">
        {isFailed ? (
          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
        ) : isPassed ? (
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
        ) : isRunning ? (
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-sky-400/80 shrink-0" />
        )}

        <span className="text-[13px] font-medium text-slate-200 truncate group-hover:text-white transition-colors">
          {probe.nameVi}
        </span>
      </div>

      {/* Right side: Status Tag */}
      <div className="ml-3 shrink-0">
        {isFailed ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#39151b] text-[#f87171] border border-red-900/40 shadow-sm shadow-red-950">
            Thất bại
          </span>
        ) : (
          <span className="text-[12px] font-medium text-[#38bdf8] hover:text-sky-300 transition-colors">
            {probe.status === "skipped" ? "Bỏ qua" : "Bỏ qua"}
          </span>
        )}
      </div>
    </div>
  );
};
