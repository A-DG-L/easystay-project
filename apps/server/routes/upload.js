const Router = require('koa-router');
const path = require('path');
const fs = require('fs');

const router = new Router({ prefix: '/api/upload' });

/**
 * @route POST /api/upload
 * @desc 上传图片接口
 */
router.post('/', async (ctx) => {
  // 1. 获取上传的文件 (koa-body 会把文件放在 ctx.request.files 中)
  const file = ctx.request.files ? ctx.request.files.file : null; // 前端字段名需约定为 'file'

  if (!file) {
    ctx.body = { code: 400, msg: '未上传文件' };
    return;
  }

  // 2. 获取文件名 (koa-body 已经自动保存到了 public/uploads，我们只需要返回路径)
  // path.basename 获取路径中的最后一部分（即文件名）
  const basename = path.basename(file.filepath); 
  
  // 3. 生成访问 URL
  // 假设服务器地址是 localhost:3000，静态资源映射到了 /uploads
  // 这里的 ctx.origin 会自动获取当前的主机名 (如 http://localhost:3000)
  const url = `${ctx.origin}/uploads/${basename}`;

  ctx.body = {
    code: 200,
    data: { url }, // 返回给前端这个 URL，前端拿到后存入 Hotel 模型的 images 数组中
    msg: '上传成功'
  };
});

module.exports = router;