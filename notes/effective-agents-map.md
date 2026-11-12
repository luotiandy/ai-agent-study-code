# 《Building Effective Agents》五模式对照笔记(边读边填)

> 读法:每读完一个模式,填一行——用自己的话写机制,再对照 p1-cli 找「有 / 无 / 变形」。
> 填完最后一节做「光谱定位一句话」练习。参考答案见《W3-D2 详解》第 02 章(先自己填,再对照)。

| 模式 | 文章机制(我自己的话) | p1-cli 有无 | 我的例证 / 代码位置 |
| --- | --- | --- | --- |
| Prompt Chaining(链式) |  |  |  |
| Routing(路由) |  |  |  |
| Parallelization(并行:切分/投票) |  |  |  |
| Orchestrator-Workers(编排-工人) |  |  |  |
| Evaluator-Optimizer(评估-优化) |  |  |  |

## 光谱定位练习

- 一句话说清 p1-cli 在 Workflow vs Agent 光谱的位置:___
- p1-cli 的哪个任务「其实用 Workflow 更好」?为什么最终仍值得用 Agent:___
- 「能用 Workflow 就不 Agent」我认同吗?我的边界条件:___

## 两个值得记的设计决策(读文章时想到的自己代码里的对照)

- tool_calls 多条时我选择了串行执行(for await),为什么:___
- zod 自愈循环算不算 Evaluator-Optimizer?我的判断:___
