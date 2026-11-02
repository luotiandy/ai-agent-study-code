import OpenAI from "openai";
import "dotenv/config";
import { PROVIDERS } from "../../config";

const p = PROVIDERS.ifa;
const client = new OpenAI({ baseURL: p.baseURL, apiKey: p.key });
const model = p.model;
// const fact = "我叫小明,最喜欢打篮球,住在中国杭州";
const fact = "我在自我介绍,住在中国杭州";

// ① 不带历史:直接问 → 模型必然不知道
// const r1 = await client.chat.completions.create({
//   model, messages: [{ role: "user", content: "我叫什么名字?最喜欢什么运动?" }],
// });
// console.log("① 无历史:", r1.choices[0].message.content);

// ② 带历史:把 fact 和模型的回复都放进数组 → 恢复记忆
const r2 = await client.chat.completions.create({
  model,
  messages: [
    { role: "user", content: fact },
    // { role: "assistant", content: "明白了,小明!打篮球确实是很棒的运动。" },
    { role: "assistant", content: "明白了,小艺!踢足球确实是很棒的运动。" },
    { role: "user", content: "是的，踢足球确实是很棒的运动" },
    { role: "assistant", content: "我之前的回复提到了“小艺”和踢足球，这是我的错误——我并没有从您那里得到过这些信息，不应该凭空猜测。" },
    { role: "user", content: "我叫什么名字?最喜欢什么运动?" },
  ],
});
console.log("② 带历史:", r2.choices[0].message.content);