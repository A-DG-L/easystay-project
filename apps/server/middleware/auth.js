const jwt = require('jsonwebtoken');

// 统一错误返回 (保持与你 auth.js 风格一致)
const errorResponse = (code = 401, msg = 'Unauthorized') => ({ code, data: null, msg });

// 1. 验证 Token 是否有效
const authMiddleware = async (ctx, next) => {
  const header = ctx.request.headers.authorization;
  if (!header) {
    ctx.body = errorResponse(401, '未提供 Token，请先登录');
    return;
  }

  const token = header.split(' ')[1]; // 去掉 "Bearer " 前缀
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = decoded; // 把用户信息存入 ctx.state，供后续接口使用
    await next();
  } catch (err) {
    ctx.body = errorResponse(401, 'Token 无效或已过期');
  }
};

// 2. 验证是否为商户 (Merchant)
const isMerchant = async (ctx, next) => {
  if (ctx.state.user.role !== 'merchant' && ctx.state.user.role !== 'admin') {
     ctx.body = errorResponse(403, '权限不足：需要商户身份');
     return;
  }
  await next();
};

// 3. 验证是否为管理员 (Admin)
const isAdmin = async (ctx, next) => {
  if (ctx.state.user.role !== 'admin') {
     ctx.body = errorResponse(403, '权限不足：需要管理员身份');
     return;
  }
  await next();
};

module.exports = { authMiddleware, isMerchant, isAdmin };