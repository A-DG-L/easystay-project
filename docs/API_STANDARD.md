# 易宿酒店项目 API 开发规范

## 1. 基础信息
- **Base URL**: http://localhost:3000
- **Content-Type**: application/json

## 2. 统一响应格式 (Response Structure)
后端所有接口必须严格遵守以下 JSON 格式返回：

```json
{
  "code": 200,      // 业务状态码：200 成功，非 200 失败
  "data": { ... },  // 数据载体，对象或数组
  "msg": "操作成功"  // 提示信息，用于展示给用户或调试
}