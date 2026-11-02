import OpenAI from "openai";       // pnpm add openai dotenv tsx
import "dotenv/config";
import { PROVIDERS } from "../../config";

type Provider = { baseURL: string; model: string; key?: string };

async function ask(p: Provider, question: string) {
  const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });
  const res = await client.chat.completions.create({
    model: p.model,
    messages: [
      { role: "system", content: "你是一个简洁的技术助手。" },
      { role: "user", content: question },
    ],
  });

  return {
    answer: res.choices[0].message?.content,
    usage: res.usage,   // token 用量就在这里——从第一天就养成看它的习惯
  };
}

const q = "用三句话解释什么是 function calling";

// 只跑配了 key 的 provider；一个都没配就明确提示退出
const ready = Object.entries(PROVIDERS).filter(([, p]) => p.key) as [string, Provider][];
if (ready.length === 0) {
  console.error("没有找到任何 API Key。请复制 .env.example 为 .env，并至少填入一个 Key。");
  process.exit(1);
}

for (const [name, p] of ready) {
  const t0 = Date.now();
  try {
    const { answer, usage } = await ask(p, q);
    console.log(`\n===== ${name} (${Date.now() - t0}ms) =====`);
    console.log(answer);
    console.log("tokens:", usage?.prompt_tokens, "in /", usage?.completion_tokens, "out");
  } catch (err) {
    // 单个 provider 失败不影响其他 provider
    console.error(`\n===== ${name} 失败 (${Date.now() - t0}ms) =====`);
    console.error(err instanceof Error ? err.message : err);
  }
}
