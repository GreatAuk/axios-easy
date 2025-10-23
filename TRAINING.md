# `axios-easy` 库内部培训文档

## 目录

1.  [**引言：`axios-easy` 是什么？**](#1-引言axios-easy-是什么)
    *   [它解决了什么问题？](#它解决了什么问题)
    *   [核心设计理念](#核心设计理念)
2.  [**快速上手：两种集成模式**](#2-快速上手两种集成模式)
    *   [模式一：工厂函数 `createRequestClient` (推荐)](#模式一工厂函数-createrequestclient-推荐)
    *   [模式二：模块化组装 (搭积木)](#模式二模块化组装-搭积木)
3.  [**核心功能深度解析：拦截器篇**](#3-核心功能深度解析拦截器篇)
    *   [**`default-request-interceptor`**: 请求预处理器](#default-request-interceptor-请求预处理器)
    *   [**`default-response-interceptor`**: 响应数据标准化](#default-response-interceptor-响应数据标准化)
    *   [**`error-message-interceptor`**: 统一错误处理与提示](#error-message-interceptor-统一错误处理与提示)
    *   [**`authenticate-interceptor`**: 优雅的认证与 Token 刷新](#authenticate-interceptor-优雅的认证与-token-刷新)
    *   [**`params-serializer-interceptor`**: URL 参数序列化专家](#params-serializer-interceptor-url-参数序列化专家)
4.  [**高级用法与工具函数**](#4-高级用法与工具函数)
    *   [**`processFileStream`**: 智能文件流处理](#processfilestream-智能文件流处理)
    *   [其他工具函数 (`getFilenameFromContentDisposition`, `normalizeRequestPayload`)](#其他工具函数)
5.  [**最佳实践与 Q&A**](#5-最佳实践与-qa)
    *   [如何选择集成模式？](#如何选择集成模式)
    *   [如何处理个别接口的特殊逻辑？](#如何处理个别接口的特殊逻辑)
    *   [如何配合 UI 库进行错误提示？](#如何配合-ui-库进行错误提示)

---

## 1. 引言：`axios-easy` 是什么？

`axios-easy` 是一个基于 `axios` 的模块化、类型友好的 TypeScript 库。它并非要取代 `axios`，而是通过一系列**可组合、可插拔**的拦截器和工具函数, 极大地简化和标准化了项目中的 HTTP 请求处理逻辑。

### 它解决了什么问题？

在传统的 `axios` 使用中, 我们经常需要在每个项目中重复编写以下逻辑:

*   **Header 处理**：在请求头中附加 `Authorization `等。
*   **响应数据解包**：从 `res.data.data` 中提取核心数据。
*   **业务错误判断**：检查 `res.data.code` 是否为成功状态。
*   **统一错误提示**：网络错误、超时、404/500、业务失败等情况下的全局提示。
*   **登录状态失效**：处理 401 状态码, 实现 Token 刷新或跳转登录页。
*   **请求参数格式化**：去除前后空格、处理 `undefined` 值等。
*   **文件下载**：处理二进制流, 从响应头获取文件名。

`axios-easy` 将这些通用场景的最佳实践封装成了独立的模块, 让我们无需重复造轮子, 只需几行配置即可拥有一个功能完备、稳定可靠的请求层。

### 核心设计理念

*   **🔌 高度可组合 (Composable)**: 像乐高积木一样, 你可以按需引入和组合不同的拦截器, 只添加你需要的功能。
*   **🌳 Tree-Shakable**: 所有模块都支持按需加载, 确保最终打包体积最小化。
*   **💧 类型友好 (Type-Friendly)**: 完整的 TypeScript 类型定义, 配合 `AxiosRequestConfig` 类型扩展, 提供卓越的编码体验和静态检查能力。
*   **👌 简单透明**: API 设计简洁直观, 底层完全基于 `axios` 拦截器实现, 没有黑魔法, 源码简单易懂, 方便排查问题和二次开发。

## 2. 快速上手：两种集成模式

`axios-easy` 提供了两种灵活的集成方式, 你可以根据项目需求和个人偏好选择。

### 模式一：工厂函数 `createRequestClient` (推荐)

这是最简单、最快的方式。一个函数即可创建一个预设了所有核心拦截器的 `axios` 实例。

**适用场景**：新项目启动, 或希望快速获得一套完整、标准化的请求解决方案。

**示例代码**：

```typescript
// src/utils/request.ts
import { createRequestClient } from 'axios-easy/create-request-client';
import type { AxiosError, AxiosResponse } from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus'; // 假设使用 Element Plus

// 假设后端接口返回的数据结构
type ApiResponse<T> = {
  resultCode: 'SUCCESS' | 'FAIL';
  data: T;
  errorCode?: string;
  errorCodeDes?: string;
};

// 和后端约定好的登录失效错误码
const AUTH_ERROR_CODES = ['TOKEN_TIMEOUT', 'KICK_OUT'];

const { axiosInstance, request, setGlobalLanguage } = createRequestClient({
  // 1. 基础 Axios 配置
  axiosConfig: {
    baseURL: '/api',
    timeout: 30 * 1000,
  },

  // 2. 开启默认请求拦截器 (处理下载超时、参数规范化)
  defaultRequest: {
    extendTimeoutWhenDownload: true,
    normalizePayload: { trim: true, dropUndefined: true, emptyStringToNull: true },
  },

  // 3. 配置默认响应拦截器 (解包数据、判断业务成功)
  defaultResponse: {
    codeField: 'resultCode',
    dataField: 'data',
    successCode: 'SUCCESS',
    isThrowWhenFail: true, // 业务失败时抛出错误, 进入 catch 块
  },

  // 4. 配置认证拦截器 (处理 401 和 Token 刷新)
  authenticate: (instance) => ({
    isAuthenticateFailed: (error) => {
      const errorCode = error.response?.data?.errorCode;
      return error.response?.status === 401 || (errorCode ? AUTH_ERROR_CODES.includes(errorCode) : false);
    },
    doReAuthenticate: async () => {
      // 清理用户信息, 跳转登录页
      console.log('认证失败, 跳转登录页');
      window.location.href = '/login';
    },
    enableRefreshToken: true, // 启用无感刷新
    doRefreshToken: async () => {
      // 实现刷新 token 的逻辑
      const res = await instance.post('/refresh-token', {
        refreshToken: localStorage.getItem('refresh_token'),
      });
      const { token, refreshToken } = res.data;
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refreshToken);
    },
  }),

  // 5. 配置错误消息拦截器 (统一弹窗提示)
  errorMessage: {
    handler: (errorResponse, networkErrMsg) => {
      const errorMessage = errorResponse.data?.errorCodeDes || networkErrMsg || '未知错误';
      if (errorResponse.config?.errorMessageMode === 'modal') {
        ElMessageBox.alert(errorMessage, '错误提示', { type: 'error' });
      } else if (errorResponse.config?.errorMessageMode !== 'none') {
        ElMessage.error(errorMessage);
      }
    },
    defaultLanguage: 'zh',
  },

  // 6. 自定义设置 (例如: 添加业务 Token)
  setup: (client) => {
    client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  },
});

export default request;
export { axiosInstance, setGlobalLanguage };
```

### 模式二：模块化组装 (搭积木)

如果你需要更高的定制性, 或者想在现有 `axios` 实例上逐步增强功能, 可以选择此模式。

**适用场景**：老项目改造, 或需要与其他 `axios` 插件（如 `axios-retry`）深度整合。

**示例代码**：

```typescript
// src/utils/request.ts
import axios from 'axios';
import { createDefaultRequestInterceptor } from 'axios-easy/default-request-interceptor';
import { createDefaultResponseInterceptor } from 'axios-easy/default-response-interceptor';
import { createAuthenticateInterceptor } from 'axios-easy/authenticate-interceptor';
import { createErrorMessageInterceptor } from 'axios-easy/error-message-interceptor';
// ... 其他导入

// 1. 创建原生 Axios 实例
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30 * 1000,
});

// 2. 添加业务 Token 拦截器 (这是你自己的业务逻辑)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. 按需应用 axios-easy 的拦截器
createDefaultRequestInterceptor(axiosInstance, { /* ...配置... */ });
createDefaultResponseInterceptor(axiosInstance, { /* ...配置... */ });
createAuthenticateInterceptor(axiosInstance, { /* ...配置... */ });
createErrorMessageInterceptor(axiosInstance, { /* ...配置... */ });

// 4. 如果需要, 还可以集成第三方库
// import axiosRetry from 'axios-retry';
// axiosRetry(axiosInstance, { retries: 3 });

export default axiosInstance;
```
