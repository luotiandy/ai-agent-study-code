import { Session } from "./Session";

const COMMANDS = {
  help: "显示可用命令",
  history: "打印当前消息数组(亲眼看'记忆')",
  clear: "清空历史(保留 system)",
  usage: "查看累计 token 用量",
  exit: "退出",
} as const;

export async function handleCommand(raw: string, s: Session): Promise<boolean> {
  const cmd = raw.slice(1).trim().split(/\s+/)[0];
  switch (cmd) {
    case "help":
      console.table(COMMANDS);
      return true;
    case "history":
      console.log(JSON.stringify(s.messages, null, 2));
      return true;
    case "clear":
      s.clear();
      console.log("✅ 历史已清空(system 保留)");
      return true;
    case "usage":
      console.log(`  轮次 ${s.usage.turns} | 累计输入 ${s.usage.promptTokens} tok | 累计输出 ${s.usage.completionTokens} tok`);
      return true;
    case "exit":
      return false;
    default:
      console.log(`未知命令:${cmd}(输入 /help 查看)`);
      return true;
  }
}