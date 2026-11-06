// 价格单位：元 / 百万 token（本地静态快照，不作为结算依据）
export type ModelPrice = { input: number; output: number };
export type UsageStats = {
  promptTokens: number;
  completionTokens: number;
  turns: number;
  cost: number;
};

export const PRICE_TABLE: Record<string, ModelPrice> = {
  "deepseek-chat": { input: 2,  output: 8 },
  "glm-5.3-flash": { input: 1,  output: 4 },
};

export function costOf(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const price = PRICE_TABLE[model];
  // 未知模型显式返回 NaN，避免把不可计价的数据静默显示成 0
  if (!price) return NaN;
  return (promptTokens / 1e6) * price.input + (completionTokens / 1e6) * price.output;
}

export function formatCost(cost: number): string {
  return Number.isNaN(cost) ? "?" : `¥${cost.toFixed(4)}`;
}

export function formatUsage(usage: UsageStats, model: string): string {
  return [
    `模型 ${model}`,
    `模型请求 ${usage.turns} 次`,
    `输入 ${usage.promptTokens.toLocaleString()} tok`,
    `输出 ${usage.completionTokens.toLocaleString()} tok`,
    `累计费用 ${formatCost(usage.cost)}`,
  ].join(" | ");
}

export function printUsage(usage: UsageStats, model: string): void {
  console.log(`  ${formatUsage(usage, model)}`);
}

export function printPricing(currentModel: string): void {
  console.log("  模型单价（元 / 百万 tokens）:");
  const rows = Object.entries(PRICE_TABLE).map(([model, price]) => ({
    模型: model,
    输入: `¥${price.input}`,
    输出: `¥${price.output}`,
    当前: model === currentModel ? "✅" : "",
  }));
  console.table(rows);

  if (!PRICE_TABLE[currentModel]) {
    console.log(`  ⚠️ 当前模型 ${currentModel} 未配置单价，费用会显示为 ?`);
  }
}
