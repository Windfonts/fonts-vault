# 认证系统测试指南

## 手动测试步骤

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 测试登录流程

1. 访问 http://localhost:3000/login
2. 输入凭证：
   - 用户名: `admin`
   - 密码: `admin123`
3. 点击"登录"按钮
4. 应该重定向到 `/admin` 页面
5. 应该看到欢迎消息和用户信息

### 3. 测试受保护路由

1. 在未登录状态下访问 http://localhost:3000/admin
2. 应该看到错误或被重定向

### 4. 测试登出功能

1. 在已登录状态下，点击"退出登录"按钮
2. 应该重定向到 `/login` 页面
3. 再次访问 `/admin` 应该无法访问

### 5. 测试错误凭证

1. 访问 http://localhost:3000/login
2. 输入错误的用户名或密码
3. 应该看到错误消息："用户名或密码错误"

## 自动化测试

属性测试将在以下任务中实现：

### 任务 3.1: 认证状态一致性

测试认证状态在客户端和服务器端的一致性。

```typescript
// 属性: 如果用户在服务器端已认证，客户端也应该能获取到相同的会话
property('认证状态一致性', async () => {
  // 登录
  const session1 = await getServerSession();
  const session2 = await getClientSession();

  // 断言: 两个会话应该一致
  expect(session1?.user.id).toBe(session2?.user.id);
});
```

### 任务 3.2: 凭证验证正确性

测试凭证验证的正确性。

```typescript
// 属性: 只有正确的凭证才能通过验证
property('凭证验证正确性', async (username, password) => {
  const result = await login({ username, password });

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    expect(result.success).toBe(true);
  } else {
    expect(result.success).toBe(false);
  }
});
```

### 任务 3.3: 会话清理完整性

测试登出后会话是否完全清理。

```typescript
// 属性: 登出后，所有会话数据应该被清除
property('会话清理完整性', async () => {
  // 登录
  await login(validCredentials);
  const sessionBefore = await getSession();
  expect(sessionBefore).toBeTruthy();

  // 登出
  await logout();
  const sessionAfter = await getSession();

  // 断言: 会话应该为空
  expect(sessionAfter).toBeNull();
});
```

## 预期结果

所有测试应该通过，确保：

1. ✅ 正确的凭证可以登录
2. ✅ 错误的凭证无法登录
3. ✅ 登录后可以访问受保护路由
4. ✅ 未登录无法访问受保护路由
5. ✅ 登出后会话被清除
6. ✅ 会话在 30 天内有效
7. ✅ JWT 正确签名和验证

## 常见问题

### Q: 登录后立即被登出？

A: 检查 `NEXTAUTH_URL` 环境变量是否正确设置。

### Q: 无法访问 `/admin` 页面？

A: 确保已经登录，并且会话有效。

### Q: 看到 "Configuration" 错误？

A: 检查 `AUTH_SECRET` 环境变量是否已设置。

## 下一步

完成手动测试后，继续实现：

- 任务 4: 中间件和权限控制
- 任务 3.1-3.3: 属性测试
