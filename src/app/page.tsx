"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  ExternalLink,
  Info,
  Sparkles,
  KeyRound,
  Shield,
  User as UserIcon,
  LogOut,
  Coins,
} from "lucide-react";
import { SCREENSHOT_MOCK_REPORT } from "@/lib/mockData";
import { DetectionReport, ProbeId, ProbeResult } from "@/types/detector";
import { User } from "@/types/auth";
import { getClientUser, setClientUser } from "@/lib/clientAuth";
import { ScoreRing } from "@/components/ScoreRing";
import { ProbeItem } from "@/components/ProbeItem";
import { VerdictCard } from "@/components/VerdictCard";
import { FingerprintCard } from "@/components/FingerprintCard";
import { TokenAuditSection } from "@/components/TokenAuditSection";
import { ProbeDetailModal } from "@/components/ProbeDetailModal";
import { RunTestModal } from "@/components/RunTestModal";
import { CommercialModal } from "@/components/CommercialModal";
import { AuthModal } from "@/components/AuthModal";

export default function HomePage() {
  const [report, setReport] = useState<DetectionReport>(SCREENSHOT_MOCK_REPORT);
  const [selectedProbe, setSelectedProbe] = useState<ProbeResult | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isCommercialOpen, setIsCommercialOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setCurrentUser(getClientUser());
  }, []);

  const handleLogout = () => {
    setClientUser(null);
    setCurrentUser(null);
  };

  // Group the 12 probes into 2 columns of 6 items each exactly like the screenshot
  const leftProbeIds: ProbeId[] = [
    "llm_fingerprint",
    "non_streaming",
    "thinking_signature",
    "tool_use",
    "model_identity",
    "vision",
  ];

  const rightProbeIds: ProbeId[] = [
    "streaming",
    "web_search",
    "structured_output",
    "knowledge_cutoff",
    "document_recognition",
    "token_audit",
  ];

  const handleDownloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `apizz-report-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#111319] text-[#e2e8f0] px-4 py-8 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-5xl space-y-3">
        {/* Top Navbar / User Account Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-[#151822] border border-[#232736] text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-bold text-sky-400 tracking-wide">APIZZ.NET Platform</span>
            <span>•</span>
            <span className="hidden sm:inline">Kiểm định gian lận API Claude tự động</span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                {currentUser.role === "admin" && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Trang Quản Trị Admin
                  </Link>
                )}

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1e2b] border border-slate-700/60 text-slate-200">
                  <span>{currentUser.avatar || "👤"}</span>
                  <span className="font-semibold text-white">{currentUser.name}</span>
                  <span className="text-slate-500">|</span>
                  <Coins className="w-3 h-3 text-sky-400" />
                  <span className="font-mono font-bold text-sky-400">{currentUser.credits} cr</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1f2433] hover:bg-[#272d40] text-sky-300 font-semibold border border-sky-500/30 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>

        {/* Main Frame Container */}
        <div className="bg-[#14161f] border border-[#232736] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232736]">
            {/* Title & Platform Tag */}
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Kết quả Phát hiện
              </h1>
              <span className="text-xs sm:text-sm text-slate-400 font-normal">
                @apizz.net (Nền tảng Phát hiện Claude chuyên nghiệp nhất)
              </span>
            </div>

            {/* Actions: Commercial API, New Test, Download, UUID */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsCommercialOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-sky-500/15 hover:from-amber-500/25 hover:to-sky-500/25 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Bán API / Nạp Credits
              </button>

              <button
                onClick={() => setIsTestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors shadow-sm shadow-sky-950"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Kiểm tra API mới
              </button>

              <button
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#282d3e] text-slate-300 text-xs font-medium border border-[#2d3345] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Tải báo cáo
              </button>

              <div
                onClick={handleCopyId}
                title="Bấm để sao chép mã UUID"
                className="cursor-pointer text-[12px] font-mono text-slate-400 hover:text-sky-400 transition-colors bg-[#171a24] px-2.5 py-1 rounded border border-[#242938]"
              >
                {copiedId ? "Đã sao chép!" : report.id}
              </div>
            </div>
          </div>

          {/* Top Main Section: Score Ring + 12 Probes Checklist */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8 border-b border-[#232736]">
            {/* Circular Gauge Ring (4 cols) */}
            <div className="lg:col-span-4 flex justify-center lg:justify-start lg:pl-6">
              <ScoreRing
                score={report.overallScore}
                modelLabel={report.claimedModel || "Claude-Opus-3-5"}
              />
            </div>

            {/* 12 Probes Checklist Grid (8 cols) */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {/* Left Column (6 items) */}
              <div className="space-y-1">
                {leftProbeIds.map((id) => {
                  const probe = report.probes[id];
                  if (!probe) return null;
                  return (
                    <ProbeItem
                      key={id}
                      probe={probe}
                      onClick={() => setSelectedProbe(probe)}
                    />
                  );
                })}
              </div>

              {/* Right Column (6 items) */}
              <div className="space-y-1">
                {rightProbeIds.map((id) => {
                  const probe = report.probes[id];
                  if (!probe) return null;
                  return (
                    <ProbeItem
                      key={id}
                      probe={probe}
                      onClick={() => setSelectedProbe(probe)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Conclusion & Market Price Card */}
          <div className="mt-6">
            <VerdictCard
              title={report.verdictTitle}
              description={report.verdictDescription}
              marketPrice={report.estimatedMarketPrice}
            />
          </div>

          {/* Section: Fingerprint Attribution Card */}
          <div className="mt-6">
            <FingerprintCard
              title={report.fingerprintAttribution.titleVi}
              subDescription={report.fingerprintAttribution.descriptionVi}
              attributionText="指纹归现为 Claude-Opus-3-5(100%), 与声明一致"
              scores={report.fingerprintAttribution.scores}
            />
          </div>

          {/* Section: Token Audit Section */}
          <div className="mt-6">
            <TokenAuditSection audit={report.tokenAudit} />
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-4 border-t border-[#1e2230] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Nền tảng kiểm thử độc lập - Bảo vệ người dùng khỏi proxy gian lận</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Thời gian đo: {new Date(report.createdAt).toLocaleString("vi-VN")}</span>
              <span>•</span>
              <span>Target: {report.targetUrl}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: View Probe Inspection Details */}
      <ProbeDetailModal
        probe={selectedProbe}
        onClose={() => setSelectedProbe(null)}
      />

      {/* Modal: Run New Detection / Change Scenarios */}
      <RunTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTestComplete={(newReport) => setReport(newReport)}
      />

      {/* Modal: Commercial API, Pricing & Keys Management */}
      <CommercialModal
        isOpen={isCommercialOpen}
        onClose={() => setIsCommercialOpen(false)}
      />

      {/* Modal: User Auth Login & Register */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </main>
  );
}
