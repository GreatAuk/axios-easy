import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createParamsSerializerInterceptor } from '../src/params-serializer-interceptor';

describe('createParamsSerializerInterceptor', () => {
  const axiosInstance: AxiosInstance = axios.create();
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  let interceptorId: number = -1;

  /** 清理每个测试用例产生的副作用 */
  afterEach(() => {
    mock.reset();
    if (interceptorId !== -1) {
      axiosInstance.interceptors.request.eject(interceptorId);
      interceptorId = -1;
    }
    vi.restoreAllMocks();
  });

  it('应该返回拦截器 ID', () => {
    /* 测试拦截器创建是否成功并返回有效 ID */
    interceptorId = createParamsSerializerInterceptor(axiosInstance, {
      qsStringifyArrayFormat: 'brackets',
    });

    expect(typeof interceptorId).toBe('number');
    expect(interceptorId).toBeGreaterThanOrEqual(0);
  });

  it('应该使用 qs 库序列化参数', async () => {
    /* 测试基本参数序列化功能 */
    interceptorId = createParamsSerializerInterceptor(axiosInstance, {
      qsStringifyArrayFormat: 'brackets',
    });

    const params = {
      name: 'test',
      age: 25,
      active: true,
    };

    mock.onGet('/test').reply((config) => {
      /* 验证参数被正确序列化 */
      const serializedParams = (config.paramsSerializer as Function)(params);
      expect(serializedParams).toBe('name=test&age=25&active=true');
      return [200, { success: true }];
    });

    const response = await axiosInstance.get('/test', {
      params,
    });

    expect(response.data).toEqual({ success: true });
  });

  describe('数组参数序列化格式', () => {
    it('qsStringifyArrayFormat=brackets 应该使用方括号格式', async () => {
      /* 测试 brackets 格式：arr[]=1&arr[]=2 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {
        tags: ['javascript', 'typescript'],
        ids: [1, 2, 3],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toBe('tags%5B%5D=javascript&tags%5B%5D=typescript&ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('qsStringifyArrayFormat=indices 应该使用索引格式', async () => {
      /* 测试 indices 格式：arr[0]=1&arr[1]=2 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'indices',
      });

      const params = {
        tags: ['javascript', 'typescript'],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toBe('tags%5B0%5D=javascript&tags%5B1%5D=typescript');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('qsStringifyArrayFormat=repeat 应该使用重复格式', async () => {
      /* 测试 repeat 格式：arr=1&arr=2 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'repeat',
      });

      const params = {
        tags: ['javascript', 'typescript'],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toBe('tags=javascript&tags=typescript');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('qsStringifyArrayFormat=comma 应该使用逗号分隔格式', async () => {
      /* 测试 comma 格式：arr=1,2,3 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'comma',
      });

      const params = {
        tags: ['javascript', 'typescript'],
        ids: [1, 2, 3],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toBe('tags=javascript%2Ctypescript&ids=1%2C2%2C3');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });
  });

  describe('请求级别配置覆盖', () => {
    it('请求配置中的 qsStringifyArrayFormat 应该覆盖全局配置', async () => {
      /* 测试请求级别的配置优先级 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets', // 全局配置
      });

      const params = {
        tags: ['javascript', 'typescript'],
      };

      const requestConfig: AxiosRequestConfig = {
        params,
        qsStringifyArrayFormat: 'comma', // 请求级别配置
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* 应该使用请求级别的 comma 格式，而不是全局的 brackets 格式 */
        expect(serializedParams).toBe('tags=javascript%2Ctypescript');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', requestConfig);
    });

    it('当请求配置中没有指定 qsStringifyArrayFormat 时应该使用全局配置', async () => {
      /* 测试全局配置作为默认值 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'indices', // 全局配置
      });

      const params = {
        tags: ['javascript', 'typescript'],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* 应该使用全局的 indices 格式 */
        expect(serializedParams).toBe('tags%5B0%5D=javascript&tags%5B1%5D=typescript');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });
  });

  describe('边界情况和错误处理', () => {
    it('如果 qsStringifyArrayFormat 不传', async () => {
      /* 测试空参数对象的处理 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance);

      const params = {
        tags: ['javascript', 'typescript'],
        id: 1111,
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toMatchInlineSnapshot(`"tags%5B0%5D=javascript&tags%5B1%5D=typescript&id=1111"`)
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });
    it('应该处理空参数对象', async () => {
      /* 测试空参数对象的处理 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {};

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        expect(serializedParams).toBe('');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('应该处理 null 和 undefined 值', async () => {
      /* 测试 null 和 undefined 值的处理 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {
        name: 'test',
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* qs 库默认会将 null 转换为空字符串，undefined 会被忽略 */
        expect(serializedParams).toBe('name=test&nullValue=&emptyString=');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('应该处理空数组', async () => {
      /* 测试空数组的处理 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {
        name: 'test',
        emptyArray: [],
        tags: ['javascript'],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* 空数组应该被忽略 */
        expect(serializedParams).toBe('name=test&tags%5B%5D=javascript');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('应该处理嵌套对象', async () => {
      /* 测试嵌套对象的序列化 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {
        user: {
          name: 'John',
          age: 30,
        },
        tags: ['frontend', 'backend'],
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* qs 库会将嵌套对象展开 */
        expect(serializedParams).toMatchInlineSnapshot(`"user%5Bname%5D=John&user%5Bage%5D=30&tags%5B%5D=frontend&tags%5B%5D=backend"`)
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });

    it('应该处理特殊字符', async () => {
      /* 测试特殊字符的URL编码 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const params = {
        query: 'hello world',
        special: '!@#$%^&*()',
        chinese: '你好世界',
      };

      mock.onGet('/test').reply((config) => {
        const serializedParams = (config.paramsSerializer as Function)(params);
        /* 特殊字符应该被正确编码 */
        expect(serializedParams).toContain('query=hello%20world');
        expect(serializedParams).toContain('special=%21%40%23%24%25%5E%26%2A%28%29');
        expect(serializedParams).toContain('chinese=%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C');
        return [200, { success: true }];
      });

      await axiosInstance.get('/test', { params });
    });
  });

  describe('拦截器配置验证', () => {
    it('应该正确设置 paramsSerializer 函数', () => {
      /* 验证拦截器正确设置了 paramsSerializer */
      const originalParamsSerializer = axiosInstance.defaults.paramsSerializer;

      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      /* 获取拦截器处理函数 */
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = { params: { test: 'value' } };
      const newConfig = handler(config);

      expect(typeof newConfig.paramsSerializer).toBe('function');
      expect(newConfig.paramsSerializer).not.toBe(originalParamsSerializer);
    });

    it('拦截器应该保持原有配置不变', () => {
      /* 验证拦截器不会修改其他配置 */
      interceptorId = createParamsSerializerInterceptor(axiosInstance, {
        qsStringifyArrayFormat: 'brackets',
      });

      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const originalConfig = {
        url: '/test',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
        params: { test: 'value' },
      };

      const newConfig = handler({ ...originalConfig });

      /* 除了 paramsSerializer，其他配置应该保持不变 */
      expect(newConfig.url).toBe(originalConfig.url);
      expect(newConfig.method).toBe(originalConfig.method);
      expect(newConfig.headers).toEqual(originalConfig.headers);
      expect(newConfig.timeout).toBe(originalConfig.timeout);
      expect(newConfig.params).toEqual(originalConfig.params);
    });
  });
});
