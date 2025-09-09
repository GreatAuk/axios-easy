import type { AxiosError, AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthenticateInterceptor } from '../src/authenticate-interceptor';

const API_PATH = '/api/user';

function sleep(durationMillisecond: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, durationMillisecond))
}

describe('authenticateResponseInterceptor', () => {
  const axiosInstance: AxiosInstance = axios.create();
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  let interceptorId: number = -1;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  /** 清理每个测试用例产生的副作用 */
  afterEach(() => {
    mock.reset();
    if (interceptorId !== -1) {
      axiosInstance.interceptors.response.eject(interceptorId);
      interceptorId = -1;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('应该返回拦截器 ID', () => {
    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate: vi.fn(),
      enableRefreshToken: false,
      doRefreshToken: vi.fn(),
    });

    expect(typeof interceptorId).toBe('number');
    expect(interceptorId).toBeGreaterThanOrEqual(0);
  });

  it('当未开启 refreshToken 时, 登录失效应该调用 doReAuthenticate', async () => {
    const doReAuthenticate = vi.fn().mockResolvedValue(undefined);

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: false,
      doRefreshToken: vi.fn(),
    });

    // 第一次请求返回 401
    mock.onGet(API_PATH).replyOnce(401);

    await expect(axiosInstance.get(API_PATH)).rejects.toThrow();
    expect(doReAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('当登录失效且开启 refreshToken 时, 应该刷新 token 并重试原请求', async () => {
    const doReAuthenticate = vi.fn();
    const doRefreshToken = vi.fn().mockResolvedValue('new-token');

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: true,
      doRefreshToken,
    });

    // 第一次调用返回 401, 重试后返回 200
    mock.onGet(API_PATH).replyOnce(401).onGet(API_PATH).reply(200, { id: 1 });

    const resp = await axiosInstance.get(API_PATH);

    expect(resp.status).toBe(200); // 虽然只请求了一次，但是因为刷新 token 成功， 又在内部重新请求了一次，所以返回了 200
    expect(resp.data.id).toEqual(1);
    expect(doRefreshToken).toHaveBeenCalledTimes(1);
    expect(doReAuthenticate).not.toHaveBeenCalled();
  });

  it('在刷新 token 过程中, 后续请求应该排队等待', async () => {
    const doReAuthenticate = vi.fn();
    /** 通过 Promise 手动控制刷新 token 的完成时机 */
    let refreshResolve!: (v: string) => void;
    const doRefreshToken = vi.fn().mockImplementation(() => new Promise<string>((resolve) => {
      refreshResolve = resolve;
    }));

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: true,
      doRefreshToken,
    });

    // 第一次请求 401, 重试用 200 返回
    mock.onGet('/test1').replyOnce(401).onGet('/test1').reply(200, { id: 1 });
    mock.onGet('/test2').replyOnce(401).onGet('/test2').reply(200, { id: 2 });

    // 同时发起两个请求
    const req1 = axiosInstance.get('/test1');
    const req2 = axiosInstance.get('/test2');

    // 此时两个请求都不应已完成
    let req1Settled = false;
    let req2Settled = false;
    req1.then(() => { req1Settled = true; });
    req2.then(() => { req2Settled = true; });

    let start = Date.now();
    let end = 0;
    const diff = 30 * 1000;
    // 模拟等待 30 秒
    const sp = sleep(diff);
    vi.advanceTimersByTime(diff);
    await sp.then(() => {
      end = Date.now();
    });

    expect(end - start).toBeGreaterThanOrEqual(diff);

    // 30 秒后，两个请求也不应已完成
    expect(req1Settled).toBe(false);
    expect(req2Settled).toBe(false);

    // 确保 doRefreshToken 被调用, 完成刷新 token
    await vi.waitFor(() => {
      expect(doRefreshToken).toHaveBeenCalledTimes(1);
    });

    refreshResolve('new-token');

    const res = await Promise.allSettled([req1, req2])

    const fulfilledRes = res.filter((v): v is PromiseFulfilledResult<any> => v.status === 'fulfilled')

    expect(fulfilledRes[0].value.data.id).toBe(1);
    expect(fulfilledRes[1].value.data.id).toBe(2);
    expect(doReAuthenticate).not.toHaveBeenCalled();
  });

  it('当刷新 token 失败时, 应该调用 doReAuthenticate 并拒绝原请求', async () => {
    const doReAuthenticate = vi.fn().mockResolvedValue(undefined);
    const refreshError = new Error('refresh failed');
    const doRefreshToken = vi.fn<() => Promise<string>>(() => Promise.reject(refreshError));

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: true,
      doRefreshToken: doRefreshToken as any,
    });

    mock.onGet(API_PATH).replyOnce(401);

    await expect(axiosInstance.get(API_PATH)).rejects.toThrowError()

    expect(doRefreshToken).toHaveBeenCalledTimes(1);
    expect(doReAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('并发请求时token刷新失败，所有等待的请求都应该被取消', async () => {
    const refreshError = new Error('Refresh failed');
    const mockDoRefreshToken = vi.fn().mockRejectedValue(refreshError);
    const mockDoReAuthenticate = vi.fn().mockResolvedValue(undefined);

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate: mockDoReAuthenticate,
      enableRefreshToken: true,
      doRefreshToken: mockDoRefreshToken as any,
    });

    // Mock 401 错误
    mock.onGet("/test1").replyOnce(401);
    mock.onGet('/test2').replyOnce(401);

    let err1: any
    let err2: any
    await Promise.allSettled([axiosInstance.get('/test1'), axiosInstance.get('/test2')]).then((res: any) => {
      err1 = res[0].reason
      err2 = res[1].reason
    })
    expect(axios.isCancel(err1)).toBe(true);
    expect(axios.isCancel(err2)).toBe(true);
  });

  it('token 刷新成功后，如果后端仍返回 401，应该停止重试，并调用 doReAuthenticate', async () => {
    const doReAuthenticate = vi.fn();
    const doRefreshToken = vi.fn().mockResolvedValue('new-token');

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: true,
      doRefreshToken,
    });

    mock.onGet("/test1").replyOnce(401).onGet("/test1").replyOnce(401);

    await expect(axiosInstance.get('/test1')).rejects.toThrow();

    expect(doReAuthenticate).toHaveBeenCalledTimes(1);
    expect(doRefreshToken).toHaveBeenCalledTimes(1);
  })

  it('应该使用自定义 isAuthenticateFailed 判定函数', async () => {
    const doReAuthenticate = vi.fn();
    const doRefreshToken = vi.fn();
    const isAuthenticateFailed = vi.fn<(e: AxiosError) => boolean>().mockReturnValue(false);

    interceptorId = createAuthenticateInterceptor(axiosInstance, {
      doReAuthenticate,
      enableRefreshToken: false,
      doRefreshToken,
      isAuthenticateFailed,
    });

    mock.onGet(API_PATH).replyOnce(401);

    await expect(axiosInstance.get(API_PATH)).rejects.toThrow();

    // 自定义函数被调用
    expect(isAuthenticateFailed).toHaveBeenCalledTimes(1);
    // 因为返回 false, 不应触发 doReAuthenticate
    expect(doReAuthenticate).not.toHaveBeenCalled();
  });

});