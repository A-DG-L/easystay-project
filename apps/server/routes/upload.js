const Router = require('koa-router');
const path = require('path');
const fs = require('fs');
const Room = require('../models/Room');

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

  // 2. 获取原始扩展名，并生成一个带时间戳的文件名，避免冲突
  const ext = path.extname(file.originalFilename || '');
  const safeExt = ext || '.jpg';
  const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`;

  // koa-body 已经把文件保存到了 uploadDir 指定的目录（public/uploads），
  // 我们在该目录内重命名一次，使用我们生成的 filename
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  const newFilePath = path.join(uploadDir, filename);

  try {
    // file.filepath 是当前保存的完整路径
    fs.renameSync(file.filepath, newFilePath);
  } catch (err) {
    console.error('重命名上传文件失败:', err);
  }

  const basename = filename;

  // 3. 只返回相对路径，让前端在各自环境下拼接完整域名
  // 例如：/uploads/xxxxx.jpg
  const url = `/uploads/${basename}`;

  ctx.body = {
    code: 200,
    data: { url }, // 返回给前端这个 URL，前端拿到后存入 Hotel 模型的 images 数组中
    msg: '上传成功'
  };
});

/**
 * @route DELETE /api/upload
 * @desc 删除图片：同时删除本地文件，并清理房型中引用的 imageUrl
 * @body { url: string }
 */
router.delete('/', async (ctx) => {
  const { url } = ctx.request.body || {};

  if (!url) {
    ctx.body = { code: 400, msg: '缺少图片 URL' };
    return;
  }

  try {
    // 提取文件名
    const filename = path.basename(url);
    const filePath = path.join(__dirname, '..', 'public', 'uploads', filename);

    // 删除本地文件（如果存在）
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 清理房型中引用该图片的记录
    await Room.updateMany({ imageUrl: url }, { $unset: { imageUrl: '' } });

    ctx.body = { code: 200, data: null, msg: '图片已删除' };
  } catch (err) {
    console.error('删除图片失败:', err);
    ctx.body = { code: 500, data: null, msg: '删除图片失败' };
  }
});

module.exports = router;