import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Session } from "./Session";
import { handleCommand } from "./command";
import { printUsage } from "./pricing";
import { PROVIDERS } from "../../../config";

const p = PROVIDERS.ifa;

const SYSTEM =
  "你是一个简洁的技术助手,先给结论再解释。任何数学运算——包括看似简单的乘除——必须通过 calculator 工具完成,禁止心算;拿到工具结果后再作答。";

/** 非交互单任务模式参数:--task 必填,--dir/--out 可选 */
function parseArgs(argv: string[]) {
  const get = (key: string) => {
    const i = argv.indexOf(key);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    task: get("--task"),
    dir: get("--dir") ?? ".",
    out: get("--out") ?? "report.md",
    verbose: argv.includes("--verbose"),
  };
}

/** 非交互单任务模式:D2 稳定性测试的调用入口(可被脚本重复执行) */
async function runNonInteractive(
  client: OpenAI,
  task: string,
  dir: string,
  out: string,
  verbose: boolean,
): Promise<number> {
  const session = new Session(
    `${SYSTEM}\n当前工作目录是项目根,所有相对路径基于它。任务完成后把结果报告用 write_file 写入指定输出文件,再用一句话总结。`,
    client,
    p.model,
  );
  const fullTask = `${task}\n\n约束:只统计 ${dir} 下的文本文件;报告为 markdown 格式,包含文件清单、每个文件的行数与合计。`;

  const { text } = await session.chat(fullTask, {
    onDelta: (t) => process.stdout.write(t),
    onTool: (name, args) => console.log(`\n  🔧 ${name}(${JSON.stringify(args)})`),
    onHop: verbose
      ? (info) => console.log(`\n  [hop ${info.hop}] messages=${info.messageCount} | 点名: ${info.tools.join(", ")}`)
      : undefined,
  });

  printUsage(session.usage, p.model);
  return text ? 0 : 1; // 退出码:D2 的稳定性脚本靠它判定成败
}

/** 交互模式:与 W1-D7 相同 */
async function interactive(client: OpenAI, verbose: boolean) {
  const session = new Session(SYSTEM, client, p.model);
  const rl = readline.createInterface({ input, output });
  console.log("P1 交互模式 | /help 查看命令 | Shift+C 中断/退出");

  let controller = new AbortController();
  let busy = false;
  process.stdin.on("keypress", (_str, key) => {
    if (key && key.shift && key.name === "c") {
      if (busy) controller.abort();
      else process.exit(0);
    }
  });
  input.setRawMode?.(true);

  while (true) {
    const line = (await rl.question("\n你> ")).trim();
    if (!line) continue;
    if (line.startsWith("/")) {
      const shouldContinue = await handleCommand(line, session);
      if (!shouldContinue) break;
      continue;
    }

    busy = true;
    controller = new AbortController();
    process.stdout.write("\n助手> ");
    try {
      const { text, interrupted } = await session.chat(line, {
        onDelta: (t) => process.stdout.write(t),
        onTool: (name, args) => console.log(`\n  🔧 ${name}(${JSON.stringify(args)})`),
        onHop: verbose
          ? (info) => console.log(`\n  [hop ${info.hop}] messages=${info.messageCount} | 点名: ${info.tools.join(", ")}`)
          : undefined,
        signal: controller.signal,
      });
      if (interrupted) console.log("\n⏹ 已中断(已生成内容已保留在上下文)");
      else if (!text) console.log("");
    } catch (e) {
      console.error(`\n❌ 调用失败:${e instanceof Error ? e.message : String(e)}`);
      console.error("  (已回滚本轮输入,历史保持一致;可重试)");
    }
    busy = false;
  }
}

async function main() {
  const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });
  const { task, dir, out, verbose } = parseArgs(process.argv.slice(2));

  if (task) {
    // 非交互:跑完退出,退出码 0/1 —— 可测试性是 D2 稳定性测试的前提
    const code = await runNonInteractive(client, task, dir, out, verbose);
    process.exit(code);
  }
  await interactive(client, verbose);
}

main();
