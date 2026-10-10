import { DetectionReport } from "@/types/detector";
import { SCREENSHOT_MOCK_REPORT } from "./mockData";

// Global in-memory storage for reports during server runtime
const reportStore = new Map<string, DetectionReport>();

// Seed with default screenshot report
reportStore.set(SCREENSHOT_MOCK_REPORT.id, SCREENSHOT_MOCK_REPORT);

export function saveReport(report: DetectionReport): void {
  reportStore.set(report.id, report);
}

export function getReportById(id: string): DetectionReport | null {
  return reportStore.get(id) || null;
}

export function getAllReports(): DetectionReport[] {
  return Array.from(reportStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
