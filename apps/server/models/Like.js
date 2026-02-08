const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  // 谁收藏的
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 收藏了哪个酒店
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  
  // 收藏时间
  createdAt: { type: Date, default: Date.now }
});

// 创建复合索引：确保同一个用户对同一个酒店只能收藏一次，方便查询
likeSchema.index({ userId: 1, hotelId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);