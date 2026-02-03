const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  // 关联所属酒店
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  
  name: { type: String, required: true }, // 房型名 (如：豪华双床房)
  price: { type: Number, required: true }, // 价格
  stock: { type: Number, default: 10 },    // 剩余房间数
  size: { type: String },                  // 面积 (如 "25m²")
  capacity: { type: Number, default: 2 },  // 可住人数
  
  // 房型图片
  imageUrl: { type: String }
});

module.exports = mongoose.model('Room', roomSchema);