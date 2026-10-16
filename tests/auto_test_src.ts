/**
 * Automated Test Suite for src/ (cctest-claude-detector)
 * Tests core detection engine, authentication, API key manager, and storage.
 */

import { generateUUID, runApiDetection } from "../src/lib/engine";
import { registerUser, authenticateUser, getAllUsers, deleteUser } from "../src/lib/auth";
import {
  getAllApiKeys,
  getApiKeyRecord,
  createApiKey,
  deleteApiKey,
  toggleApiKeyStatus,
  verifyAndDeductCredit,
  adjustKeyCredits,
  topupKey,
  getAdminStats,
} from "../src/lib/apiKeyManager";
import { saveReport, getReportById, getAllReports } from "../src/lib/storage";
import { PROBE_DEFINITIONS } from "../src/lib/constants";
import { DetectionReport } from "../src/types/detector";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
  }
}

async function runTestSuite() {
  console.log("\n=================================================================");
  console.log("  🚀 KHỞI CHẠY BỘ KIỂM THỬ TỰ ĐỘNG CHO THƯ MỤC src/");
  console.log("=================================================================\n");

  // 1. TEST ENGINE & UUID
  console.log("📦 [1/5] Kiểm thử Detection Engine & UUID Generator...");
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();
  assert(typeof uuid1 === "string" && uuid1.length === 36, "generateUUID tạo mã UUID 36 ký tự chuẩn v4");
  assert(uuid1 !== uuid2, "generateUUID tạo các mã duy nhất không trùng lặp");

  // Test Mock Detection Clean (100% Genuine)
  const cleanReport = await runApiDetection({
    apiKey: "demo_clean",
    model: "claude-3-7-sonnet-20250219",
    isMockDemo: true,
    mockScenario: "clean_100",
  });
  assert(cleanReport.overallScore === 100, "Clean Mock Scenario trả về điểm tuyệt đối 100%");
  assert(cleanReport.confidenceLevel === "high", "Clean Mock Scenario trả về confidenceLevel high");
  assert(cleanReport.targetModel.includes("claude-3-7-sonnet"), "Xác nhận đúng targetModel Claude 3.7 Sonnet");

  // Test Mock Detection Downgraded (Fake)
  const fakeReport = await runApiDetection({
    apiKey: "demo_fake",
    model: "claude-3-7-sonnet-20250219",
    isMockDemo: true,
    mockScenario: "fake_downgraded_35",
  });
  assert(fakeReport.overallScore <= 35, `Fake Downgraded Scenario trả về điểm thấp (${fakeReport.overallScore}% <= 35%)`);
  assert(fakeReport.confidenceLevel === "counterfeit", "Fake Downgraded Scenario trả về confidenceLevel counterfeit");

  // Test Probe Definitions
  const probeKeys = Object.keys(PROBE_DEFINITIONS);
  assert(probeKeys.length === 12, `Hệ thống định nghĩa đầy đủ ${probeKeys.length}/12 probes chuyên sâu`);
  const totalWeight = Object.values(PROBE_DEFINITIONS).reduce((acc, p) => acc + p.weight, 0);
  assert(totalWeight === 110, `Tổng trọng số các probes đạt chuẩn 110 điểm chuẩn hóa (thực tế: ${totalWeight})`);

  // 2. TEST AUTH & RBAC
  console.log("\n🔐 [2/5] Kiểm thử Hệ Thống Xác Thực (Authentication & RBAC)...");
  // Test Pre-seeded admin
  const adminLogin = authenticateUser("admin@apizz.net", "admin123");
  assert(adminLogin.user !== undefined && adminLogin.user.role === "admin", "Admin đăng nhập thành công với quyền admin");

  // Test Pre-seeded user
  const userLogin = authenticateUser("user@apizz.net", "user123");
  assert(userLogin.user !== undefined && userLogin.user.role === "user", "User đăng nhập thành công với quyền user");

  // Test Wrong password
  const failLogin = authenticateUser("admin@apizz.net", "wrongpassword");
  assert(failLogin.error !== undefined, "Từ chối đăng nhập khi sai mật khẩu");

  // Test Registration
  const testEmail = `tester_${Date.now()}@test.vn`;
  const regResult = registerUser(testEmail, "SecretPass123", "Kỹ Sư Kiểm Thử");
  assert(regResult.user !== undefined, "Đăng ký thành viên mới thành công");
  assert(regResult.user?.credits === 10, "Cấp phát 10 credit ban đầu cho tài khoản mới");

  // Test Duplicate registration
  const dupResult = registerUser(testEmail, "SecretPass123", "Kỹ Sư Kiểm Thử");
  assert(dupResult.error !== undefined, "Ngăn chặn đăng ký trùng lặp email");

  // Test User List & Delete
  const allUsersBefore = getAllUsers();
  assert(allUsersBefore.length >= 3, `Lấy danh sách người dùng thành công (${allUsersBefore.length} users)`);
  if (regResult.user) {
    const deleted = deleteUser(regResult.user.id);
    assert(deleted === true, "Xóa tài khoản thành viên thành công");
  }

  // 3. TEST COMMERCIAL API KEY MANAGER
  console.log("\n🔑 [3/5] Kiểm thử Quản Lý API Key Thương Mại...");
  const initialKeys = getAllApiKeys();
  assert(initialKeys.length >= 1, `Khởi tạo danh sách API Key (${initialKeys.length} keys có sẵn)`);

  // Create Key
  const newKey = createApiKey("Khóa Test Tự Động", "pro", 100, "usr-user-01");
  assert(newKey.key.startsWith("apizz_live_"), "Định dạng tiền tố API Key chuẩn 'apizz_live_'");
  assert(newKey.credits === 100, "Khởi tạo đủ 100 credits cho gói Pro");

  // Lookup Key
  const foundKey = getApiKeyRecord(newKey.key);
  assert(foundKey !== null && foundKey.id === newKey.id, "Tìm kiếm API Key theo chuỗi Token chính xác");

  // Toggle status
  const toggled = toggleApiKeyStatus(newKey.id);
  assert(toggled === true, "Bật/Tắt trạng thái hoạt động của API Key thành công");
  const disabledKey = getApiKeyRecord(newKey.key);
  assert(disabledKey?.isActive === false, "Khóa chuyển sang trạng thái Inactive");
  toggleApiKeyStatus(newKey.id); // Re-enable

  // Deduct credits via verifyAndDeductCredit
  const deductRes = verifyAndDeductCredit(newKey.key);
  assert(deductRes.valid === true && deductRes.record?.credits === 99, "Khấu trừ credit hợp lệ khi gọi API (100 - 1 = 99)");

  // Top up credits
  const topupRes = topupKey(newKey.key, 50);
  assert(topupRes !== null && topupRes.credits === 149, "Nạp thêm credit thành công (99 + 50 = 149)");

  // Adjust credits
  const adjusted = adjustKeyCredits(newKey.id, 10);
  assert(adjusted === true, "Điều chỉnh số dư credit linh hoạt thành công");

  // Admin Stats
  const stats = getAdminStats();
  assert(stats.totalKeys >= 2, `Tính toán thống kê Admin: ${stats.totalKeys} keys, ${stats.totalScans} scans, ${stats.estimatedRevenueVnd.toLocaleString()} VNĐ`);

  // Delete key
  const deletedKey = deleteApiKey(newKey.id);
  assert(deletedKey === true, "Xóa API Key thành công");

  // 4. TEST STORAGE
  console.log("\n💾 [4/5] Kiểm thử Lưu Trữ Báo Cáo (Storage Engine)...");
  const sampleReport: DetectionReport = {
    ...cleanReport,
    id: `rep_${generateUUID()}`,
    targetModel: "claude-3-7-sonnet-20250219",
    createdAt: new Date().toISOString(),
  };
  saveReport(sampleReport);
  const retrieved = getReportById(sampleReport.id);
  assert(retrieved !== null && retrieved.id === sampleReport.id, "Lưu và truy vấn báo cáo theo ID thành công");

  const allReports = getAllReports();
  assert(allReports.length >= 2, `Danh sách báo cáo trả về đầy đủ (${allReports.length} reports)`);

  // 5. TEST SUMMARY
  console.log("\n=================================================================");
  console.log(`  📊 TỔNG KẾT KIỂM THỬ: ${passedCount} PASS / ${failedCount} FAIL`);
  console.log("=================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("  🎉 TẤT CẢ MODULE TRONG src/ HOẠT ĐỘNG HOÀN HẢO 100%!\n");
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
