# 插问档案 · side-questions

> 用途：主线教学（02、03、04…章节）之外的插问与答案都记在这里。对话被压缩后，从这里能找回所有「支线知识」。
> 格式：每条 = 问题 → 答案要点。按时间顺序追加。

---

## Q1. chrome-cdp.mjs 是这个项目自己命名的文件吗？还是第三方封装？

是**项目自己写的源码文件**（`server/chrome-cdp.mjs`，约 60 行），文件名是项目起的，内容也是项目手写的——一个极简的 CDP WebSocket 客户端 + 专用 Chrome 启动器。它不依赖 puppeteer / playwright-core 之类的库（playwright 只作为测试工具存在，运行时没用它的 API 控制浏览器）。之所以手写：全项目只用到 4-5 个 CDP 命令（Page.navigate、Network.enable、Network.getResponseBody、Runtime.evaluate、Target.getTargets/createTarget），引一整个库不划算，而且手写能严格控制连接边界（只连 127.0.0.1、校验端点身份）。

## Q2. CDP 是什么？

**Chrome DevTools Protocol**，Chrome/Chromium 内置的官方调试协议。你按 F12 打开的开发者工具，就是浏览器通过这个协议跟前端面板通信的。协议本体很简单：浏览器开一个调试端口，程序用 WebSocket 连上去，发 JSON 指令（导航到某 URL、开启网络监听、在页面里执行一段 JS、读取响应体……），浏览器回 JSON 结果，还会主动推送事件（比如「有个网络请求完成了」）。本项目用法：启动专用 Chrome 时传 `--remote-debugging-port=端口`，然后连 `ws://127.0.0.1:端口/devtools/page/标签页id`，用 Page/Network/Target/Runtime 四个域的指令实现「导航 → 截获岗位列表响应 → 注入翻页 JS → 补拉详情」。

## Q3. DOM 是什么？

**Document Object Model**（文档对象模型）：浏览器把 HTML 源码解析后构建出的一棵对象树——页面上每个元素（div、a、按钮、文本）都是树上的节点，JavaScript 通过操作这棵树来改变页面显示。爬虫语境里「解析 DOM」= 等页面渲染后去读元素的文本/属性。BOSS 采集里这对概念正好形成对比：**解析 DOM**（旧 Safari 方案：读页面上的卡片元素，结构易变、薪资有反爬字体）vs **截获 API 响应**（新 Chrome 方案：直接拿浏览器自己请求到的 JSON 数据，字段全且稳定）。

## Q4. 「实时进度、协作式停止、code 37 识别、并发锁」分别怎么实现？

四个都是**单进程内的轻量机制**，没有引入任何框架：

- **实时进度**：boss-chrome.mjs 里有模块级变量 `progress = {status, phase, pages, jobs, details}`。采集流程每读一批列表/一个详情就更新它；`chromeProgress()` 函数把它塞进 `collectionSnapshot()` 的返回值，而前端本来就在轮询（activeRun 期间每 1.5 秒拉一次 bootstrap），于是进度条自动动起来。本质 = 共享对象 + 前端轮询。
- **协作式停止**：点「停止」只调 `POST /api/boss-chrome/stop`，它只做一件事：设标志 `stopRequested = true`——不杀浏览器、不掐断网络。采集循环里每个关键节点（每批之间、每次详情前）都会调 `guard()` 巡检函数，它的第一行就检查这个标志，发现置位就抛出「你已停止本次采集，已读取结果保留」。即**采集流程只在安全的检查点上自己退出**，所以叫协作式；已入库数据不受影响。
- **code 37 环境异常**：BOSS 接口返回的 JSON 有个业务码 `code`，正常为 0，37 是它家的风控码「环境异常」。`listPayload()` 开头专门判 `code===37`，抛出带 `reason:'access_check'` 的错误。另外还挂了一个 CDP 事件监听（Page.frameNavigated）：页面一旦跳到验证码/安全检查路径就置 `securityVisited` 标志，收尾时把普通失败转译成「BOSS 访问检查后未能加载岗位列表」——区分「接口拒绝」和「页面被带去人机验证」两种风控。
- **并发锁**：两个模块级变量分两层。boss-chrome.mjs 的 `occupied`（布尔）：任何 Chrome 操作（采集/打开/检查）进入时发现 true 就拒绝「Chrome 正在处理另一项 BOSS 操作」，结束时 finally 里释放。chrome-cdp.mjs 的 `opening`（Promise）：多个请求同时发现浏览器没启动时，第一个把「启动浏览器的 Promise」存进 opening，后来的直接 await 同一个 Promise——只启动一次、大家共享结果。Node 单线程保证「检查 + 置位」之间不会被打断，所以这种内存锁在单进程里是可靠的（多实例部署时才需要 Redis 之类的分布式锁——呼应企业化讨论）。

## Q5. /improve 是什么？

API 端点 `POST /api/resumes/:id/improve`——「给这份简历生成针对某岗位的定向建议」。前端在简历编辑页底部选目标岗位、点「生成建议」。后端把「简历正文 + 岗位（公司/职位/描述）+ 你的长期记忆块」发给百炼模型，系统提示词约束：只基于真实经历提建议、缺失标「待补充」、不编造、岗位描述是不可信资料。未配置模型时降级为固定的规则清单（5 条准备清单）。修复竞态前它只是单轮问答；现在返回 `sessionId`，支持追问（见下条）。

## Q6. sessionId 是什么？

这次建议生成的**追问会话的工单号**。`/improve` 返回 sessionId 后，你可以 `POST /api/resumes/:id/improve/ask {sessionId, question}` 继续追问「你上面说的第 2 点能展开吗」。服务端用 sessionId 在内存 Map（improveSessions）里找回那次的完整对话历史（用户问了什么、模型答了什么），拼进新请求发给模型，模型才有上下文。属性：30 分钟无活动自动过期；绑定 workspace 和 resumeId（拿别处 sessionId 或换了简历都返回 409「追问会话已失效」）；超过 6 轮把早期对话机械折叠成摘要（省 token，零模型调用）。存内存意味着服务重启即失效——这是刻意设计的「短期」。

## Q7. SPA 是什么？

Single Page Application，单页应用。整个网站只有一个真实 HTML 页面，首次加载后 JavaScript 接管一切：切页面不向服务器要新 HTML，而是 React 在浏览器里换组件、只 fetch 数据。本项目 7 个页面就是 App.tsx 里一个 page state 切换出来的。代价是首次加载慢、刷新需要服务端「兜底路由」返回 index.html（由此引出 404/缓存/CSP 那批安全加固）。

## Q8. CSP 和 X-Frame-Options 是什么？

两个 HTTP **安全响应头**，服务器随响应发给浏览器、由浏览器强制执行：

- **CSP**（Content-Security-Policy，内容安全策略）：一份资源白名单——「本页只许加载哪些来源的脚本/样式/图片、允不允许内联」。主要防 XSS（攻击者把恶意 `<script>` 混进内容）。项目值举例：`script-src 'self'` 只许本站脚本；`style-src 'self' 'unsafe-inline'` 放行 React 必需的内联样式；`frame-src 'self' blob:` 放行 PDF 预览的 blob iframe。
- **X-Frame-Options: DENY**：禁止任何其他页面把本站嵌进 `<iframe>`。防点击劫持（clickjacking：攻击者把你的页面塞进透明 iframe 叠在自己页面上，诱导你在不知情时点击）。手机接收页用的是 CSP 的等价指令 `frame-ancestors 'none'`。

## Q9. workspace 白名单是什么？

`X-Workspace` 请求头决定每个请求用哪个数据库（demo / personal）。**修复前**写法是 `header==='demo' ? 'demo' : 'personal'`——任何拼错的值（persnal、demo2……）都静默落进 personal 真实库，存在「以为在示例空间、实际写进真实库」的风险。**修复后**：只接受 demo / personal（头缺失默认 personal，前端恒发此头），其他值返回 400 中文错误。这类「未知值宁拒绝不猜测」是数据边界的基本功。

## Q10. 「sync 账号复活竞态」是什么？

竞态（race condition）= 程序结果取决于操作时序的缺陷。`/api/sync` 同步邮箱的流程：开始时快照全部账号 → 逐个 await 网络收信（每账号几秒）→ 结束写回 `status/lastSync`。危险窗口：**同步进行中你删除了某账号**——写回时会把开始时的旧账号对象（含加密凭据）原样 put 回数据库，已删除的账号「复活」。修法：await 返回后、写回前**重读数据库**，账号已不存在就跳过。这就是「异步流程写回过期数据」的经典形态。

## Q11. 「recruitment 并发覆盖」是什么？

同款竞态，另一个模块。招聘入口可达性检查：开始时快照入口列表 → 每个入口 await 网络检查（数秒）→ 用**旧快照**整体写回。窗口期：检查进行中你通过「更新入口地址」改了某入口 URL → 检查完成时旧值覆盖新值，你的修改丢失。修法：写回前重读；URL 已被用户改动就不覆盖 url/resumeUrl，只更新检查时间等元数据。两条竞态共同的教训一句话：**await 之后写库之前，先重读当前记录**。
