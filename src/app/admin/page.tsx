"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  Key,
  Users,
  BarChart3,
  Coins,
  Activity,
  Trash2,
  Power,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { ApiKeyRecord } from "@/types/commercial";
import { User, AdminStats } from "@/types/auth";
import { getClientUser } from "@/lib/clientAuth";

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<"keys" | "users" | "logs">("keys");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const user = getClientUser();
    setCurrentUser(user);
    if (user && user.role === "admin") {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, keysRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/v1/keys").then((r) => r.json()),
        fetch("/api/auth/users").then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (keysRes.success) setKeys(keysRes.keys);
      if (usersRes.success) setUsers(usersRes.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showNotif = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Admin: Bạn có chắc chắn muốn xóa API Key này vĩnh viễn?")) return;
    try {
      const res = await fetch(`/api/v1/keys?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotif("Đã xóa API Key thành công!");
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleKey = async (id: string) => {
    try {
      const res = await fetch("/api/v1/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyOrId: id, action: "toggle" }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif("Đã thay đổi trạng thái hoạt động của khóa!");
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCreditsToKey = async (id: string, delta: number) => {
    try {
      const res = await fetch("/api/v1/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyOrId: id, action: "adjustCredits", creditsDelta: delta }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif(`Đã cộng thêm ${delta} credits vào khóa!`);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Admin: Bạn có chắc chắn muốn xóa tài khoản người dùng này?")) return;
    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotif("Đã xóa người dùng thành công!");
        loadData();
      } else {
        alert(data.error || "Không thể xóa admin");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif(`Đã đổi vai trò thành ${newRole.toUpperCase()}!`);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredKeys = keys.filter(
    (k) =>
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!loading && (!currentUser || currentUser.role !== "admin")) {
    return (
      <main className="min-h-screen bg-[#0f1118] text-[#e2e8f0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#141724] border border-rose-900/50 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-rose-950/80 text-rose-400 border border-rose-900/60 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">403 - Quyền Truy Cập Bị Từ Chối</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Bạn đang đăng nhập với tài khoản người dùng thường (hoặc chưa đăng nhập).
            Khu vực quản trị này chỉ dành riêng cho Quản Trị Viên (Admin).
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại Trang Chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1118] text-[#e2e8f0] p-4 sm:p-6 lg:p-8 flex justify-center">
      <div className="w-full max-w-6xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#202536]">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#171a26] text-slate-400 hover:text-white border border-[#262c3e] transition-colors"
              title="Về trang chủ"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                Trang Quản Trị Hệ Thống
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ADMIN PORTAL
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Quản lý toàn bộ API Keys, Người dùng, Doanh thu và Kiểm toán Hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-[#191d2c] hover:bg-[#22273b] border border-[#2a3146] text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới dữ liệu
            </button>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              Xem Trang Chủ Test
            </Link>
          </div>
        </div>

        {/* Global Notification */}
        {notification && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {notification}
          </div>
        )}

        {/* KPI Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[#141724] border border-[#23283a] rounded-xl shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Doanh thu ước tính</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
                {stats.estimatedRevenueVnd.toLocaleString("vi-VN")} đ
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Từ các gói Starter / Pro / Enterprise</div>
            </div>

            <div className="p-4 bg-[#141724] border border-[#23283a] rounded-xl shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Tổng lượt quét API</span>
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white font-mono">
                {stats.totalScans}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Lượt audit 12 đầu dò đã chạy</div>
            </div>

            <div className="p-4 bg-[#141724] border border-[#23283a] rounded-xl shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Khóa API Hoạt động</span>
                <Key className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white font-mono">
                {stats.activeKeys} <span className="text-xs text-slate-400 font-normal">/ {stats.totalKeys} keys</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Đang cấp quyền trên server</div>
            </div>

            <div className="p-4 bg-[#141724] border border-[#23283a] rounded-xl shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Tổng Người Dùng</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-white font-mono">
                {stats.totalUsers}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tài khoản đăng ký trên hệ thống</div>
            </div>
          </div>
        )}

        {/* Tabs & Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141724] p-3 rounded-xl border border-[#23283a]">
          <div className="flex items-center gap-1.5 bg-[#0f1118] p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("keys")}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === "keys"
                  ? "bg-sky-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Tất cả API Keys ({keys.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === "users"
                  ? "bg-sky-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Người Dùng ({users.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên / key / email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0f1118] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* TAB 1: ALL API KEYS */}
        {activeTab === "keys" && (
          <div className="bg-[#141724] border border-[#23283a] rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#11131c] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-[#23283a]">
                  <tr>
                    <th className="py-3 px-4">Tên Key</th>
                    <th className="py-3 px-4">Mã API Key</th>
                    <th className="py-3 px-4">Gói (Tier)</th>
                    <th className="py-3 px-4 text-center">Số dư Credits</th>
                    <th className="py-3 px-4 text-center">Đã Quét</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác Quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2333]">
                  {filteredKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-[#191d2c]/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{k.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">{k.key}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-950 text-sky-400 border border-sky-800/40">
                          {k.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        {k.credits}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {k.totalUsed}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {k.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/50">
                            Đã khóa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Add 50 credits */}
                          <button
                            onClick={() => handleAddCreditsToKey(k.id, 50)}
                            className="px-2 py-1 rounded bg-[#1e2333] hover:bg-slate-700 text-sky-400 font-semibold text-[11px] transition-colors"
                            title="Nạp 50 credits"
                          >
                            +50
                          </button>
                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleKey(k.id)}
                            className={`p-1 rounded transition-colors ${
                              k.isActive
                                ? "bg-amber-950/40 text-amber-400 hover:bg-amber-900/60"
                                : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60"
                            }`}
                            title={k.isActive ? "Tạm dừng khóa" : "Kích hoạt lại khóa"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete Key */}
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors"
                            title="Xóa vĩnh viễn khóa API này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredKeys.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Không tìm thấy khóa API nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="bg-[#141724] border border-[#23283a] rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#11131c] text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-[#23283a]">
                  <tr>
                    <th className="py-3 px-4">Tên người dùng</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4 text-center">Số dư Credits</th>
                    <th className="py-3 px-4">Ngày đăng ký</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2333]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#191d2c]/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <span>{u.avatar || "👤"}</span>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        {u.credits}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="px-2 py-1 rounded bg-[#1e2333] hover:bg-slate-700 text-sky-400 text-[11px] font-medium transition-colors"
                          >
                            Đổi thành {u.role === "admin" ? "USER" : "ADMIN"}
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors"
                              title="Xóa tài khoản người dùng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
