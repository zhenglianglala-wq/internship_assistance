# 简历字体资源

简历默认使用项目内置 Noto Sans SC（思源黑体系列），可选 Noto Serif SC（思源宋体系列）、霞鹜文楷。三者均按 SIL Open Font License 1.1 分发，许可与版权声明保留在本目录。2026-11-11 下载，文件 SHA-256 与来源见 manifest.json。

- Noto Sans SC：notofonts/noto-cjk 的 Sans/SubsetOTF/SC；许可 NotoSans-LICENSE.txt。
- Noto Serif SC：notofonts/noto-cjk 的 Serif/SubsetOTF/SC；许可 NotoSerif-LICENSE.txt。
- 霞鹜文楷：lxgw/LxgwWenKai 的 fonts/TTF；许可 WenKai-OFL.txt。

PDFKit 将所选字体的已用字形嵌入 PDF；网页预览从本机静态资源加载；Even HTML 内嵌所选字体，导出后离线打开保持字体。字体文件合计约44 MiB，应随项目一起保留，无需安装系统字体或联网下载。旧结构化版本缺省字体为 noto-sans。
