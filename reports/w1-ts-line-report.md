# w1 目录 ts 文件行数统计报告

## 文件清单与行数

| # | 文件 | 行数 |
|---|------|-----:|
| 1 | w1/d1/hello-llm.ts | 44 |
| 2 | w1/d2/chat-cli/main.ts | 48 |
| 3 | w1/d2/chat-cli/Session.ts | 43 |
| 4 | w1/d2/chat-cli/command.ts | 32 |
| 5 | w1/d2/stateless-demo.ts | 28 |
| 6 | w1/d3/sampling-matrix.ts | 59 |
| 7 | w1/d4/chat-cli/main.ts | 57 |
| 8 | w1/d4/chat-cli/Session.ts | 71 |
| 9 | w1/d4/chat-cli/command.ts | 32 |
| 10 | w1/d4/stream-sdk.ts | 39 |
| 11 | w1/d4/stream-demo.ts | 69 |
| 12 | w1/d5/chat-cli/main.ts | 51 |
| 13 | w1/d5/chat-cli/Session.ts | 146 |
| 14 | w1/d5/chat-cli/tools.ts | 53 |
| 15 | w1/d5/chat-cli/command.ts | 32 |
| 16 | w1/d6/chat-cli/main.ts | 53 |
| 17 | w1/d6/chat-cli/pricing.ts | 57 |
| 18 | w1/d6/chat-cli/Session.ts | 154 |
| 19 | w1/d6/chat-cli/tools.ts | 53 |
| 20 | w1/d6/chat-cli/command.ts | 38 |
| 21 | w1/d6/extractor.ts | 86 |
| 22 | w1/d6/extractor-ai.ts | 41 |
| 23 | w1/d7/w1-cli/main.ts | 70 |
| 24 | w1/d7/w1-cli/pricing.ts | 57 |
| 25 | w1/d7/w1-cli/Session.ts | 186 |
| 26 | w1/d7/w1-cli/tools.ts | 122 |
| 27 | w1/d7/w1-cli/command.ts | 44 |

## 合计

| 目录 | 文件数 | 行数小计 |
|------|-------:|--------:|
| w1/d1 | 1 | 44 |
| w1/d2 | 4 | 146 |
| w1/d3 | 1 | 59 |
| w1/d4 | 5 | 327 |
| w1/d5 | 4 | 433 |
| w1/d6 | 7 | 482 |
| w1/d7 | 5 | 523 |
| **w1 总计** | **27** | **1765** |

> 统计口径:`find w1 -name "*.ts"` 共 27 个文本 ts 文件,`wc -l` 逐文件统计行数,各目录小计经 calculator 核验(146+59+44=249,327+433=760,760+482+523=1765)。
