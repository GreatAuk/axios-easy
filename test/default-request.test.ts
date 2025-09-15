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

  describe('config.normalizePayload', () => {
    it('默认所有选项为 false：不应变更 payload', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: false });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { s: ' a ', x: undefined, arr: [' a ', undefined] },
      } as any;
      const newConfig = handler(config);

      expect(newConfig.data).toEqual({ s: ' a ', x: undefined, arr: [' a ', undefined] });
    });

    it('当设置 trim=true 时，应去除字符串空白', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: false });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { s: ' a ', arr: [' b ', '  c  '] },
        normalizePayload: { trim: true },
      } as any;
      const newConfig = handler(config);

      expect(newConfig.data).toEqual({ s: 'a', arr: ['b', 'c'] });
    });

    it('当设置 dropUndefined=true 时，应删除 undefined', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: false });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { a: undefined, b: 'x', arr: [undefined, 'y', undefined] },
        normalizePayload: { dropUndefined: true },
      } as any;
      const newConfig = handler(config);

      expect(newConfig.data).toEqual({ b: 'x', arr: ['y'] });
    });

    it('当 trim=true 且 emptyStringToNull=true 时，应将空字符串转为 null', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, { extendTimeoutWhenDownload: false });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { a: '  ', b: '', c: ' text ' },
        normalizePayload: { trim: true, emptyStringToNull: true },
      } as any;
      const newConfig = handler(config);

      expect(newConfig.data).toEqual({ a: null, b: null, c: 'text' });
    });
  })

  describe('global normalizePayload + merge', () => {
    it('应应用全局 normalizePayload（当请求未设置时）', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, {
        extendTimeoutWhenDownload: false,
        normalizePayload: { trim: true, dropUndefined: true },
      });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { s: ' a ', x: undefined, arr: [' b ', undefined] },
      } as any;
      const newConfig = handler(config);

      expect(newConfig.data).toEqual({ s: 'a', arr: ['b'] });
    });

    it('请求级设置应覆盖全局（merge 行为）', () => {
      interceptorId = createDefaultRequestInterceptor(axiosInstance, {
        extendTimeoutWhenDownload: false,
        normalizePayload: { trim: true, emptyStringToNull: true },
      });
      const handler = (axiosInstance.interceptors.request as any).handlers[interceptorId]?.fulfilled as (cfg: any) => any;

      const config = {
        timeout: 1000,
        data: { a: '', b: ' text ' },
        // 覆盖全局的 trim=true 为 false，但沿用全局 emptyStringToNull=true
        normalizePayload: { trim: false },
      } as any;
      const newConfig = handler(config);

      // 未 trim，因此 b 保留空白；a 原本就是空字符串，按全局 emptyStringToNull 转为 null
      expect(newConfig.data).toEqual({ a: null, b: ' text ' });
    });
  })
});
