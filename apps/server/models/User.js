const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'merchant', 'admin'], 
    default: 'user' 
  },
  // [新增] 头像字段，存储图片 URL
  avatar: { type: String, default: '' },
  // [新增] 昵称 (有时候 username 是账号，用户想显示别的名字)
  nickname: { type: String },
  
  phoneNumber: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);