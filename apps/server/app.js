const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const app = new Koa();
const router = new Router();

// 1. 中间件配置
app.use(cors()); // 允许跨域
app.use(bodyParser());

// 2. 定义统一的 API 返回格式 
// 我们封装一个工具函数，或者在每个接口里手动写
const successResponse = (data, msg = 'success') => ({
  code: 200,
  data: data,
  msg: msg
});

const errorResponse = (code = 500, msg = 'error') => ({
  code: code,
  data: null,
  msg: msg
});

// 3. 测试接口
router.get('/', async (ctx) => {
  ctx.body = successResponse({ name: '易宿酒店API' }, '服务运行正常');
});

// 4. 启动服务
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});