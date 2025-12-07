#!/bin/bash

# 一键构建、推送、部署脚本
set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  文风字库 Docker 一键部署${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 REGISTRY 环境变量
if [ -z "$DOCKER_REGISTRY" ]; then
  echo -e "${YELLOW}警告: 未设置 DOCKER_REGISTRY 环境变量${NC}"
  echo -e "${YELLOW}将只构建本地镜像，不推送到远程仓库${NC}"
  read -p "是否继续? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 步骤 1: 构建镜像
echo -e "\n${BLUE}[1/3] 构建 Docker 镜像...${NC}"
./scripts/docker-build.sh

# 步骤 2: 推送镜像（如果设置了 REGISTRY）
if [ -n "$DOCKER_REGISTRY" ]; then
  echo -e "\n${BLUE}[2/3] 推送镜像到仓库...${NC}"
  ./scripts/docker-push.sh
else
  echo -e "\n${YELLOW}[2/3] 跳过推送步骤${NC}"
fi

# 步骤 3: 询问是否部署
echo -e "\n${BLUE}[3/3] 部署选项${NC}"
echo -e "${YELLOW}选择部署方式:${NC}"
echo "  1) 本地部署 (docker-compose)"
echo "  2) 远程部署 (需要 SSH 配置)"
echo "  3) 跳过部署"
read -p "请选择 (1-3): " -n 1 -r
echo

case $REPLY in
  1)
    echo -e "${GREEN}启动本地部署...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✓ 本地部署完成！${NC}"
    echo -e "${BLUE}访问地址: http://localhost:3000${NC}"
    ;;
  2)
    read -p "请输入服务器地址 (user@host): " SERVER
    if [ -n "$SERVER" ]; then
      echo -e "${GREEN}部署到远程服务器: ${SERVER}${NC}"
      ssh $SERVER "cd ~/windfonts-vault && ./docker-deploy.sh"
      echo -e "${GREEN}✓ 远程部署完成！${NC}"
    else
      echo -e "${RED}未输入服务器地址，跳过部署${NC}"
    fi
    ;;
  3)
    echo -e "${YELLOW}跳过部署步骤${NC}"
    ;;
  *)
    echo -e "${RED}无效选择，跳过部署${NC}"
    ;;
esac

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  部署流程完成！${NC}"
echo -e "${GREEN}========================================${NC}"
