// w2/d2/stability.ts —— 稳定性测试:同一任务重复 N 次,统计成功率与成本分布
// 运行:pnpm start-w2d2(仓库根目录)
// 可调:STABILITY_TASK / STABILITY_RUNS 环境变量
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, mkdirSync } from "node:fs";

const run = promisify(execFile);

// ── 实验参数(环境变量可覆盖)──
const TASK = process.env.STABILITY_TASK ?? "统计 w1 目录下所有文件的行数,把报告写入指定输出文件";
const RUNS = Number(process.env.STABILITY_RUNS ?? 10);
const TIMEOUT_MS = 5 * 60_000; // 单次护栏:5 分钟,防个别 run 挂死拖垮整轮测试

type RunResult = {
  index: number;
  ok: boolean;
  durationMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  cost: string | null;
  errorTail: string; // 失败时的线索(stderr 尾巴 / 退出码 / 超时标记)
};

// 从 CLI 的 usage 行提取数据(格式来自 pricing.ts 的 printUsage)
function parseUsage(stdout: string) {
  const p = stdout.match(/输入 ([\d,]+) tok/);
  const c = stdout.match(/输出 ([\d,]+) tok/);
  const cost = stdout.match(/累计费用 (¥[\d.]+|\?)/);
  return {
    promptTokens: p ? Number(p[1].replace(/,/g, "")) : null,
    completionTokens: c ? Number(c[1].replace(/,/g, "")) : null,
    cost: cost ? cost[1] : null,
  };
}

const results: RunResult[] = [];
mkdirSync("reports", { recursive: true });

for (let i = 1; i <= RUNS; i++) {
  const t0 = Date.now();
  console.log(`\n===== run ${i}/${RUNS} =====`);
  try {
    const { stdout } = await run(
      "pnpm",
      ["start-w2d1", "--", "--task", TASK, "--dir", "w1", "--out", `reports/run-${i}.md`],
      { timeout: TIMEOUT_MS, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    const parsed = parseUsage(stdout);
    results.push({ index: i, ok: true, durationMs: Date.now() - t0, ...parsed, errorTail: "" });
    console.log(`✅ run ${i} 完成(耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    const err = e as { code?: number | string; stderr?: string; killed?: boolean };
    const tail =
      (err.stderr ?? "")
        .split("\n")
        .filter(Boolean)
        .slice(-3)
        .join(" / ") || (err.killed ? "超时被杀" : `退出码 ${err.code}`);
    results.push({
      index: i, ok: false, durationMs: Date.now() - t0,
      promptTokens: null, completionTokens: null, cost: null, errorTail: tail,
    });
    console.log(`❌ run ${i} 失败:${tail}`);
  }
}

// ── 汇总:成功率 / 耗时分布 / 成本分布 ──
const okRuns = results.filter((r) => r.ok);
const successRate = ((okRuns.length / results.length) * 100).toFixed(0);
const costs = okRuns.map((r) => r.cost).filter((c) => c && c !== "?");
const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);

const lines: string[] = [
  `# 稳定性测试报告 · ${new Date().toISOString().slice(0, 10)}`,
  "",
  `- 任务:${TASK}`,
  `- 运行:${RUNS} 次 | 成功 ${okRuns.length} | 成功率 **${successRate}%**`,
  `- 耗时:平均 ${(results.reduce((s, r) => s + r.durationMs, 0) / results.length / 1000).toFixed(1)}s / 最快 ${(durations[0] / 1000).toFixed(1)}s / 最慢 ${(durations[durations.length - 1] / 1000).toFixed(1)}s`,
  `- 成功运行费用:${costs.join(", ") || "(无可用数据)"}`,
  "",
  "## 明细",
  "",
  "| run | 结果 | 耗时s | 输入tok | 输出tok | 费用 | 失败线索 |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      `| ${r.index} | ${r.ok ? "✅" : "❌"} | ${(r.durationMs / 1000).toFixed(1)} | ${r.promptTokens ?? "-"} | ${r.completionTokens ?? "-"} | ${r.cost ?? "-"} | ${r.errorTail.slice(0, 60) || "-"} |`,
  ),
  "",
  "## 失败归因(逐个失败样本填写,类别见 W2-D2 详解册)",
  "",
  "- run _:失败模式(选错工具 / 参数幻觉 / 工具报错 / 预算耗尽 / 基础设施)→ 对策:___",
];

mkdirSync("notes", { recursive: true });
writeFileSync("notes/w2-stability-result.md", lines.join("\n"), "utf8");
console.log(`\n📊 成功率 ${successRate}% | 报告已写入 notes/w2-stability-result.md`);
