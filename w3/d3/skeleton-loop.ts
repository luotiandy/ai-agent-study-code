// W3-D3 · skeleton-loop.ts —— Q2「现场手写最小 agent loop」参考答案
//
// ⚠️ 使用纪律:先白板限时 15 分钟自己写(不看这个文件),写完再对照。
//    白板版允许没有流式/白名单/成本——四考点齐即及格;本文件是「及格 + 工程完整度」范本。
//
// 与总册 40 行母体同形,并补上你在 W1-W3 学到的工程件(对应 Q2 的「主动补一句」):
//   考点① assistant 消息原样回填(含 tool_calls)—— 历史决策连贯的前提
//   考点② tool 结果以 role:"tool" 回填,报错也回填让模型自适应
//   考点③ 终止条件 = 无 tool_calls 输出
//   考点④ maxSteps 兜底 + token 计量;另有:结果截断(8000 字符)、错误结构化回填
//
// 跑法(仓库根,需 .env 的 MODEL_BASE_URL / MODEL_API_KEY):
//   pnpm start-w3d3 "看看 w1 目录下有什么"
import OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";
import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;

const client = new OpenAI({
  baseURL: p.baseURL,
  apiKey: p.key,
});
const MODEL = p.model;

// 工具注册表:schema 给模型看,handler 在本地执行 —— 安全边界完全由你掌控
const registry: Record<string, { description: string; parameters: Record<string, unknown>; handler: (args: any) => unknown }> = {
  list_dir: {
    description: "列出目录内容。参数 dir 为相对路径。",
    parameters: { type: "object", properties: { dir: { type: "string" } }, required: ["dir"] },
    handler: (a) => fs.readdirSync(path.resolve(a.dir), { withFileTypes: true })
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name)),
  },
  read_file: {
    description: "读取单个文本文件。参数 file 为相对路径,上限 40KB。",
    parameters: { type: "object", properties: { file: { type: "string" } }, required: ["file"] },
    handler: (a) => {
      const p = path.resolve(a.file);
      if (!p.startsWith(process.cwd())) throw new Error("路径越界"); // 路径穿越防护:模型给的字符串不可信
      const s = fs.statSync(p);
      if (s.size > 40 * 1024) throw new Error("文件过大,请分段读取");
      return fs.readFileSync(p, "utf8");
    },
  },
};

const SYSTEM = "你是终端里的文件助手。用中文回答。需要查看文件系统时调用工具,不要编造内容。";

async function runAgent(goal: string, maxSteps = 8): Promise<string> {
  // 考点①前提:消息数组是唯一状态 —— 「记忆」就是不断 append 的数组,没有别的魔法
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM }, // 身份 + 规则 + 能力说明,只注入一次
    { role: "user", content: goal },
  ];
  const tools = Object.entries(registry).map(([name, t]) => ({
    type: "function" as const,
    function: { name, description: t.description, parameters: t.parameters },
  }));
  let promptTokens = 0, completionTokens = 0;

  for (let step = 1; step <= maxSteps; step++) {
    const res = await client.chat.completions.create({ model: MODEL, messages, tools });
    promptTokens += res.usage?.prompt_tokens ?? 0;
    completionTokens += res.usage?.completion_tokens ?? 0;

    const msg = res.choices[0].message;
    // 考点① assistant 消息必须原样回填(含 tool_calls)——缺了它,后续 tool 消息找不到挂靠点,协议直接 400
    messages.push(msg);

    // 考点③ 终止条件:不再调工具 = 任务完成
    if (!msg.tool_calls?.length) {
      console.log(`\n[meta] ${step} 次请求 | 输入 ${promptTokens} tok | 输出 ${completionTokens} tok`);
      return msg.content ?? "";
    }

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue; // 本骨架只用 function 型工具调用
      let result: unknown;
      try {
        const tool = registry[call.function.name];
        if (!tool) throw new Error(`未注册的工具:${call.function.name}`);
        result = tool.handler(JSON.parse(call.function.arguments));
      } catch (e) {
        // 考点② 错误也回填而不是中断:错误是环境反馈,模型据此改参数重试
        result = { error: e instanceof Error ? e.message : String(e) };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 8000), // 工程件:截断 —— 单工具结果失控是上下文爆炸第一大来源
      });
    }
  }
  // 考点④ maxSteps 是兜底护栏:到这里先怀疑任务拆解粒度或工具描述质量,而不是盲目调大
  throw new Error(`已达最大步数(${maxSteps}),任务未完成`);
}

const goal = process.argv[2] ?? "看看当前目录下有什么,挑一个子目录再深入看一层,用三句话汇报";
runAgent(goal)
  .then((answer) => console.log(`\n${answer}`))
  .catch((e) => { console.error(`失败:${e instanceof Error ? e.message : e}`); process.exit(1); });
