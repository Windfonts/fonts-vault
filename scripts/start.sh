#!/bin/sh
set -e

# 加载环境变量
if [ -f .env.production ]; then
  echo "Loading .env.production..."
  export $(grep -v '^#' .env.production | xargs)
fi

echo "Starting server with environment:"
echo "  NEXTAUTH_URL=$NEXTAUTH_URL"
echo "  AUTH_TRUST_HOST=$AUTH_TRUST_HOST"
echo "  DATABASE_URL=$DATABASE_URL"

exec node server.js
