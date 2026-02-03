const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  // 关联发布该酒店的商户ID
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  name: { type: String, required: true }, // 酒店名
  address: { type: String, required: true }, // 地址
  starLevel: { type: Number, min: 1, max: 5 }, // 星级
  openingTime: { type: String }, // 开业时间 (如 "2020年")
  
  // 酒店描述/介绍
  description: { type: String },
  
  // 图片列表 (存储图片 URL)
  images: [{ type: String }],
  
  // 设施 (如：免费Wifi, 停车场) - 文档中的“快捷标签” [cite: 63]
  facilities: [{ type: String }],
  
  // 状态管理：pending(审核中), published(已发布/审核通过), offline(已下线/审核不通过)
  status: { 
    type: String, 
    enum: ['pending', 'published', 'offline'], 
    default: 'pending' 
  },
  
  // 如果审核不通过，管理员填写的拒绝原因 [cite: 66]
  rejectReason: { type: String, default: '' },
  
  // 评分 (文档提到酒店列表要有评分)
  score: { type: Number, default: 4.5 }
});

module.exports = mongoose.model('Hotel', hotelSchema);