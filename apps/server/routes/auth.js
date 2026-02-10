const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

const router = new Router({ prefix: '/api/auth' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/auth/register
 * @desc 用户/商户注册
 * [优化]：允许注册时直接传入 nickname 或 phoneNumber
 */
router.post('/register', async (ctx) => {
  try {
    // 接收更多参数
    const { username, password, role, nickname, phoneNumber } = ctx.request.body;

    if (!username || !password) {
      return ctx.body = errorResponse(400, '用户名和密码不能为空');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return ctx.body = errorResponse(400, '用户名已存在');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'user',
      // [新增] 如果前端传了就存，没传就由 User 模型给默认值或空
      nickname: nickname || '', 
      phoneNumber: phoneNumber || '',
      avatar: '' // 注册时默认无头像，或设置一个默认图片URL
    });

    const savedUser = await newUser.save();

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
 * [关键修改]：返回 avatar 和 nickname
 */
router.post('/login', async (ctx) => {
  try {
    const { username, password } = ctx.request.body;

    // 1. 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return ctx.body = errorResponse(400, '用户不存在');
    }

    // 2. 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return ctx.body = errorResponse(400, '密码错误');
    }

    // 3. 签发 Token
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 4. 返回完整信息 [这里是你要改的核心]
    ctx.body = successResponse({
      token: 'Bearer ' + token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        // [新增] 返回这两个字段，前端拿到后直接存入 LocalStorage 或全局状态
        nickname: user.nickname || user.username, // 如果没有昵称，默认显示用户名
        avatar: user.avatar || ''                 // 如果没有头像，返回空字符串让前端显示默认图
      }
    }, '登录成功');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '服务器错误');
  }
});

module.exports = router;