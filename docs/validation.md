# 本地验证记录

2026-11-11，macOS 本地环境。界面使用 `apple-interface-design` 的 Web 模式。

## 已通过

- TypeScript 类型检查、Vite 生产构建。
- 简历增强：PDF / DOCX 在真实本机解析工作线程提取正文，中文 PDF 导出后独立回读；DOCX 原件与 PDF 原件逐字节比对一致，修复隐藏 `.data` 路径下原件下载404。覆盖无效文件、大小/解压限制、无法提取提示、版本固定、迁移记录幂等、人工确认与空间隔离。
- 招聘入口：31个可选长期主页、用户自定义入口及动态计数；同域跳转自动更新、跨域目标待核对、失败保留、1/7/30天复查设置持久化。浏览器复现并修复异步开关回弹，20次简历页签快切、390px窄视口、200%缩放均检查。
- 81 项 Node 测试：空间隔离、申请与证据持久化、简历版本、邮箱凭据加密、发送确认与并发保护；来源识别、公开地址与跳转校验、岗位解析、去重、跨来源可见状态、失败保留数据、偏好筛选、收藏幂等、定时任务与重启恢复；百炼端点限制和密钥不返回浏览器；暂存内容密钥检查及带点号的百炼密钥格式。新增 Safari 连接、固定 BOSS 地址、同岗位详情合并、验证停止、定时排除和列表刷新保留旧详情；手机分享原文保留、核对入库、不带链接的独立岗位、无效图片与大小限制、OCR 失败保留内容、手机接收认证 / 限流 / 到期 / 接口隔离、模型仅返回建议。
- 22 条 Chromium headless 浏览器流程：申请图节点、阶段记录、搜索、简历版本、投递草稿、消息人工确认、模态键盘操作；方向与城市多选、自定义城市、出勤与时长保存、刷新持久化；来源添加、后台采集、离开后返回、原文详情、收藏进入申请图；部分来源失败后重试、来源开关及定时开关；手机分享暂存重开与核对、申请图展开原文、真实 Mac Vision OCR 上传、独立手机接收页面提交与关闭重开、二维码更新；BOSS 页面 DOM 解析、Vue 原薪资字段与岗位 ID 校验、详情读取、连接检查、后台入库、验证提示和窄窗口。
- 桌面视口 1440×1050、1920×1080；窄视口 390×844、720×450；CSS `zoom:2` 压力检查无页面横向溢出。窄窗口流程图纵向重排，检查所有节点边界都在画布内。
- 读取实际桌面、窄窗口、来源弹窗与真实岗位截图，检查层级、遮挡和可操作区域。导航 / 工具栏使用单层玻璃，其余为实色；实色模式保留边界与选中底座。
- `pnpm run check:secrets` 源文件检查通过；`pnpm audit --prod` 返回 0 个已知漏洞。`.env` 权限为 0600，密钥未出现在前端源码、构建产物或 API 返回中。未创建或推送 GitHub 仓库。

新简历界面截图包括 `resume-library.png`、`resume-platforms.png`、`resume-migration.png`、`resume-platforms-narrow.png`；合成导出样例 `resume-export-sample.pdf` 已通过 Poppler 渲染并实际查看中文排版，浏览器下载的 `resume-ui-export.pdf` 也已独立解析核对。

截图位于本地、由 Git 忽略的 `artifacts/`，包括工作台、时间线、简历、设置实色模式、窄窗口和缩放结果。浏览器测试使用独立 `.data/e2e-*` 数据库，未写入个人空间。

## 真实服务联调

- 腾讯官网实习类别与 Notion 的 Ashby 公开来源通过本机 HTTP 接口采集，两个来源均返回完整成功快照。此次保留 237 个真实岗位：腾讯 96 个、Notion 141 个；默认实习偏好显示 99 个。再次采集没有产生重复岗位。记录见本地 `artifacts/collection-live.json`。
- BOSS 使用用户明确授权的 Safari Apple 事件接口及已登录页面实机验证。以「软件 / 武汉 / 仅实习」搜索，当前15个岗位全部识别为实习，15个薪资可读，5个完整详情入库；第二次采集新增0、更新0、未变化15。个人池共252个岗位，默认实习偏好显示114个。记录见 `artifacts/boss-safari-live-integration.json`。Safari 登录态采集不读取 Cookie 或聊天；未向招聘方发送消息。
- Greenhouse 自有招聘主页通过真实采集适配器返回 19 个岗位。
- Lever 单页公开请求成功返回 1 个岗位；完整采集曾受当前网络 DNS / 连接错误影响，未记为完整真实联调通过。分页与解析使用固定样本验证。
- 百炼 `qwen-plus` 的最小真实请求及应用内模型测试均成功；未上传个人简历进行真实改写验证。
- 2026-10-28 的历史招聘入口复查通过真实本机 HTTP 链路验证，当时8个入口均返回可访问，保存检查时间与下次复查时间；未向任何站点发送简历或账号信息。记录见 `artifacts/recruitment-live.json`。
- 本次没有自动创建申请、投递、发送平台消息或外部邮件。定时采集默认关闭。
- Mac Vision 使用浏览器生成的合成中文岗位截图，通过真实文件上传、Swift 编译、原生 OCR、核对表单及 SQLite 保存链路验证，未替换 OCR。首次编译与识别约29秒；不作为所有设备或图片的性能保证。
- 手机接收端在本机私有网卡地址及独立端口运行，使用 Chromium 390×844 浏览器实际提交内容，验证主工作台接口不可访问、关闭连接失效及重新开启更换二维码。没有使用真实手机硬件；未验证跨设备防火墙、Wi-Fi 隔离或 iOS 本地网络权限。

## 验证限制

采集浏览器测试替换公开招聘源响应和 Safari Apple 事件边界，不操作真实 Safari 账号；DOM 提取器在 Chromium 中执行固定页面样本，应用 HTTP、后台任务、SQLite 与界面均真实运行。测试服务显式跳过本地 `.env`，不使用真实模型密钥。发送协议测试使用替代传输，不发送外部邮件。

QQ / 163 / Gmail / Outlook / 学校邮箱的实际登录、真实网络收信、OAuth 续期和真实邮件送达仍需用户邮箱账号与 OAuth 客户端配置后联调。

应用自动化测试使用 Chromium headless；另用已登录 Safari 对 BOSS 采集器做真实验证，不代表全应用 Safari / WebKit、Firefox、真实移动硬件、读屏器或长时间 GPU 性能验收。CSS 放大不是浏览器原生缩放；另做等效窄视口检查，但未操作浏览器原生缩放菜单。测试减少动态效果与手动实色开关，未实测所有系统级透明度和高对比组合；没有做全站 WCAG 对比度认证或帧率保证。

官网自动采集当前支持腾讯、Greenhouse、Lever、Ashby，以及包含 JobPosting 结构化数据的公开页面。通用官网使用固定样本验证；需要登录、动态渲染或不提供结构化岗位数据的站点需要单独适配。BOSS 网页支持 Chrome 自动滚动翻页/详情和 macOS Safari 当前页采集。Chrome 已通过真实浏览器/CDP、真实 BOSS 列表翻页和详情、HTTP任务、SQLite、工作台展示及列表复采验收。手机 App 与实习僧通过用户提交的分享或截图接入，自动翻页、后台读取聊天、原生分享扩展、官网表单投递与官网申请状态读取尚未实现。手机内容的模型整理测试替换了模型响应，不代表本次对真实分享执行过百炼提取。

## 简历迁移边界

本次没有向外部招聘网站上传真实简历、自动填写官网或提交申请。迁移助手提供文件导出、按章复制、官网跳转和用户自填的上传确认记录；后者不能证明平台服务器已接收，也不推进申请阶段。浏览器官网跳转使用合成页面，真实账号登录与实际平台上传尚未联调。PDF 扫描件的 OCR 和复杂版式还原未实现，解析失败时保留原件和手动补正文入口。公开官网检查不验证登录、附件上传或全部 JS 跳转。

## 表单模板生成验证

- 真实调用 `@jsonresume/schema` 1.7.0 校验 JSON 数据及 `jsonresume-theme-even` 0.27.0 渲染 HTML，未替换开源引擎。记录及许可见 `docs/open-source-resume.md`。
- 姓名、照片压缩、教育/项目/实习/技能填写，草稿保存刷新恢复，隐藏模块/照片，PDF 排版预览，生成版本及再次编辑另存；实际下载 PDF/JSON/HTML 后独立解析。Even 页面实际打开并检查无外部请求。
- 3个模板和4页长文样例通过真实 PDFKit 生成、Poppler 渲染并实际查看中文、照片和换页。修复页脚绘制导致的额外空页，单页和多页回归均验证。界面覆盖20次页签快切、20次模板切换、390px和200%缩放；修复放大后的编辑区拥挤和横向溢出。
- 样例与截图为明确合成资料，位于忽略的 `artifacts/builder-*.pdf`、`resume-builder-*.png`、`resume-builder-even.html`，未向个人库写入演示经历，也未发送真实简历。

## 2026-11-11 Chrome、字体与目录扩展

- Chrome 采集接口/任务/SQLite：多批列表去重、详情身份匹配、字段白名单、列表刷新保留旧正文、验证后停止、部分结果分批保存与明确部分状态；显式停止后不再请求详情；Safari 来源并存。
- `scripts/test-chrome-live-transport.mjs`：真实独立 Chromium、Node 原生 WebSocket/CDP、Network 响应监听、页面滚动、浏览器内详情请求，读取2批列表、3个唯一岗位和3个详情。上游全部为明确合成响应，未接触用户浏览器账号；证据 `artifacts/chrome-transport-evidence.json`。
- 真实 BOSS Chrome 当前可用：2批列表读取28个岗位、补充3个详情，复采后池内33个规范链接无重复，旧详情与时间保留。之前页面回首页实际返回环境异常（code37）；修正浏览器启动配置后成功。2026-11-11 Safari 检查未找到 BOSS 标签页，旧的 Safari 实机记录保留为历史证据。
- 字体内置于 `public/fonts`：思源黑体、思源宋体、霞鹜文楷。3份合成简历 PDF 由 PDFKit 生成、独立解析并用 Poppler 渲染，实际查看中文、标题、页脚及日期，未依赖系统字体。Even 离线导出内嵌所选字体。新 UI 选择与草稿恢复已验证。
- 官网目录31项、默认选择16项，可搜索/筛选、勾选、添加自定义 HTTPS 入口、取消显示；刷新持久化、20次快速切换、200% CSS缩放和窄视口检查。修复官网选择的异步回跳与 Chrome 采集后仍显示收藏页。
- 31项真实公开网络复查使用临时隔离数据库：25可访问、4网络检查未成功、2跨域跳转待核对；失败保留旧地址，跨域不自动替换。不能据此证明招聘账号登录或简历上传。证据 `artifacts/recruitment-expanded-live.json`。
- 构建、密钥扫描及生产依赖审计通过；未推送 GitHub，未发送邮件、平台消息或申请。

最终复验：73项 Node 测试通过、22条全套浏览器流程通过；官网卡片200%放大布局修正后，3条新增 Chrome/目录/字体流程再次通过，并实际查看截图。

补充调试（用户暂不登录 BOSS）：新增5项浏览器连接故障测试，修复并发打开重复启动、子进程失败仍等待完整时限、连接关闭后命令长时间等待。78项后端测试通过；4条 Chrome/目录/字体相关浏览器流程通过，包含390px窄屏与200%放大。真实隔离 Chromium 的 CDP 断开后即时失败、重新建立新页连接均通过。上游仍为合成数据，真实账号采集保持待登录状态。

截图复核发现并修复：200% CSS缩放后原生 dialog 可能超出垂直视口，标题和关闭按钮不可见。弹窗现根据视口与根元素缩放计算可用尺寸，并监听缩放/窗口变化；新增关闭按钮在视口内、弹窗上下边界检查。构建通过，相关9条浏览器流程通过（含20次导航、模态键盘/回焦、Chrome/官网/字体与390px/200%布局），实际查看最终放大截图。

真实登录后复查：站点返回 code37「您的环境存在异常.」，并通过自动检查路由回到首页，未出现可操作的人工验证控件。修正测试端口启动配置（保持同一登录目录）、支持 CDP base64 JSON 解析；自动检查页状态为 checking，可见人工验证才为 captcha，环境异常单独提示。

真实验收：首次成功运行读取2批、28个岗位，补充3条详情，新增27条并更新1条已有来源记录；列表复采读取28条，其中23条复用、5条新岗位，最终33个规范链接无重复。复采前的详情正文与 detailCapturedAt 保持不变。源设置恢复为2批/3详情。通过实际工作台 UI 选择 Chrome 来源、展示33张岗位卡片、打开详情核对浏览器证据并截图。81项 Node 测试和7条 Chrome/Safari相关浏览器流程通过。证据 `artifacts/boss-chrome-live-integration.json`、`boss-chrome-live-workbench.png`、`boss-chrome-live-detail.png`，均 Git 忽略。未创建申请、发送平台消息或投递。

## 2026-11-13 SPA 兜底与安全响应头加固

- 未知 /api 路径不再落入 SPA 兜底：全部接口路由之后新增 `app.use('/api')` 兜底，返回 404 JSON `{error:'接口不存在'}`，已注册路由（含 OAuth 回调）不受影响；带扩展名的未知路径返回 404 JSON `{error:'资源不存在'}`，不再把 HTML 当作 JS/PNG 返回；SPA 兜底仅服务页面导航形状的请求。
- 静态缓存：`dist/assets` 哈希产物经 express.static `setHeaders`（按落盘文件路径判断，非请求 URL）返回 `public, max-age=31536000, immutable`；`index.html`（含兜底返回）为 `no-cache`；`/api` 维持原有 `no-store`，未重复设置。
- 主应用响应新增 CSP 与 `X-Frame-Options: DENY`：script/style/font 限 'self'，style 允许 'unsafe-inline'（React 内联样式），img 允许 data:（头像照片、二维码），frame-src 允许 blob:（简历原件与排版预览 iframe），另加 base-uri 'none'、form-action 'self'、object-src 'none'、frame-ancestors 'none'。仅经 Express 响应头生效，未写入 index.html，dev 模式 5173 与手机接收页独立实例未动。
- 工作空间校验：`X-Workspace` 仅接受 demo/personal，缺失时默认 personal，其他非空值返回 400 中文提示，不再静默落库。
- 同步竞态（账号）：`/api/sync` 每个账号写回 status/lastSync 前重读记录，同步中被删除的账号跳过写回（成功分支；失败分支本就不写回），不再整体复活含 secret 的旧快照。imap 调用对齐到 mailServices 服务边界（与 transport 一致），仅为测试注入需要，接口与语义不变。
- 目录检查竞态（招聘入口）：核查发现 recruitment.mjs 已有"写回前重读、url 与检查开始时不一致则整条跳过"的守卫（此前会话加入），满足"不覆盖用户设置的 url/resumeUrl"。实现选择整条跳过而非仅更新检查元数据：PATCH 改地址时本就重置 lastCheckedAt/status 并写入"你更新了地址，请重新检查"提示，整条跳过可避免覆盖任何用户刚设置的字段，下次检查可重跑。本次未改 recruitment.mjs，仅以测试锁定。
- 新增 `tests/hardening.test.mjs` 8 项回归：未知 /api 404 JSON（GET/POST）、未知带扩展名路径 404 且非 text/html、首页 no-cache/CSP/X-Frame-Options 与 /api no-store、哈希产物 immutable（dist 缺失时自动跳过）、非法 X-Workspace 400、慢 IMAP 同步中删号断言不复活、recruitment 慢响应中并发改 url 断言不被覆盖、仅改名称时检查元数据刷新且用户字段保留。
- 验证环境：Linux 沙箱 Node 22.23.4，隔离 DATA_DIR 与 /tmp 构建，未触碰个人 `.data` 与真实 `.env`。构建通过且产物哈希与现有 dist 一致（前端未改动，未回传 dist）；`node --test tests/*.test.mjs` 89/89 通过（81 旧 + 8 新）；`scripts/check-secrets.mjs` 通过；Playwright Chromium 24 条浏览器流程 23 条通过、1 条未通过——Vision OCR 截图用例依赖 `/usr/bin/swiftc`（macOS Vision），沙箱无 swiftc，属环境限制，该用例此前在 macOS 实机通过且与本次改动无关。沙箱运行浏览器需临时 `LD_LIBRARY_PATH` 提供 libXdamage.so.1，Chromium 安装于沙箱目录，未污染项目。
- 隔离服务 curl 实测（127.0.0.1:4318，临时 DATA_DIR，测后清理）：`/api/does-not-exist` → 404 JSON `{"error":"接口不存在"}` 且 `Cache-Control: no-store`；`/assets/nope-9a1b2c.js` → 404 JSON `{"error":"资源不存在"}`，Content-Type 非 text/html；`/` → 200 text/html，`Cache-Control: no-cache`，含完整 CSP 与 `X-Frame-Options: DENY`；`/assets/index-C5c_g_Ev.js` → 200，`Cache-Control: public, max-age=31536000, immutable`；`X-Workspace: boss` → 400 `{"error":"工作空间标识无效，仅支持 demo 或 personal"}`。
- 未覆盖：本沙箱无法访问用户本机 4318 运行实例，重启后的当面核对留待用户执行（服务器端改动需重启生效，dist 无需重建）；真实邮箱 IMAP 同步与 BOSS 真实登录等真实上游流程本次未触碰。未推送 GitHub，未发送邮件、消息或投递。

## 2026-11-14 Langfuse 模型观测接入

- server/ai.mjs 可选接入 Langfuse（官方 langfuse 3.39.2 SDK，纯 JS，lockfileVersion 9.0 不变）。配置 LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY（可选 LANGFUSE_HOST，默认云版 EU）后，每次 generateText 上报一条 trace（name 为 resume-improve / mobile-structure / model-test，随调用点区分）与一条 generation（模型名、prompt/响应、token 用量、起止时间、apiHost 元数据），flushAt=1 即时上报。未配置密钥时完全不创建客户端、零网络请求；上报构造或发送异常被捕获，绝不影响模型结果与接口响应。三个调用点（简历定向建议、手机分享结构化、模型连接测试）各自带语义化名称。
- 用量来源：百炼/OpenAI 兼容响应中的 usage（prompt_tokens/completion_tokens/total_tokens），此前被丢弃，现记录进 generation.usage；total 缺失时以输入+输出兜底。
- 新增 tests/observability.test.mjs 4 项：未配置时零行为且不建客户端；注入假客户端断言 trace 元数据与用量数值；上报抛错不影响模型返回；真实 SDK 指向本地捕获 HTTP 服务完成端到端上报（断言 Basic 认证头、batch 含 trace-create/generation-create、模型名与用量）。后端合计 93/93（89+4）通过；密钥扫描通过；前端未改动，无需重建 dist。
- 选择说明：Langfuse v4 已将 /api/public/ingestion 列为遗留端点；官方 v3 SDK 为其持续兼容的客户端路径，且接入集中在 ai.mjs 单处，日后可低成本迁移到 @langfuse/otel。未自写上报协议，避免随版本漂移。
- 未验证与限制：未用真实 Langfuse 云账号端到端验证（需用户注册并配置 keys 重启后，在控制台核对 resume-improve 等三条 trace）；模型调用失败（HTTP 非 200/网络异常）不产生 trace；成本换算依赖 Langfuse 内置模型单价表，自定义模型名可能显示为 0 成本；简历正文与岗位描述会随 prompt 上传至 Langfuse 云端，为用户知情选择的云版方案；沙箱安装依赖时曾临时改写 node_modules/.modules.yaml 的 store 路径记录并已还原为 Mac 原值。

## 2026-11-14 记忆功能第一期（长期记忆 + 注入）

- 按 `docs/memory-design.md` 第一期实施。新增 `server/memory.mjs`：`memories` 存储（core/preference/episode/negative 四类），`GET/POST/PATCH/DELETE /api/memories`，手动添加直接 confirmed，容量上限（20/20/20/100）超限返回 409 中文提示，demo 空间拒绝写入；PATCH 支持确认/退役/编辑，DELETE 硬删除。`/api/bootstrap` 新增 `memories` 字段。
- 注入：`buildMemoryBlock` 把已确认记忆拼为 system prompt 附录——core/preference/negative 全量（个人数据量小，无向量库），episode 按岗位关键词双向子串匹配取最近 5 条；块尾固定"没有记录要如实说明、冲突以记忆为准"的弃答指令；无任何记忆时 system prompt 追加"如实说明暂无记录，不要编造"。仅接入 `resume-improve`；`memoryVersion`（条数+最近确认时间）随 trace metadata 上报 Langfuse。
- 前端：设置页新增"关于我的记忆"卡片（src/pages/Mail.tsx）：手动添加表单、待确认区（记住/丢弃）、四类已生效区（过时了/删除），demo 空间提示；类型/数据定义在 `src/types.ts`，样式追加至 `src/styles.css`。
- 测试：新增 `tests/memory.test.mjs` 6 项（手动添加生效、pending 确认后才注入、注入内容与弃答文案、episode 关键词过滤、退役后不注入且无记忆时提示暂无记录、容量上限 409 与 demo 拒绝）。后端合计 100/100（94+6）通过；tsc 类型检查通过；密钥扫描通过。
- 构建：前端有改动，沙箱副本构建成功并已同步 dist（新 bundle `index-BOxeqm7B.js`/`index-CKRQyTlY.css`）。
- 浏览器流程（沙箱 Chromium，按历史分组方式）：app 5、resumes 3、builder 2、discovery 4、safari 3、chrome 4、mobile 2 通过，合计 23 条；Vision OCR 用例仍因沙箱无 swiftc 失败（环境限制，同前记录）。
- 发现一个既有测试顺序依赖（非本次引入）：若 chrome.spec 先于 discovery.spec 连跑，chrome 用例采集留下的岗位池使"采集岗位"计数徽标出现，`getByRole('button',{name:/采集岗位/})` 同时匹配页内 tab 与"查看全部已采集岗位"按钮，触发 Playwright strict mode violation，discovery 3 条与 safari 1 条失败；单独跑或按无 chrome 前置分组均通过。失败选择器位于 Discovery.tsx（本次未改动），记忆功能不产生岗位数据。建议后续将选择器改为精确匹配或用例间清理岗位池。
- 隔离服务 curl 实测（临时 DATA_DIR，测后清理）：POST /api/memories → 201 confirmed；GET 列表与 bootstrap 均含记忆；PATCH retired 与 DELETE → 200；demo POST → 400 中文提示。真实模型调用下的注入效果未验证（沙箱无真实百炼 key），已由假模型断言 prompt 内容的单测覆盖。
