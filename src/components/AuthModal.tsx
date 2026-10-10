"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { User } from "@/types/auth";
import { setClientUser } from "@/lib/clientAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = tab === "login" ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Thao tác không thành công");
      }

      setClientUser(data.user);
      onAuthSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#141722] border border-[#262c3e] rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 border border-sky-800/40">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {tab === "login" ? "Đăng Nhập Tài Khoản" : "Đăng Ký Tài Khoản Mới"}
              </h3>
              <p className="text-xs text-slate-400">Hệ thống APIZZ.NET Platform</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex bg-[#0f1118] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === "login" ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-colors ${
              tab === "register" ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Đăng ký (Nhận 10 Free Credits)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tên hiển thị
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#10121a] border border-[#242938] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#10121a] border border-[#242938] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#10121a] border border-[#242938] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-sky-950"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : tab === "login" ? (
              "Đăng Nhập"
            ) : (
              "Đăng Ký Tài Khoản"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
