// 服务端品牌单一来源。改品牌名：优先改这里（或在 .env 设 APP_DISPLAY_NAME 覆盖），
// 并同步 index.html 的 <title>/<meta description> 与 server/phone/receiver.html 的展示文字。
export const APP_NAME = (process.env.APP_DISPLAY_NAME ?? '').trim() || 'lalaliang';
