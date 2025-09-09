import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultRequestInterceptor } from '../src/default-request-interceptor';

describe('defaultRequestInterceptor', () => {
  const axiosInstance: AxiosInstance = axios.create({
    responseReturn: 'body',
  })
  let interceptorId: number = -1
  axiosInstance.defaults.timeout = 1000;
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
    axiosInstance.interceptors.request.eject(interceptorId);
    interceptorId = -1
    vi.restoreAllMocks()
  });

  describe('options.extendTimeoutWhenDownload', () => {
    it('extendTimeoutWhenDownload=true 时, responseType 为 blob 且未单独设置 timeout 应放大 10 倍', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: true });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = { timeout: 1000, responseType: 'blob' };
      const newConfig = handler(config);

      expect(newConfig.timeout).toBe(10000);
    });

    it('当 responseType 不是下载类型时不应修改 timeout', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: true });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = { timeout: 1000, responseType: 'json' };
      const newConfig = handler(config);

      expect(newConfig.timeout).toBe(1000);
    });

    it('extendTimeoutWhenDownload=false 时即便下载也不应修改 timeout', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: false });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = { timeout: 1000, responseType: 'arraybuffer' };
      const newConfig = handler(config);

      expect(newConfig.timeout).toBe(1000);
    });
  })
});