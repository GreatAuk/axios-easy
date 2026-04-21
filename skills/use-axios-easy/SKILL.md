---
name: use-axios-easy
description: 指导开发者在项目中集成和使用 axios-easy 库。当用户询问如何使用 axios-easy、如何配置拦截器、如何创建请求客户端、如何处理认证/错误/响应等 HTTP 请求相关问题时，必须使用此 skill。即使用户只是问"怎么用"或"帮我配置一下请求"，也应该触发此 skill。
---

# 使用 axios-easy

## 重要：先读文档

在回答任何关于 axios-easy 的问题之前，**必须先读取项目中的文档**：

```
node_modules/axios-easy/README.md
```

这是最权威的文档来源，包含所有 API 的完整类型定义和使用示例。

---

## 库的定位

`axios-easy` 是一个**模块化、可组合**的 axios 增强库，通过一系列独立拦截器来标准化 HTTP 请求/响应处理。所有拦截器支持按需导入（Tree-Shakable）。

---

## 两种集成方式

### 方式一：手动组合拦截器（推荐，灵活度高）

适合需要精细控制每个拦截器的场景。

```ts
import axios from 'axios';
import { createDefaultRequestInterceptor } from 'axios-easy/default-request-interceptor';
import { createDefaultResponseInterceptor } from 'axios-easy/default-response-interceptor';
import { createAuthenticateInterceptor } from 'axios-easy/authenticate-interceptor';
import { createErrorMessageInterceptor } from 'axios-easy/error-message-interceptor';

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  responseReturn: 'body', // 扩展属性：控制响应返回格式
  errorMessageMode: 'message', // 扩展属性：控制错误提示方式
  timeout: 30000,
});

// 按需添加拦截器（顺序很重要）
createDefaultRequestInterceptor(axiosInstance, { ... });
createDefaultResponseInterceptor(axiosInstance, { ... });
createAuthenticateInterceptor(axiosInstance, { ... });
createErrorMessageInterceptor(axiosInstance, { ... });
```

### 方式二：createRequestClient 工厂（快速上手）

一个函数搞定所有拦截器，适合快速接入。

```ts
import { createRequestClient } from 'axios-easy/create-request-client';

const { axiosInstance, request } = createRequestClient({
  axiosConfig: { baseURL: '...', timeout: 30000 },
  defaultRequest: true,
  defaultResponse: { codeField: 'code', dataField: 'data', successCode: 0 },
  authenticate: (instance) => ({ ... }),
  errorMessage: { handler: (error, networkErrMsg) => { ... } },
  setup: (client) => { /* 挂载自定义拦截器或第三方插件 */ },
});
```

---

## 核心拦截器速查

| 拦截器 | 导入路径 | 主要功能 |
|--------|----------|----------|
| 默认请求 | `axios-easy/default-request-interceptor` | 下载超时延长、请求参数规范化（trim/去undefined/空串转null） |
| 默认响应 | `axios-easy/default-response-interceptor` | 自动解包响应体、业务成功码判断、控制返回格式 |
| 认证 | `axios-easy/authenticate-interceptor` | 401处理、无感刷新 Token |
| 错误提示 | `axios-easy/error-message-interceptor` | 统一错误信息展示、中英文国际化 |
| 参数序列化 | `axios-easy/params-serializer-interceptor` | qs 序列化（一般不需要） |

---

## 关键扩展类型

axios-easy 为 `AxiosRequestConfig` 扩展了以下配置项，可在每个请求中单独覆盖：

- `responseReturn?: 'raw' | 'body' | 'data'` — 控制响应返回格式
- `errorMessageMode?: 'message' | 'modal' | 'none'` — 控制错误提示方式
- `errorMessageLanguage?: 'zh' | 'en'` — 单次请求的错误语言
- `normalizePayload?: { trim, dropUndefined, emptyStringToNull }` — 单次请求的参数规范化

---

## 工具函数（axios-easy/utils）

- `processFileStream(response, options)` — 处理文件下载，自动判断是流还是JSON错误
- `getFilenameFromContentDisposition(header)` — 从响应头解析文件名
- `saveAs(blob, fileName)` — 触发浏览器下载（file-saver 的重导出）
- `normalizeRequestPayload(payload, options)` — 手动规范化请求参数

---

## 集成建议

1. **先确认后端的响应数据结构**（`codeField`、`dataField`、`successCode` 的值），这是配置 `defaultResponse` 拦截器的前提。
2. **按需选择拦截器**，不需要的功能不用引入。
3. **错误提示依赖 UI 组件库**（如 Element Plus、Ant Design Vue），需要在 `errorMessage.handler` 中调用相应组件。
4. **无感刷新 Token** 需要后端配合提供 refresh token 接口。
5. **文件下载**建议搭配 `responseReturn: 'raw'` + `processFileStream` 使用。
