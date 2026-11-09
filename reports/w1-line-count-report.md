# w1 目录 TS 文件行数统计报告

- 统计范围:`w1/` 下所有 `.ts` 文件(仅文本文件,不含 `.DS_Store`、`.txt`、`.md` 等)
- 文件总数:27 个
- 合计行数:**1765 行**

## 明细清单

| 文件 | 行数 |
| --- | ---: |
| w1/d1/hello-llm.ts | 44 |
| w1/d2/stateless-demo.ts | 28 |
| w1/d2/chat-cli/Session.ts | 43 |
| w1/d2/chat-cli/command.ts | 32 |
| w1/d2/chat-cli/main.ts | 48 |
| w1/d3/sampling-matrix.ts | 59 |
| w1/d4/stream-demo.ts | 69 |
| w1/d4/stream-sdk.ts | 39 |
| w1/d4/chat-cli/Session.ts | 71 |
| w1/d4/chat-cli/command.ts | 32 |
| w1/d4/chat-cli/main.ts | 57 |
| w1/d5/chat-cli/Session.ts | 146 |
| w1/d5/chat-cli/command.ts | 32 |
| w1/d5/chat-cli/main.ts | 51 |
| w1/d5/chat-cli/tools.ts | 53 |
| w1/d6/extractor-ai.ts | 41 |
| w1/d6/extractor.ts | 86 |
| w1/d6/chat-cli/Session.ts | 154 |
| w1/d6/chat-cli/command.ts | 38 |
| w1/d6/chat-cli/main.ts | 53 |
| w1/d6/chat-cli/pricing.ts | 57 |
| w1/d6/chat-cli/tools.ts | 53 |
| w1/d7/w1-cli/Session.ts | 186 |
| w1/d7/w1-cli/command.ts | 44 |
| w1/d7/w1-cli/main.ts | 70 |
| w1/d7/w1-cli/pricing.ts | 57 |
| w1/d7/w1-cli/tools.ts | 122 |
| **合计** | **1765** |

## 按目录小计

| 目录 | 文件数 | 行数 |
| --- | ---: | ---: |
| w1/d1 | 1 | 44 |
| w1/d2 | 4 | 195 |
| w1/d3 | 1 | 59 |
| w1/d4 | 5 | 268 |
| w1/d5 | 4 | 282 |
| w1/d6 | 7 | 482 |
| w1/d7 | 5 | 479 |

## 说明

- 行数由 `wc -l` 统计(按换行符计数)。
- 小计与合计经过交叉校验:各目录小计相加 44+195+59+268+282+482+479 = 1765,与逐文件累加结果一致。
- 已排除非 ts 文件:`w1/.DS_Store`(二进制)、`w1/d6/sample.txt`(非 ts)。
