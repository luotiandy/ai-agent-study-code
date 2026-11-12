import { Session } from "./Session";
import { printPricing, printUsage } from "./pricing";
import { toToolsParam } from "./tools";

const COMMANDS = {
  help: "显示可用命令",
  history: "打印当前消息数组(亲眼看'记忆')",
  clear: "清空历史(保留 system)",
  usage: "查看累计 token 用量与费用",
  pricing: "查看模型单价表",
  tools: "查看模型可见的工具定义",
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
      printUsage(s.usage, s.model);
      return true;
    case "pricing":
      printPricing(s.model);
      return true;
    case "tools":
      console.log("模型可见的工具定义:");
      console.log(JSON.stringify(toToolsParam(), null, 2));
      return true;
    case "exit":
      return false;
    default:
      console.log(`未知命令:${cmd}(输入 /help 查看)`);
      return true;
  }
}
