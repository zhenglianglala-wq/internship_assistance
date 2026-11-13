# 简历生成器的开源接入

2026-10-28 核对并接入以下 GitHub 项目的 npm 发行包，版本固定在锁文件中：

| 组件 | 实际用途 | 固定版本 | 许可 |
|---|---|---|---|
| [JSON Resume Schema](https://github.com/jsonresume/jsonresume.org/tree/master/packages/schema) | 生成时校验标准简历数据；导出兼容 JSON Resume 的 JSON | `@jsonresume/schema` 1.7.0 | MIT |
| [Even](https://github.com/rbardini/jsonresume-theme-even) | 调用其真实 `render()` 引擎，生成离线 HTML 网页简历 | `jsonresume-theme-even` 0.27.0 | MIT |

许可声明保存在 `docs/licenses/`。通过官方仓库的 package.json、README、许可证及安装包 API 核对，未克隆并运行其他完整简历网站。

本项目自行实现中文表单和3个 PDF 版式：简约通用、清新校园、技术项目。PDF 使用 PDFKit 和项目内置的思源黑体、思源宋体、霞鹜文楷生成（可选，默认思源黑体）；Even 保留其独立网页布局，不将自制 PDF 模板冒称上游模板。

Even 输出会移除脚本和远程资源，并内嵌用户选择的字体，并添加限制资源加载的 CSP；照片仅允许用户选择的本机 PNG/JPEG 数据，不自动请求远程照片。网页主题和 JSON 校验在本机执行，不连接 JSON Resume 在线托管服务、不发布 GitHub Gist，也不把简历传给 GitHub。

个人照片先在浏览器压缩为 JPEG，服务端再次核对格式与尺寸。生成 PDF 原件、表单草稿和填写数据存入本机 `.data`。照片作为生成信息保留；关闭「在成品中显示照片」后，PDF、JSON Resume 和 Even 网页均不携带照片。隐藏的经历模块保留在本机表单，但不会进入导出的简历内容。

生成操作使用请求标识防止重复创建版本，编辑生成信息时新增版本，旧版 PDF 不变。生成的 PDF 直接复用原有下载、邮件附件与迁移准备流程。人工直接修改 Markdown 正文会另存文本版本；需要保留版式时使用「编辑生成信息」。

当前支持姓名、求职意向、邮箱、电话、城市、个人网站、照片、简介、到岗安排、教育、实习/工作、项目和技能。JSON Resume 只输出这些已实现字段；不声称覆盖其全部章节，也暂不提供任意 JSON Resume 导入。表单生成不调用语言模型、不生成未填写的学历、单位、项目或成果；定向完善建议继续使用已有的手动触发功能。
