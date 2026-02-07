const Router = require('koa-router');
const Comment = require('../models/Comment');
const Order = require('../models/Order');
const Hotel = require('../models/Hotel');
const { authMiddleware } = require('../middleware/auth');

const router = new Router({ prefix: '/api/comments' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/comments
 * @desc 发布评论 (必须登录，必须有已完成的订单)
 * @cite image_37dc86.png
 */
router.post('/', authMiddleware, async (ctx) => {
  try {
    const { orderId, content, rating, images } = ctx.request.body;
    const userId = ctx.state.user.id;

    // 1. 校验必填项
    if (!orderId || !content || !rating) {
      return ctx.body = errorResponse(400, '参数不完整');
    }

    // 2. 校验订单有效性
    // 必须是当前用户的订单，且状态必须是 'paid' 或 'completed' (根据你之前的 Order 定义)
    const order = await Order.findOne({ 
      _id: orderId, 
      userId 
    });

    if (!order) {
      return ctx.body = errorResponse(404, '订单不存在或无权评价');
    }

    // 3. 检查是否已经评价过 (虽然 Model 有唯一索引，但在业务层拦截更友好)
    const existComment = await Comment.findOne({ orderId });
    if (existComment) {
      return ctx.body = errorResponse(400, '该订单已评价，请勿重复提交');
    }

    // 4. 创建评论
    const newComment = new Comment({
      userId,
      hotelId: order.hotelId, // 自动从订单获取酒店ID，防止前端传错
      orderId,
      content,
      rating,
      images
    });

    await newComment.save();

    // --- [进阶功能：自动更新酒店评分] ---
    // 当有新评价时，重新计算该酒店的平均分
    await updateHotelScore(order.hotelId);

    ctx.body = successResponse(newComment, '评价发布成功');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '评价失败');
  }
});

/**
 * @route GET /api/comments
 * @desc 获取某酒店的评论列表 (公开接口)
 * @cite image_37dc86.png
 */
router.get('/', async (ctx) => {
  try {
    const { hotelId, page = 1, pageSize = 10 } = ctx.request.query;

    if (!hotelId) return ctx.body = errorResponse(400, '必须提供 hotelId');

    const skip = (page - 1) * pageSize;

    // 查询评论，并把用户信息(头像/昵称)带出来
    const comments = await Comment.find({ hotelId })
      .populate('userId', 'username avatar') // 假设 User 模型里有 avatar 字段，没有就只取 username
      .sort({ createdAt: -1 }) // 最新评价在前
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await Comment.countDocuments({ hotelId });

    ctx.body = successResponse({ list: comments, total, page, pageSize });
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '获取评论失败');
  }
});

// --- 辅助函数：更新酒店平均分 ---
async function updateHotelScore(hotelId) {
  try {
    // 使用 MongoDB 聚合查询计算平均分
    const stats = await Comment.aggregate([
      { $match: { hotelId: hotelId } },
      { $group: { _id: '$hotelId', avgRating: { $avg: '$rating' } } }
    ]);

    if (stats.length > 0) {
      // 保留一位小数，例如 4.7
      const score = Math.round(stats[0].avgRating * 10) / 10;
      await Hotel.findByIdAndUpdate(hotelId, { score });
    }
  } catch (error) {
    console.error('更新酒店评分失败:', error);
  }
}

module.exports = router;