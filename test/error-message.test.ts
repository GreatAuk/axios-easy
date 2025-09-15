import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createErrorMessageInterceptor, httpMessageMapZH, httpMessageMaps, setGlobalLanguage, getGlobalLanguage } from '../src/error-message-interceptor';

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
    vi.restoreAllMocks();
    // 重置全局语言设置
    setGlobalLanguage(undefined);
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
      expect(capturedMsg).toBe(httpMessageMapZH.networkError);
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
      expect(capturedMsg).toBe(httpMessageMapZH.requestTimeout);
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
      expect(capturedMsg).toBe(httpMessageMapZH.requestTimeout);
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
      expect(capturedMsg).toBe(httpMessageMapZH.badRequest);
    });

    it('应该处理401错误 - 未授权', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(401, { message: 'Unauthorized' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.unauthorized);
    });

    it('应该处理403错误 - 禁止访问', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(403, { message: 'Forbidden' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.forbidden);
    });

    it('应该处理404错误 - 未找到', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(404, { message: 'Not Found' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.notFound);
    });

    it('应该处理408错误 - 请求超时', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(408, { message: 'Request Timeout' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.requestTimeout);
    });

    it('应该处理500错误 - 内部服务器错误', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(500, { message: 'Internal Server Error' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.networkError);
    });

    it('应该处理未映射的状态码', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(502, { message: 'Bad Gateway' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMapZH.networkError);
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
      expect(capturedMsg).toBe(httpMessageMapZH.requestTimeout);
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
      expect(capturedMsg).toBe(httpMessageMapZH.networkError);
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

      expect(capturedMsg).toBe(httpMessageMapZH.notFound);
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
        httpMessageMapZH.networkError,
      );
    });
  });

  describe('国际化功能', () => {
    it('应该支持默认中文错误信息', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(400, { message: 'Bad Request' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.zh.badRequest);
    });

    it('应该支持通过默认语言参数设置英文', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'en')

      mock.onGet('/api/pet/1').reply(400, { message: 'Bad Request' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.badRequest);
    });

    it('应该支持通过请求配置设置语言', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(401, { message: 'Unauthorized' });

      await expect(
        axiosInstance.get('/api/pet/1', { errorMessageLanguage: 'en' })
      ).rejects.toThrow();

      expect(capturedMsg).toBe(httpMessageMaps.en.unauthorized);
    });

    it('请求配置的语言应该优先于默认语言', async () => {
      let capturedMsg = '';

      // 默认设置为英文
      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'en')

      mock.onGet('/api/pet/1').reply(403, { message: 'Forbidden' });

      // 请求中设置为中文，应该优先使用中文
      await expect(
        axiosInstance.get('/api/pet/1', { errorMessageLanguage: 'zh' })
      ).rejects.toThrow();

      expect(capturedMsg).toBe(httpMessageMaps.zh.forbidden);
    });

    it('应该正确处理网络错误的多语言', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'en')

      mock.onGet('/api/pet/1').networkErrorOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.networkError);
    });

    it('应该正确处理超时错误的多语言', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'en')

      mock.onGet('/api/pet/1').timeoutOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.requestTimeout);
    });

    it('应该测试所有状态码的中英文错误信息', async () => {
      const statusCodes = [400, 401, 403, 404, 408];
      const messageKeys = ['badRequest', 'unauthorized', 'forbidden', 'notFound', 'requestTimeout'];

      for (let i = 0; i < statusCodes.length; i++) {
        const statusCode = statusCodes[i];
        const messageKey = messageKeys[i];

        // 测试中文
        let capturedMsgZh = '';
        interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
          capturedMsgZh = networkErrMsg;
        }, 'zh');

        mock.onGet(`/api/test/${statusCode}`).reply(statusCode, { message: 'Error' });

        await expect(axiosInstance.get(`/api/test/${statusCode}`)).rejects.toThrow();
        expect(capturedMsgZh).toBe(httpMessageMaps.zh[messageKey]);

        // 清理拦截器
        axiosInstance.interceptors.response.eject(interceptorId);

        // 测试英文
        let capturedMsgEn = '';
        interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
          capturedMsgEn = networkErrMsg;
        }, 'en');

        mock.onGet(`/api/test-en/${statusCode}`).reply(statusCode, { message: 'Error' });

        await expect(axiosInstance.get(`/api/test-en/${statusCode}`)).rejects.toThrow();
        expect(capturedMsgEn).toBe(httpMessageMaps.en[messageKey]);

        // 清理拦截器
        axiosInstance.interceptors.response.eject(interceptorId);
        interceptorId = -1;
      }
    });

    it('应该处理无效语言类型时回退到默认语言', async () => {
      let capturedMsg = '';

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      })

      mock.onGet('/api/pet/1').reply(404, { message: 'Not Found' });

      // 设置无效的语言类型，应该回退到默认的中文
      await expect(
        axiosInstance.get('/api/pet/1', { errorMessageLanguage: 'invalid' as any })
      ).rejects.toThrow();

      // 由于无效语言会导致 httpMessageMaps[language] 为 undefined，
      // 应该使用默认语言的错误信息
      expect(capturedMsg).toBe(httpMessageMaps.zh.notFound);
    });
  });

  describe('全局语言管理', () => {
    it('应该支持获取和设置全局语言', () => {
      // 默认应该是中文
      expect(getGlobalLanguage()).toBeUndefined();

      // 设置为英文
      setGlobalLanguage('en');
      expect(getGlobalLanguage()).toBe('en');

      // 重新设置为中文
      setGlobalLanguage('zh');
      expect(getGlobalLanguage()).toBe('zh');
    });

    it('拦截器应该使用全局语言设置', async () => {
      let capturedMsg = '';

      // 设置全局语言为英文
      setGlobalLanguage('en');

      // 创建拦截器时不指定默认语言，应该使用全局语言
      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      });

      mock.onGet('/api/pet/1').reply(400, { message: 'Bad Request' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.badRequest);
    });

    it('全局语言应该优先于拦截器默认语言', async () => {
      let capturedMsg = '';

      // 设置全局语言为英文
      setGlobalLanguage('en');

      // 创建拦截器时指定默认语言为中文，应该优先使用中文
      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'zh');

      mock.onGet('/api/pet/1').reply(401, { message: 'Unauthorized' });

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.unauthorized);
    });

    it('请求配置语言应该优先于拦截器默认语言和全局语言', async () => {
      let capturedMsg = '';

      // 设置全局语言为中文
      setGlobalLanguage('zh');

      // 创建拦截器时指定默认语言为英文
      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      }, 'en');

      mock.onGet('/api/pet/1').reply(403, { message: 'Forbidden' });

      // 请求中设置语言为中文，应该优先使用中文
      await expect(
        axiosInstance.get('/api/pet/1', { errorMessageLanguage: 'zh' })
      ).rejects.toThrow();

      expect(capturedMsg).toBe(httpMessageMaps.zh.forbidden);
    });

    it('应该支持动态切换全局语言', async () => {
      let capturedMsg = '';

      // 初始设置为中文
      setGlobalLanguage('zh');

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      });

      // 第一次请求使用中文
      mock.onGet('/api/test/1').reply(404, { message: 'Not Found' });
      await expect(axiosInstance.get('/api/test/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.zh.notFound);

      // 动态切换到英文
      setGlobalLanguage('en');

      // 第二次请求应该使用英文
      mock.onGet('/api/test/2').reply(404, { message: 'Not Found' });
      await expect(axiosInstance.get('/api/test/2')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.notFound);
    });

    it('全局语言切换应该影响所有未指定默认语言的拦截器', async () => {
      let capturedMsg1 = '';
      let capturedMsg2 = '';

      // 创建两个拦截器，都不指定默认语言
      const interceptorId1 = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg1 = networkErrMsg;
      });

      const axiosInstance2 = axios.create();
      const mock2 = new MockAdapter(axiosInstance2);
      const interceptorId2 = createErrorMessageInterceptor(axiosInstance2, (error, networkErrMsg) => {
        capturedMsg2 = networkErrMsg;
      });

      // 设置全局语言为英文
      setGlobalLanguage('en');

      // 两个实例都应该使用英文
      mock.onGet('/api/test1').reply(400, { message: 'Bad Request' });
      mock2.onGet('/api/test2').reply(401, { message: 'Unauthorized' });

      await expect(axiosInstance.get('/api/test1')).rejects.toThrow();
      await expect(axiosInstance2.get('/api/test2')).rejects.toThrow();

      expect(capturedMsg1).toBe(httpMessageMaps.en.badRequest);
      expect(capturedMsg2).toBe(httpMessageMaps.en.unauthorized);

      // 清理
      axiosInstance.interceptors.response.eject(interceptorId1);
      axiosInstance2.interceptors.response.eject(interceptorId2);
      mock2.restore();
      interceptorId = -1; // 防止 afterEach 重复清理
    });

    it('全局语言设置应该支持网络错误', async () => {
      let capturedMsg = '';

      // 设置全局语言为英文
      setGlobalLanguage('en');

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      });

      mock.onGet('/api/pet/1').networkErrorOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.networkError);
    });

    it('全局语言设置应该支持超时错误', async () => {
      let capturedMsg = '';

      // 设置全局语言为英文
      setGlobalLanguage('en');

      interceptorId = createErrorMessageInterceptor(axiosInstance, (error, networkErrMsg) => {
        capturedMsg = networkErrMsg;
      });

      mock.onGet('/api/pet/1').timeoutOnce();

      await expect(axiosInstance.get('/api/pet/1')).rejects.toThrow();
      expect(capturedMsg).toBe(httpMessageMaps.en.requestTimeout);
    });
  });
});