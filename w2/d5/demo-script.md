# P1 演示录屏台本 · 2 分钟一次过

> 配套《W2-D5 详解》第 03 章。原则:**一次录完,不剪辑**;录砸整个重录,不解释不拼接。
> 录屏成品 `demo.mp4` 留本目录,GIF 压制后放 `p1-cli/docs/demo.gif`。

## 录前准备(5 分钟逐项过)

- [ ] 终端字号 16px+,窗口约 1200×750
- [ ] `clear` 清屏,提示符干净无残留
- [ ] 系统勿扰模式开启(防弹窗入镜)
- [ ] 确认旧报告已清理:`ls reports/`(无 p1-demo-report.md)
- [ ] **按台本空跑彩排一遍**,正式录制零思考停顿

## 逐秒台本

| 时间 | 动作 | 展示点 |
| --- | --- | --- |
| 0:00 – 0:10 | `ls w2/d5/p1-cli`,停 2 秒 | 项目形态:干净的模块划分(Session/tools/command/pricing/main + README) |
| 0:10 – 1:00 | 敲下方演示命令,**全程不碰键盘**让流式跑完 | 核心 50 秒:流式可视化、工具调用依次出现、`--verbose` 跳数(💭/🔧)、成本面板四个卖点同屏 |
| 1:00 – 1:20 | `pnpm start-w2d5` 进交互 → 输入一个小任务(如「查北京天气并乘 3」)→ 中途 **Shift+C 中断** → 再输 `/history` 证明已生成内容保留 | 「中断保留内容」差异化机制 |
| 1:20 – 1:45 | 交互里输入「执行 sudo rm -rf /tmp/x」 | run_command 白名单**当场拒绝**——安全设计的活证据 |
| 1:45 – 2:00 | `/exit` 退出 → `head -20 reports/p1-demo-report.md` 展示产出落盘 → (可选)编辑器打开 README | 闭环:任务真实产出 + 项目有门面 |

## 演示命令(0:10 敲这条;总册钦定任务,不许换)

```bash
pnpm start-w2d5 -- --task "统计 w1 目录下所有 ts 文件的行数" --dir w1 --out reports/p1-demo-report.md --verbose
```

## GIF 压制(mp4 → 3MB 内,两遍法)

```bash
# ① 调色板(全局最优配色,防发灰)
ffmpeg -i demo.mp4 -vf "fps=12,scale=900:-1:flags=lanczos,palettegen" palette.png
# ② 出 GIF;超 3MB 降 fps=10 或 scale=800 重跑
ffmpeg -i demo.mp4 -i palette.png -lavfi "fps=12,scale=900:-1:flags=lanczos [x]; [x][1:v] paletteuse" demo.gif
mkdir -p p1-cli/docs && mv demo.gif p1-cli/docs/demo.gif
```

工具链二选一:QuickTime(屏幕录制选区 → mp4)+ 上方 ffmpeg;或 Kap(`brew install --cask kap`)直接出 GIF。

## 合格标准

- [ ] 2:00 内完整闭环,一次过无剪辑
- [ ] GIF 浏览器里字看得清,成本面板出现在画面中
- [ ] GIF ≤ 3MB,README 打开不卡
- [ ] 演示任务与 README 复现命令、走查**同一条**(三处一致才叫闭环)
