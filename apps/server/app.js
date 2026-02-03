require('dotenv').config(); // 1. 引入环境变量
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const mongoose = require('mongoose'); // 2. 引入 mongoose

const app = new Koa();
const router = new Router();

const authRoutes = require('./routes/auth');

// --- 数据库连接逻辑开始 ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ 数据库连接成功！(MongoDB Atlas)');
  })
  .catch((err) => {
    console.error('❌ 数据库连接失败:', err);
  });
// --- 数据库连接逻辑结束 ---

app.use(cors());
app.use(bodyParser());
app.use(authRoutes.routes()).use(authRoutes.allowedMethods());

// 简单的 API 规范封装
const successResponse = (data, msg = 'success') => ({
  code: 200,
  data: data,
  msg: msg
});

router.get('/', async (ctx) => {
  ctx.body = successResponse({ name: '易宿酒店API' }, '服务运行正常');
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 服务运行在 http://localhost:${PORT}`);
});