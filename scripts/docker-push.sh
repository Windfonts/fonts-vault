#!/bin/bash

# Docker 推送脚本
set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取版本号
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="windfonts-vault"
REGISTRY="${DOCKER_REGISTRY:-xianyu12580}"

echo -e "${BLUE}开始推送镜像到 ${REGISTRY}...${NC}"

# 推送版本标签
echo -e "${GREEN}推送: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}

# 推送 latest 标签
echo -e "${GREEN}推送: ${REGISTRY}/${IMAGE_NAME}:latest${NC}"
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo -e "${GREEN}✓ 推送完成！${NC}"
echo -e "${BLUE}镜像地址:${NC}"
echo -e "  ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
echo -e "  ${REGISTRY}/${IMAGE_NAME}:latest"
