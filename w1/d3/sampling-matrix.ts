import OpenAI from "openai";
import { writeFileSync, mkdirSync } from "node:fs";
import "dotenv/config";
import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;

const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });
const model = p.model;

// 实验设计:两类任务代表两种「好坏标准」
const TASKS = {
  factual: "Node.js 的事件循环是什么?用 3 句话回答,不要展开。",
  creative: "给一个命令行待办事项工具起 10 个产品名,一行一个,只要名字。",
};
const TEMPS = [0, 0.7, 1.5];
const RUNS = 3;
const MAX_TOKENS = 2000;   // 保险丝:防个别 run 跑飞(实验成本可控)

const matrix: Record<string, Record<number, string[]>> = {};

for (const [name, prompt] of Object.entries(TASKS)) {
  matrix[name] = {};
  for (const temp of TEMPS) {
    const outputs: string[] = [];
    for (let i = 0; i < RUNS; i++) {
      const res = await client.chat.completions.create({
        model,
        temperature: temp,
        max_tokens: MAX_TOKENS,     // 注:部分新模型要求改用 max_completion_tokens(库详解第 09 章)
        messages: [{ role: "user", content: prompt }],
      });
      const choice = res.choices[0];
      outputs.push(choice.message.content?.trim() ?? "");
      if (choice.finish_reason !== "stop") {
        console.warn(`⚠️ ${name}/temp=${temp}/run${i + 1} 截断于 ${choice.finish_reason}`);
      }
    }
    matrix[name][temp] = outputs;
    console.log(`\n===== ${name} · temperature=${temp} =====`);
    outputs.forEach((o, i) => console.log(`--- run ${i + 1} ---\n${o}\n`));
  }
}

// 落盘成 markdown 报告(实验是资产,必须能横向回看)
mkdirSync("notes", { recursive: true });
const lines: string[] = [
  `# 采样矩阵实验 · ${new Date().toISOString().slice(0, 10)}`,
  `模型:${model} · 每组 ${RUNS} 次 · max_tokens=${MAX_TOKENS}`, "",
];
for (const [name, byTemp] of Object.entries(matrix)) {
  lines.push(`## ${name}`, "");
  for (const [temp, outs] of Object.entries(byTemp)) {
    lines.push(`### temperature = ${temp}`, "");
    outs.forEach((o, i) => lines.push(`**run ${i + 1}**`, "", "```text", o, "```", ""));
  }
}
writeFileSync("notes/sampling-matrix-result.md", lines.join("\n"), "utf8");
console.log("✅ 报告已写入 notes/sampling-matrix-result.md");
