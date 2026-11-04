import OpenAI from "openai";
import type {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import "dotenv/config";
import { registry, toToolsParam } from "./tools";

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

  async askWithTools(userInput: string): Promise<string> {
    this.messages.push({ role: "user", content: userInput });

    // tools 只对“本次 create() 请求”生效，不是 Session 级配置。
    const tools = toToolsParam();
    let remainingToolRounds = 5; // 防御模型无限循环调用工具

    while (true) {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages,
        // 最后一次不带 tools，强制模型基于已有工具结果给出自然语言答案
        tools: remainingToolRounds > 0 ? tools : undefined,
      });
      const msg = res.choices[0].message;

      // 含 tool_calls 的 assistant 消息必须原样整体回填
      this.messages.push(msg);
      this.usage.promptTokens += res.usage?.prompt_tokens ?? 0;
      this.usage.completionTokens += res.usage?.completion_tokens ?? 0;

      const calls = (msg.tool_calls ?? []).filter(
        (call): call is ChatCompletionMessageFunctionToolCall => call.type === "function",
      );

      // 模型没点名工具 → 当前请求就是最终答案
      if (!calls.length) {
        console.log('this.messages: ', this.messages);
        return msg.content ?? "";
      }

      // 预算耗尽但模型仍要点名工具：撤回这条悬空 tool_calls 消息，
      // 再用不带 tools 的请求强制收尾，避免下一轮因缺少 tool 结果而 400。
      if (remainingToolRounds <= 0) {
        this.messages.pop();
        const final = await this.client.chat.completions.create({
          model: this.model,
          messages: this.messages,
        });
        const answer =
          final.choices[0].message.content ?? "(已达最大工具轮次，任务未完成)";
        this.messages.push({ role: "assistant", content: answer });
        this.usage.promptTokens += final.usage?.prompt_tokens ?? 0;
        this.usage.completionTokens += final.usage?.completion_tokens ?? 0;
        return answer;
      }

      // 执行同一 assistant 消息里的多条 tool_calls
      for (const call of calls) {
        let result: unknown;
        try {
          const tool = registry[call.function.name];
          if (!tool) throw new Error(`未注册的工具:${call.function.name}`);
          const args = tool.schema.parse(JSON.parse(call.function.arguments));
          result = await tool.execute(args);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }

        this.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }

      remainingToolRounds -= 1;
      // 继续循环：下一轮仍带 tools，让模型可以把天气结果再交给 calculator
    }
  }

  clear() {
    this.messages = [this.messages[0]]; // 只保留 system,其余清空
    this.usage = { promptTokens: 0, completionTokens: 0, turns: 0 };
  }
}
