"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  Key,
  Code2,
  Copy,
  Check,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { PRICING_PLANS, PricingPlan, ApiKeyRecord } from "@/types/commercial";

interface CommercialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommercialModal: React.FC<CommercialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"pricing" | "keys" | "docs">("pricing");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PricingPlan | null>(null);
  const [paymentData, setPaymentData] = useState<any | null>(null);
  const [selectedKeyForTopup, setSelectedKeyForTopup] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch keys list
  useEffect(() => {
    if (isOpen) {
      loadKeys();
    }
  }, [isOpen]);

  const loadKeys = async () => {
    try {
      const res = await fetch("/api/v1/keys");
      const data = await res.json();
      if (data.success && data.keys) {
        setKeys(data.keys);
        if (data.keys.length > 0 && !selectedKeyForTopup) {
          setSelectedKeyForTopup(data.keys[0].key);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName || "Khóa Mới",
          tier: "free",
          credits: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKeyName("");
        loadKeys();
        setSuccessMsg("Đã tạo API Key mới với 5 lượt test miễn phí!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa API Key này không? Hành động này sẽ vô hiệu hóa khóa ngay lập tức.")) return;
    try {
      const res = await fetch(`/api/v1/keys?id=${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Đã xóa API Key thành công!");
        loadKeys();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(data.error || "Không thể xóa API Key");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    setSelectedPlanForPayment(plan);
    const targetKey = selectedKeyForTopup || (keys[0]?.key ?? "apizz_live_demo_8f9a2b7c4d1e");

    try {
      const res = await fetch("/api/v1/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: targetKey,
          planId: plan.id,
          instantCredit: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentData(data.order);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmInstantPayment = async () => {
    if (!paymentData) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/v1/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: paymentData.key,
          planId: selectedPlanForPayment?.id,
          instantCredit: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        loadKeys();
        setPaymentData(null);
        setSelectedPlanForPayment(null);
        setActiveTab("keys");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#141722] border border-[#262c3e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-[#23283a] bg-[#11131c]">
          <div className="flex items-center space-x-2.5 mb-3 sm:mb-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Dịch vụ Thương mại & Cổng API APIZZ.NET
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/40">
                  Commercial API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Bán gói cước kiểm thử, quản lý API Key và tài liệu tích hợp hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-[#191d2b] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setActiveTab("pricing");
                  setPaymentData(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "pricing"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Mua Gói
              </button>

              <button
                onClick={() => setActiveTab("keys")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "keys"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Quản lý Key ({keys.length})
              </button>

              <button
                onClick={() => setActiveTab("docs")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === "docs"
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Tài liệu API
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global notification banner */}
        {successMsg && (
          <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: PRICING PLANS */}
          {activeTab === "pricing" && !paymentData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white">Bảng giá Gói Dịch vụ API Scan</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chọn gói phù hợp để nhận credits quét API. Mỗi lần chạy 12 đầu dò tiêu hao 1 credit.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PRICING_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                      plan.recommended
                        ? "bg-[#181d2c] border-sky-500/80 shadow-lg shadow-sky-950/50"
                        : "bg-[#161924] border-[#252a3b] hover:border-slate-700"
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500 text-slate-950">
                        Phổ biến nhất
                      </span>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{plan.description}</p>

                      <div className="my-3">
                        <div className="text-xl font-extrabold text-white">
                          {plan.priceVnd === 0
                            ? "Miễn phí"
                            : `${plan.priceVnd.toLocaleString("vi-VN")} đ`}
                        </div>
                        <div className="text-[11px] text-sky-400 font-semibold mt-0.5">
                          {plan.credits} lượt quét API ({plan.credits} credits)
                        </div>
                      </div>

                      <ul className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-3">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        plan.recommended
                          ? "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-900"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      }`}
                    >
                      {plan.priceVnd === 0 ? "Nhận 5 Credits" : "Mua ngay"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1 SUB: VIETQR PAYMENT MODAL */}
          {activeTab === "pricing" && paymentData && (
            <div className="bg-[#10121a] border border-[#242938] rounded-2xl p-5 max-w-lg mx-auto shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">
                    Thanh toán chuyển khoản VietQR Tự động
                  </h3>
                </div>
                <button
                  onClick={() => setPaymentData(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Đổi gói khác
                </button>
              </div>

              <div className="mt-4 flex flex-col items-center">
                {/* QR Code image */}
                <div className="bg-white p-3 rounded-xl shadow-lg border">
                  <img
                    src={paymentData.qrUrl}
                    alt="VietQR Chuyển khoản"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <div className="mt-4 w-full space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-[#181c28]">
                    <span className="text-slate-400">Gói mua:</span>
                    <span className="font-bold text-sky-400">{paymentData.planName} (+{paymentData.creditsToAdd} credits)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#181c28]">
                    <span className="text-slate-400">Số tiền:</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {paymentData.amountVnd.toLocaleString("vi-VN")} VNĐ
                    </span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#181c28]">
                    <span className="text-slate-400">Ngân hàng:</span>
                    <span className="font-bold text-white">{paymentData.bankCode} - {paymentData.accountNumber}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#181c28]">
                    <span className="text-slate-400">Chủ tài khoản:</span>
                    <span className="font-bold text-white">{paymentData.accountName}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#181c28]">
                    <span className="text-slate-400">Nội dung CK:</span>
                    <span className="font-bold text-amber-400 font-mono">{paymentData.transferMemo}</span>
                  </div>
                </div>

                <div className="mt-4 w-full flex items-center gap-2">
                  <button
                    onClick={handleConfirmInstantPayment}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isProcessing ? "Đang xác thực giao dịch..." : "Xác nhận Đã Chuyển Khoản (Nạp Ngay)"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API KEY MANAGEMENT */}
          {activeTab === "keys" && (
            <div className="space-y-5">
              {/* Top Create Key Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#10121a] rounded-xl border border-[#242938]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-sky-400" />
                    Quản lý Khóa API Thương mại
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dùng khóa này trong header `Authorization: Bearer apizz_live_...` khi gọi API.
                  </p>
                </div>

                <form onSubmit={handleCreateKey} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Tên định danh (vd: Server Bot)"
                    className="px-3 py-1.5 text-xs bg-[#191d2a] border border-[#2e364a] rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo Key mới
                  </button>
                </form>
              </div>

              {/* Keys Table */}
              <div className="space-y-2.5">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="p-3.5 bg-[#161a26] border border-[#252a3b] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{k.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/40 uppercase">
                          {k.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                        <span>{k.key}</span>
                        <button
                          onClick={() => handleCopy(k.key)}
                          className="p-1 rounded text-slate-400 hover:text-sky-400 transition-colors"
                          title="Sao chép API Key"
                        >
                          {copiedKey === k.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Số dư lượt quét</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          {k.credits} credits
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedKeyForTopup(k.key);
                          setActiveTab("pricing");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        Nạp thêm
                      </button>

                      <button
                        onClick={() => handleDeleteKey(k.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 transition-colors"
                        title="Xóa API Key này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: API DOCUMENTATION */}
          {activeTab === "docs" && (
            <div className="space-y-5 text-xs text-slate-300">
              <div>
                <h3 className="text-sm font-bold text-white">Tài liệu Tích hợp API APIZZ.NET Thương mại</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dễ dàng tích hợp vào bot kiểm tra tự động, trạm OneAPI / NewAPI hoặc server backend của bạn.
                </p>
              </div>

              {/* Endpoint Spec */}
              <div className="p-3.5 bg-[#10121a] rounded-xl border border-[#242938] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-bold bg-sky-500 text-slate-950 font-mono">
                    POST
                  </span>
                  <code className="text-sky-300 font-mono">/api/v1/detect</code>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Thực hiện kiểm thử 12 đầu dò chuyên sâu đối với endpoint và khóa API Claude mục tiêu. Tiêu hao 1 credit/lần gọi.
                </p>
              </div>

              {/* Code Samples */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-white">1. Gọi bằng cURL (Terminal):</div>
                <pre className="p-3 bg-[#0d0f14] rounded-xl border border-slate-800 font-mono text-sky-300/90 overflow-x-auto text-[11px]">
{`curl -X POST "https://apizz.net/api/v1/detect" \\
  -H "Authorization: Bearer apizz_live_demo_8f9a2b7c4d1e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiKey": "sk-ant-api03-xxxx",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-3-7-sonnet-20250219"
  }'`}
                </pre>

                <div className="text-xs font-bold text-white">2. Gọi bằng Node.js (TypeScript / JavaScript):</div>
                <pre className="p-3 bg-[#0d0f14] rounded-xl border border-slate-800 font-mono text-emerald-300/90 overflow-x-auto text-[11px]">
{`const res = await fetch("https://apizz.net/api/v1/detect", {
  method: "POST",
  headers: {
    "Authorization": "Bearer apizz_live_demo_8f9a2b7c4d1e",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    apiKey: "sk-target-key-to-audit",
    baseUrl: "https://relay-station.com/v1",
    model: "claude-3-5-sonnet-20241022"
  })
});

const data = await res.json();
console.log("Score:", data.report.overallScore);
console.log("Verdict:", data.report.verdictTitle);
console.log("Credits còn lại:", data.creditsRemaining);`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
