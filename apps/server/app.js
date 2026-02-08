require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
// const bodyParser = require('koa-bodyparser'); // [删除或注释掉这一行]
const { koaBody } = require('koa-body');        // [新增] 引入 koa-body
const serve = require('koa-static');            // [新增] 引入静态资源服务
const cors = require('@koa/cors');
const mongoose = require('mongoose');
const path = require('path');                   // [新增] 引入 path 模块

const app = new Koa();
const router = new Router();

const authRoutes = require('./routes/auth');
const hotelRoutes = require('./routes/hotel');
const roomRoutes = require('./routes/room');
const uploadRoutes = require('./routes/upload'); 
const orderRoutes = require('./routes/orders');
const likeRoutes = require('./routes/like');       
const historyRoutes = require('./routes/history');
const commentRoutes = require('./routes/comment');
const userRoutes = require('./routes/user');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ 数据库连接成功！(MongoDB Atlas)'))
  .catch((err) => console.error('❌ 数据库连接失败:', err));

app.use(cors());

// [修改] 使用 koa-body 替代 bodyparser，开启文件上传支持
app.use(koaBody({
  multipart: true, // 支持文件上传
  formidable: {
    uploadDir: path.join(__dirname, 'public/uploads'), // 上传目录
    keepExtensions: true, // 保留文件扩展名
    maxFileSize: 5 * 1024 * 1024, // 限制文件大小为 5MB
  }
}));

// [新增] 开启静态资源服务，这样前端才能通过 http://localhost:3000/uploads/xxx.jpg 访问图片
app.use(serve(path.join(__dirname, 'public')));

// 注册路由
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(hotelRoutes.routes()).use(hotelRoutes.allowedMethods());
app.use(roomRoutes.routes()).use(roomRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods()); 
app.use(orderRoutes.routes()).use(orderRoutes.allowedMethods());
app.use(likeRoutes.routes()).use(likeRoutes.allowedMethods());       
app.use(historyRoutes.routes()).use(historyRoutes.allowedMethods());
app.use(commentRoutes.routes()).use(commentRoutes.allowedMethods());
app.use(userRoutes.routes()).use(userRoutes.allowedMethods());

// ... 这里的 successResponse 和 根路由保持不变 ...

// 注册主路由
app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`);
});