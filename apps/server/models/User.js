const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // 实际项目中应加密存储
  // 角色区分：user(普通用户), merchant(商户), admin(管理员)
  role: { 
    type: String, 
    enum: ['user', 'merchant', 'admin'], 
    default: 'user' 
  },
  phoneNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);