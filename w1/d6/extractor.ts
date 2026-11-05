import OpenAI from "openai";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources/chat/completions";
import { z } from "zod";
import { readFileSync } from "node:fs";
import "dotenv/config";
import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;
const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });

// ① 输出契约:先定义「什么是合格的抽取结果」
const Resume = z.object({
  name: z.string().describe("姓名,找不到填 null"),
  phone: z.string().regex(/^[\d\-+ ]*$/).nullable(),
  special_phone: z.string().regex(/^[\d\-+ ]*$/).nullable().describe("紧急联系人电话号码，找不到填 null"),
  city: z.string().describe("城市,找不到填 null"),
  skills: z.array(z.string()).min(1),
  experience_years: z.number().nullable(),
  summary: z.string().describe("一句话总结此人亮点,≤30 字"),
});
type Resume = z.infer<typeof Resume>;

// ② 把抽取任务定义成「不出声的工具」
const extractTool = {
  type: "function" as const,
  function: {
    name: "record_resume",
    description: "从文本中抽取简历信息并记录。必须完整填充所有字段。",
    parameters: {
      type: "object",
      properties: {
        name: { type: ["string", "null"], description: "姓名" },
        phone: { type: ["string", "null"], description: "联系电话" },
        special_phone: { type: ["string", "null"], description: "紧急联系人" },
        city: { type: ["string", "null"], description: "城市,地址,现在所在城市" },
        skills: { type: "array", items: { type: "string" }, description: "技能列表" },
        experience_years: { type: ["number", "null"], description: "工作年限,数字" },
        summary: { type: "string", description: "一句话亮点总结" },
      },
      required: ["name", "phone", "special_phone", "city", "skills", "experience_years", "summary"],
      additionalProperties: false,
    },
  },
};

// ③ 抽取 + 校验 + 自愈:失败把错误喂回去,最多重试 2 次
async function extract(text: string): Promise<{ data: Resume; attempts: number }> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: "你是信息抽取引擎。调用 record_resume 工具记录结果,不要输出任何多余文本。" },
    { role: "user", content: `抽取以下文本的简历信息:\n\n${text}` },
  ];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await client.chat.completions.create({
      model: p.model,
      messages,
      tools: [extractTool],
      tool_choice: { type: "function", function: { name: "record_resume" } },  // 强制点名
      temperature: 0,                                                          // 抽取任务:零温
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    // OpenAI SDK 的 tool_calls 是 function/custom 的联合类型；这里只处理 function call。
    const calls = (msg.tool_calls ?? []).filter(
      (call): call is ChatCompletionMessageFunctionToolCall => call.type === "function",
    );
    const call = calls[0];
    if (!call) { messages.push({ role: "user", content: "你没有调用 record_resume,请重试。" }); continue; }

    try {
      const raw = JSON.parse(call.function.arguments);
      const data = Resume.parse(raw);            // zod 校验:通过即返回
      console.log('messages:', messages);
      return { data, attempts: attempt };
    } catch (e) {
      const issue = e instanceof z.ZodError ? e.issues.map(i => `${i.path}: ${i.message}`).join("; ") : String(e);
      messages.push({ role: "tool", tool_call_id: call.id, content: `校验失败:${issue}。请修正后重新调用。` });
      // 注意:失败的这次调用也要留在历史里——错误是下一轮的修正依据
    }
  }
  throw new Error("抽取失败:3 次尝试均未通过 schema 校验");
}

const text = readFileSync(new URL("sample.txt", import.meta.url), "utf8");
const { data, attempts } = await extract(text);
console.log(`✅ 第 ${attempts} 次尝试通过校验:\n`, JSON.stringify(data, null, 2));