import "dotenv/config";

import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;
const baseURL = p.baseURL;
const apiKey = p.key;
const model = p.model;
const question = process.argv[2] ?? "用 5 句话解释什么是事件驱动架构";

// ① 用原生 fetch 发起流式请求(不经 SDK,看清协议本体)
const res = await fetch(`${baseURL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model,
    stream: true,
    stream_options: { include_usage: true },   // 让最后一个 chunk 带 usage
    messages: [{ role: "user", content: question }],
  }),
});

if (!res.ok || !res.body) {
  throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

// ② 流式读取三件套:getReader + TextDecoder + 行缓冲
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";            // 半帧缓冲区:凑齐一行才解析
let full = "";           // 增量拼接的完整答案
let usage: { prompt: number; completion: number } | null = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });      // stream:true = 允许多字节字符跨 chunk

  const lines = buf.split("\n");
  buf = lines.pop() ?? "";                             // 最后一段可能是半行 → 留在缓冲区

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();                    // 去掉行尾 \r(兼容 CRLF)
    if (!line.startsWith("data:")) continue;           // 跳过空行与注释行(:keep-alive)
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") {
      console.log("\n\n[DONE]");
      printResult();
      process.exit(0);
    }
    const chunk = JSON.parse(payload);
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      process.stdout.write(delta);                     // 打字机效果
    }
    if (chunk.usage) {
      usage = { prompt: chunk.usage.prompt_tokens, completion: chunk.usage.completion_tokens };
    }
    const finish = chunk.choices?.[0]?.finish_reason;
    if (finish && finish !== "stop") console.log(`\n[finish_reason: ${finish}]`);
  }
}
printResult();

function printResult() {
  console.log("\n\n[DONE]");
  console.log(`\n完整答案: ${full}`);
  console.log(`\n总长 ${full.length} 字符`, usage ? `| tokens: ${usage.prompt} in / ${usage.completion} out` : "| (本次流未返回 usage)");
}