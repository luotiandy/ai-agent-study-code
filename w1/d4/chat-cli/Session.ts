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

  async ask(
    userInput: string,
    onDelta?: (text: string) => void, // 增量回调:UI 与逻辑解耦的关键
    signal?: AbortSignal, // 中断信号
  ): Promise<{ text: string; interrupted: boolean }> {
    this.messages.push({ role: "user", content: userInput });

    const controller = new AbortController();
    signal?.addEventListener("abort", () => controller.abort(), { once: true });

    let full = "";
    let interrupted = false;
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: this.messages,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: controller.signal }, // SDK 原生支持 AbortSignal
      );
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta?.(delta);
        }
        const u = chunk.usage;
        if (u) {
          this.usage.promptTokens += u.prompt_tokens;
          this.usage.completionTokens += u.completion_tokens;
          this.usage.turns += 1;
        }
      }
    } catch (e) {
      if (controller.signal.aborted) {
        interrupted = true; // 用户主动中断:不算错误
      } else throw e;
    }

    // 中断与完成都要回填——已生成的部分是真实历史,丢弃会让下一轮「忘事」
    if (full) this.messages.push({ role: "assistant", content: full });
    else if (!interrupted) this.messages.pop(); // 完全没输出且非中断 → 回滚 user(沿用 D2 的脏历史治理)
    return { text: full, interrupted };
  }

  clear() {
    this.messages = [this.messages[0]]; // 只保留 system,其余清空
    this.usage = { promptTokens: 0, completionTokens: 0, turns: 0 };
  }
}
