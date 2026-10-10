import { ApiKeyRecord } from "@/types/commercial";
import { AdminStats } from "@/types/auth";
import { getAllUsers } from "./auth";
import { generateUUID } from "./engine";

// Memory storage for commercial API keys
const keysStore = new Map<string, ApiKeyRecord>();

// Pre-seed a default demo API key for instant testing
const DEFAULT_DEMO_KEY: ApiKeyRecord = {
  id: "key-demo-default-01",
  userId: "usr-admin-01",
  name: "Khóa Quản Trị Hệ Thống",
  key: "apizz_live_demo_8f9a2b7c4d1e",
  credits: 50,
  totalUsed: 12,
  tier: "pro",
  createdAt: new Date().toISOString(),
  isActive: true,
};

keysStore.set(DEFAULT_DEMO_KEY.key, DEFAULT_DEMO_KEY);
// Backward compatibility for cctest key
keysStore.set("cctest_live_demo_8f9a2b7c4d1e", DEFAULT_DEMO_KEY);

export function getAllApiKeys(): ApiKeyRecord[] {
  return Array.from(keysStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getApiKeyRecord(keyString: string): ApiKeyRecord | null {
  const cleanKey = keyString.replace(/^Bearer\s+/i, "").trim();
  return keysStore.get(cleanKey) || null;
}

export function getKeysByUserId(userId: string): ApiKeyRecord[] {
  return Array.from(keysStore.values())
    .filter((k) => !k.userId || k.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createApiKey(
  name: string,
  tier: "free" | "starter" | "pro" | "reseller" = "free",
  credits = 50,
  userId?: string
): ApiKeyRecord {
  const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const keyString = `apizz_live_${randomHex}`;

  const record: ApiKeyRecord = {
    id: generateUUID(),
    userId: userId || "usr-user-01",
    name: name.trim() || `API Key ${keysStore.size + 1}`,
    key: keyString,
    credits,
    totalUsed: 0,
    tier,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  keysStore.set(record.key, record);
  return record;
}

export function deleteApiKey(keyOrId: string): boolean {
  for (const [key, record] of Array.from(keysStore.entries())) {
    if (record.id === keyOrId || record.key === keyOrId) {
      keysStore.delete(key);
      return true;
    }
  }
  return false;
}

export function toggleApiKeyStatus(keyOrId: string): boolean {
  for (const [key, record] of Array.from(keysStore.entries())) {
    if (record.id === keyOrId || record.key === keyOrId) {
      record.isActive = !record.isActive;
      keysStore.set(key, record);
      return true;
    }
  }
  return false;
}

export function adjustKeyCredits(keyOrId: string, deltaCredits: number): boolean {
  for (const [key, record] of Array.from(keysStore.entries())) {
    if (record.id === keyOrId || record.key === keyOrId) {
      record.credits = Math.max(0, record.credits + deltaCredits);
      keysStore.set(key, record);
      return true;
    }
  }
  return false;
}

export function verifyAndDeductCredit(keyString: string): {
  valid: boolean;
  error?: string;
  record?: ApiKeyRecord;
} {
  const cleanKey = keyString.replace(/^Bearer\s+/i, "").trim();
  const record = keysStore.get(cleanKey);

  if (!record) {
    return { valid: false, error: "API Key không hợp lệ hoặc không tồn tại." };
  }

  if (!record.isActive) {
    return { valid: false, error: "API Key đã bị khóa hoặc tạm dừng." };
  }

  if (record.credits <= 0) {
    return {
      valid: false,
      error: "Tài khoản API Key đã hết lượt quét (Credits = 0). Vui lòng nạp thêm credit để tiếp tục.",
      record,
    };
  }

  // Deduct 1 credit
  record.credits -= 1;
  record.totalUsed += 1;
  keysStore.set(cleanKey, record);

  return { valid: true, record };
}

export function topupKey(keyString: string, addedCredits: number): ApiKeyRecord | null {
  const cleanKey = keyString.trim();
  const record = keysStore.get(cleanKey);
  if (!record) return null;

  record.credits += addedCredits;
  keysStore.set(cleanKey, record);
  return record;
}

export function getAdminStats(): AdminStats {
  const allKeys = getAllApiKeys();
  const allUsers = getAllUsers();
  const totalScans = allKeys.reduce((acc, k) => acc + k.totalUsed, 0);
  const activeKeys = allKeys.filter((k) => k.isActive).length;
  // Estimated revenue from plans & credits
  const estimatedRevenueVnd = allKeys.reduce((acc, k) => {
    if (k.tier === "starter") return acc + 50000;
    if (k.tier === "pro") return acc + 200000;
    if (k.tier === "reseller") return acc + 500000;
    return acc;
  }, 350000); // seed default

  return {
    totalUsers: allUsers.length,
    totalKeys: allKeys.length,
    totalScans,
    estimatedRevenueVnd,
    activeKeys,
  };
}
