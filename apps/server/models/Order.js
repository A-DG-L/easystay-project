const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // 关联下单用户
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 冗余存储酒店ID，方便查询
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  
  // 关联预订的房型
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  
  // 订单详情
  checkInDate: { type: Date, required: true },  // 入住日期
  checkOutDate: { type: Date, required: true }, // 离店日期
  totalPrice: { type: Number, required: true }, // 总价
  // 预订间数（房间数量）
  roomCount: { type: Number, default: 1 },
  // 入住晚数，便于统计和展示
  nights: { type: Number, default: 1 },
  
  // 入住人信息 (根据文档 Source 247: "填入住人信息")
  guestName: { type: String, required: true },
  guestPhone: { type: String, required: true },

  // 订单状态: pending(待支付), paid(已支付/已预订), cancelled(已取消), completed(已入住/完成)
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'cancelled', 'completed'], 
    default: 'pending' 
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);