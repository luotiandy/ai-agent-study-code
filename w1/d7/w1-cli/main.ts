import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Session } from "./Session";
import { handleCommand } from "./command";
import { PROVIDERS } from "../../../config";

const p = PROVIDERS.ifa;

const DEMO_HINT =
  "试试演示任务:「扫描这个项目,统计各代码文件的行数,把报告写到 report.md」";

async function main() {
  const client = new OpenAI({
    baseURL: p.baseURL,
    apiKey: p.key,
  });
  const session = new Session(
    "你是一个简洁的技术助手,先给结论再解释。",
    client,
    p.model,
  );

  const rl = readline.createInterface({ input, output });
  console.log("D7 w1-cli v1.0(流式 × 工具合流)| /help 查看命令 | Shift+C 中断/退出");
  console.log(`  ${DEMO_HINT}`);

  // 中断模型:AbortController 中断一次后就永久 aborted,
  // 所以每轮请求前都要换一个新的(重新武装),Shift+C 只打断「当前这轮」
  let controller = new AbortController();
  let busy = false;

  process.stdin.on("keypress", (_str, key) => {
    if (key && key.shift && key.name === "c") {
      if (busy) controller.abort();
      else process.exit(0);
    }
  });
  // keypress 需要 rawMode(放在 readline 创建前):
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
    controller = new AbortController(); // 重新武装:上一轮用掉的 signal 作废
    process.stdout.write("\n助手> ");
    try {
      const { text, interrupted } = await session.chat(line, {
        onDelta: (t) => process.stdout.write(t),
        onTool: (name, args) => console.log(`\n  🔧 ${name}(${JSON.stringify(args)})`),
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

main();
