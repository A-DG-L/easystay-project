const Router = require('koa-router');
const Hotel = require('../models/Hotel');
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
    const hotels = await Hotel.find({ merchantId }).sort({ createdAt: -1 });
    ctx.body = successResponse(hotels);
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
    // 只查询 status 为 pending 的酒店
    const hotels = await Hotel.find({ status: 'pending' })
      .sort({ createdAt: 1 }); // 按申请时间正序排列（先申请的先审）
    ctx.body = successResponse(hotels);
  } catch (err) {
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
 * @cite source: 116
 */
router.patch('/:id/status', authMiddleware, isAdmin, async (ctx) => {
  try {
    const { status, rejectReason } = ctx.request.body;
    
    // 校验状态值
    if (!['published', 'offline', 'pending'].includes(status)) {
      return ctx.body = errorResponse(400, '无效的状态值');
    }

    const updateData = { status };
    if (status === 'offline' && rejectReason) {
      updateData.rejectReason = rejectReason;
    }

    const updatedHotel = await Hotel.findByIdAndUpdate(
      ctx.params.id, 
      updateData, 
      { new: true }
    );

    ctx.body = successResponse(updatedHotel, '审核状态已更新');
  } catch (err) {
    ctx.body = errorResponse(500, '审核操作失败');
  }
});

module.exports = router;