# 项目文本文件行数统计报告

统计范围:项目根目录 `.` 下所有文本文件;已排除 `.git/`、`node_modules/`、`.pnpm-store/` 目录及二进制文件 `fixtures/broken.bin`。
统计口径:`wc -l`(换行符行数)。共 **65 个文件**,合计 **6735 行**。

## 文件清单(按目录分组)

### 根目录(9 个文件,940 行)

| 文件 | 行数 |
|---|---:|
| .env | 6 |
| .gitignore | 103 |
| config.ts | 6 |
| package.json | 31 |
| pnpm-lock.yaml | 583 |
| tsconfig.json | 12 |
| w1-line-count-report.md | 43 |
| w1-lines-report.md | 53 |
| w1-loc-report.md | 103 |
| **小计** | **940** |

### reports/(5 个文件,268 行)

| 文件 | 行数 |
|---|---:|
| reports/w1-line-count-report.md | 56 |
| reports/w1-loc-report.md | 54 |
| reports/w1-ts-line-count-report.md | 51 |
| reports/w1-ts-line-count.md | 59 |
| reports/w1-ts-line-report.md | 48 |
| **小计** | **268** |

### fixtures/(2 个文件,799 行)

| 文件 | 行数 |
|---|---:|
| fixtures/big.txt | 799 |
| fixtures/empty.txt | 0 |
| **小计** | **799** |

### notes/(5 个文件,1544 行)

| 文件 | 行数 |
|---|---:|
| notes/sampling-matrix-analysis.html | 108 |
| notes/sampling-matrix-report.md | 118 |
| notes/sampling-matrix-result.md | 207 |
| notes/sampling-matrix.html | 288 |
| notes/w2-stability-result.md | 24 |
| **小计** | **1544** |

### w1/(30 个文件,1913 行)

| 文件 | 行数 |
|---|---:|
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
| w1/d6/sample.txt | 27 |
| w1/d6/chat-cli/Session.ts | 154 |
| w1/d6/chat-cli/command.ts | 38 |
| w1/d6/chat-cli/main.ts | 53 |
| w1/d6/chat-cli/pricing.ts | 57 |
| w1/d6/chat-cli/tools.ts | 53 |
| w1/d7/w1-cli/README.md | 43 |
| w1/d7/w1-cli/Session.ts | 186 |
| w1/d7/w1-cli/command.ts | 44 |
| w1/d7/w1-cli/main.ts | 70 |
| w1/d7/w1-cli/pricing.ts | 57 |
| w1/d7/w1-cli/report.md | 29 |
| w1/d7/w1-cli/tools.ts | 122 |
| **小计** | **1913** |

### w2/(14 个文件,1374 行)

| 文件 | 行数 |
|---|---:|
| w2/d1/p1-cli/README.md | 43 |
| w2/d1/p1-cli/Session.ts | 186 |
| w2/d1/p1-cli/command.ts | 44 |
| w2/d1/p1-cli/main.ts | 106 |
| w2/d1/p1-cli/pricing.ts | 57 |
| w2/d1/p1-cli/tools.ts | 153 |
| w2/d2/stability.ts | 98 |
| w2/d3/make-fixtures.ts | 26 |
| w2/d4/README.md | 43 |
| w2/d4/Session.ts | 196 |
| w2/d4/command.ts | 44 |
| w2/d4/main.ts | 114 |
| w2/d4/pricing.ts | 57 |
| w2/d4/tools.ts | 153 |
| **小计** | **1374** |

## 分组合计

| 分组 | 文件数 | 行数 |
|---|---:|---:|
| 根目录 | 9 | 940 |
| reports/ | 5 | 268 |
| fixtures/ | 2 | 799 |
| notes/ | 5 | 1544 |
| w1/ | 30 | 1913 |
| w2/ | 14 | 1374 |
| **合计** | **65** | **6735** |

## 备注

- 根目录另有历史报告文件(`w1-line-count-report.md` 等)与 `reports/` 下同名报告,行数不同,均为本仓库的旧产物,按约束一并计入。
- `fixtures/broken.bin` 为二进制文件,未计入。
