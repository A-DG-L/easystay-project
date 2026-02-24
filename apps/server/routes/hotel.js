const Router = require('koa-router');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const Order = require('../models/Order');
const { authMiddleware, isMerchant, isAdmin } = require('../middleware/auth');

const router = new Router({ prefix: '/api/hotels' });

const successResponse = (data, msg = 'success') => ({ code: 200, data, msg });
const errorResponse = (code = 400, msg = 'error') => ({ code, data: null, msg });

/**
 * @route POST /api/hotels
 * @desc [商户] 创建/录入酒店信息
 * @cite source: 103
 */
router.post('/', authMiddleware, isMerchant, async (ctx) => {
  try {
    //const { name, address, starLevel, description, facilities, images } = ctx.request.body;
    // 建议修改为：
    const { 
      name, address, starLevel, openingTime, 
      description, facilities, images, minPrice, score ,rejectReason
    } = ctx.request.body;
    const merchantId = ctx.state.user.id; // 从 Token 获取商户ID

    const newHotel = new Hotel({
      merchantId,
      name,
      address,
      starLevel,
      description,
      facilities,
      minPrice,
      images,
      openingTime,
      status: 'pending', // 默认为审核中 [cite: 36]
      rejectReason,
      score
    });

    const savedHotel = await newHotel.save();
    ctx.body = successResponse(savedHotel, '酒店已提交，等待审核');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '创建酒店失败');
  }
});

/**
 * @route GET /api/hotels/my-hotels
 * @desc [商户] 获取自己发布的酒店列表
 */
router.get('/my-hotels', authMiddleware, isMerchant, async (ctx) => {
  try {
    const merchantId = ctx.state.user.id;

    // 1. 先查出当前商户的所有酒店
    const hotels = await Hotel.find({ merchantId }).sort({ _id: -1 });

    if (!hotels.length) {
      return ctx.body = successResponse([]);
    }

    const hotelIds = hotels.map(hotel => hotel._id);

    // 2. 统计每个酒店的房型数和订单数
    const [roomStats, orderStats] = await Promise.all([
      // 统计房型数量
      Room.aggregate([
        { $match: { hotelId: { $in: hotelIds } } },
        { $group: { _id: '$hotelId', count: { $sum: 1 } } }
      ]),
      // 统计订单数量
      Order.aggregate([
        { $match: { hotelId: { $in: hotelIds } } },
        { $group: { _id: '$hotelId', count: { $sum: 1 } } }
      ])
    ]);

    const roomCountMap = new Map(roomStats.map(item => [String(item._id), item.count]));
    const orderCountMap = new Map(orderStats.map(item => [String(item._id), item.count]));

    // 3. 把统计结果合并到返回数据中，供管理端显示
    const result = hotels.map(hotel => {
      const obj = hotel.toObject();
      const key = String(hotel._id);
      return {
        ...obj,
        roomCount: roomCountMap.get(key) || 0,
        orderCount: orderCountMap.get(key) || 0
      };
    });

    ctx.body = successResponse(result);
  } catch (err) {
    ctx.body = errorResponse(500, '获取列表失败');
  }
});

/**
 * @route GET /api/hotels/pending
 * @desc [管理员] 获取所有待审核的酒店
 * 注意：必须放在 router.get('/') 之前，否则会被 / 路由捕获
 */
router.get('/pending', authMiddleware, isAdmin, async (ctx) => {
  try {
    // 建议修改：按 _id 排序 (MongoDB的_id包含时间戳) 或者按 openingTime
    // 如果你的 Schema 里配置了 timestamps: true，那么 createdAt 会自动生成，否则建议改用 _id
    const hotels = await Hotel.find({ status: 'pending' })
      .sort({ _id: -1 }); // -1 为倒序(最新的在前面)，1 为正序
      
    ctx.body = successResponse(hotels);
  } catch (err) {
    console.error(err); // 加上 console.error 方便在服务端控制台看报错
    ctx.body = errorResponse(500, '获取待审核列表失败');
  }
});

/**
 * @route GET /api/hotels
 * @desc [用户] 酒店列表/搜索 (支持分页、关键词、星级筛选)
 * @cite source: 113
 */
router.get('/', async (ctx) => {
  try {
    const { keyword, starLevel, minPrice, maxPrice, page = 1, pageSize = 10 } = ctx.request.query;
    
    // 构建查询条件：只显示“已发布”的酒店
    let query = { status: 'published' };

    // 关键词搜索 (匹配名称或地址)
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 星级筛选
    if (starLevel) {
      query.starLevel = starLevel;
    }

    // 分页计算
    const skip = (page - 1) * pageSize;
    
    // 查询数据库
    const hotels = await Hotel.find(query)
      .skip(skip)
      .limit(parseInt(pageSize))
      .sort({ score: -1 }); // 按评分排序

    const total = await Hotel.countDocuments(query);

    ctx.body = successResponse({ list: hotels, total, page, pageSize });
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '查询失败');
  }
});


/**
 * @route PUT /api/hotels/:id
 * @desc [商户] 更新酒店信息
 */
router.put('/:id', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { id } = ctx.params;
    const merchantId = ctx.state.user.id;
    const updateData = ctx.request.body;

    // 检查酒店归属权
    const hotel = await Hotel.findOne({ _id: id, merchantId });
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权操作此酒店');
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
      id,
      { ...updateData, merchantId }, // 保持merchantId不变
      { new: true }
    );

    ctx.body = successResponse(updatedHotel, '更新成功');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '更新失败');
  }
});

/**
 * @route DELETE /api/hotels/:id
 * @desc [商户] 删除酒店
 */
router.delete('/:id', authMiddleware, isMerchant, async (ctx) => {
  try {
    const { id } = ctx.params;
    const merchantId = ctx.state.user.id;

    // 检查酒店归属权
    const hotel = await Hotel.findOne({ _id: id, merchantId });
    if (!hotel) {
      return ctx.body = errorResponse(403, '无权操作此酒店');
    }

    await Hotel.findByIdAndDelete(id);
    ctx.body = successResponse(null, '删除成功');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '删除失败');
  }
});



/**
 * @route GET /api/hotels/:id
 * @desc [用户/通用] 获取酒店详情
 * @cite source: 100
 */
router.get('/:id', async (ctx) => {
  try {
    const hotel = await Hotel.findById(ctx.params.id).populate('merchantId', 'username');
    if (!hotel) return ctx.body = errorResponse(404, '酒店不存在');
    ctx.body = successResponse(hotel);
  } catch (err) {
    ctx.body = errorResponse(500, '获取详情失败');
  }
});

/**
 * @route PATCH /api/hotels/:id/status
 * @desc [管理员] 审核酒店 (通过/拒绝/下线)
 */
router.patch('/:id/status', authMiddleware, isAdmin, async (ctx) => {
  try {
    const { status, rejectReason } = ctx.request.body;
    
    // 1. 修改这里：把 'rejected' 加入允许的列表
    const allowedStatuses = ['published', 'offline', 'pending', 'rejected'];
    
    if (!allowedStatuses.includes(status)) {
      return ctx.body = errorResponse(400, '无效的状态值'); // 这里就是你遇到的报错
    }

    const updateData = { status };

    // 2. 修改这里：如果是 'offline' 或者 'rejected'，都允许保存拒绝/下线理由
    if ((status === 'offline' || status === 'rejected') && rejectReason) {
      updateData.rejectReason = rejectReason;
    }

    // 如果状态变成了 rejected，建议清空 rejectReason 以外的敏感字段，或者保持原样也可
    // 这里保持原样即可

    const updatedHotel = await Hotel.findByIdAndUpdate(
      ctx.params.id, 
      updateData, 
      { new: true }
    );

    ctx.body = successResponse(updatedHotel, '审核状态已更新');
  } catch (err) {
    console.error(err);
    ctx.body = errorResponse(500, '审核操作失败');
  }
});

module.exports = router;