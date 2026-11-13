#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  runtime_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$runtime_bin/node" ]; then
    export PATH="$runtime_bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
  else
    echo '请先安装 Node.js 22.13 或更新版本，然后重新启动。'
    exit 1
  fi
fi
if [ ! -d node_modules ]; then
  if command -v pnpm >/dev/null 2>&1; then pnpm install; else npm install; fi
fi
if [ ! -f dist/index.html ]; then
  if command -v pnpm >/dev/null 2>&1; then pnpm run build; else npm run build; fi
fi
echo 'lalaliang · 打开 http://localhost:4318'
echo '关闭这个终端窗口或按 Control+C 可停止服务。'
node server/index.mjs
