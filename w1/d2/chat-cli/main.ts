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
    "你是一个简洁的技术助手,回答控制在 200 字内,先给结论再解释。",
    client,
    p.model,
  );

  const rl = readline.createInterface({ input, output });
  console.log("D2 多轮对话 CLI | /help 查看命令 | /exit 退出");

  while (true) {
    const line = (await rl.question("\n你> ")).trim();
    if (!line) continue;                                  // 空行直接重问
    if (line.startsWith("/")) {
      const keep = await handleCommand(line, session);
      if (!keep) break;                                   // /exit → 跳出
      continue;
    }
    try {
      const answer = await session.ask(line);
      console.log(`\n助手> ${answer}`);
      console.log(`  [第 ${session.usage.turns} 轮] 本轮累计输入 ${session.usage.promptTokens} tok`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("❌ 调用失败:", msg);
      if (e instanceof OpenAI.BadRequestError) {
        session.messages.pop();                           // 回滚刚 push 的 user 消息
        console.error("  (已回滚本轮输入,历史保持一致)");
      }
    }
  }
  rl.close();
  console.log(`会话结束 | 总轮次 ${session.usage.turns} | 输入 ${session.usage.promptTokens} + 输出 ${session.usage.completionTokens} tokens`);
}

main();