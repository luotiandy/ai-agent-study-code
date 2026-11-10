import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import "dotenv/config";
import { registry, toToolsParam } from "./tools";
import { costOf, type UsageStats } from "./pricing";

/** 合流版的过程回调:打字机 / 工具调用可视化 / 中断信号 */
export interface ChatHooks {
  onDelta?: (text: string) => void;
  onTool?: (name: string, args: unknown) => void;
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  interrupted: boolean;
}

export class Session {
  // 长对话观测哨:达到 N 轮打印一次提示(压缩策略在 W5,先观测不处理)
  private readonly MAX_TURNS = 15;
  private maxTurnsWarned = false;

  messages: ChatCompletionMessageParam[] = [];
  usage: UsageStats = { promptTokens: 0, completionTokens: 0, turns: 0, cost: 0 };

  constructor(
    system: string,
    private client: OpenAI,
    readonly model: string,
  ) {
    // system 只注入一次,永远住在数组第 0 位
    this.messages.push({ role: "system", content: system });
  }

  // 每次模型请求后累计 token 与费用;工具多跳的每一跳都会计入
  private recordUsage(promptTokens?: number | null, completionTokens?: number | null): void {
    const prompt = promptTokens ?? 0;
    const completion = completionTokens ?? 0;
    this.usage.promptTokens += prompt;
    this.usage.completionTokens += completion;
    this.usage.cost += costOf(this.model, prompt, completion);
    this.usage.turns += 1;
  }

  /**
   * D7 合流版:流式输出 × 多跳工具循环
   * 合并了 D2 ask(流式记忆)与 D5 askWithTools(点名-执行-回填):
   * 同一个循环里消费两种流——content → 打字机;tool_calls → 按 index 累积。
   */
  async chat(userInput: string, hooks: ChatHooks = {}): Promise<ChatResult> {
    this.messages.push({ role: "user", content: userInput });

    const controller = new AbortController();
    hooks.signal?.addEventListener("abort", () => controller.abort(), { once: true });

    const tools = toToolsParam();
    let remainingToolRounds = 10; // 工具轮数预算:防御无限循环
    let interrupted = false;

    try {
      while (true) {
        // tools 只对「本次 create() 请求」生效;预算耗尽后的收尾请求不带 tools,强制自然语言作答
        const stream = await this.client.chat.completions.create(
          {
            model: this.model,
            messages: this.messages,
            tools: remainingToolRounds > 0 ? tools : undefined,
            stream: true,
            stream_options: { include_usage: true },
          },
          { signal: controller.signal },
        );

        // 同一个循环里消费两种流:content → 打字机;tool_calls → 按 index 累积
        const acc = new Map<number, { id: string; name: string; args: string }>();
        let content = "";
        let usage: OpenAI.CompletionUsage | undefined;

        for await (const chunk of stream) {
          const d = chunk.choices[0]?.delta;
          if (d?.content) {
            content += d.content;
            hooks.onDelta?.(d.content);
          }
          if (d?.tool_calls) {
            for (const t of d.tool_calls) {
              const cur = acc.get(t.index) ?? { id: "", name: "", args: "" };
              if (t.id) cur.id = t.id;
              if (t.function?.name) cur.name += t.function.name;
              if (t.function?.arguments) cur.args += t.function.arguments;
              acc.set(t.index, cur);
            }
          }
          if (chunk.usage) usage = chunk.usage;
        }

        // 流式的关键差异:没有现成的 msg 对象,usage 在流的最后一个 chunk 里
        if (usage) this.recordUsage(usage.prompt_tokens, usage.completion_tokens);

        // 累积器 → 结构化 tool_calls(index 排序还原调用顺序)
        const calls = [...acc.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, c]) => ({
            id: c.id,
            type: "function" as const,
            function: { name: c.name, arguments: c.args },
          }));

        // 中断:已生成的部分是真实历史,回填半截内容;不完整的 tool_calls 直接放弃
        // (绝不能回填带 tool_calls 却没有 tool 结果的悬空消息——下一轮必 400)
        if (controller.signal.aborted) {
          interrupted = true;
          if (content) this.messages.push({ role: "assistant", content });
          else this.messages.pop(); // 一个字都没生成 → 回滚 user,历史保持成对完整
          return { text: content, interrupted };
        }

        // assistant 消息回填:content 为空时传 null(部分实现对空串敏感)
        this.messages.push({
          role: "assistant",
          content: content || null,
          ...(calls.length ? { tool_calls: calls } : {}),
        });

        // 模型没点名工具 → 流式答案已在打字机里输出完毕,收工
        if (!calls.length) {
          if (!this.maxTurnsWarned && this.usage.turns >= this.MAX_TURNS) {
            this.maxTurnsWarned = true;
            console.log(`  ⚠️ 会话已达 ${this.MAX_TURNS} 轮:留意成本平方增长与上下文上限(W5 讲压缩)`);
          }
          return { text: content, interrupted };
        }

        // 预算耗尽但模型仍要点名(防御性分支):撤回悬空的 tool_calls 消息 + 不带 tools 强制收尾
        // (绝不能把「点名了但没执行」的悬空消息留在历史里——下一轮必 400)
        if (remainingToolRounds <= 0) {
          this.messages.pop();
          const final = await this.client.chat.completions.create({
            model: this.model,
            messages: this.messages,
          });
          const answer = final.choices[0].message.content ?? "(已达最大工具轮次，任务未完成)";
          this.messages.push({ role: "assistant", content: answer });
          this.recordUsage(final.usage?.prompt_tokens, final.usage?.completion_tokens);
          hooks.onDelta?.(answer);
          return { text: answer, interrupted: false };
        }

        // 执行同一 assistant 消息里的多条 tool_calls(过程可视化交给 onTool)
        for (const call of calls) {
          let result: unknown;
          let parsedArgs: unknown = null;
          try {
            const tool = registry[call.function.name];
            if (!tool) throw new Error(`未注册的工具:${call.function.name}`);
            parsedArgs = tool.schema.parse(JSON.parse(call.function.arguments));
            hooks.onTool?.(call.function.name, parsedArgs);
            result = await tool.execute(parsedArgs);
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
        // 下一跳:模型看到全部工具结果,可以继续点名(如把天气结果交给 calculator)或直接作答
      }
    } catch (e) {
      // 非 abort 的异常(网络错误等):脏历史治理——把悬空的 user 消息回滚,
      // 供重试;若错误前已写入过 assistant 消息则不动(最后一条不是 user,自然跳过)
      const last = this.messages[this.messages.length - 1];
      if (last?.role === "user") this.messages.pop();
      throw e;
    }
  }

  clear() {
    this.messages = [this.messages[0]]; // 只保留 system,其余清空
    this.usage = { promptTokens: 0, completionTokens: 0, turns: 0, cost: 0 };
  }
}
