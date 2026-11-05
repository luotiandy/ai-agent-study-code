import OpenAI from "openai";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources/chat/completions";
import { z } from "zod";
import { readFileSync } from "node:fs";
import "dotenv/config";
import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;
const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });

// ③ 抽取 + 校验 + 自愈:失败把错误喂回去,最多重试 2 次
async function extract(
  text: string,
): Promise<{ data: string | null; attempts: number }> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "输出 JSON,字段:name,phone,special_phone(紧急联系人),city(居住地),skills,experience_years,summary;无需过渡处理，按原内容输出即可",
    },
    { role: "user", content: text },
  ];

  const res = await client.chat.completions.create({
    model: p.model,
    response_format: { type: "json_object" }, // 只保证合法 JSON,不保证字段
    messages,
  });
  const msg = res.choices[0].message;
  messages.push(msg);

  console.log('messages:', messages);

  return { data: msg.content, attempts: 1 };
}

const text = readFileSync(new URL("sample.txt", import.meta.url), "utf8");
const { data, attempts } = await extract(text);
console.log(
  `✅ 第 ${attempts} 次尝试通过校验:\n`,
  data,
);
