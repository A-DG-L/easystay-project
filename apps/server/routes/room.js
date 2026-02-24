const Router = require('koa-router');
const Room = require('../models/Room');
const Hotel = require('../models/Hotel'); // 需要检查酒店归属权
const Order = require('../models/Order'); // 用于按日期计算库存占用
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
 * @route PUT /api/rooms/:id
 * @desc [商户] 更新房型信息
 */
router.put('/:id', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    // 先找到房型
    const room = await Room.findById(id).populate('hotelId');
    if (!room) {
      return ctx.body = errorResponse(404, '房型不存在');
    }

    // 检查酒店归属权
    const hotel = await Hotel.findOne({ 
      _id: room.hotelId._id, 
      merchantId: ctx.state.user.id 
    });
    
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权操作此房型');
    }

    const updatedRoom = await Room.findByIdAndUpdate(id, updateData, { new: true });
    ctx.body = successResponse(updatedRoom, '更新成功');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '更新失败');
  }
});


/**
 * @route DELETE /api/rooms/:id
 * @desc [商户] 删除房型
 */
router.delete('/:id', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { id } = ctx.params;

    // 先找到房型
    const room = await Room.findById(id).populate('hotelId');
    if (!room) {
      return ctx.body = errorResponse(404, '房型不存在');
    }

    // 检查酒店归属权
    const hotel = await Hotel.findOne({ 
      _id: room.hotelId._id, 
      merchantId: ctx.state.user.id 
    });
    
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权操作此房型');
    }

    await Room.findByIdAndDelete(id);
    ctx.body = successResponse(null, '删除成功');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '删除失败');
  }
});


// 工具函数：按天遍历日期区间 [start, end)
const eachDay = (start, end, cb) => {
  const cur = new Date(start.getTime());
  while (cur < end) {
    cb(new Date(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }
};

const formatDateKey = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * @route GET /api/rooms/:id/availability
 * @desc [用户] 检查指定房型在给定入住/离店日期和间数下是否可预订（按天计算已占用库存）
 */
router.get('/:id/availability', authMiddleware, async (ctx) => {
  try {
    const { id } = ctx.params;
    const { roomCount = 1, checkInDate, checkOutDate } = ctx.request.query;

    const count = parseInt(roomCount, 10) || 1;
    if (count <= 0) {
      return ctx.body = errorResponse(400, 'roomCount 必须大于 0');
    }

    if (!checkInDate || !checkOutDate) {
      return ctx.body = errorResponse(400, '必须提供 checkInDate 和 checkOutDate');
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return ctx.body = errorResponse(400, '入住/离店日期不合法');
    }

    const room = await Room.findById(id);
    if (!room) {
      return ctx.body = errorResponse(404, '房型不存在');
    }

    const totalStock = room.stock || 0;
    if (totalStock <= 0) {
      return ctx.body = successResponse({
        available: false,
        stock: 0,
        message: '该房型暂无可售房量'
      }, '库存不足');
    }

    // 查询与所选日期区间有重叠的订单（排除已取消）
    const existingOrders = await Order.find({
      roomId: id,
      status: { $ne: 'cancelled' },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start }
    });

    // 统计每个日期已占用的间数
    const occupancy = {}; // { '2026-02-24': usedCount }
    existingOrders.forEach((order) => {
      const oStart = new Date(order.checkInDate);
      const oEnd = new Date(order.checkOutDate);
      const overlapStart = oStart > start ? oStart : start;
      const overlapEnd = oEnd < end ? oEnd : end;
      const orderCount = order.roomCount ? parseInt(order.roomCount, 10) || 1 : 1;

      eachDay(overlapStart, overlapEnd, (day) => {
        const key = formatDateKey(day);
        occupancy[key] = (occupancy[key] || 0) + orderCount;
      });
    });

    const insufficientDates = [];

    // 检查每一天是否有足够库存
    eachDay(start, end, (day) => {
      const key = formatDateKey(day);
      const used = occupancy[key] || 0;
      if (used + count > totalStock) {
        insufficientDates.push(key);
      }
    });

    if (insufficientDates.length > 0) {
      return ctx.body = successResponse({
        available: false,
        stock: totalStock,
        insufficientDates,
        message: `以下日期库存不足：${insufficientDates.join(', ')}`
      }, '库存不足');
    }

    ctx.body = successResponse({
      available: true,
      stock: totalStock
    }, '库存充足');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '检查库存失败');
  }
});

/**
 * @route GET /api/rooms/:id/inventory
 * @desc [商户] 查看指定房型在某个日期范围内的每日库存占用情况
 *       startDate / endDate 为可选，格式 YYYY-MM-DD，默认为今天起 7 天（含首尾）。
 */
router.get('/:id/inventory', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { id } = ctx.params;
    let { startDate, endDate } = ctx.request.query;

    // 校验房型归属权
    const room = await Room.findById(id).populate('hotelId');
    if (!room) {
      return ctx.body = errorResponse(404, '房型不存在');
    }

    const hotel = await Hotel.findOne({ _id: room.hotelId._id, merchantId: ctx.state.user.id });
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权查看该房型库存');
    }

    // 默认日期范围：今天起 7 天（含首尾）
    if (!startDate || !endDate) {
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + 6); // 共 7 天
      startDate = formatDateKey(today);
      endDate = formatDateKey(end);
    }

    const start = new Date(startDate);
    const endInclusive = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(endInclusive.getTime()) || endInclusive < start) {
      return ctx.body = errorResponse(400, '日期范围不合法');
    }

    // 将 end 转成半开区间的结束时间 [start, realEnd)
    const realEnd = new Date(endInclusive.getTime());
    realEnd.setDate(realEnd.getDate() + 1);

    const totalStock = room.stock || 0;

    // 查询与日期区间有重叠的订单（排除已取消）
    const existingOrders = await Order.find({
      roomId: id,
      status: { $ne: 'cancelled' },
      checkInDate: { $lt: realEnd },
      checkOutDate: { $gt: start }
    });

    const occupancy = {};
    existingOrders.forEach((order) => {
      const oStart = new Date(order.checkInDate);
      const oEnd = new Date(order.checkOutDate);
      const overlapStart = oStart > start ? oStart : start;
      const overlapEnd = oEnd < realEnd ? oEnd : realEnd;
      const orderCount = order.roomCount ? parseInt(order.roomCount, 10) || 1 : 1;

      eachDay(overlapStart, overlapEnd, (day) => {
        const key = formatDateKey(day);
        occupancy[key] = (occupancy[key] || 0) + orderCount;
      });
    });

    const list = [];
    eachDay(start, realEnd, (day) => {
      const key = formatDateKey(day);
      const booked = occupancy[key] || 0;
      const available = Math.max(totalStock - booked, 0);
      list.push({
        date: key,
        total: totalStock,
        booked,
        available
      });
    });

    ctx.body = successResponse({
      roomId: id,
      hotelId: room.hotelId._id,
      startDate: formatDateKey(start),
      endDate: formatDateKey(endInclusive),
      list
    });
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '获取库存明细失败');
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