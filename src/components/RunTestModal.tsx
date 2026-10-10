"use client";

import React, { useState } from "react";
import { X, Play, Sparkles, Key, Globe, Cpu, ShieldAlert, CheckCircle2 } from "lucide-react";
import { POPULAR_MODELS, DEFAULT_BASE_URL } from "@/lib/constants";
import { DetectionReport } from "@/types/detector";

interface RunTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestComplete: (report: DetectionReport) => void;
}

export const RunTestModal: React.FC<RunTestModalProps> = ({
  isOpen,
  onClose,
  onTestComplete,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState("claude-3-7-sonnet-20250219");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunRealTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setError("Vui lòng nhập Claude API Key hoặc chọn kịch bản mẫu");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          baseUrl,
          model,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Kiểm tra thất bại");
      }

      onTestComplete(data.report);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra trong quá trình kiểm tra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = async (
    scenario: "suspicious_91" | "clean_100" | "fake_downgraded_35"
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMockDemo: true,
          mockScenario: scenario,
          model,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onTestComplete(data.report);
        onClose();
      }
    } catch (err: any) {
      setError("Không thể tải kịch bản demo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#161822] border border-[#2b3042] rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-800/40">
              <Play className="w-5 h-5 fill-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Khởi tạo Kiểm tra API Claude</h3>
              <p className="text-xs text-slate-400">Kiểm tra tính xác thực, độn token và phát hiện proxy lậu</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Scenarios */}
        <div className="mt-4 p-3.5 bg-[#10121a] rounded-xl border border-[#232736]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Chọn nhanh kịch bản mô phỏng kiểm tra:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectScenario("suspicious_91")}
              className="p-2 rounded-lg bg-[#181c28] hover:bg-[#202638] border border-slate-700/60 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                Kịch bản trong ảnh (91%)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Lỗi Thinking Signature</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScenario("clean_100")}
              className="p-2 rounded-lg bg-[#181c28] hover:bg-[#202638] border border-slate-700/60 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Chuẩn 100% Console
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Vượt qua mọi đầu dò</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectScenario("fake_downgraded_35")}
              className="p-2 rounded-lg bg-[#181c28] hover:bg-[#202638] border border-slate-700/60 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Gian lận Đánh tráo (28%)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Hạ cấp sang GPT/Qwen</div>
            </button>

            {/* Test Selling Key Option */}
            <button
              type="button"
              onClick={() => {
                setApiKey("apizz_live_demo_8f9a2b7c4d1e");
                setBaseUrl("http://localhost:3000");
              }}
              className="p-2.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-left transition-colors col-span-1 sm:col-span-3 flex items-center justify-between mt-1"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold text-sky-300">
                    Khóa bạn tạo bán (apizz_live_...) qua Trạm Relay
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Tự động chọn Base URL nội bộ (http://localhost:3000) để đạt chuẩn 100% điểm uy tín
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-sky-400 shrink-0">Điền nhanh →</span>
            </button>
          </div>
        </div>

        {/* Real Test Form */}
        <form onSubmit={handleRunRealTest} className="mt-4 space-y-3.5">
          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              API Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.anthropic.com hoặc endpoint trung gian"
              className="w-full px-3 py-2 text-xs bg-[#11131a] border border-[#242938] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              API Key (Chính hãng hoặc Proxy Bearer Key)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-... hoặc proxy key"
              className="w-full px-3 py-2 text-xs bg-[#11131a] border border-[#242938] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Gợi ý: Nếu test khóa bạn tự tạo bán (<code>apizz_live_...</code>), hệ thống sẽ tự động chuyển tiếp qua Trạm Relay nội bộ để đạt điểm số 100% chuẩn nguyên bản.
            </p>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Mô hình cần kiểm tra
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#11131a] border border-[#242938] rounded-lg text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            >
              {POPULAR_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-md shadow-sky-900/40"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Đang kiểm tra 12 đầu dò...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Chạy Kiểm tra Thực tế
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
