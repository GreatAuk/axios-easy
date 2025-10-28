# 搭配 openapi-ts-request 使用

> 个人特定工作场景使用，无需参考。

`easy-axios` 为 `openapi-ts-request` 提供了一些工具函数。

```ts
import { patchApiJSON, toUpperFirstLetter } from 'axios-easy/openapi-ts-request-util';
```

### 1. 定义通用 request 函数供 openapi-ts-request 使用

```ts
// utils/request.ts
// axiosInstance 是经过 easy-axios 包装的 axios 实例
/**
 * 通用的请求方法
 */
export async function request<T>(url: string, config: AxiosRequestConfig) {
  try {
    const res = await axiosInstance({
      ...config,
      url,
    });

    return res as T;
  } catch (error: any) {
    throw error.response ? error.response.data : error;
  }
}
```

### 2. 新建配置文件

在项目根目录新建 `openapi-ts-request.config.ts`

```ts
import { defineConfig } from 'openapi-ts-request';

export default defineConfig([
  {
    describe: '系统模块 API',
    requestImportStatement: `import { request } from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
`,
    requestOptionsType: 'AxiosRequestConfig',
    schemaPath: 'http://domain/v2/api-docs?group=system',
    serversPath: './api/system',
    // apiPrefix: "'/todo'",
    // priorityRule: 'include', // 模式规则，可选include/exclude/both
    // includeTags: [], // 根据指定的 tags 生成代码, priorityRule=include则必填
    // excludeTags: [], // 根据指定的 tags 不生成代码
    // includePaths: [], // 根据指定的 paths 生成代码
    // excludePaths: [], // 根据指定的 paths 不生成代码
    hook: {
      afterOpenApiDataInited: patchApiJSON,
    },
  },
  {
    describe: '认证 API',
    requestImportStatement: `import { request } from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
`,
    requestOptionsType: 'AxiosRequestConfig',
    schemaPath: 'http://domain/v2/api-docs?group=auth',
    serversPath: './api/auth',
    // apiPrefix: "'/todo'",
    // priorityRule: 'include', // 模式规则，可选include/exclude/both
    // includeTags: [], // 根据指定的 tags 生成代码, priorityRule=include则必填
    // excludeTags: [], // 根据指定的 tags 不生成代码
    // includePaths: [], // 根据指定的 paths 生成代码
    // excludePaths: [], // 根据指定的 paths 不生成代码
    hook: {
      afterOpenApiDataInited: patchApiJSON,
    },
  },
]);
```

在 `package.json` 中注册命令
```json
{
  "scripts": {
    "openapi": "openapi-ts"
  }
}
```

运行命令
```bash
pnpm openapi
```