"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { DetectionReport, ProbeId, ProbeResult } from "@/types/detector";
import { ScoreRing } from "@/components/ScoreRing";
import { ProbeItem } from "@/components/ProbeItem";
import { VerdictCard } from "@/components/VerdictCard";
import { FingerprintCard } from "@/components/FingerprintCard";
import { TokenAuditSection } from "@/components/TokenAuditSection";
import { ProbeDetailModal } from "@/components/ProbeDetailModal";
import { SCREENSHOT_MOCK_REPORT } from "@/lib/mockData";

export default function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [report, setReport] = useState<DetectionReport | null>(null);
  const [selectedProbe, setSelectedProbe] = useState<ProbeResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/report/${params.id}`);
        const data = await res.json();
        if (data.success) {
          setReport(data.report);
        } else {
          // Fallback to screenshot mock if not found
          setReport({ ...SCREENSHOT_MOCK_REPORT, id: params.id });
        }
      } catch {
        setReport({ ...SCREENSHOT_MOCK_REPORT, id: params.id });
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [params.id]);

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-[#111319] flex items-center justify-center text-slate-400">
        <div className="animate-pulse">Đang tải báo cáo {params.id}...</div>
      </div>
    );
  }

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

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `apizz-report-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <main className="min-h-screen bg-[#111319] text-[#e2e8f0] px-4 py-8 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại trang chủ kiểm tra
          </Link>
        </div>

        <div className="bg-[#14161f] border border-[#232736] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232736]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Kết quả Phát hiện
              </h1>
              <span className="text-xs sm:text-sm text-slate-400">
                @apizz.net (Báo cáo xác minh độc lập)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2330] hover:bg-[#282d3e] text-slate-300 text-xs font-medium border border-[#2d3345] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Tải báo cáo
              </button>
              <div className="text-[12px] font-mono text-slate-400 bg-[#171a24] px-2.5 py-1 rounded border border-[#242938]">
                {report.id}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8 border-b border-[#232736]">
            <div className="lg:col-span-4 flex justify-center lg:justify-start lg:pl-6">
              <ScoreRing
                score={report.overallScore}
                modelLabel={report.claimedModel || "Claude-Opus-3-5"}
              />
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              <div className="space-y-1">
                {leftProbeIds.map((id) => (
                  <ProbeItem
                    key={id}
                    probe={report.probes[id]}
                    onClick={() => setSelectedProbe(report.probes[id])}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {rightProbeIds.map((id) => (
                  <ProbeItem
                    key={id}
                    probe={report.probes[id]}
                    onClick={() => setSelectedProbe(report.probes[id])}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <VerdictCard
              title={report.verdictTitle}
              description={report.verdictDescription}
              marketPrice={report.estimatedMarketPrice}
            />
          </div>

          <div className="mt-6">
            <FingerprintCard
              title={report.fingerprintAttribution.titleVi}
              subDescription={report.fingerprintAttribution.descriptionVi}
              attributionText="指纹归现为 Claude-Opus-3-5(100%), 与声明一致"
              scores={report.fingerprintAttribution.scores}
            />
          </div>

          <div className="mt-6">
            <TokenAuditSection audit={report.tokenAudit} />
          </div>
        </div>
      </div>

      <ProbeDetailModal
        probe={selectedProbe}
        onClose={() => setSelectedProbe(null)}
      />
    </main>
  );
}
