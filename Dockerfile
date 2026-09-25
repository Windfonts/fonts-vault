# 多阶段构建 - 与 packageManager=pnpm 对齐（npm ci 在现依赖树会 arborist 崩溃）
FROM node:20-alpine AS base
# 国内 apk + npm；pnpm 钉 9.x（Node 20；pnpm 11 要 Node>=22）
RUN sed -i 's#https\?://dl-cdn.alpinelinux.org#https://mirrors.aliyun.com#g' /etc/apk/repositories \
  && npm config set registry https://registry.npmmirror.com \
  && npm install -g pnpm@9.15.9

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
ARG PNPM_REGISTRY=https://registry.npmmirror.com
RUN pnpm config set registry "$PNPM_REGISTRY" \
  && pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN mkdir -p /app/data && if [ ! -f /app/data/prod.db ]; then : > /app/data/prod.db; fi
RUN pnpm run build

# 运行阶段 - 使用 standalone 输出
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV AUTH_TRUST_HOST=true
ENV DATABASE_URL=file:./data/prod.db

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /app/data /app/logs && chown -R nextjs:nodejs /app/data /app/logs

COPY --from=builder --chown=nextjs:nodejs /app/data/prod.db /app/data/prod.db

COPY --from=builder --chown=nextjs:nodejs /app/scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 4000

ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
