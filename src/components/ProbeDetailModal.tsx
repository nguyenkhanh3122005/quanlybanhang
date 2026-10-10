"use client";

import React from "react";
import { X, CheckCircle2, XCircle, Clock, Terminal, Activity } from "lucide-react";
import { ProbeResult } from "@/types/detector";
import { PROBE_DEFINITIONS } from "@/lib/constants";

interface ProbeDetailModalProps {
  probe: ProbeResult | null;
  onClose: () => void;
}

export const ProbeDetailModal: React.FC<ProbeDetailModalProps> = ({ probe, onClose }) => {
  if (!probe) return null;

  const def = PROBE_DEFINITIONS[probe.id];
  const isFailed = probe.status === "failed";
  const isPassed = probe.status === "passed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#161822] border border-[#2b3042] rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            {isFailed ? (
              <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-900/50">
                <XCircle className="w-6 h-6" />
              </div>
            ) : isPassed ? (
              <div className="p-2 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-900/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {probe.nameVi}
                <span className="text-xs font-normal text-slate-400">({def?.nameEn})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{def?.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 text-sm">
          {/* Status & Latency Pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#11131a] border border-[#232736] text-xs">
              <span className="text-slate-400">Trạng thái:</span>
              <span
                className={`font-semibold ${
                  isFailed ? "text-rose-400" : isPassed ? "text-sky-400" : "text-slate-400"
                }`}
              >
                {isFailed ? "Thất bại (Failed)" : isPassed ? "Đạt chuẩn (Passed)" : "Đã bỏ qua"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#11131a] border border-[#232736] text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Độ trễ:</span>
              <span className="font-mono font-medium text-white">{probe.latencyMs}ms</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#11131a] border border-[#232736] text-xs text-slate-300">
              <span>Trọng số:</span>
              <span className="font-mono font-medium text-sky-400">{def?.weight || 10} điểm</span>
            </div>
          </div>

          {/* Details / Explanation */}
          {probe.details && (
            <div className="bg-[#11131a] p-3.5 rounded-xl border border-[#232736]">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Phân tích kỹ thuật:
              </div>
              <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">{probe.details}</p>
            </div>
          )}

          {/* Error message if any */}
          {probe.error && (
            <div className="bg-rose-950/30 p-3.5 rounded-xl border border-rose-900/50">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
                Nguyên nhân thất bại:
              </div>
              <p className="text-rose-300 text-xs sm:text-sm font-mono break-all">{probe.error}</p>
            </div>
          )}

          {/* Raw Response */}
          {probe.rawResponse && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                Dữ liệu JSON phản hồi (Raw Response):
              </div>
              <pre className="p-3 bg-[#0d0f14] rounded-xl border border-slate-800 text-xs font-mono text-sky-300/90 overflow-x-auto max-h-48">
                {JSON.stringify(probe.rawResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
