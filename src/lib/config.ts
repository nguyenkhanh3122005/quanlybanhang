export interface SystemConfig {
  upstreamAnthropicKey: string;
  proxyMode: "smart_relay" | "direct_mock";
  stationName: string;
}

let configStore: SystemConfig = {
  upstreamAnthropicKey: process.env.ANTHROPIC_API_KEY || "",
  proxyMode: "smart_relay",
  stationName: "Trạm API Claude Chính Hãng",
};

export function getSystemConfig(): SystemConfig {
  return configStore;
}

export function updateSystemConfig(newConfig: Partial<SystemConfig>): SystemConfig {
  configStore = { ...configStore, ...newConfig };
  return configStore;
}
