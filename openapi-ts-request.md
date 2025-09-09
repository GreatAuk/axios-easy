# 搭配 openapi-ts-request 使用

> 个人特定工作场景使用，无需参考。

`easy-axios` 为 `openapi-ts-request` 提供了一些工具函数。

```ts
import { patchApiJSON, toUpperFirstLetter } from 'simple-axios/openapi-ts-request-util';
```

### 1. 定义通用 request 函数供 openapi-ts-request 使用

```ts
// utils/request.ts
// axiosInstance 是经过 easy-axios 包装的 axios 实例
/**
 * 通用的请求方法
 */
function request<T>(
  url: string,
  config: AxiosRequestConfig,
): Promise<T> {
  return axiosInstance({
    ...config,
    url,
  }) as Promise<T>
}
```

### 2. 定义 generateService 函数

需要安装
```bash
pnpm add openapi-ts-request -D
```

```ts
import type { APIDataType } from 'openapi-ts-request/dist/generator/type';

import { generateService } from 'openapi-ts-request';
import { genDefaultFunctionName } from 'openapi-ts-request/dist/generator/util';
import { patchApiJSON, toUpperFirstLetter } from 'simple-axios/openapi-ts-request-util';

/**
 * http://domain.com/swagger-ui.html?docExpansion=list#/
 */
export function generateService_system() {
  // 详细文档参考 https://github.com/openapi-ui/openapi-ts-request
  generateService({
    requestImportStatement: `import { request } from '@/utils/request';
import type { AxiosRequestConfig } from 'axios';
`,
    requestOptionsType: 'AxiosRequestConfig',
    schemaPath: 'http://domain/v2/api-docs',
    serversPath: './api/system',
    // apiPrefix: "'/todo'",
    // priorityRule: 'include', // 模式规则，可选include/exclude/both
    // includeTags: [], // 根据指定的 tags 生成代码, priorityRule=include则必填
    // excludeTags: [], // 根据指定的 tags 不生成代码
    // includePaths: [], // 根据指定的 paths 生成代码
    // excludePaths: [], // 根据指定的 paths 不生成代码
    hook: {
      afterOpenApiDataInited: patchApiJSON,
      // 自定义函数名生成,比默认的稳定。默认的生成方式，如果接口的公共 prefix 有更新，那么所有的函数名都会被更新
      customFunctionName: (data: APIDataType, prefix: string = '') => {
        const { path, method } = data;

        // 取路径的最后 4 个，如果需要修改，可以修改 spliceLength 参数
        const _path = path
          .split('/')
          .splice(-4)
          .map((v) => toUpperFirstLetter(v))
          .join('/');

        return `${method}${genDefaultFunctionName(_path, prefix)}`;
      },
    },
  });
}

```

### 3. 可交互式的 generate service

如果当前项目对接多个后端服务，可以通过可交互的方式来生成不同的服务。

需要安装

```bash
pnpm add @clack/prompts tsx -D
```

定义可交互的生成服务函数
```ts
// generate-service.ts
import { cancel, intro, isCancel, multiselect } from '@clack/prompts';

// 根据需要导入你定义的 generateService 函数
import { generateService_system } from './system.service';
import { generateService_user } from './user.service';

/** generateService 函数 map */
const serverNameMap = {
  generateService_system,
  generateService_user,
};
/** generateService 函数描述 map */
const serverDescMap: Record<string, string> = {
  generateService_system: '系统管理',
  generateService_user: '用户管理',
};

void (async function () {
  type Answers = (keyof typeof serverNameMap)[];

  const answers = (await multiselect({
    message: '请选择要生成的 service',
    options: Object.keys(serverNameMap).map((name) => ({
      value: name,
      label: name,
      hint: serverDescMap[name],
    })),
    required: true,
  })) as unknown as Answers;

  if (isCancel(answers) || !answers) {
    cancel('👋 Has cancelled');
    // eslint-disable-next-line n/prefer-global/process, unicorn/no-process-exit
    process.exit(0);
  }

  answers.forEach((name) => {
    const fn = serverNameMap[name];
    if (fn) fn();
    else intro(`===========没有找到 ${name} 对应的函数===========`);
  });
})();
```

在 `package.json` 中注册命令
```json
{
  "scripts": {
    "openapi": "tsx generate-service.ts"
  }
}
```

运行命令
```bash
pnpm openapi
```