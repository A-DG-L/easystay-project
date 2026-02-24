const Router = require('koa-router');
const Order = require('../models/Order');
const Room = require('../models/Room');
const { authMiddleware } = require('../middleware/auth'); // 必须登录才能下单

const router = new Router({ prefix: '/api/orders' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

// 工具函数：按天遍历日期区间 [start, end)
const eachDay = (start, end, cb) => {
  const cur = new Date(start.getTime());
  while (cur < end) {
    cb(new Date(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }
};

const formatDateKey = (date) => date.toISOString().split('T')[0];

/**
 * @route POST /api/orders
 * @desc [用户] 创建订单 (下单，库存按日期由订单记录推导，不再直接扣减 Room.stock)
 * @cite source: 246 "下单接口 POST /create。扣减房型库存"（已调整为按日期校验）
 */
router.post('/', authMiddleware, async (ctx) => {
  try {
    const { roomId, hotelId, checkInDate, checkOutDate, totalPrice, guestName, guestPhone, roomCount, nights } = ctx.request.body;
    const userId = ctx.state.user.id;

    // 1. 检查参数
    if (!roomId || !hotelId || !checkInDate || !checkOutDate) {
      return ctx.body = errorResponse(400, '参数不完整');
    }

    // 2. 计算本次预订的间数（至少为 1 间）
    const count = Math.max(1, parseInt(roomCount, 10) || 1);

    // 3. 按日期校验库存（不直接修改 Room.stock）
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return ctx.body = errorResponse(400, '入住/离店日期不合法');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return ctx.body = errorResponse(404, '房型不存在');
    }

    const totalStock = room.stock || 0;
    if (totalStock <= 0) {
      return ctx.body = errorResponse(400, '该房型暂无可售房量');
    }

    const existingOrders = await Order.find({
      roomId,
      status: { $ne: 'cancelled' },
      checkInDate: { $lt: end },
      checkOutDate: { $gt: start }
    });

    const occupancy = {};
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

    let canBook = true;
    eachDay(start, end, (day) => {
      const key = formatDateKey(day);
      const used = occupancy[key] || 0;
      if (used + count > totalStock) {
        canBook = false;
      }
    });

    if (!canBook) {
      return ctx.body = errorResponse(400, '该房型在所选日期内库存不足');
    }

    // 4. 创建订单
    const newOrder = new Order({
      userId,
      hotelId,
      roomId,
      checkInDate,
      checkOutDate,
      totalPrice,
      roomCount: count,
      nights: Math.max(1, parseInt(nights, 10) || 1),
      guestName,
      guestPhone,
      status: 'pending' // 默认为待支付
    });

    await newOrder.save();

    ctx.body = successResponse(newOrder, '下单成功，请尽快支付');

  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '创建订单失败');
  }
});

/**
 * @route GET /api/orders
 * @desc [用户] 获取“我的订单”列表
 * @cite source: 247 "我的订单页：展示历史订单状态"
 */
router.get('/', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // 查询该用户的所有订单，并按时间倒序排列
    // populate 用于把 hotelId 和 roomId 变成具体的对象，方便前端显示酒店名和房型名
    const orders = await Order.find({ userId })
      .populate('hotelId', 'name address') // 只取酒店的 name 和 address
      .populate('roomId', 'name price')    // 只取房型的 name 和 price
      .sort({ createdAt: -1 });

    ctx.body = successResponse(orders);
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '获取订单列表失败');
  }
});

/**
 * @route POST /api/orders/:id/pay
 * @desc [用户] 模拟支付
 * @cite source: 247 "支付直接模拟(点按钮即成功)"
 */
router.post('/:id/pay', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const orderId = ctx.params.id;

    // 查找属于该用户的订单
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return ctx.body = errorResponse(404, '订单不存在');
    }

    if (order.status !== 'pending') {
      return ctx.body = errorResponse(400, '订单状态无法支付');
    }

    // 更新状态为已支付
    order.status = 'paid';
    await order.save();

    ctx.body = successResponse(order, '支付成功');
  } catch (err) {
    ctx.body = errorResponse(500, '支付操作失败');
  }
});

/**
 * @route POST /api/orders/:id/cancel
 * @desc [用户] 取消订单 (可选功能：回滚库存)
 */
router.post('/:id/cancel', authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const order = await Order.findOne({ _id: ctx.params.id, userId });

    if (!order) return ctx.body = errorResponse(404, '订单不存在');
    if (order.status === 'cancelled') return ctx.body = errorResponse(400, '订单已取消');

    // 1. 更新订单状态
    order.status = 'cancelled';
    await order.save();

    // 不再直接回滚 Room.stock，库存由订单记录和房型总房量推导
    ctx.body = successResponse(null, '订单已取消');
  } catch (err) {
    ctx.body = errorResponse(500, '取消失败');
  }
});

module.exports = router;