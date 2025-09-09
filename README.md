# simple-axios

[![npm version](https://img.shields.io/npm/v/simple-axios.svg)](https://www.npmjs.com/package/simple-axios)
[![license](https://img.shields.io/npm/l/simple-axios.svg)](https://github.com/GreatAuk/simple-axios/blob/main/LICENSE)

`simple-axios` 是一个为 [axios](https://axios-http.com/) 设计的轻量级工具函数库。它通过提供一系列即插即用的 `axios` 拦截器(没有其他黑科技)，帮助你优雅地处理请求和响应的通用逻辑，让你的代码更整洁、更易于维护。

## ✨ 特性

- **🔌 高度可组合**: 提供独立的拦截器，你可以像乐高积木一样按需组合，只添加你需要的功能。
- **🌳 Tree-Shakable**: 所有工具和拦截器都支持按需加载，确保最终打包体积最小化。
- **🚀 功能强大**: 内置认证、响应格式化、错误处理、请求重试（集成的第三方）、文件下载等常用场景的最佳实践。
- **💧 类型友好**: 使用 TypeScript 编写，提供完整的类型定义，带来卓越的开发体验。
- **👌 使用简单**: API 设计简洁直观，只需几行代码即可集成到你的项目中，没有其他黑科技，只是通过 `axios` 拦截器来实现，源码简单易懂。

## 📦 安装

```bash
pnpm install simple-axios
# or
npm install simple-axios
# or
yarn add simple-axios
```

## 📊 一个请求的流程

```mermaid
graph TD
    subgraph 发起请求前
        modify_request_header[<i class='fa fa-edit'></i> 修改请求头]
        configure_user_id[<i class='fa fa-user'></i> 配置用户标识]
    end

    subgraph 请求处理后
        handle_network_error[<i class='fa fa-unlink'></i> 网络错误处理]
        handle_authorization_error[<i class='fa fa-shield'></i> 授权错误处理]
        retry_on_exception[<i class='fa fa-refresh'></i> 异常请求重试]
        handle_general_error[<i class='fa fa-exclamation-triangle'></i> 普通错误处理]
    end

    call_function[<i class='fa fa-cogs'></i> 调用请求函数] --> handle_params[<i class='fa fa-sliders'></i> 请求参数处理]
    handle_params --> modify_request_header
    configure_user_id --> initiate_request[<i class='fa fa-paper-plane'></i> 发起请求]
    modify_request_header --> configure_user_id
    initiate_request --> handle_network_error
    handle_network_error --> handle_authorization_error
    handle_authorization_error --> retry_on_exception
    retry_on_exception --> handle_general_error
    handle_general_error --> request_completed[<i class='fa fa-check-circle'></i> 请求完成]
    request_completed --> return_params[<i class='fa fa-sliders'></i> 返回参数处理]

    classDef normal fill:#fff,stroke:#44b6a9,stroke-width:2px,color:#333
    classDef subprocess fill:#fff,stroke:#44b6a9,stroke-width:2px,color:#333
    classDef box fill:#e0f5f5,stroke:#44b6a9,stroke-width:2px,stroke-dasharray: 5 5

    class call_function,handle_params,modify_request_header,configure_user_id,initiate_request,handle_network_error,handle_authorization_error,retry_on_exception,handle_general_error,request_completed,return_params normal
    class 发起请求前,请求处理后 box
```

## 🚀 快速上手

下面是一个集成了所有核心拦截器的示例，展示了 `simple-axios` 的使用方法，这是一个比较完整的示例，你简单修改后可以直接使用。

```ts
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

// 从各个模块按需导入拦截器创建函数
import { createDefaultRequestInterceptor } from 'simple-axios/default-request-interceptor';
import { createDefaultResponseInterceptor } from 'simple-axios/default-response-interceptor';
import { createAuthenticateInterceptor } from 'simple-axios/authenticate-interceptor';
import { createErrorMessageInterceptor } from 'simple-axios/error-message-interceptor';

// 请求重试功能，如果使用，请安装 axios-retry
// import axiosRetry from 'axios-retry';

/** 假设你的接口返回数据结构如下 */
type ApiResponse<T> = {
  resultCode: 'SUCCESS' | 'FAIL';
  data: T;
  errorCode?: string;
  errorCodeDes?: string;
};

/** 和后端约定好的登录失效错误码 */
const AUTH_ERROR_CODES = [
  'KICK_OUT', // Token已被踢下线
  'LOGIN_REPLACE', // 登录被顶下线
  'NOT_TOKEN',
  'TOKEN_DEFAULT_ERROR', // 当前会话未登录
  'TOKEN_TIMEOUT', // Token 已过期
]

// 创建 Axios 实例
const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  responseReturn: 'body',
  timeout: 30 * 1000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
});

// 添加你自己的业务请求拦截器 (例如：添加 token)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

 // 应用默认请求拦截器
createDefaultRequestInterceptor(axiosInstance, {
  extendTimeoutWhenDownload: true, // 下载文件时自动延长超时时间，防止因文件过大导致下载超时
});

// 应用默认响应拦截器 (主要处理数据结构)
createDefaultResponseInterceptor(axiosInstance, {
  codeField: 'resultCode',
  dataField: 'data',
  successCode: 'SUCCESS',
  isThrowWhenFail: true,
});

// 认证拦截器, 支持无感刷新 token。用于登录失效
createAuthenticateInterceptor(axiosInstance, {
  isAuthenticateFailed: (error: AxiosError<ApiResponse<any>>) => {
    // 自定义逻辑判断登录是否失效
    return error.response?.status === 401 || AUTH_ERROR_CODES.includes(errorCode!)
  },
  doReAuthenticate: async (error: AxiosError<Response<any>, any>) => {
    // 登录失效或刷新 token 失败后的行为，一般是跳转登录页面
    const { errorCode } = error.response?.data || {} // 可以针对后端返回的错误码进行不同处理
    window.location.href = '/login';
  },
  enableRefreshToken: true, // 启用无感刷新 token 功能
  doRefreshToken: async () => {
    // 实现刷新 token 的逻辑
    const res = await axiosInstance.post('/refresh-token', {
      refreshToken: localStorage.getItem('refresh_token'),
    });
    const { token, refreshToken } = res.data;
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
  },
});

// 请求重试，如果需要使用，请安装 axios-retry, 参考：https://github.com/softonic/axios-retry
// axiosRetry(axiosInstance, {
//   retries: 3
// })

// 应用错误消息拦截器 (统一错误提示, 在这里定义业务错误提示)
createErrorMessageInterceptor(axiosInstance, (error: AxiosResponse<ApiResponse<any>>, networkErrMsg) => {
  const { data, config } = error;

  // 如果单独配置了不提示错误信息，则直接返回
  if (config?.errorMessageMode === 'none') {
    return;
  }

  const errorMessage = data?.errorCodeDes || networkErrMsg || data?.errorCode || '未知错误';

  // 这里使用你项目中的 UI 组件库来显示错误，例如 Element Plus
  if (config?.errorMessageMode === 'message') {
    // 如果没有错误信息，则会根据状态码进行提示
    ElMessage({
      message: errorMessage,
      type: 'error',
      plain: true,
      grouping: true,
    });
  } else if (config?.errorMessageMode === 'modal') {
    ElMessageBox({
      title: '错误提示',
      message: errorMessage,
      type: 'error',
      showCancelButton: false,
      confirmButtonText: '知道了',
    }).catch(() => { });
  }
});
```

```ts
// 现在，你可以使用配置好的 axiosInstance 发起请求了
async function getUserInfo() {
  try {
    // 拦截器会自动处理数据，你直接拿到的就是 data 字段(axios 的原始响应对象)的内容
    const userInfo = await axiosInstance.get<ApiResponse<{ id: number; name: string }>>('/user/info', {
      errorMessageMode: 'modal',
    });
    console.log(userInfo); // { id: 1, name: 'Alice' }
  } catch (error) {
    // 错误会被 error-message-interceptor 捕获并提示，你无需手动处理
    console.error('获取用户信息失败');
  }
}
```

## 📚 API 文档

### `simple-axios/default-request-interceptor` [source](https://github.com/GreatAuk/simple-axios/blob/main/src/default-request-interceptor/index.ts)

此拦截器用于优化请求行为。

**功能**:
- **下载场景下延长 timeout**: 当检测到请求是用于下载文件时（`responseType` 为 `'blob'` 或 `'arraybuffer'`），会自动延长该请求的超时时间（默认为基础超时时间的 10 倍），防止因文件过大导致下载超时。

**配置选项 (`DefaultRequestInterceptorOptions`)**:

```ts
export type DefaultRequestInterceptorOptions = {
  /**
   * 当请求是下载文件时（`responseType` 为 `'blob'` 或 `'arraybuffer'`），
   * 是否自动延长请求的超时时间，以防止因文件过大导致下载超时。
   * @default true
   */
  extendTimeoutWhenDownload?: boolean;
};
```

**使用**:
```ts
import { createDefaultRequestInterceptor } from 'simple-axios/default-request-interceptor';

createDefaultRequestInterceptor(axiosInstance, {
  extendTimeoutWhenDownload: true, // 默认为 true，下载文件时自动延长超时时间，防止因文件过大导致下载超时
});
```

---

### `simple-axios/default-response-interceptor` [source](https://github.com/GreatAuk/simple-axios/blob/main/src/default-response-interceptor/index.ts)

此拦截器用于标准化响应数据结构，让你在业务代码中只关心核心数据。

**功能**:
- **自动解包**: 根据后端返回的结构，自动提取核心业务数据。
- **业务成功判断**: 根据你定义的成功码（`successCode`），判断业务请求是否成功。如果失败，则抛出错误，交由后续的错误拦截器处理。
- **灵活的返回类型**: 通过在请求 `config` 中设置 `responseReturn`，可以控制返回的数据格式：
    - `'raw'`: 返回原始的 Axios 响应对象。
    - `'body'`: 返回响应体 `response.data`。
    - `'data'`: 返回响应体中的核心数据字段 `response.data[dataField]`。

**配置选项 (`DefaultResponseInterceptorOptions`)**:

```ts
export type DefaultResponseInterceptorOptions = {
  /**
   * 响应数据中代表业务状态码的字段名。
   * @default 'code'
   */
  codeField: string;
  /**
   * 响应数据中代表核心业务数据的字段名，或一个函数，用于从响应体中提取数据。
   * @default 'data'
   */
  dataField: ((response: any) => any) | string;
  /**
   * 定义业务成功的状态码值。
   * 可以是一个具体的值，或一个函数，返回 `true` 表示成功。
   * @default 0
   */
  successCode: ((code: any) => boolean) | number | string;
  /**
   * 当业务请求失败时（状态码不匹配 `successCode`），是否抛出错误。
   * 设置为 `true` 后，业务错误将进入 `catch` 块，可由错误拦截器统一处理。
   * @default true
   */
  isThrowWhenFail?: boolean;
};
```

**使用**:
```ts
import { createDefaultResponseInterceptor } from 'simple-axios/default-response-interceptor';

// 假设后端接口结构为 { resultCode: 'SUCCESS', data: { ... } }
createDefaultResponseInterceptor(axiosInstance, {
  codeField: 'resultCode',
  dataField: 'body',
  successCode: 'SUCCESS',
  isThrowWhenFail: true,
});
```

**注意**
默认的配置（`isThrowWhenFail: true`），接口的业务错误(`resultCode: 'FAIL'`)会被 throw，交由后续的错误拦截器处理，你无需手动处理。

> 优点：
> 简化业务代码：业务层面只需要关注成功的逻辑
> 统一错误处理：所有错误都在拦截器中统一处理
> 提高可维护性：错误处理逻辑集中，易于修改和扩展
> 符合开发规范：遵循了单一职责和关注点分离原则

简单的使用示例：
```ts
try {
  const res = await axiosInstance.get('/api/user/info');
  /* 这里只处理成功情况（且只有 res.resultCode === 'SUCCESS' 才会进入），代码更清晰 */
  console.log(res.data);
} catch (err) {
  /*
   * 这里会捕获所有错误：
   * 1. 网络错误（404、500等）
   * 2. 业务错误（resultCode: 'FAIL'）
   * 3. 代码执行错误（如 res 不存在）
   * 因为没有设置 options.errorMessageMode: 'none'，所以错误信息已在拦截器中统一处理和展示
   */
  console.error(err);
}
```

如果个别接口你不使用默认的错误处理，可以在请求配置中设置 `errorMessageMode: 'none'`
```ts
try {
  const res = await axiosInstance.get('/api/user/info', {
    errorMessageMode: 'none', // // 默认有错误，会在 axios 响应拦截器中直接使用 ElMessage(由 createErrorMessageInterceptor 的配置决定) 提示错误信息。这里设置为 'none'，需要自己处理错误
  });
  /* 这里只处理成功情况（且只有 res.resultCode === 'SUCCESS' 才会进入），代码更清晰 */
  console.log(res.data);
} catch (err) {
  if (isServerError(err) && err.errorCode === 'Expired') {
    // 因为上面设置了 errorMessageMode: 'none'，所以这里需要自己处理错误。
    console.log('操作已过期');
  } else {
    // 非后端业务报错，直接打印
    console.error(err);
  }
}
```

为了 ts 类型友好，判断是否是后端错误，可以参考如下示例封装一个 utils 函数：

```ts
/**
 * 判断是否是后端错误 (公司项目约定的统一错误返回格式)
 * @param error 错误对象
 * @returns 是否是后端错误
 */
export function isServerError(error: any): error is ServerError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  return (
    // 这里根据和后端约定的返回数据结构来判断
    Reflect.has(error, 'resultCode') &&
    Reflect.has(error, 'errorCode') &&
    Reflect.has(error, 'errorCodeDes')
  );
}
```
---

### `simple-axios/error-message-interceptor` [source](https://github.com/GreatAuk/simple-axios/blob/main/src/error-message-interceptor/index.ts)

此拦截器用于统一捕获和处理所有请求错误，并提供友好的错误提示。

**功能**:
- **标准化错误信息**: 将网络错误、超时、HTTP 错误（4xx, 5xx）等转化为用户易于理解的提示信息。
- **自定义处理**: 你需要提供一个处理函数，来自定义如何显示错误信息（例如使用 `Message` 或 `Modal` 组件）。

**回调函数类型 (`HandleErrorMessage`)**:

```ts
/**
 * @param error Axios 响应对象，其中包含了完整的错误信息。
 * @param networkErrMsg networkErrMsg 是拦截器生成的标准化错误信息 在服务器返回4xx或5xx状态码，无法连接到服务器或CORS错误，请求超时的情况(axios 内部错误)，才有预置的错误信息。
 */
export type HandleErrorMessage = (error: AxiosResponse<any, any>, networkErrMsg: string) => void;
```

**使用**:
你需要传入一个回调函数，该函数接收两个参数：`error` (Axios 响应对象) 和 `networkErrMsg` (拦截器生成的标准化错误信息)。

```ts
import { createErrorMessageInterceptor } from 'simple-axios/error-message-interceptor';

createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
  // 优先使用后端返回的错误描述
  const errorMessage = error.data?.errorCodeDes || networkErrMsg || '未知错误';

  // 使用你项目的 UI 库进行提示
  // ElMessage.error(finalMessage);
  console.error(errorMessage);

  // 你还可以根据请求配置的 errorMessageMode 来决定提示方式
  if (error.config?.errorMessageMode === 'modal') {
    // ElMessageBox.alert(errorMessage, '错误');
  } else {
    // ...其他处理
  }
});
```

---

### `simple-axios/authenticate-interceptor` [source](https://github.com/GreatAuk/simple-axios/blob/main/src/authenticate-interceptor/index.ts)

这是一个认证处理拦截器，专门用于处理登录状态失效（如 401）和 Token 自动续期。

**功能**:
- **认证失败处理**: 当 `isAuthenticateFailed` 函数返回 `true` 时，执行 `doReAuthenticate` 操作，例如强制用户登出或跳转到登录页。
- **无感刷新 Token**:
    1. 当认证失败时，如果 `enableRefreshToken` 为 `true`，它会暂停所有新的请求。
    2. 调用你提供的 `doRefreshToken` 函数来获取新的 Token。
    3. 刷新成功后，自动用新 Token 重放刚才失败的请求以及所有被暂停的请求。
    4. 如果刷新失败，则执行 `doReAuthenticate`。

**配置选项 (`AuthenticateInterceptorOptions`)**:

```ts
export type AuthenticateInterceptorOptions = {
  /**
   * 判断当前错误是否为认证失败。
   * @param error Axios 错误对象。
   * @returns 如果是认证失败，则返回 `true`。
   */
  isAuthenticateFailed: (error: AxiosError) => boolean;
  /**
   * 认证失败且无法恢复（或刷新 Token 失败）后执行的操作。
   * 通常用于跳转到登录页。
   * @param error Axios 错误对象。
   */
  doReAuthenticate: (error: AxiosError) => Promise<void>;
  /**
   * 是否启用 Token 自动刷新功能。
   * @default false
   */
  enableRefreshToken: boolean;
  /**
   * 一个异步函数，用于执行刷新 Token 的具体逻辑。
   * 如果刷新成功，函数应正常返回；如果失败，则应抛出异常，以便触发 `doReAuthenticate`。
   * @param error Axios 错误对象。
   */
  doRefreshToken: (error: AxiosError) => Promise<any>;
};
```

**使用**:
```ts
import { createAuthenticateInterceptor } from 'simple-axios/authenticate-interceptor';

createAuthenticateInterceptor(axiosInstance, {
  isAuthenticateFailed: (error) => error.response?.status === 401,
  doReAuthenticate: async () => {
    window.location.href = '/login';
  },
  enableRefreshToken: true,
  doRefreshToken: async () => {
    const res = await axios.post('/api/refresh-token', { ... });
    // 保存新 token
    localStorage.setItem('token', res.data.token);
  },
});
```

---

### `simple-axios/utils`

提供一些在网络请求中非常实用的辅助函数。

**`processFileStream(response, options)`** [source](https://github.com/GreatAuk/simple-axios/blob/main/src/utils/processFileStream.ts)

处理文件下载流的核心函数。它能智能判断响应是文件流还是包含错误信息的 JSON。

- **如果成功 (文件流)**: 自动从 `content-disposition` 头获取文件名，并调用 [`file-saver`](https://github.com/eligrey/FileSaver.js) 库的 `saveAs` 触发浏览器下载（比简单的通过 a 标签下载兼容性更好）。
- **如果失败 (JSON)**: 解析 JSON 中的错误信息并返回。

**配置选项 (`ProcessFileStreamOptions`)**:

```ts
export type ProcessFileStreamOptions = {
  /**
   * 自定义文件名。
   * 如果提供此选项，将优先使用该文件名，而不是从 `content-disposition` 头中解析。
   */
  fileName?: string;
  /**
   * 当响应体是 JSON 格式的错误信息时，用于提取错误文本的字段名。
   * @default 'errorCodeDes'
   */
  errorMessageField?: string;
};
```

**使用**:
```ts
import { processFileStream } from 'simple-axios/utils';

async function handleExport() {
  try {
    const response = await axiosInstance.get('/api/export-file', {
      responseType: 'blob', // 必须指定响应类型
      responseReturn: 'raw', // 需要原始响应来获取 headers
    });

    const errMsg = await processFileStream(response, { errorMessageField: 'errorCodeDes' });

    if (errMsg) {
      // ElMessage.error(errMsg);
      console.error(errMsg);
    } else {
      // ElMessage.success('导出成功');
      console.log('导出成功');
    }
  } catch (error) {
    // 网络等其他错误
  }
}
```

**`getFilenameFromContentDisposition`** [source](https://github.com/GreatAuk/simple-axios/blob/main/src/utils/getFilenameFromContentDisposition.ts)

从 `content-disposition` 响应头中安全地解析出文件名。支持 filename*=(RFC-5987) 和 filename= 格式。

**使用**

```ts
import { getFilenameFromContentDisposition } from 'simple-axios/utils';

const fileName = getFilenameFromContentDisposition(response.headers['content-disposition']);

const header1 = "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6.zip"; // 包含中文 "测试文件.zip"
const header2 = 'attachment; filename="a simple file.txt"';
const header3 = 'inline; filename=another-file.pdf';
const header4 = 'form-data; name="file"; filename="report with spaces.docx"';
const header5 = 'attachment; filename="semicolon;.txt"'; // 包含分号的带引号文件名

console.log(`Header 1: ${getFilenameFromContentDisposition(header1)}`); // 输出: Header 1: 测试文件.zip
console.log(`Header 2: ${getFilenameFromContentDisposition(header2)}`); // 输出: Header 2: a simple file.txt
console.log(`Header 3: ${getFilenameFromContentDisposition(header3)}`); // 输出: Header 3: another-file.pdf
console.log(`Header 4: ${getFilenameFromContentDisposition(header4)}`); // 输出: Header 4: report with spaces.docx
console.log(`Header 5: ${getFilenameFromContentDisposition(header5)}`); // 输出: Header 5: semicolon;.txt
```

**`saveAs(blob, fileName)`** [source](https://github.com/eligrey/FileSaver.js)

重新导出了 `file-saver` 库的 `saveAs` 函数，方便实现文件下载，比简单的通过 a 标签下载兼容性更好。

```ts
import { saveAs } from 'simple-axios/utils';
```

```ts
// Saving text
const blob = new Blob(["Hello, world!"], {type: "text/plain;charset=utf-8"});
saveAs(blob, "hello world.txt");

// Saving URLs
saveAs("https://httpbin.org/image", "image.jpg");

// Saving a canvas
const canvas = document.getElementById("my-canvas");
canvas.toBlob(function(blob) {
  saveAs(blob, "pretty image.png");
});
```

## 🤝 贡献

欢迎提交 PR 和 Issue！

本仓库使用 pnpm 管理 node 和 pnpm 版本，请确保你使用的是 pnpm v10 以上

## 📄 许可证

[MIT](./LICENSE)
