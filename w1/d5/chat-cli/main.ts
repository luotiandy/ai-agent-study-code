import OpenAI from "openai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Session } from "./Session";
import { handleCommand } from "./command";
import { PROVIDERS } from "../../../config";

const p = PROVIDERS.ifa;

async function main() {
  const client = new OpenAI({
    baseURL: p.baseURL,
    apiKey: p.key,
  });
  const session = new Session(
    "你是一个简洁的技术助手,回答控制在 200 字内,先给结论再解释。任何数学运算——包括看似简单的乘除——必须通过 calculator 工具完成，禁止心算；拿到工具结果后再作答",
    client,
    p.model,
  );

  const rl = readline.createInterface({ input, output });
  console.log("D2 多轮对话 CLI | /help 查看命令 | /exit 退出");

  const globalSignal = new AbortController();
  // Ctrl+C 第一击:中断当前请求;第二击:强制退出
  process.stdin.on("keypress", (_str, key) => {
    if (key && key.name === "c") {
      if (busy) globalSignal.abort();
      else process.exit(0);
    }
  });
  // keypress 需要 rawMode(放在 readline 创建前):
  input.setRawMode?.(true);

  // 主循环里:
  let busy = false;
  while (true) {
    const line = (await rl.question("\n你> ")).trim();
    if (!line) continue;
    if (line.startsWith("/")) {
      /* 命令分支不变 */
    }

    busy = true;
    const answer = await session.askWithTools(line);
    process.stdout.write(`\n助手> ${answer}\n`);
    busy = false;
  }
}

main();
