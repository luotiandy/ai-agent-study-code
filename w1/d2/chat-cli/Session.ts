import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import "dotenv/config";

export class Session {
  // 在 Session 类中追加:超过 N 轮时打印警告(先不做压缩,只做观测)
  private readonly MAX_TURNS = 15;
  messages: ChatCompletionMessageParam[] = [];
  usage = { promptTokens: 0, completionTokens: 0, turns: 0 };

  constructor(
    system: string,
    private client: OpenAI,
    private model: string,
  ) {
    // system 只注入一次,永远住在数组第 0 位
    this.messages.push({ role: "system", content: system });
  }

  async ask(userInput: string): Promise<string> {
    this.messages.push({ role: "user", content: userInput });        // ① 用户消息入列
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: this.messages,                                       // ② 全量发送(数组即记忆)
    });
    const msg = res.choices[0].message;
    this.messages.push({ role: "assistant", content: msg.content ?? "" }); // ③ 回填,至关重要
    this.usage.promptTokens += res.usage?.prompt_tokens ?? 0;
    this.usage.completionTokens += res.usage?.completion_tokens ?? 0;
    this.usage.turns += 1;

    // 超过 N 轮时打印警告(先不做压缩,只做观测)
    if (this.usage.turns > this.MAX_TURNS) {
      console.warn(`⚠️ 超过 ${this.MAX_TURNS} 轮,建议压缩记忆`);
    }
    
    return msg.content ?? "";
  }

  clear() {
    this.messages = [this.messages[0]];   // 只保留 system,其余清空
    this.usage = { promptTokens: 0, completionTokens: 0, turns: 0 };
  }
}