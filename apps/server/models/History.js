const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  
  // 浏览时间 (每次浏览都会更新这个时间)
  updatedAt: { type: Date, default: Date.now }
});

// 索引：方便按时间倒序查询
historySchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('History', historySchema);