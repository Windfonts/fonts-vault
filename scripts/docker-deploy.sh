#!/bin/bash

# Docker 部署脚本（用于云端服务器）
set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="windfonts-vault"
CONTAINER_NAME="windfonts-vault"
REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-latest}"

echo -e "${BLUE}开始部署 ${IMAGE_NAME}...${NC}"

# 停止并删除旧容器
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
  echo -e "${GREEN}停止旧容器...${NC}"
  docker stop ${CONTAINER_NAME} || true
  docker rm ${CONTAINER_NAME} || true
fi

# 拉取最新镜像
if [ -n "$REGISTRY" ]; then
  echo -e "${GREEN}拉取镜像: ${REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
  docker pull ${REGISTRY}/${IMAGE_NAME}:${VERSION}
  IMAGE_TAG="${REGISTRY}/${IMAGE_NAME}:${VERSION}"
else
  IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
fi

# 启动新容器
echo -e "${GREEN}启动新容器...${NC}"
docker run -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -p 4000:4000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env.production \
  ${IMAGE_TAG}

# 等待容器启动
echo -e "${BLUE}等待容器启动...${NC}"
sleep 5

# 检查容器状态
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
  echo -e "${GREEN}✓ 部署成功！${NC}"
  echo -e "${BLUE}容器状态:${NC}"
  docker ps -f name=${CONTAINER_NAME}
  echo -e "${BLUE}查看日志: docker logs -f ${CONTAINER_NAME}${NC}"
else
  echo -e "${RED}✗ 部署失败！${NC}"
  echo -e "${BLUE}查看日志: docker logs ${CONTAINER_NAME}${NC}"
  exit 1
fi
