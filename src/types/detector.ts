export type ProbeStatus = "passed" | "failed" | "skipped" | "running" | "pending";

export type ProbeId =
  | "llm_fingerprint"
  | "non_streaming"
  | "thinking_signature"
  | "tool_use"
  | "model_identity"
  | "vision"
  | "streaming"
  | "web_search"
  | "structured_output"
  | "knowledge_cutoff"
  | "document_recognition"
  | "token_audit";

export interface ProbeDefinition {
  id: ProbeId;
  nameVi: string;
  nameEn: string;
  description: string;
  category: "core" | "structure" | "capability" | "billing";
  weight: number; // For score calculation
}

export interface ProbeResult {
  id: ProbeId;
  nameVi: string;
  status: ProbeStatus;
  score: number; // 0 - 100
  latencyMs: number;
  details?: string;
  rawRequest?: any;
  rawResponse?: any;
  error?: string;
  data?: Record<string, any>;
}

export interface ModelFingerprintScore {
  modelName: string;
  percentage: number;
  description?: string;
}

export interface TokenAuditDetails {
  reportedInputTokens: number;
  countedInputTokens: number;
  reportedOutputTokens: number;
  countedOutputTokens: number;
  inflationRatio: number; // e.g. 1.0 = honest, 1.3 = 30% inflated
  isInflated: boolean;
  estimatedCostPerM: number;
}

export interface DetectionReport {
  id: string; // UUID e.g. 1e9c1153-7840-4a21-86be-a570966c2871
  createdAt: string;
  targetModel: string;
  claimedModel: string;
  targetUrl: string;
  overallScore: number; // 0 - 100
  confidenceLevel: "high" | "medium" | "low" | "counterfeit";
  verdictTitle: string;
  verdictDescription: string;
  estimatedMarketPrice: string;
  probes: Record<ProbeId, ProbeResult>;
  fingerprintAttribution: {
    titleVi: string;
    descriptionVi: string;
    scores: ModelFingerprintScore[];
  };
  tokenAudit?: TokenAuditDetails;
  isMock?: boolean;
}

export interface RunTestRequest {
  apiKey: string;
  baseUrl?: string;
  model: string;
  systemPrompt?: string;
  probesToRun?: ProbeId[];
  isMockDemo?: boolean;
  mockScenario?: "suspicious_91" | "clean_100" | "fake_downgraded_35" | "inflated_tokens_70";
}
