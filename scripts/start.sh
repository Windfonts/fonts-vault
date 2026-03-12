#!/bin/sh
set -e

# 回退加载环境变量（仅在运行时未注入 AUTH_SECRET 时启用）
if [ -z "${AUTH_SECRET:-}" ] && [ -f .env.production ]; then
  echo "AUTH_SECRET 未注入，回退加载 .env.production..."
  set -a
  . ./.env.production
  set +a
fi

echo "Starting server with environment:"
echo "  NEXTAUTH_URL=$NEXTAUTH_URL"
echo "  AUTH_TRUST_HOST=$AUTH_TRUST_HOST"
echo "  DATABASE_URL=$DATABASE_URL"

exec node server.js
