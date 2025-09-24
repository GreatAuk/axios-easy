import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultResponseInterceptor } from '../src/default-response-interceptor';

function makeResponseSuccess<T = any>(data: T) {
  return {
    resultCode: 'SUCCESS',
    data,
  };
}

function makeResponseError(message: string, errorCode: string) {
  return {
    resultCode: 'FAIL',
    errorCode,
    errorCodeDes: message,
  };
}

describe('defaultResponseInterceptor', () => {
  const axiosInstance: AxiosInstance = axios.create({
    responseReturn: 'body',
  })
  let interceptorId: number = -1
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
    axiosInstance.interceptors.response.eject(interceptorId);
    interceptorId = -1
    vi.restoreAllMocks()
  });

  // it('供断点调试使用-无意义测试用例"）', async () => {
  //   interceptorId = createDefaultResponseInterceptor(axiosInstance, {
  //     codeField: 'resultCode',
  //     dataField: 'data',
  //     successCode: 'SUCCESS',
  //     isThrowWhenFail: true,
  //   })

  //   axiosInstance.interceptors.response.use(null, (error) => {
  //     console.error('[85]-index.test.ts', error)
  //     return 2222222
  //   })

  //   axiosInstance.interceptors.response.use(null, (error) => {
  //     console.error('[85]-index.test.ts', error)
  //     return error
  //   })


  //   const mockResponse = makeResponseError('Pet not found', 'PET_NOT_FOUND');
  //   mock.onGet('/api/pet/2').reply(400, mockResponse);

  //   const response = await axiosInstance.get('/api/pet/2').catch((error) => {
  //     console.error('[95]-index.test.ts', error)
  //     return 23333333
  //   });

  // });

  describe('成功场景测试', () => {
    it('默认配置 - 返回完整响应体（因为 DEFAULT_CONFIG.responseReturn = "body"）', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockData = {
        name: 'dog',
        id: 1,
      };
      const mockResponse = makeResponseSuccess(mockData);

      mock.onGet('/api/pet/1').reply(200, mockResponse);

      const response = await axiosInstance.get<typeof mockResponse>('/api/pet/1');

      // 默认配置中 responseReturn: 'body'，所以返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('responseReturn: data - 明确返回 data 字段数据', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockData = {
        name: 'cat',
        id: 2,
      };
      const mockResponse = makeResponseSuccess(mockData);

      mock.onGet('/api/pet/2').reply(200, mockResponse);

      const response = await axiosInstance.get<typeof mockData>('/api/pet/2', {
        responseReturn: 'data'
      });

      expect(response).toEqual(mockData);
    });

    it('responseReturn: raw - 返回完整的 axios 响应对象', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockData = {
        name: 'cat',
        id: 2,
      };
      const mockResponse = makeResponseSuccess(mockData);

      mock.onGet('/api/pet/2').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/pet/2', {
        responseReturn: 'raw'
      });

      expect(response.data).toEqual(mockResponse);
      expect(response.config.responseReturn).toBe('raw');
      expect(response.status).toBe(200);
      expect(response.headers).toBeDefined();
    });

    it('responseReturn: body - 返回响应体数据', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockData = {
        name: 'bird',
        id: 3,
      };
      const mockResponse = makeResponseSuccess(mockData);

      mock.onGet('/api/pet/3').reply(200, mockResponse);

      const response = await axiosInstance.get<typeof mockResponse>('/api/pet/3', {
        responseReturn: 'body'
      });

      expect(response).toEqual(mockResponse);
    });

    it('数字类型的 successCode', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'code',
        dataField: 'result',
        successCode: 0,
        isThrowWhenFail: true,
      })

      const mockData = { message: 'success' };
      const mockResponse = {
        code: 0,
        result: mockData,
      };

      mock.onGet('/api/status').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/status');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });
  });

  describe('错误场景测试', () => {
    it('接口失败且 isThrowWhenFail: true - 应该抛出错误', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = makeResponseError('Pet not found', 'PET_NOT_FOUND');

      mock.onGet('/api/pet/999').reply(200, mockResponse);

      await expect(axiosInstance.get('/api/pet/999')).rejects.toMatchObject({
        data: mockResponse
      });
    });

    it('接口失败且 isThrowWhenFail: false - 不应该抛出错误', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: false,
      })

      const mockResponse = makeResponseError('Pet not found', 'PET_NOT_FOUND');

      mock.onGet('/api/pet/999').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/pet/999');

      // 当失败且不抛出错误时，默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('接口失败且 responseReturn: raw - 不检查成功失败，直接返回原始响应', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = makeResponseError('Pet not found', 'PET_NOT_FOUND');

      mock.onGet('/api/pet/999').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/pet/999', {
        responseReturn: 'raw'
      });

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });
  });

  describe('函数配置测试', () => {
    it('successCode 为函数 - 自定义成功判断逻辑', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'status',
        dataField: 'payload',
        successCode: (code: string) => code === 'OK' || code === 'PENDING',
        isThrowWhenFail: true,
      })

      const mockData = { task: 'processing' };
      const mockResponse = {
        status: 'PENDING',
        payload: mockData,
      };

      mock.onGet('/api/task/1').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/task/1');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('successCode 函数返回 false - 应该抛出错误', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'status',
        dataField: 'payload',
        successCode: (code: string) => code === 'OK',
        isThrowWhenFail: true,
      })

      const mockResponse = {
        status: 'ERROR',
        payload: null,
        message: 'Task failed'
      };

      mock.onGet('/api/task/2').reply(200, mockResponse);

      await expect(
        axiosInstance.get('/api/task/2')
      ).rejects.toMatchObject({
        data: mockResponse
      });
    });

    it('dataField 为函数且 responseReturn: "data" - 执行函数提取数据', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: (responseData: any) => ({
          items: responseData.list,
          total: responseData.count,
          transformed: true
        }),
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = {
        resultCode: 'SUCCESS',
        list: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }],
        count: 2,
      };

      mock.onGet('/api/transform').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/transform', {
        responseReturn: 'data'
      });

      expect(response).toEqual({
        items: mockResponse.list,
        total: mockResponse.count,
        transformed: true
      });
    });

    it('dataField 函数处理复杂嵌套数据且 responseReturn: "data"', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'code',
        dataField: (responseData: any) => responseData.result?.content?.data || null,
        successCode: 200,
        isThrowWhenFail: true,
      })

      const actualData = { user: 'jane', role: 'user' };
      const mockResponse = {
        code: 200,
        result: {
          content: {
            data: actualData,
            meta: { version: '2.0' }
          }
        }
      };

      mock.onGet('/api/nested').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/nested', {
        responseReturn: 'data'
      });

      expect(response).toEqual(actualData);
    });
  });

  describe('边界情况测试', () => {
    it('应该返回拦截器ID', () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      expect(typeof interceptorId).toBe('number');
      expect(interceptorId).toBeGreaterThanOrEqual(0);
    });
    it('codeField 字段不存在', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'nonExistentCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = {
        data: { message: 'hello' }
        // 缺少 nonExistentCode 字段
      };

      mock.onGet('/api/test').reply(200, mockResponse);

      await expect(
        axiosInstance.get('/api/test')
      ).rejects.toMatchObject({
        data: mockResponse
      });
    });

    it('dataField 字段不存在 - 默认返回完整响应体', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'nonExistentData',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = {
        resultCode: 'SUCCESS'
        // 缺少 nonExistentData 字段
      };

      mock.onGet('/api/test').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/test');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('响应数据为 null', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      mock.onGet('/api/null').reply(200, null);

      await expect(
        axiosInstance.get('/api/null')
      ).rejects.toThrow();
    });

    it('响应状态为 204 且无响应体时应返回 undefined', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      mock.onGet('/api/no-content').reply(204);

      await expect(axiosInstance.get('/api/no-content')).resolves.toBeUndefined();
    });

    it('响应状态为 204 且请求配置 responseReturn 为 data 时应返回 undefined', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      mock.onGet('/api/no-content-data').reply(204);

      await expect(axiosInstance.get('/api/no-content-data', {
        responseReturn: 'data'
      })).resolves.toBeUndefined();
    });

    it('空字符串作为 successCode', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'status',
        dataField: 'result',
        successCode: '',
        isThrowWhenFail: true,
      })

      const mockData = { empty: 'success' };
      const mockResponse = {
        status: '',
        result: mockData,
      };

      mock.onGet('/api/empty-code').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/empty-code');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('布尔值作为 successCode（通过函数实现）', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'success',
        dataField: 'data',
        successCode: (code: any) => code === true,
        isThrowWhenFail: true,
      })

      const mockData = { boolean: 'test' };
      const mockResponse = {
        success: true,
        data: mockData,
      };

      mock.onGet('/api/boolean').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/boolean');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('dataField 函数返回 undefined', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: () => undefined,
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = makeResponseSuccess({ some: 'data' });

      mock.onGet('/api/undefined').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/undefined');

      // 默认 responseReturn: 'body'，返回完整响应体
      expect(response).toEqual(mockResponse);
    });

    it('dataField 函数抛出错误', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: () => {
          throw new Error('dataField processing error');
        },
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = makeResponseSuccess({ some: 'data' });

      mock.onGet('/api/error-processing').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/error-processing');

      // 默认 responseReturn: 'body'，返回完整响应体，dataField 函数不会被调用
      expect(response).toEqual(mockResponse);
    });

    it('dataField 函数抛出错误且 responseReturn: "data"', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: () => {
          throw new Error('dataField processing error');
        },
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = makeResponseSuccess({ some: 'data' });

      mock.onGet('/api/error-processing-data').reply(200, mockResponse);

      await expect(
        axiosInstance.get('/api/error-processing-data', {
          responseReturn: 'data'
        })
      ).rejects.toThrow('dataField processing error');
    });

    it('dataField 字段不存在且 responseReturn: "data" - 返回 undefined', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'nonExistentData',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      })

      const mockResponse = {
        resultCode: 'SUCCESS'
        // 缺少 nonExistentData 字段
      };

      mock.onGet('/api/test-data').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/test-data', {
        responseReturn: 'data'
      });

      // 当 responseReturn: 'data' 且 dataField 不存在时，返回 undefined
      expect(response).toBeUndefined();
    });

    it('接口失败且 isThrowWhenFail: false 且 responseReturn: "data"', async () => {
      interceptorId = createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: false,
      })

      const mockResponse = makeResponseError('Pet not found', 'PET_NOT_FOUND');

      mock.onGet('/api/pet/fail-data').reply(200, mockResponse);

      const response = await axiosInstance.get('/api/pet/fail-data', {
        responseReturn: 'data'
      });

      // 当失败且不抛出错误且 responseReturn: 'data' 时，返回 data 字段（undefined）
      expect(response).toBeUndefined();
    });
  });
});
