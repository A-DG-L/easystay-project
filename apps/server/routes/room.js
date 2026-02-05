const Router = require('koa-router');
const Room = require('../models/Room');
const Hotel = require('../models/Hotel'); // 需要检查酒店归属权
const { authMiddleware, isMerchant } = require('../middleware/auth');

const router = new Router({ prefix: '/api/rooms' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/rooms
 * @desc [商户] 为指定酒店添加房型
 * @cite source: 108
 */
router.post('/', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { hotelId, name, price, stock, size, imageUrl } = ctx.request.body;
    const merchantId = ctx.state.user.id;

    // 1. 安全检查：确认该酒店属于当前商户
    const hotel = await Hotel.findOne({ _id: hotelId, merchantId });
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权操作此酒店或酒店不存在');
    }

    // 2. 创建房型
    const newRoom = new Room({
      hotelId,
      name,
      price,
      stock,
      size,
      imageUrl
    });

    await newRoom.save();

    // 3. (可选) 更新酒店的最低价格 minPrice
    // 逻辑：如果新房型价格比酒店当前minPrice低，则更新酒店minPrice
    // 此处简化，暂略，建议在复杂业务中处理

    ctx.body = successResponse(newRoom, '房型添加成功');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '添加房型失败');
  }
});

/**
 * @route GET /api/rooms
 * @desc [用户/通用] 获取某酒店的所有房型列表
 * @cite source: 113
 */
router.get('/', async (ctx) => {
  try {
    const { hotelId } = ctx.request.query;
    if (!hotelId) return ctx.body = errorResponse(400, '必须提供 hotelId');

    const rooms = await Room.find({ hotelId });
    ctx.body = successResponse(rooms);
  } catch (err) {
    ctx.body = errorResponse(500, '获取房型失败');
  }
});

module.exports = router;