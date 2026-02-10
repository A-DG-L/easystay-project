const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order'); // 需要统计订单
const Like = require('../models/Like');   // 需要统计收藏
const { authMiddleware } = require('../middleware/auth');

const router = new Router({ prefix: '/api/users' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route GET /api/users/profile
 * @desc [聚合接口] 获取个人信息 + 仪表盘统计数据
 * @cite image_383a63.png "核心数据统计栏 (Dashboard)"
 */
router.get('/profile', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;

    // 1. 并发查询所有需要的数据，提高性能
    const [user, orderCount, pendingPaymentCount, likeCount] = await Promise.all([
      User.findById(userId).select('-password'), // 查用户 (排除密码字段)
      Order.countDocuments({ userId }),          // 查全部订单数
      Order.countDocuments({ userId, status: 'pending' }), // 查待支付数
      Like.countDocuments({ userId })            // 查收藏数
    ]);

    if (!user) return ctx.body = errorResponse(404, '用户不存在');

    // 2. 组装返回数据
    const responseData = {
      // 用户基本信息
      userInfo: {
        id: user._id,
        username: user.username,
        nickname: user.nickname || user.username, // 如果没昵称就显示用户名
        avatar: user.avatar || '', // 默认头像
        role: user.role
      },
      // 仪表盘统计数据
      stats: {
        orderCount,         // 全部订单
        pendingPaymentCount, // 待支付
        likeCount           // 我的收藏
      }
    };

    ctx.body = successResponse(responseData);

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '获取个人信息失败');
  }
});

/**
 * @route POST /api/users/update
 * @desc 修改个人资料 (头像、昵称)
 */
router.post('/update', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { avatar, nickname } = ctx.request.body;

    const updateData = {};
    if (avatar) updateData.avatar = avatar;
    if (nickname) {
      if (nickname.length > 20) return ctx.body = errorResponse(400, '昵称太长了');
      updateData.nickname = nickname;
      }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

    ctx.body = successResponse(updatedUser, '资料更新成功');
  } catch (err) {
    ctx.body = errorResponse(500, '更新失败');
  }
});

/**
 * @route POST /api/users/change-password
 * @desc 修改密码
 * @cite image_383a63.png "修改密码 (安全性)"
 */
router.post('/change-password', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { oldPassword, newPassword } = ctx.request.body;

    if (!oldPassword || !newPassword) {
      return ctx.body = errorResponse(400, '请输入旧密码和新密码');
    }

    // 1. 找用户
    const user = await User.findById(userId);
    
    // 2. 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return ctx.body = errorResponse(400, '旧密码不正确');
    }

    // 3. 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. 更新
    user.password = hashedPassword;
    await user.save();

    ctx.body = successResponse(null, '密码修改成功，请重新登录');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '修改密码失败');
  }
});

module.exports = router;