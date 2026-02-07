const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // 关联用户
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 关联酒店
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  
  // 关联订单 (核心：确保是“住后评价”的凭证)
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  
  // 评分 (1-5分)
  rating: { type: Number, required: true, min: 1, max: 5 },
  
  // 评论内容
  content: { type: String, required: true },
  
  // 评论图片 (可选)
  images: [{ type: String }],
  
  // 商家回复 (预留字段，后续商家可以在后台回复)
  reply: { type: String },

  createdAt: { type: Date, default: Date.now }
});

// 唯一索引：保证一个订单只能评价一次！
commentSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Comment', commentSchema);