import OpenAI from "openai";
import "dotenv/config";

import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;
const baseURL = p.baseURL;
const apiKey = p.key;
const model = p.model;

const client = new OpenAI({ baseURL, apiKey });

const stream = await client.chat.completions.create({
  model: model,
  stream: true,
  stream_options: { include_usage: true },
  messages: [
    {
      role: "user",
      content: process.argv[2] ?? "用 5 句话解释什么是事件驱动架构",
    },
  ],
});

let full = "";
for await (const chunk of stream) {
  // SDK 已把 SSE 解析包成异步迭代器
  const delta = chunk.choices[0]?.delta?.content ?? "";
  if (delta) {
    full += delta;
    process.stdout.write(delta);
  }
  if (chunk.usage)
    console.log(
      `\n[usage] ${chunk.usage.prompt_tokens} in / ${chunk.usage.completion_tokens} out`,
    );
}
console.log("\n\n[DONE]");
console.log(`\n总长 ${full.length} 字符`);
