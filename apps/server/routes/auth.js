const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // 引入我们在上一步建立的模型

const router = new Router({ prefix: '/api/auth' }); // 所有接口都有 /api/auth 前缀

// 辅助函数：统一返回格式
const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/auth/register
 * @desc 用户/商户注册
 */
router.post('/register', async (ctx) => {
  try {
    const { username, password, role } = ctx.request.body;

    // 1. 校验必填
    if (!username || !password) {
      ctx.body = errorResponse(400, '用户名和密码不能为空');
      return;
    }

    // 2. 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      ctx.body = errorResponse(400, '用户名已存在');
      return;
    }

    // 3. 密码加密 (加盐)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. 创建新用户
    const newUser = new User({
      username,
      password: hashedPassword, // 存入加密后的密码
      role: role || 'user'      // 默认为普通用户
    });

    // 5. 保存到 MongoDB
    const savedUser = await newUser.save();

    // 返回成功信息 (不返回密码)
    ctx.body = successResponse({
      id: savedUser._id,
      username: savedUser.username,
      role: savedUser.role
    }, '注册成功');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '服务器内部错误');
  }
});

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 */
router.post('/login', async (ctx) => {
  try {
    const { username, password } = ctx.request.body;

    // 1. 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      ctx.body = errorResponse(400, '用户不存在');
      return;
    }

    // 2. 验证密码 (将输入的密码与数据库的密文对比)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      ctx.body = errorResponse(400, '密码错误');
      return;
    }

    // 3. 生成 Token (包含用户ID和角色信息)
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }); // 7天过期

    ctx.body = successResponse({
      token: 'Bearer ' + token, // 前端通常需要 Bearer 前缀
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    }, '登录成功');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '服务器错误');
  }
});

module.exports = router;