#!/bin/bash

# Docker 构建脚本
set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}开始构建 Docker 镜像...${NC}"

# 获取版本号（从 package.json）
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="windfonts-vault"
REGISTRY="${DOCKER_REGISTRY:-xianyu12580}"

# 构建镜像
echo -e "${GREEN}构建镜像: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
docker build -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} -t ${REGISTRY}/${IMAGE_NAME}:latest .

# 同时打本地标签（方便本地测试）
docker tag ${REGISTRY}/${IMAGE_NAME}:latest ${IMAGE_NAME}:latest

echo -e "${GREEN}✓ 构建完成！${NC}"
echo -e "${BLUE}镜像列表:${NC}"
docker images | grep ${IMAGE_NAME}
