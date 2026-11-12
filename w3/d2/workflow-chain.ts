// W3-D2 · workflow-chain.ts —— Prompt Chaining 对照实验
//
// 同一个任务(统计 w1 下所有 .ts 文件行数,写 markdown 报告),两种光谱形态:
//   版本 A(已有): pnpm start-w2d5 -- --task "统计 w1 目录下所有 ts 文件的行数" ...
//       → Agent:模型在循环里实时决定「先列目录、发现子目录就递归、逐个读、汇总、写报告」
//   版本 B(本文件): pnpm start-w3d2-chain
//       → Workflow(Prompt Chaining):路径全部由代码预定义——list_dir → read_file × N →
//         calculator 求和 → write_file,每一步在写代码时就定死,模型完全不参与。
//
// 关键设计:复用同一套工具注册表(./p1-cli/tools 的 registry)。
// 于是两个版本唯一的变量就是「谁决定路径」——模型 vs 代码,完美的控制变量实验。
//
// 跑完做三个观察(对照表见《W3-D2 详解》第 02 章):
//   ① token 成本:本版 0(没有模型调用);Agent 版 ~¥0.02/次
//   ② 确定性:本版连跑两次输出逐字节相同;Agent 版措辞每次可能不同
//   ③ 通用性:把任务改成「统计 .md 文件」——Agent 版只需改 --task 一个词;
//      本版要改两处代码(filter 后缀 + 报告标题),改完才重新生效
import { registry } from "./p1-cli/tools";
import * as path from "node:path";

const DIR = process.argv[2] ?? "w1";
const OUT = process.argv[3] ?? "reports/w3d2-chain-report.md";

type Row = { file: string; lines: number };

/** 步骤 1(固定):递归收集目录下所有 .ts —— 逐层调 list_dir,目录项(带 / 后缀)深入 */
async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = (await registry.list_dir.execute({ dir })) as string[];
  const files: string[] = [];
  for (const e of entries) {
    const full = path.posix.join(dir, e);
    if (e.endsWith("/")) files.push(...(await collectTsFiles(full)));
    else if (e.endsWith(".ts")) files.push(full);
  }
  return files.sort();
}

async function main() {
  const t0 = Date.now();
  console.log(`[chain] 版本 B · Prompt Chaining(路径预定义,零模型调用)`);
  console.log(`[chain] 任务:统计 ${DIR} 下所有 .ts 行数 → ${OUT}\n`);

  // 步骤 1:list_dir × 递归(固定)
  const files = await collectTsFiles(DIR);
  console.log(`[chain] 步骤1 list_dir:发现 ${files.length} 个 .ts`);

  // 步骤 2:read_file × N(固定循环,N 由代码算出,模型无发言权)
  const rows: Row[] = [];
  for (const f of files) {
    const content = (await registry.read_file.execute({ file: f })) as string;
    rows.push({ file: f, lines: content.split("\n").length });
    console.log(`[chain] 步骤2 read_file:${f} → ${rows.at(-1)!.lines} 行`);
  }

  // 步骤 3:calculator 求和(固定)——表达式由代码拼接,工具照常跑白名单校验
  const expr = rows.map((r) => r.lines).join("+") || "0";
  const sum = (await registry.calculator.execute({ expression: expr })) as { value: number };
  console.log(`[chain] 步骤3 calculator:${expr.slice(0, 40)}${expr.length > 40 ? "…" : ""} = ${sum.value}`);

  // 步骤 4:write_file(固定)——报告格式也在这里写死;Agent 版这一步是模型自己组织的
  // 确定性纪律:报告里不写任何随运行变化的字段(连耗时都不写)——保证两次输出逐字节可比
  const report = [
    `# 行数统计报告(Workflow · Prompt Chaining 版)`,
    ``,
    `- 目录:${DIR}(仅 .ts,递归)`,
    `- 生成方式:代码预定义步骤序列 list_dir → read_file × N → calculator → write_file,无模型参与`,
    ``,
    `| 文件 | 行数 |`,
    `| --- | --- |`,
    ...rows.map((r) => `| ${r.file} | ${r.lines} |`),
    `| **总计(${rows.length} 个文件)** | **${sum.value}** |`,
    ``,
  ].join("\n");
  await registry.write_file.execute({ file: OUT, content: report });
  console.log(`[chain] 步骤4 write_file:${OUT}`);

  console.log(`\n[chain] 完成。总耗时 ${(Date.now() - t0)} ms,token 消耗 0,费用 ¥0`);
  console.log(`[chain] 再跑一遍,输出与本次逐字节相同——这就是 Workflow 的「结果确定」`);
  console.log(`[chain] 对照:Agent 版同任务 ≈ 30-90s / ¥0.02 / 措辞每次可能不同 / 但换任务只需改一句话`);
}

main().catch((e) => {
  console.error(`[chain] 失败:${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
