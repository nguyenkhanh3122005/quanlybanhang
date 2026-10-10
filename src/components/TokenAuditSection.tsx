"use client";

import React from "react";
import { Coins, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { TokenAuditDetails } from "@/types/detector";

interface TokenAuditSectionProps {
  audit?: TokenAuditDetails;
}

export const TokenAuditSection: React.FC<TokenAuditSectionProps> = ({ audit }) => {
  if (!audit) return null;

  return (
    <div className="w-full bg-[#181a24] border border-[#232736] rounded-xl p-4 sm:p-5 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Coins className="w-4 h-4 text-sky-400" />
          <h3 className="text-[14px] font-bold text-white">Kiểm toán Sử dụng Token & Định giá Cước</h3>
        </div>

        {audit.isInflated ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/50">
            <AlertTriangle className="w-3.5 h-3.5" />
            Phát hiện gian lận độn Token ({audit.inflationRatio}x)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            Số Token trung thực ({audit.inflationRatio}x)
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Input tokens */}
        <div className="bg-[#12141c] p-3 rounded-lg border border-[#242938]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Input Tokens</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-mono">{audit.reportedInputTokens}</span>
            <span className="text-xs text-slate-400">báo cáo</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Thực tế chuẩn: <span className="text-slate-300 font-mono">{audit.countedInputTokens}</span>
          </div>
        </div>

        {/* Output tokens */}
        <div className="bg-[#12141c] p-3 rounded-lg border border-[#242938]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Output Tokens</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-mono">{audit.reportedOutputTokens}</span>
            <span className="text-xs text-slate-400">báo cáo</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Thực tế chuẩn: <span className="text-slate-300 font-mono">{audit.countedOutputTokens}</span>
          </div>
        </div>

        {/* Inflation ratio & cost */}
        <div className="bg-[#12141c] p-3 rounded-lg border border-[#242938]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Hệ số chênh lệch</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-lg font-bold font-mono ${audit.isInflated ? "text-rose-400" : "text-sky-400"}`}>
              {audit.inflationRatio}x
            </span>
            <span className="text-xs text-slate-400">{audit.isInflated ? "bị khai khống" : "chuẩn xác"}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Đơn giá ước tính: <span className="text-slate-300 font-mono">${audit.estimatedCostPerM}/1M</span>
          </div>
        </div>
      </div>
    </div>
  );
};
