import { z } from "zod";

export type ToolDef = {
  description: string;                    // 给模型看的文档
  parameters: Record<string, unknown>;      // JSON Schema:给模型的参数格式
  schema: z.ZodTypeAny;                   // zod:给你自己的执行侧校验(双 schema 分工)
  execute: (args: any) => Promise<unknown>;
};

export const registry: Record<string, ToolDef> = {
  get_weather: {
    description:
      "查询中国城市实时天气,返回温度与天气状况。仅支持中国大陆地级市,不支持海外城市与历史天气。",
    parameters: {
      type: "object",
      properties: { city: { type: "string", description: "城市名,如:杭州" } },
      required: ["city"],
      additionalProperties: false,
    },
    schema: z.object({ city: z.string().min(1) }),
    execute: async ({ city }: { city: string }) => {
      // 演示用伪实现;接真实 API 时换 fetch 即可(注意超时)
      const mock: Record<string, string> = { "杭州": "18℃ 多云", "北京": "11℃ 晴", "上海": "20℃ 小雨" };
      if (!mock[city]) throw new Error(`暂无「${city}」的天气数据(仅支持:杭州/北京/上海)`);
      return { city, weather: mock[city] };
    },
  },
  calculator: {
    description:
      "计算一个数学表达式的值,支持四则运算与括号。仅用于数值计算,不要用于单位换算或天气查询。",
    parameters: {
      type: "object",
      properties: { expression: { type: "string", description: "数学表达式,如:(3+4)*2" } },
      required: ["expression"],
      additionalProperties: false,
    },
    schema: z.object({ expression: z.string().min(1) }),
    execute: async ({ expression }: { expression: string }) => {
      // 安全观落地:白名单校验——模型给的字符串永远不可信
      if (!/^[\d+\-*/().\s]+$/.test(expression)) throw new Error("表达式含非法字符,仅支持数字与四则运算符");
      // eslint-disable-next-line no-new-func
      const value = Function(`"use strict";return (${expression})`)();
      return { expression, value: Number(value.toFixed(6)) };
    },
  },
};

// 注册表 → 请求的 tools 参数
export function toToolsParam() {
  return Object.entries(registry).map(([name, t]) => ({
    type: "function" as const,
    function: { name, description: t.description, parameters: t.parameters },
  }));
}