import type { AxiosInstance } from 'axios';

export type DefaultRequestInterceptorOptions = {
  /** 下载文件时，是否延长超时时间 */
  extendTimeoutWhenDownload?: boolean;
};

/**
 * 默认请求拦截器
 * @param options.extendTimeoutWhenDownload - 下载文件时，是否延长超时时间, 默认值为 true
 * @returns 拦截器 ID, 用于移除拦截器
 */
export const createDefaultRequestInterceptor = (axiosInstance: AxiosInstance, {
  extendTimeoutWhenDownload = true,
}: DefaultRequestInterceptorOptions): number => {

  const requestInterceptorId = axiosInstance.interceptors.request.use((config) => {
    const { responseType } = config;

    // 如果开启了下载延长超时功能，则在请求阶段检查 responseType
    // 当 responseType 为 'blob' 或 'arraybuffer' 时，且当前请求没有单独设置 timeout 时，将当前请求的 timeout 扩大 10 倍
    if (extendTimeoutWhenDownload && responseType && ['blob', 'arraybuffer'].includes(responseType)) {
      const baseTimeout = axiosInstance.defaults.timeout ?? 0;
      // baseTimeout 和 config.timeout 相等时，说明没有为当前请求设置 timeout，延长超时时间
      if (baseTimeout === config.timeout) {
        config.timeout = baseTimeout * 10;
      }
    }

    return config;
  });

  return requestInterceptorId;
};
