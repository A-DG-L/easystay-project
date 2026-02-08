const Router = require('koa-router');
const Like = require('../models/Like');
const { authMiddleware } = require('../middleware/auth'); // 必须登录

const router = new Router({ prefix: '/api/likes' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/likes/toggle
 * @desc 收藏/取消收藏某酒店
 * @cite image_37cea1.png
 */
router.post('/toggle', authMiddleware, async (ctx) => {
  try {
    const { hotelId } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!hotelId) return ctx.body = errorResponse(400, '缺少 hotelId');

    // 1. 检查是否已经收藏
    const existingLike = await Like.findOne({ userId, hotelId });

    if (existingLike) {
      // 2. 如果已收藏 -> 删除 (取消收藏)
      await Like.findByIdAndDelete(existingLike._id);
      ctx.body = successResponse({ isLiked: false }, '已取消收藏');
    } else {
      // 3. 如果未收藏 -> 创建 (添加收藏)
      const newLike = new Like({ userId, hotelId });
      await newLike.save();
      ctx.body = successResponse({ isLiked: true }, '收藏成功');
    }

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '操作失败');
  }
});

/**
 * @route GET /api/likes
 * @desc 获取“我的收藏”列表
 * @cite image_37cea1.png
 */
router.get('/', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;

    // 查询该用户的收藏，并通过 populate 拿到酒店的具体信息
    const likes = await Like.find({ userId })
      .populate('hotelId') // 填充酒店详情
      .sort({ createdAt: -1 }); // 按收藏时间倒序

    // 格式化返回数据，把 hotelId 对象提取出来作为主要数据
    // 过滤掉可能因为酒店被删除而导致的 null
    const list = likes
      .map(item => item.hotelId)
      .filter(item => item !== null);

    ctx.body = successResponse(list);
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '获取收藏列表失败');
  }
});

module.exports = router;