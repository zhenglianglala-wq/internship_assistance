# lalaliang · Internship Studio

个人本地实习工作台。按公司组织不同岗位的申请，用可点击的流程图追踪联系、初筛、笔试、面试与 Offer。界面遵循 `apple-interface-design` 的信息层级、控制层材质和可访问交互原则，以紫、绿、橙、蓝、粉区分状态和内容。

名称在 `index.html` 的 `<title>品牌名 · 实习工作台</title>` 中修改，前端品牌文字会同步读取标题中的品牌名。4318 端口提供 `dist` 构建，修改源码后执行 `pnpm build` 并刷新页面；`pnpm dev` 的5173端口可实时预览源码修改。网页描述在同一文件的 `meta[name="description"]` 中维护。

## 启动

需要 **Node.js 22.13+**（项目使用 Node 内置 SQLite）。

```sh
pnpm install
pnpm run build
pnpm start
```

打开 [本地工作台](http://localhost:4318)。macOS 也可双击 `start.command`；支持使用本机 Codex 已附带的 Node 运行时。开发模式执行 `pnpm dev`，访问 `http://localhost:5173`。

首次打开为明确标识的「示例空间」。左侧切换「我的空间」即可从空白数据开始；两者使用独立数据库。示例模式无法连接真实邮箱或发送邮件。

## 已实现

| 功能 | 当前行为 |
|---|---|
| 工作台 | 从真实本地记录计算统计、面试日程、待确认草稿 |
| 申请星图 | 公司下多岗位独立跟踪；缩放、拖动画布；点击节点查看记录和依据；时间线视图 |
| 采集岗位 | BOSS Chrome 自动滚动翻页及详情、Safari 当前列表及详情；腾讯官网、Greenhouse / Lever / Ashby 公开岗位接口、JSON-LD JobPosting 官网；后台采集、来源结果、去重及内容更新 |
| 手机岗位 | iPhone / Android 分享文字、链接、截图导入；可选扫码局域网接收；本机 OCR、待核对队列、百炼整理与原文证据 |
| 求职偏好 | 可多选方向、城市，自定义城市；岗位类型、远程 / 混合办公、出勤与时长、关键词；保存后立即筛选已有数据 |
| 机会池 | 收藏采集岗位后建立申请图；同一岗位重复收藏返回同一申请；手动添加岗位与来源链接 |
| 申请进度 | 手动添加阶段、证据和北京时间面试日程；支持跳过阶段、撤回、未通过 |
| 简历 | 拖拽上传 PDF / DOCX / TXT / MD；本机提取正文、PDF 原件预览、版本编辑、PDF/TXT 导出、原件下载 |
| 模板与生成 | 姓名/照片/教育/经历表单；3套中文 PDF 模板、即时预览、草稿恢复、再次编辑另存版本；JSON Resume 校验与 Even 网页导出 |
| 简历迁移与官网 | 选择固定版本、下载上传文件、按章节复制、跳转官网、人工确认迁移记录；可选官网目录、自定义招聘网站、按时间复查与地址更新 |
| 简历建议 | 无模型时提供明确标注的规则清单；配置兼容 API 后基于原文生成定向建议 |
| 邮箱 | 多账号、IMAP 收件、SMTP 发件；客户端授权码及 Gmail / Outlook OAuth 适配 |
| 消息识别 | 规则识别阶段、匹配公司岗位；模糊匹配保留待确认；人工确认后才写入进度 |
| 投递队列 | 准备草稿 → 编辑保存 → 预览实际收件人及附件 → 明确确认 → SMTP 发送 |

**当前边界：**BOSS 支持专用 Chrome / Chromium 自动采集（关键词、城市、滚动翻页、详情上限）与 Safari 当前页采集。首次 Chrome 连接需要在独立窗口登录，不能继承 Safari 登录；实习僧及手机 App 的岗位通过用户提交的分享内容或截图接入；手机原生 App 内自动翻页与聊天读取尚未实现。官网表单自动填写与官网申请状态抓取尚未实现。公司官网支持下述已适配来源；没有结构化岗位数据、需要登录或动态渲染的其他官网可能需要单独适配。邮件通道的真实账号联调仍需用户配置邮箱凭据，未发送真实测试邮件。学校邮箱适配标准 IMAP TLS / SMTP TLS 或 STARTTLS；专属 OAuth、CAS 或非标准协议需单独适配。

PDF / DOCX 上传后在本机提取正文，原件与排版保持不变。PDF 可直接预览；提取内容应核对，扫描件、加密或复杂文件可能需要手动粘贴。文本修改另存独立版本，可导出 PDF/TXT；邮件附件仍使用选中的原件或 Markdown 版本。模型输出为建议，需要用户核对后保存。

## 简历与招聘官网

进入「我的简历」：

- **模板与生成**：在「模板与生成」选择简约通用、清新校园、技术项目，填写姓名、照片、联系方式、教育、项目、实习、技能和到岗安排。可调整强调色、字体、字号、模块顺序与显示。先保存本机草稿或查看 PDF 排版，再生成到简历库；「编辑生成信息」保存新版本，旧版不变。生成的 PDF 可直接用于邮件附件和官网迁移。还可导出标准 JSON Resume 与 Even 离线网页。开源项目、固定版本、许可和接入边界见 [开源接入记录](docs/open-source-resume.md)。

- **简历库与版本**：选择或拖拽文件，最大10 MB。PDF/DOCX 通过受时限和内存限制的工作线程在本机提取，PDF 最多30页、正文最多10万字；DOCX 解压后最多30 MB。失败保留可读取的原件和提示，不使用模型上传文件。TXT/MD 使用 UTF-8。
- **预览与导出**：查看 PDF 原件、核对正文、另存新版本。可下载原件，或将保存的正文生成新的 PDF 上传版。PDF 与网页导出使用项目内置的开源中文字体，默认思源黑体（Noto Sans SC），另可选思源宋体（Noto Serif SC）、霞鹜文楷；无需依赖 macOS、Windows 或 Linux 系统字体。表单生成时在「技能与排版」选择；简历库也可选择「PDF 导出字体」。PDF 嵌入所选字体，Even 网页内嵌同一字体，离线可用。字体来源、许可与校验值见 [字体资源](public/fonts/README.md)。原文件不会被覆盖。
- **迁移与招聘官网**：提供可扩展的招聘目录，覆盖 BOSS、实习僧、猎聘、腾讯、字节、阿里、网易、华为、美团、京东、百度、小米、快手、拼多多、蚂蚁、小红书、大疆、OPPO、vivo、荣耀、滴滴、携程、联想、美的、科大讯飞、商汤等。可搜索公司或行业，勾选加入「我的入口」，也可自行添加网站；列表按实际记录计数并分批显示。选择简历并「准备迁移」，下载原件/PDF、复制填写内容、打开官网；在官网完成上传后勾选并记录。准备记录绑定固定版本，不能代表平台已接收或岗位已投递。暂未实现跨站自动填写、上传和提交。
- **入口复查**：默认进入此页时检查超过7天未核对的入口，可选1/7/30天，也可手动立即检查。仅请求公开页面，无需发送简历或账号信息。跟随同域服务器跳转并记录历史；跨域变更显示待核对，手动更新后再检查。失败、反爬或登录限制保留原地址。静态检查不能验证网站全部功能、动态跳转、登录或上传成功；服务关闭/页面未打开时不会后台巡检。

收录的长期入口包括 [腾讯校招](https://join.qq.com/)、[腾讯招聘](https://careers.tencent.com/)、[BOSS](https://www.zhipin.com/)、[实习僧](https://www.shixiseng.com/)、[猎聘](https://www.liepin.com/) 和 [字节招聘](https://jobs.bytedance.com/)。扩展目录于 2026-11-11 核对官方来源。目录收录与岗位采集适配分开：能打开官网不代表该站支持自动抓取。入口访问状态以本机检查结果为准，登录、简历上传仍需在官网操作。

## 官网与公开 API 采集

在「我的空间 → 发现机会」：

1. 设置求职方向、城市和更多条件，点击「保存偏好」。方向、城市可多选；其他城市可自行输入。保存偏好只筛选已有记录，不会额外调用模型或反复采集。
2. 打开「采集来源」，选择预设，或添加公司公开招聘主页。支持以下来源：

| 来源 | 网址形式与范围 |
|---|---|
| 腾讯官网 | `https://careers.tencent.com/search.html?attrId=3` 为实习列表；`attrId=2` 为校招、`attrId=1` 为社招；省略参数时读取综合列表 |
| Greenhouse | `https://job-boards.greenhouse.io/公司标识` 或 `https://boards.greenhouse.io/公司标识` |
| Lever | `https://jobs.lever.co/公司标识`；支持 `jobs.eu.lever.co` 欧洲实例 |
| Ashby | `https://jobs.ashbyhq.com/公司标识`，仅保留明确 `isListed=true` 的公开岗位 |
| 其他官网 | HTTPS 页面中的 JSON-LD `JobPosting`；可继续读取同站 `ItemList` 指向的最多10个详情页；可识别嵌入的上述招聘平台链接 |

3. 点击「开始采集」，后台任务会自动刷新，离开页面或刷新浏览器不会取消正在执行的任务。每个来源分别报告读取数量与错误。服务重启中断的任务标记为中断，原数据保留。
4. 采集结果先进入「采集岗位」；点击「收藏并跟踪」后才创建公司 / 岗位申请，初始状态为「已发现」，不会发送消息或投递。

按规范化岗位 URL 去重，保留原文链接、来源岗位 ID、读取时间和内容指纹。只有完整来源快照才会标记该来源不再列出的岗位；失败或截断的采集保留原状态。多来源出现同一岗位时，只要还有来源列出，就不会误标缺失。岗位未列出与简历未通过是不同状态，不会联动修改申请图。

出勤天数和实习时长按你的可用上限匹配；缺失数据可选择保留并明确标注，也可排除。远程岗位仍可能有地域限制。城市匹配使用来源文字和常见中英别名，不代表已核实签证或雇佣资格。

可选开启每6 / 12 / 24小时采集，默认关闭；仅在电脑开机、服务运行时执行。腾讯与 Lever 单次最多1000条，截断会显示提示；官网详情链接最多10条，部分结果不会用于判断下架。读取公开页面前检查 robots 规则，失败、登录要求或访问限制会作为来源错误显示；不处理验证码或绕过登录限制。

公开来源请求只允许 HTTPS，限制响应大小、跳转次数和连接时间，校验全部 DNS 地址并固定已验证的连接地址，拒绝本机、内网、元数据服务和不安全跳转。采集本身不使用模型密钥。

## BOSS · Chrome 自动采集

进入「我的空间 → 发现机会 → 采集来源 → BOSS 直聘 · Chrome 自动采集」：

1. 选择关键词、城市、是否仅实习、列表批数（1–20）与详情上限（0–100）。
2. 点击「打开 Chrome 并登录」，在项目专用窗口手动登录一次，再「检查 Chrome 连接」。专用登录目录在 `.data/boss-chrome`，不复制 Safari Cookie，不提交 Git。
3. 点击「自动采集 BOSS」。程序监听岗位搜索接口响应，再通过滚动/下一页加载更多，按岗位原文链接去重；可关闭来源面板查看结果与进度。
4. 详情按数量上限逐条读取并匹配岗位 ID；验证码、登录失效或访问限制会停止后续请求，已读取数据分批保留。重新运行会刷新列表，保留先前详情及其时间，避免列表重采覆盖正文。

「页」指网站实际返回的一批列表，不保证每批固定数量。无更多数据、连续无新增、等待超时或达到上限即停止；搜索结果为部分快照，不用于判断旧岗位下架。定时采集可包含 Chrome，但要求专用浏览器保持开启、账号登录有效；程序不会后台自动登录。

优先使用系统 Chrome / Edge，也支持项目现有 Playwright Chromium。找不到时在 `.env` 设置 `BOSS_CHROME_PATH`。并发连接只启动一个浏览器；启动失败约15秒内提示，浏览器断开后命令立即失败，可重新打开连接。连接器使用本机 Node WebSocket/CDP，参考 [boss-scripts](https://github.com/lx419394005-cloud/boss-scripts) 的响应监听、滚动与详情工作流，保留 [MIT 许可](docs/licenses/boss-scripts.MIT.txt)。不会自动打招呼或发送申请。

2026-11-11 已使用登录后的真实 BOSS 账号验证「前端实习 / 武汉」：2批列表读取28个岗位并补充3条详情；列表复采复用23条、新增5条，最终33个规范链接无重复，已有详情与读取时间保留。工作台列表和详情面板已实际检查。修正了浏览器启动端口配置、CDP base64 JSON 解析，并区分自动访问检查、环境异常与可见人工验证。实机记录位于 Git 忽略的 `artifacts/boss-chrome-live-integration.json`。

## BOSS · Safari 采集

macOS 上复用 Safari 的现有登录。进入「我的空间 → 发现机会 → 采集来源」，添加「BOSS直聘 · Safari」：

1. 在 Safari 登录 BOSS。在「设置 → 高级」显示网页开发者功能，再在「开发者」允许来自 Apple 事件的 JavaScript；系统首次可能询问自动化授权。这允许本机获授权应用在网页执行脚本，应由你明确开启。
2. 选择关键词、城市和「仅搜索实习岗位」，点击「在 Safari 打开搜索」。列表加载后检查连接，再点击「开始采集」。
3. 打开岗位查看详情、读取时间与原始链接；收藏后进入申请图。检查连接只预览数量。

连接器运行固定 AppleScript，只读取 BOSS 岗位卡片和对应详情，不复制 Cookie。默认读取当前列表并依次补充前5个岗位详情；不自动翻页，不代表全量搜索结果。原始薪资通过匹配岗位 ID 与标题的页面组件字段读取；无法识别的特殊字体薪资标为待核实。重新采集按岗位链接去重，保留先前详情及其读取时间，部分列表不会把旧岗位标记下架。

Safari 来源仅手动启动，不进入定时采集。遇到登录失效、安全验证、访问限制或页面变化会停止，保留已有记录。多个 BOSS 标签页时切到目标页面，或从工作台打开搜索以绑定该标签页。不会自动沟通、投递或修改账号。


## iPhone / Android 手机岗位

在「发现机会 → 手机岗位」导入 BOSS、实习僧、猎聘或其他 App 的内容：

1. 从手机复制分享文字或链接，粘贴到电脑。也可选择 PNG / JPEG 岗位截图（最大8MB）。Mac 使用 Vision 本地 OCR，首次使用需本机 Swift 编译工具；图片在处理后删除，只保存提取文字。其他系统可先用手机提取文字再粘贴。
2. 「整理并核对」先保存待核对内容。可选点击「用百炼整理」将这一条分享文字发送给配置的模型；这一步不自动创建岗位。
3. 核对公司、职位、城市、薪资、类型和正文，再点「核对并加入岗位池」。缺失要求保持未知；仅有链接时不会声称已读取完整 App 详情。没有链接也可保存，按平台、公司、职位、城市识别重复快照。
4. 手机岗位与官网岗位共用偏好筛选。详情与申请图保留原始分享文本、来源、设备及核对时间；收藏后才建立申请。

### 直接从手机发送

打开「从手机接收」，选择电脑的局域网 IP，点「开启30分钟接收」。iPhone 与 Android 在同一个可信 Wi-Fi 下扫码打开接收页，粘贴分享内容或选择截图，电脑端待核对列表会自动刷新。也可复制接收地址到手机；连接码放在 URL 片段中，不通过页面 GET 请求发送。

接收页使用一个独立、临时的 HTTP 端口，只绑定所选的私有 IPv4 地址。必须携带本次随机连接码才能提交；不提供工作台、简历、邮箱、模型设置或文件读取接口。它不是 HTTPS 通道，应仅在可信局域网使用。系统可能需要允许本地网络连接。默认关闭，30分钟到期、手动关闭或服务退出后不可继续使用；重新开启生成新的连接码。手机入口的真实 iOS Safari / Android 硬件连接仍需设备联调。

设备端进一步接入可使用 [iOS 快捷指令分享输入](https://support.apple.com/guide/shortcuts/launch-a-shortcut-from-another-app-apd163eb9f95/ios) 或 [Android 分享接收 Intent](https://developer.android.com/training/sharing/receive)。当前交付包含浏览器接收页，未安装原生分享扩展或自动控制手机。临时提交协议为 `POST /api/share`，请求头 `X-Pairing-Token` 为当次地址 `#` 后的连接码；JSON 字段为 `text`、可选 `platform`（`auto/boss/shixiseng/liepin/other`）与 `device`（`iPhone/Android/unknown`）；截图使用 multipart 字段 `image`。

接口文档：[Greenhouse Job Board](https://docs.greenhouse.io/job-board)、[Lever Postings](https://github.com/lever/postings-api)、[Ashby Job Postings](https://developers.ashbyhq.com/docs/public-job-posting-api)。

## 邮箱配置

在「设置与连接」中添加邮箱。QQ、163 使用邮箱后台生成的客户端授权码，不是网站登录密码；Gmail 可使用应用专用密码或 OAuth。Outlook 使用 OAuth。保存后点击「测试连接」，会分别验证 IMAP 和 SMTP，不会发送邮件。

每次手动同步各账号收件箱最近 50 封邮件，每封读取上限 512 KB；邮件仅作为纯文本展示，不加载邮件 HTML 或远程图片。基于账号、UIDVALIDITY 与 UID 去重。不把没有回复直接判成拒绝。请在用户确认框中检查关联岗位、阶段和北京时间面试日程。

### Gmail / Outlook OAuth

1. 将 `.env.example` 复制为 `.env`，填写自己的 OAuth 应用信息。
2. Google Cloud 创建 Web OAuth 客户端，配置 consent screen；开发测试状态将自己的邮箱加入测试用户。所需 scope 为 `openid email https://mail.google.com/`。
3. Microsoft Entra 注册支持所需个人 / 组织账户的 Web 应用，配置委托权限并允许用户授权。使用 `openid email offline_access`、`https://outlook.office.com/IMAP.AccessAsUser.All`、`https://outlook.office.com/SMTP.Send`；组织可能还需管理员启用 IMAP / SMTP AUTH。
4. 配置相应的 Web 回调地址（修改 PORT 时同步修改）：

```text
http://localhost:4318/api/oauth/google/callback
http://localhost:4318/api/oauth/microsoft/callback
```

5. 重启服务，点击对应服务的「OAuth 授权」。完成官方授权后返回应用刷新连接列表，然后测试连接。

使用 PKCE 与一次性 state；访问令牌、刷新令牌通过本地 AES-256-GCM 密钥加密。刷新令牌可用时自动刷新，授权撤销或配置变更后需重新连接。

官方参考：[Google IMAP / SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp)、[Microsoft IMAP / SMTP OAuth](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth)、[Nodemailer SMTP](https://nodemailer.com/smtp)、[ImapFlow](https://imapflow.com/docs/api/imapflow-client/)。

## 模型配置

默认接入阿里百炼。若本机已有 `.env` 请保留，不要用模板覆盖。密钥仅在本地文件中填写：

```dotenv
AI_PROVIDER=bailian
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
AI_API_KEY=
```

在「设置与连接」可以选择地域、修改模型或粘贴百炼控制台提供的业务空间专属 Base URL，然后测试连接。百炼密钥只允许发送至官方百炼模型域名，重定向不会携带密钥。保存配置会清除旧的验证状态，测试期间配置变化时不会把旧结果标记为新配置已通过。

服务端请求 `${AI_BASE_URL}/chat/completions`。Key 不返回浏览器，页面只显示是否已配置。点击「测试模型」会执行最多16 token的小请求；点击简历「生成建议」才会发送选中的简历与岗位正文，默认输出上限2048 token。没有 Key 时仍可使用采集、筛选、本地管理和规则清单。测试服务器显式跳过真实 `.env`，不消耗本机模型额度。

参考：[百炼密钥与地域](https://help.aliyun.com/zh/model-studio/get-api-key)、[百炼兼容接口与业务空间域名](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)。

## 数据与 GitHub

- `.data/personal.sqlite`：个人记录；`.data/demo.sqlite`：示例记录。
- `.data/vault.key`：本地加密密钥；`.data/` 中还保留简历原件。目录权限 0700，密钥和附件权限 0600。**备份时完整备份 `.data/`，密钥丢失将无法解密邮箱凭据。**数据库中的简历、邮件正文未加密，应使用受保护的本机账户与磁盘。
- `.env`、`.data/`、数据库、附件、测试截图及依赖目录均由 `.gitignore` 排除；仓库只包含空值 `.env.example`。
- 上传前运行 `pnpm run check:secrets`。初始化 Git 后可执行 `git config core.hooksPath .githooks`，启用提交前检查。检测覆盖常见密钥格式及不应跟踪的文件，不能替代人工检查所有自定义密钥。
- 服务仅绑定 `127.0.0.1`，有 Host / Origin 校验及写操作本地令牌，不适合作为未经改造的公网多用户服务。

发送确认与草稿版本绑定，5 分钟有效且只能使用一次；草稿修改后需要重新预览。发送前锁定草稿，重复点击或并发确认不会重复发送。SMTP 连接在提交后失败时，结果可能不明，草稿将锁定为待核实，需在原邮箱检查，系统不会自动重试。SMTP 接受不代表邮件已经到达或被阅读。

## 验证

```sh
pnpm test
pnpm run build
pnpm run check:secrets
# 浏览器装在项目私有数据目录，避免依赖全局缓存
PLAYWRIGHT_BROWSERS_PATH="$PWD/.data/browsers" pnpm exec playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.data/browsers" pnpm run test:browser
```

浏览器测试使用独立测试数据库、4319端口和明确的合成招聘上游；HTTP、任务与 SQLite 真实执行，不加载真实模型密钥、不连接真实邮箱。真实公开来源的单独联调结果与测试覆盖见 `docs/validation.md`。截图与记录在忽略的 `artifacts/` 与 `test-results/` 中。

## 结构

```text
src/             React + TypeScript 界面、React Flow 申请图
server/          Express、本地 SQLite、邮箱适配、确认发送协议
tests/           后端回归与 Chromium 浏览器流程
scripts/         开发启动和密钥检查
.env.example     空值环境配置模板
```
