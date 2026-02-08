const Router = require('koa-router');
const History = require('../models/History');
const { authMiddleware } = require('../middleware/auth');

const router = new Router({ prefix: '/api/history' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });

/**
 * @route POST /api/history
 * @desc 添加/更新浏览记录 (在用户进入详情页时调用)
 */
router.post('/', authMiddleware, async (ctx) => {
  try {
    const { hotelId } = ctx.request.body;
    const userId = ctx.state.user.id;

    // 使用 findOneAndUpdate 实现 "Upsert" (有则更新时间，无则插入)
    await History.findOneAndUpdate(
      { userId, hotelId },
      { updatedAt: new Date() }, // 更新时间为当前
      { upsert: true, new: true }
    );

    // 可以在这里做一个优化：只保留最近 50 条记录，删除老的记录 (可选)

    ctx.body = successResponse(null, '记录已更新');
  } catch (err) {
    // 浏览记录失败不应该阻断用户体验，所以可以仅打日志
    console.error('History Error:', err);
    ctx.body = { code: 500, msg: '记录失败' }; // 依然返回 JSON 防止前端报错
  }
});

/**
 * @route GET /api/history
 * @desc 获取“我的浏览记录”
 */
router.get('/', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;

    const histories = await History.find({ userId })
      .populate('hotelId')
      .sort({ updatedAt: -1 }) // 最近浏览的在前面
      .limit(20); // 只返回最近 20 条

    const list = histories
      .map(item => item.hotelId)
      .filter(item => item !== null);

    ctx.body = successResponse(list);
  } catch (err) {
    ctx.body = { code: 500, msg: '获取记录失败' };
  }
});

module.exports = router;