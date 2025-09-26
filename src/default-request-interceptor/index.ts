import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { normalizeRequestPayload } from '../utils';
import { isFunction } from '../util';

import type { NormalizeRequestPayloadOptions } from '../utils/normalizeRequestPayload';

export type { NormalizeRequestPayloadOptions };

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * 是否在请求前规范化传参（仅处理普通对象/数组）
     * - trim: 是否去除字符串首尾空白，默认 false
     * - dropUndefined: 是否删除值为 undefined 的键/数组元素，默认 false
     * - emptyStringToNull: 是否将空字符串转换为 null，默认 false
     *
     * 未设置时，等价于 `{ trim: false, dropUndefined: false, emptyStringToNull: false }`
     */
    normalizePayload?: NormalizeRequestPayloadOptions;
  }
}

/** 下载超时扩展配置，支持布尔开关或自定义计算函数 */
export type ExtendTimeoutWhenDownloadOption = boolean | ((defaultTimeout: number, config: InternalAxiosRequestConfig) => number);

export type DefaultRequestInterceptorOptions = {
  /** 下载文件时，是否延长超时时间 */
  extendTimeoutWhenDownload?: ExtendTimeoutWhenDownloadOption;
  /** 是否在请求前规范化传参 */
  normalizePayload?: NormalizeRequestPayloadOptions;
};

/**
 * 默认请求拦截器
 * @param options.extendTimeoutWhenDownload - 下载文件时，是否延长超时时间, 默认值为 true
 * @param options.normalizePayload - 全局请求负载规范化选项
 * @returns 拦截器 ID, 用于移除拦截器
 */
export const createDefaultRequestInterceptor = (axiosInstance: AxiosInstance, {
  extendTimeoutWhenDownload = true,
  normalizePayload: globalNormalizePayload,
}: DefaultRequestInterceptorOptions = {}): number => {

  const requestInterceptorId = axiosInstance.interceptors.request.use((config) => {
    const { responseType, normalizePayload: requestNormalizePayload } = config;

    // 如果开启了下载延长超时功能，则在请求阶段检查 responseType
    // 当 responseType 为 'blob' 或 'arraybuffer' 时，且当前请求没有单独设置 timeout 时，将当前请求的 timeout 扩大
    if (extendTimeoutWhenDownload && responseType && ['blob', 'arraybuffer'].includes(responseType)) {
      const baseTimeout = axiosInstance.defaults.timeout ?? 0;
      // baseTimeout 和 config.timeout 相等时，说明没有为当前请求设置 timeout，延长超时时间
      if (baseTimeout === config.timeout) {
        /** 计算延长后的超时时间 */
        const computeTimeout = isFunction(extendTimeoutWhenDownload)
          ? extendTimeoutWhenDownload
          : /** 默认扩展算法：沿用现有逻辑乘以 10 */
          (defaultTimeout: number) => defaultTimeout * 10;

        const calculatedTimeout = computeTimeout(baseTimeout, config);

        if (typeof calculatedTimeout === 'number' && Number.isFinite(calculatedTimeout)) {
          config.timeout = calculatedTimeout;
        }
      }
    }


    // 规范化请求体 payload（对象/数组）
    // 合并全局配置与请求级配置，请求级配置优先
    const mergedNormalizePayload = {
      ...globalNormalizePayload,
      ...requestNormalizePayload,
    };

    const {
      trim = false,
      dropUndefined = false,
      emptyStringToNull = false,
    } = mergedNormalizePayload;

    if (trim || dropUndefined || emptyStringToNull) {
      // 规范化 body 数据
      if (typeof config.data !== 'undefined') {
        config.data = normalizeRequestPayload(config.data, {
          trim,
          dropUndefined,
          emptyStringToNull,
        });
      }
      // 规范化 params 数据
      if (typeof config.params !== 'undefined') {
        config.params = normalizeRequestPayload(config.params, {
          trim,
          dropUndefined,
          emptyStringToNull,
        });
      }
    }

    return config;
  });

  return requestInterceptorId;
};
