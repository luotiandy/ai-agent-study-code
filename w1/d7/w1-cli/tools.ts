import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

export type ToolDef = {
  description: string;                    // 给模型看的文档
  parameters: Record<string, unknown>;    // JSON Schema:给模型的参数格式
  schema: z.ZodTypeAny;                   // zod:给你自己的执行侧校验(双 schema 分工)
  execute: (args: any) => Promise<unknown>;
};

// ─────────────────────────────────────────────
// 安全护栏:所有文件操作限制在项目根目录内,禁止路径穿越
// (D5 原则的文件系统版:模型给的字符串永远不可信)
// ─────────────────────────────────────────────
const ROOT = path.resolve(process.cwd());
function safe(p: string): string {
  const full = path.resolve(ROOT, p);
  if (!full.startsWith(ROOT)) {
    throw new Error(`路径越界:${p}(只允许访问项目目录内)`);
  }
  return full;
}

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
  list_dir: {
    description:
      "列出目录内容(文件与子目录名,子目录带 / 后缀)。参数 dir 为相对路径,如:src 或 .(当前目录)。目录很大时优先列子目录再逐层深入。",
    parameters: {
      type: "object",
      properties: { dir: { type: "string", description: "相对路径,. 表示当前目录" } },
      required: ["dir"],
      additionalProperties: false,
    },
    schema: z.object({ dir: z.string().min(1) }),
    execute: async ({ dir }: { dir: string }) => {
      const entries = fs.readdirSync(safe(dir), { withFileTypes: true });
      return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    },
  },
  read_file: {
    description:
      "读取单个文本文件内容。仅用于读取代码或文本文件,单文件上限 40KB,超出请分段读取。不要用它读目录。",
    parameters: {
      type: "object",
      properties: { file: { type: "string", description: "相对路径" } },
      required: ["file"],
      additionalProperties: false,
    },
    schema: z.object({ file: z.string().min(1) }),
    execute: async ({ file }: { file: string }) => {
      const full = safe(file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) throw new Error(`${file} 是目录,请用 list_dir`);
      if (stat.size > 40 * 1024) {
        throw new Error(`文件过大(${Math.round(stat.size / 1024)}KB > 40KB),请分段读取`);
      }
      return fs.readFileSync(full, "utf8");
    },
  },
  write_file: {
    description:
      "把文本内容写入文件(覆盖写)。用于生成报告类产出物。路径必须在项目目录内。",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", description: "目标相对路径" },
        content: { type: "string", description: "完整文件内容" },
      },
      required: ["file", "content"],
      additionalProperties: false,
    },
    schema: z.object({ file: z.string().min(1), content: z.string().min(1) }),
    execute: async ({ file, content }: { file: string; content: string }) => {
      fs.writeFileSync(safe(file), content, "utf8");
      return { written: file, bytes: Buffer.byteLength(content) };
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
