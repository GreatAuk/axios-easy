import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createErrorMessageInterceptor, httpMessageMap } from '../src/error-message-interceptor';

describe('errorMessageResponseInterceptor', () => {
  const axiosInstance: AxiosInstance = axios.create()
  let interceptorId: number = -1
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
    if (interceptorId !== -1) {
      axiosInstance.interceptors.response.eject(interceptorId);
      interceptorId = -1;
    }
    vi.restoreAllMocks()
  });

  describe('网络相关错误', () => {
    it('应该处理网络错误', async () => {
      let capturedMsg = '';
      let capturedError: any = null;

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
        capturedError = error;
      })

      mock.onGet('/api/pet/1').networkErrorOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.networkError);
      // MockAdapter 可能不会设置具体的错误代码，我们只验证错误消息匹配即可
      expect(capturedError).toBeDefined();
      expect(capturedError.message).toContain('Network Error');
    });

    it('应该处理请求超时', async () => {
      let capturedMsg = '';
      let capturedError: any = null;

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
        capturedError = error;
      })

      mock.onGet('/api/pet/1').timeoutOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.requestTimeout);
      expect(capturedError.code).toBe('ECONNABORTED');
    });

    it('应该处理连接中断超时', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      // 模拟 ECONNABORTED 错误
      const mockError = new Error('timeout of 5000ms exceeded');
      mockError.name = 'Error';
      (mockError as any).code = 'ECONNABORTED';
      (mockError as any).isAxiosError = true;

      mock.onGet('/api/pet/1').reply(() => {
        throw mockError;
      });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.requestTimeout);
    });
  });

  describe('HTTP状态码错误', () => {
    it('应该处理400错误 - 请求错误', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(400, { message: 'Bad Request' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.badRequest);
    });

    it('应该处理401错误 - 未授权', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(401, { message: 'Unauthorized' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.unauthorized);
    });

    it('应该处理403错误 - 禁止访问', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(403, { message: 'Forbidden' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.forbidden);
    });

    it('应该处理404错误 - 未找到', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(404, { message: 'Not Found' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.notFound);
    });

    it('应该处理408错误 - 请求超时', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(408, { message: 'Request Timeout' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.requestTimeout);
    });

    it('应该处理500错误 - 内部服务器错误', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(500, { message: 'Internal Server Error' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.networkError);
    });

    it('应该处理未映射的状态码', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(502, { message: 'Bad Gateway' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.networkError);
    });
  });

  describe('请求取消', () => {
    it('应该正确处理请求取消', async () => {
      let capturedMsg = '';
      let interceptorCalled = false;

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      const controller = new AbortController();
      mock.onGet('/api/pet/1').reply(200, { data: 'success' });

      // 立即取消请求
      controller.abort();

      await expect(
        axiosInstance.get('/api/pet/1', { signal: controller.signal })
      ).rejects.toThrow();

      // 请求取消时不应该调用错误处理函数
      expect(interceptorCalled).toBe(false);
      expect(capturedMsg).toBe('');
    });
  });

  describe('边界情况', () => {
    it('应该返回拦截器ID', () => {
      interceptorId = createErrorMessageInterceptor(axiosInstance, () => { });

      expect(typeof interceptorId).toBe('number');
      expect(interceptorId).toBeGreaterThanOrEqual(0);
    });

    it('应该处理没有错误处理函数的情况', async () => {

      interceptorId = createErrorMessageInterceptor(axiosInstance, null as any)

      mock.onGet('/api/pet/1').networkErrorOnce();

      // 不应该抛出异常，即使没有错误处理函数
      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
    });

    it('应该处理非axios错误', async () => {
      let capturedMsg = '';
      let capturedError: any = null;

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
        capturedError = error;
      })

      // 模拟非axios错误
      const customError = new Error('Custom error');
      mock.onGet('/api/pet/1').reply(() => {
        throw customError;
      });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(''); // 非axios错误应该返回空字符串
      expect(capturedError).toBe(customError);
    });

    it('应该处理包含timeout关键字的错误消息', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      // 模拟包含timeout关键字的错误
      const timeoutError = new Error('Request timeout occurred');
      timeoutError.name = 'Error';
      (timeoutError as any).isAxiosError = true;
      (timeoutError as any).message = 'Request timeout occurred';

      mock.onGet('/api/pet/1').reply(() => {
        throw timeoutError;
      });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.requestTimeout);
    });

    it('应该处理包含Network Error关键字的错误消息', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      // 模拟包含Network Error关键字的错误
      const networkError = new Error('Network Error occurred');
      networkError.name = 'Error';
      (networkError as any).isAxiosError = true;
      (networkError as any).message = 'Network Error occurred';

      mock.onGet('/api/pet/1').reply(() => {
        throw networkError;
      });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMap.networkError);
    });
  });

  describe('错误处理函数调用', () => {
    it('应该传递正确的参数给错误处理函数', async () => {
      let capturedMsg = '';
      let capturedError: any = null;

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
        capturedError = error;
      })

      mock.onGet('/api/pet/1').reply(404, { message: 'Not Found' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();

      expect(capturedMsg).toBe(httpMessageMap.notFound);
      expect(capturedError).toBeDefined();
      expect(capturedError.response.status).toBe(404);
    });

    it('应该在所有错误情况下都调用错误处理函数', async () => {
      const mockHandler = vi.fn();

      interceptorId = createErrorMessageInterceptor(axiosInstance, mockHandler)

      mock.onGet('/api/pet/1').networkErrorOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.any(Object),
        httpMessageMap.networkError,
      );
    });
  });
});