// W3-D1 · guardrails.test.ts —— P1 护栏 mock 单测
// 背景:D2-D4 的真机演练里,四场景故障都被模型智能化解,强制收尾分支从未自然触发。
// 本文件把「护栏路径」从运气里拿回来:mock 模型的每个响应都是脚本化的,时序 100% 确定,
// 不调真实模型、零 token 成本、可无限重复。
//
// mock 手法:Session 构造函数本来就注入 client(D7 合流时的设计红利)——
// 我们给它一个「按剧本吐流式 chunk」的假 client,再断言三件事:
//   ① 历史永远成对(assistant.tool_calls 后必紧跟 role:"tool"——悬空即历史毒药)
//   ② 预算语义(耗尽后请求不带 tools;收尾请求非流式)
//   ③ 工具层护栏独立可测(白名单/元字符/路径越界不经过模型)
//
// 运行:pnpm start-w3d1(仓库根;tsx --test = node:test + TS,零新依赖)
import { test } from "node:test";
import assert from "node:assert/strict";
import type OpenAI from "openai";
import { Session, type ChatHooks } from "./Session";
import { registry } from "./tools";

// ── mock 流式 chunk 的最小形状(与 Session.chat 的消费侧对齐)──
type Delta = {
  content?: string;
  tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>;
};
type Chunk = { choices: Array<{ delta: Delta }>; usage?: { prompt_tokens: number; completion_tokens: number } };

const contentChunk = (text: string): Chunk => ({ choices: [{ delta: { content: text } }] });
const usageChunk = (p: number, c: number): Chunk => ({ choices: [{ delta: {} }], usage: { prompt_tokens: p, completion_tokens: c } });
const toolCallChunk = (name: string, args: string): Chunk => ({
  choices: [{ delta: { tool_calls: [{ index: 0, id: "call_test", function: { name, arguments: args } }] } }],
});

/**
 * 假 client:按 script 依次吐流式响应;script 耗尽后回退纯文本流。
 * 非流式调用(强制收尾分支专用)返回固定答案。
 * calls 记录每次 create() 的请求参数,供预算/收尾语义断言。
 */
function makeMockClient(script: Chunk[][]) {
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    chat: {
      completions: {
        create: async (params: Record<string, unknown>) => {
          calls.push(params);
          if (params.stream) {
            const chunks = script.length > 0 ? script.shift()! : [contentChunk("(mock 收尾)")];
            return (async function* () {
              for (const c of chunks) yield c;
            })();
          }
          return {
            choices: [{ message: { content: "(强制收尾答案)" } }],
            usage: { prompt_tokens: 20, completion_tokens: 8 },
          };
        },
      },
    },
  };
  return { client: client as unknown as OpenAI, calls };
}

/** 断言核心不变量:历史里任何带 tool_calls 的 assistant,下一条必是对应的 tool 结果 */
function assertNoDangling(messages: Array<Record<string, unknown>>) {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].tool_calls) {
      const next = messages[i + 1];
      assert.ok(next && next.role === "tool", `消息 ${i} 的 tool_calls 悬空(历史毒药!)`);
    }
  }
}

// ─────────────────────────────────────────────
// ① 多跳闭环(快乐路径):工具 → 回填 → 文本收尾
// ─────────────────────────────────────────────
test("① 多跳闭环:tool_calls 回填成对,usage 逐跳计账", async () => {
  const { client, calls } = makeMockClient([
    [toolCallChunk("calculator", '{"expression":"1+2"}'), usageChunk(100, 10)],
    [contentChunk("结果是 3"), usageChunk(200, 20)],
  ]);
  const s = new Session("你是测试助手。", client, "glm-5.3-flash");
  const r = await s.chat("算一下 1+2");

  assert.equal(r.interrupted, false);
  assert.equal(r.text, "结果是 3");
  // 历史:system → user → assistant(tool_calls) → tool → assistant(答案)
  assert.equal(s.messages.length, 5);
  assert.equal((s.messages[2] as Record<string, unknown>).role, "assistant");
  assert.equal((s.messages[3] as Record<string, unknown>).role, "tool");
  assertNoDangling(s.messages as unknown as Array<Record<string, unknown>>);
  // 每一跳请求都带 tools(预算未耗尽);usage 记账 2 次
  assert.ok(Array.isArray(calls[0].tools));
  assert.ok(Array.isArray(calls[1].tools));
  assert.equal(s.usage.turns, 2);
  assert.ok(!Number.isNaN(s.usage.cost), "glm-5.3-flash 在价格表内,成本不应是 NaN");
});

// ─────────────────────────────────────────────
// ② 预算耗尽 → 强制收尾(D3 演练里从未自然触发的分支)
//    预算 10:前 10 轮模型每轮都点名 calculator;第 11 轮仍点名 → 触发收尾
// ─────────────────────────────────────────────
test("② 预算耗尽:撤回悬空 tool_calls,不带 tools 强制收尾,历史无悬空", async () => {
  const loops = Array.from({ length: 10 }, () => [toolCallChunk("calculator", '{"expression":"1+1"}')]);
  const script = [...loops, [toolCallChunk("calculator", '{"expression":"2+2"}')]]; // 第 11 轮仍要点名
  const { client, calls } = makeMockClient(script);
  const s = new Session("你是测试助手。", client, "glm-5.3-flash");

  const r = await s.chat("一直算下去,不要停");

  assert.equal(r.text, "(强制收尾答案)");
  assert.equal(calls.length, 12); // 11 次流式 + 1 次非流式收尾
  // 第 11 次流式请求(预算=0)不带 tools;收尾请求非流式
  assert.equal(calls[10].tools, undefined);
  assert.equal(calls[11].stream, undefined);
  // 关键不变量:被撤回的悬空 assistant 不在历史里,全程成对
  assertNoDangling(s.messages as unknown as Array<Record<string, unknown>>);
  assert.equal((s.messages.at(-1) as Record<string, unknown>).content, "(强制收尾答案)");
});

// ─────────────────────────────────────────────
// ③ run_command 白名单三重防线(工具层护栏,不经过模型)
// ─────────────────────────────────────────────
test("③ run_command:白名单外命令 / shell 元字符全部拦截", async () => {
  // 防线一:前缀白名单
  await assert.rejects(
    registry.run_command.execute({ command: "sudo rm -rf /" }),
    /不在白名单/,
  );
  // 注入形态一律断言「被任一防线拦截」:比如 "ls; echo pwned" 的分号粘在首个
  // token 上,先触发防线一(白名单)而非防线二(元字符)——纵深防御下,同一
  // 攻击触发哪道防线取决于 token 边界,断言应表达「必被拦」,而不是「被谁拦」
  await assert.rejects(
    registry.run_command.execute({ command: "ls; echo pwned" }),
    /不在白名单|元字符/,
  );
  await assert.rejects(
    registry.run_command.execute({ command: "ls $(whoami)" }),
    /不在白名单|元字符/,
  );
  // ⚠️ 刻意不测的用例:`find . -name '*' -delete`。
  // 它白名单内、无元字符、execFile 无 shell——三道防线全部放行,测试里真执行
  // 就会删光仓库(编写时在隔离环境实测放行,靠挂载层删除保护才没出事)。
  // 教训:白名单+无 shell 挡不住白名单命令自身的破坏性参数(-delete 是 find 的
  // 参数,不是 shell 语法)——「能力级白名单」是下一层防线,详见 W3-D1 详解册。
  // 防线二补充:重定向
  await assert.rejects(
    registry.run_command.execute({ command: "ls > out.txt" }),
    /不在白名单|元字符/,
  );
  // 白名单内的合法命令真实执行(execFile 无 shell,只读安全)
  const ok = (await registry.run_command.execute({ command: "ls package.json" })) as { output: string };
  assert.ok(ok.output.includes("package.json"));
});

// ─────────────────────────────────────────────
// ④ 文件工具路径穿越防护(safe():一切模型给的路径字符串不可信)
// ─────────────────────────────────────────────
test("④ 文件工具:越界路径直接拒绝", async () => {
  await assert.rejects(registry.read_file.execute({ file: "../../../etc/passwd" }), /路径越界|只允许/);
  await assert.rejects(registry.write_file.execute({ file: "../evil.md", content: "x" }), /路径越界|只允许/);
  // 越界有时伪装成「先出界再回来」,同样要拦
  await assert.rejects(registry.read_file.execute({ file: "w2/../../package.json" }), /路径越界|只允许/);
});

// ─────────────────────────────────────────────
// ⑤ 中断保留:半截内容回填为真实历史,无 tool_calls 悬空
//    (mock 在流吐到一半时触发外部 abort,时序完全确定)
// ─────────────────────────────────────────────
test("⑤ 中断:已生成内容保留,interrupted 标记正确", async () => {
  const ext = new AbortController();
  const client = {
    chat: {
      completions: {
        create: async () =>
          (async function* () {
            yield contentChunk("已生成一半。");
            ext.abort(); // 中断信号:经 hooks.signal 转发到 Session 内部 controller
            yield contentChunk("中断后又吐的。");
          })(),
      },
    },
  };
  const s = new Session("你是测试助手。", client as unknown as OpenAI, "glm-5.3-flash");
  const hooks: ChatHooks = { signal: ext.signal };
  const r = await s.chat("讲个长故事", hooks);

  assert.equal(r.interrupted, true);
  assert.ok(r.text.includes("已生成一半"));
  // 半截内容回填为 assistant(真实历史);绝不能带着没执行的 tool_calls
  const last = s.messages.at(-1) as Record<string, unknown>;
  assert.equal(last.role, "assistant");
  assert.equal(last.tool_calls, undefined);
  assertNoDangling(s.messages as unknown as Array<Record<string, unknown>>);
});

// ─────────────────────────────────────────────
// ⑥ 网络异常:悬空 user 回滚,重试不污染历史
// ─────────────────────────────────────────────
test("⑥ 网络异常:user 回滚,历史恢复到调用前", async () => {
  const client = {
    chat: {
      completions: {
        create: async () => {
          throw new Error("ECONNRESET");
        },
      },
    },
  };
  const s = new Session("你是测试助手。", client as unknown as OpenAI, "glm-5.3-flash");
  const before = s.messages.length;
  await assert.rejects(s.chat("你好"), /ECONNRESET/);
  assert.equal(s.messages.length, before); // 悬空 user 已被回滚,可直接重试
});
