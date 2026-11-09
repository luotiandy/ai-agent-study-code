# w1 目录 TS 文件行数统计报告

- 统计范围:`w1/` 目录下全部 `*.ts` 文本文件(共 27 个,按 `find w1 -name "*.ts"` 枚举)
- 统计工具:`wc -l` 统计换行符数量,calculator 逐文件求和交叉验证
- 合计行数:**1765 行**

## 文件清单与行数

| 文件路径 | 行数 |
| --- | ---: |
| w1/d1/hello-llm.ts | 44 |
| w1/d2/chat-cli/main.ts | 48 |
| w1/d2/chat-cli/Session.ts | 43 |
| w1/d2/chat-cli/command.ts | 32 |
| w1/d2/stateless-demo.ts | 28 |
| w1/d3/sampling-matrix.ts | 59 |
| w1/d4/chat-cli/main.ts | 57 |
| w1/d4/chat-cli/Session.ts | 71 |
| w1/d4/chat-cli/command.ts | 32 |
| w1/d4/stream-sdk.ts | 39 |
| w1/d4/stream-demo.ts | 69 |
| w1/d5/chat-cli/main.ts | 51 |
| w1/d5/chat-cli/Session.ts | 146 |
| w1/d5/chat-cli/tools.ts | 53 |
| w1/d5/chat-cli/command.ts | 32 |
| w1/d6/chat-cli/main.ts | 53 |
| w1/d6/chat-cli/pricing.ts | 57 |
| w1/d6/chat-cli/Session.ts | 154 |
| w1/d6/chat-cli/tools.ts | 53 |
| w1/d6/chat-cli/command.ts | 38 |
| w1/d6/extractor.ts | 86 |
| w1/d6/extractor-ai.ts | 41 |
| w1/d7/w1-cli/main.ts | 70 |
| w1/d7/w1-cli/pricing.ts | 57 |
| w1/d7/w1-cli/Session.ts | 186 |
| w1/d7/w1-cli/tools.ts | 122 |
| w1/d7/w1-cli/command.ts | 44 |
| **合计(27 个文件)** | **1765** |

## 分目录小计

| 目录 | 文件数 | 行数 |
| --- | ---: | ---: |
| w1/d1 | 1 | 44 |
| w1/d2 | 4 | 151 |
| w1/d3 | 1 | 59 |
| w1/d4 | 5 | 268 |
| w1/d5 | 4 | 282 |
| w1/d6 | 7 | 482 |
| w1/d7 | 5 | 479 |
| **合计** | **27** | **1765** |

## 校验说明

1. `find w1 -name "*.ts"` 枚举出 27 个 ts 文件,无遗漏(已排除 .DS_Store 等非文本文件,非 ts 文件不计入)。
2. `wc -l` 输出的 `total` 为 1765。
3. calculator 按文件顺序逐项求和 = 1765。
4. calculator 按分目录小计求和(44+151+59+268+282+482+479)= 1765。
5. 三种方式结果一致,数据可靠。
