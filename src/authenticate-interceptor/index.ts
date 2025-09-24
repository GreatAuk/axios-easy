import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { isFunction } from '../util';

export type AuthenticateInterceptorOptions = {
  /** 重新授权， 一般实现是跳转到登录页面 */
  doReAuthenticate: (error: AxiosError) => Promise<void>;
  /** 是否开启 token 刷新功能 */
  enableRefreshToken: boolean;
  /** 刷新 token, 一般实现是调用后端接口刷新 token。如果失败，建议抛出异常，这样会触发 doReAuthenticate */
  doRefreshToken?: (error: AxiosError) => Promise<any>;
  /** 判断是否登录失效，默认: 判断 401 状态码 */
  isAuthenticateFailed?: (error: AxiosError) => boolean;
};

type PendingTask = {
  resolve: Function;
  reject: Function;
  config: AxiosRequestConfig;
};

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** [createAuthenticateInterceptor] 标识请求是否已经重试过(防止刷新成功后再次重放原请求：如果后端仍返回 401，会再次触发刷新逻辑 → 死循环). 请不要手动设置这个属性！！！这个属性由拦截器内部设置 */
    __retry__?: boolean
  }
}

/**
 * 授权失效-响应拦截器
 * @param axiosInstance axios 实例
 * @param options 拦截器配置
 * @returns 响应拦截器 ID, 用于移除拦截器
 */
export function createAuthenticateInterceptor(axiosInstance: AxiosInstance, {
  doReAuthenticate,
  doRefreshToken,
  enableRefreshToken,
  isAuthenticateFailed,
}: AuthenticateInterceptorOptions): number {
  if (enableRefreshToken && !isFunction(doRefreshToken)) {
    throw new Error('[axios-easy] enableRefreshToken=true requires a valid doRefreshToken handler.');
  }

  /** 是否正在刷新 token */
  let isTokenRefreshing = false;
  /** 等待刷新 token 的请求队列 */
  let pendingQueue: PendingTask[] = [];

  const responseInterceptorId = axiosInstance.interceptors.response.use(
    null,
    async (error: AxiosError) => {
      const { config, response } = error;

      /** 判断是否登录失效 */
      const isAuthFailed = isFunction(isAuthenticateFailed)
        ? isAuthenticateFailed(error)
        : response?.status === 401;

      // 如果非登录失效，直接返回错误，不进行后续处理
      if (!isAuthFailed) {
        return Promise.reject(error);
      }

      if (!config) {
        return Promise.reject(error);
      }

      // 如果没有启用 refreshToken 功能，直接调用 doReAuthenticate
      if (!enableRefreshToken) {
        await doReAuthenticate(error);
        return Promise.reject(error);
      }

      // 如果请求已经重试过，直接调用 doReAuthenticate 并返回错误。 一般出现这种情况是因为刷新 token 后端仍返回 401，如果未处理，会导致死循环。
      if (config.__retry__) {
        await doReAuthenticate(error);
        return Promise.reject(error);
      }

      // 如果正在刷新 token，则将请求加入队列，等待刷新完成
      if (isTokenRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject, config });
        });
      }

      // 标记开始刷新 token
      isTokenRefreshing = true;

      try {
        await doRefreshToken!(error);
        // 处理队列中的请求
        pendingQueue.forEach(({ resolve, config }) => {
          config.__retry__ = true;
          resolve(axiosInstance(config));
        });
        // 清空队列
        pendingQueue = [];

        return axiosInstance({ ...config, __retry__: true });
      } catch (err) {
        // 如果刷新 token 失败，处理错误（如强制登出或跳转登录页面）
        pendingQueue.forEach(({ reject }) => reject(new axios.CanceledError('request canceled due to refresh token failure')))
        pendingQueue = [];

        console.error('Refresh token failed, please login again.', err);
        await doReAuthenticate(error);

        return Promise.reject(new axios.CanceledError('request canceled due to refresh token failure'));
      } finally {
        isTokenRefreshing = false;
      }
    },
  )
  return responseInterceptorId;
};
