import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HandleErrorMessage } from '../src/error-message-interceptor';
import { setGlobalLanguage as exportedSetGlobalLanguage } from '../src/error-message-interceptor';
import { createRequestClient } from '../src/create-request-client';
import * as defaultRequestInterceptorModule from '../src/default-request-interceptor';
import * as paramsSerializerModule from '../src/params-serializer-interceptor';
import * as defaultResponseInterceptorModule from '../src/default-response-interceptor';

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('createRequestClient', () => {
  it('应返回带默认配置的 axios 实例', () => {
    const { axiosInstance } = createRequestClient({
      axiosConfig: {
        baseURL: 'https://api.example.com',
        timeout: 10_000,
      },
      defaultRequest: false,
    });

    expect(typeof axiosInstance.request).toBe('function');
    expect(axiosInstance.defaults.baseURL).toBe('https://api.example.com');
    expect(axiosInstance.defaults.timeout).toBe(10_000);
    expect((axiosInstance.defaults.headers as any)?.['Content-Type']).toBe('application/json;charset=utf-8');
  });

  it('defaultRequest 传入函数时应延长下载超时时间', () => {
    const { axiosInstance } = createRequestClient({
      axiosConfig: { timeout: 1_000 },
      defaultRequest: {
        extendTimeoutWhenDownload: (timeout) => timeout + 5_000,
      },
    });

    const handlers = (axiosInstance.interceptors.request as any).handlers
      .filter(Boolean)
      .map((handler: any) => handler.fulfilled)
      .filter(Boolean);

    let config: any = { timeout: 1_000, responseType: 'blob' };
    for (const interceptor of handlers.slice().reverse()) {
      config = interceptor(config);
    }

    expect(config.timeout).toBe(6_000);
  });

  it('authenticate 支持传入工厂函数并获得实例', () => {
    const createOptions = vi.fn((instance: AxiosInstance) => {
      expect(typeof instance.request).toBe('function');
      return {
        enableRefreshToken: false,
        doReAuthenticate: vi.fn(async (_error: AxiosError) => { }),
      };
    });

    createRequestClient({
      authenticate: createOptions,
      defaultRequest: false,
    });

    expect(createOptions).toHaveBeenCalledTimes(1);
  });

  it('errorMessage 配置应转发到错误拦截器', async () => {
    const handleError: HandleErrorMessage = vi.fn();
    const { axiosInstance } = createRequestClient({
      defaultRequest: false,
      errorMessage: {
        handler: handleError,
      },
    });

    const responseHandlers = (axiosInstance.interceptors.response as any).handlers
      .filter(Boolean)
      .map((handler: any) => handler.rejected)
      .filter(Boolean);

    const error: any = {
      config: {},
      response: {
        status: 500,
      },
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };

    for (const interceptor of responseHandlers) {
      try {
        await interceptor(error);
      } catch (_err) {
        // 预期拦截器会抛出错误，这里吞掉即可
      }
    }

    expect(handleError).toHaveBeenCalledTimes(1);
  });

  it('defaultRequest 为 true 时应以默认配置挂载拦截器', () => {
    const requestSpy = vi.spyOn(defaultRequestInterceptorModule, 'createDefaultRequestInterceptor');

    const { axiosInstance } = createRequestClient({ defaultRequest: true });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0]?.[0]).toBe(axiosInstance);
    expect(requestSpy.mock.calls[0]?.[1]).toEqual({});
  });

  it('paramsSerializer 为 true 时应注册参数序列化拦截器', () => {
    const paramsSpy = vi.spyOn(paramsSerializerModule, 'createParamsSerializerInterceptor');

    const { axiosInstance } = createRequestClient({ paramsSerializer: true, defaultRequest: false });

    expect(paramsSpy).toHaveBeenCalledTimes(1);
    expect(paramsSpy.mock.calls[0]?.[0]).toBe(axiosInstance);
    expect(paramsSpy.mock.calls[0]?.[1]).toEqual({});
  });

  it('defaultResponse 配置应传递给响应拦截器', () => {
    const responseSpy = vi.spyOn(defaultResponseInterceptorModule, 'createDefaultResponseInterceptor');
    const options = { unwrapResponseBody: true } as any;

    const { axiosInstance } = createRequestClient({ defaultResponse: options, defaultRequest: false });

    expect(responseSpy).toHaveBeenCalledTimes(1);
    expect(responseSpy.mock.calls[0]?.[0]).toBe(axiosInstance);
    expect(responseSpy.mock.calls[0]?.[1]).toBe(options);
  });

  it('setup 回调应在实例创建后执行', () => {
    const setup = vi.fn();

    const { axiosInstance } = createRequestClient({ setup, defaultRequest: false });

    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(axiosInstance);
  });

  it('request 方法应透传配置并返回结果', async () => {
    /** 模拟 axios 实例函数 */
    const requestImplementation = vi.fn().mockResolvedValue({ data: 'ok' });
    const interceptors = {
      request: { use: vi.fn(), handlers: [] as any[] },
      response: { use: vi.fn(), handlers: [] as any[] },
    };
    const defaults = { headers: {} } as any;
    /** 模拟 axios 实例 */
    const mockAxiosInstance = Object.assign(requestImplementation, {
      interceptors,
      defaults,
    });
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

    const { request } = createRequestClient();

    const result = await request<{ data: string }>('https://example.com/api', {
      method: 'POST',
      data: { foo: 'bar' },
    });

    expect(requestImplementation).toHaveBeenCalledTimes(1);
    expect(requestImplementation).toHaveBeenCalledWith({
      method: 'POST',
      data: { foo: 'bar' },
      url: 'https://example.com/api',
    });
    expect(result).toEqual({ data: 'ok' });
  });

  it('request 方法遇到响应错误时应抛出后端数据', async () => {
    /** 模拟 axios 实例函数 */
    const requestImplementation = vi.fn().mockRejectedValue({
      response: {
        data: { message: 'invalid' },
      },
    });
    const interceptors = {
      request: { use: vi.fn(), handlers: [] as any[] },
      response: { use: vi.fn(), handlers: [] as any[] },
    };
    const defaults = { headers: {} } as any;
    /** 模拟 axios 实例 */
    const mockAxiosInstance = Object.assign(requestImplementation, {
      interceptors,
      defaults,
    });
    vi.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as unknown as AxiosInstance);

    const { request } = createRequestClient();

    await expect(request('https://example.com/api', { method: 'GET' })).rejects.toEqual({
      message: 'invalid',
    });
  });

  it('setGlobalLanguage 应保持与原函数同一引用', () => {
    const { setGlobalLanguage } = createRequestClient({ defaultRequest: false });

    expect(setGlobalLanguage).toBe(exportedSetGlobalLanguage);
  });
});
