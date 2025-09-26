import axios, { type AxiosInstance, type CreateAxiosDefaults, type AxiosRequestConfig } from 'axios';

import { createAuthenticateInterceptor, type AuthenticateInterceptorOptions } from '../authenticate-interceptor';
import { createDefaultRequestInterceptor, type DefaultRequestInterceptorOptions } from '../default-request-interceptor';
import { createDefaultResponseInterceptor, type DefaultResponseInterceptorOptions } from '../default-response-interceptor';
import { createErrorMessageInterceptor, setGlobalLanguage, type ErrorMessageInterceptorOptions } from '../error-message-interceptor';
import { createParamsSerializerInterceptor, type ParamsSerializerInterceptorOptions } from '../params-serializer-interceptor';

/** 创建请求客户端时的整体配置 */
export type CreateRequestClientOptions = {
  /** axios.create 的默认配置 */
  axiosConfig?: CreateAxiosDefaults;
  /** 是否启用默认请求拦截器。true 表示使用默认配置（下载延长超时 & 请求体规范化-去除字符串首尾空白开启） */
  defaultRequest?: boolean | DefaultRequestInterceptorOptions;
  /** 是否启用默认响应拦截器 */
  defaultResponse?: false | DefaultResponseInterceptorOptions;
  /** 是否启用认证拦截器，支持使用工厂函数拿到实例 */
  authenticate?: false | ((instance: AxiosInstance) => AuthenticateInterceptorOptions);
  /** 是否启用错误消息拦截器 */
  errorMessage?: false | ErrorMessageInterceptorOptions;
  /** 是否启用参数序列化拦截器 */
  paramsSerializer?: boolean | ParamsSerializerInterceptorOptions;
  /** 自定义扩展逻辑，可在此添加更多拦截器或插件 */
  setup?: (client: AxiosInstance) => void;
};

export type CreateRequestClientResult = {
  axiosInstance: AxiosInstance;
  request: <T>(url: string, config: AxiosRequestConfig) => Promise<T>;
  setGlobalLanguage: typeof setGlobalLanguage;
};

/**
 * 创建带有常用拦截器组合的 Axios 实例
 */
export const createRequestClient = ({
  axiosConfig,
  authenticate,
  defaultRequest,
  defaultResponse,
  errorMessage,
  paramsSerializer,
  setup,
}: CreateRequestClientOptions = {}): CreateRequestClientResult => {
  /** 默认的头部信息，保证 JSON 请求可用 */
  const defaultHeaders = {
    'Content-Type': 'application/json;charset=utf-8',
  } as Record<string, string>;

  /** 创建基础 axios 实例 */
  const axiosInstance = axios.create({
    timeout: 30 * 1000,
    responseReturn: 'body',
    errorMessageMode: 'message',
    ...axiosConfig,
    headers: {
      ...defaultHeaders,
      ...(axiosConfig?.headers as Record<string, string> | undefined),
    },
  });

  if (paramsSerializer) {
    /** 参数序列化拦截器配置 */
    const paramsSerializerOptions = paramsSerializer === true ? {} : paramsSerializer;
    createParamsSerializerInterceptor(axiosInstance, paramsSerializerOptions);
  }

  if (defaultRequest) {
    /** 默认请求拦截器配置 */
    const requestOptions = defaultRequest === true ? {} : defaultRequest;
    createDefaultRequestInterceptor(axiosInstance, requestOptions);
  }

  if (defaultResponse) {
    createDefaultResponseInterceptor(axiosInstance, defaultResponse);
  }

  if (authenticate) {
    /** 认证拦截器配置 */
    const authenticateOptions = authenticate(axiosInstance);
    createAuthenticateInterceptor(axiosInstance, authenticateOptions);
  }

  if (errorMessage) {
    createErrorMessageInterceptor(axiosInstance, errorMessage);
  }

  setup?.(axiosInstance);

  /**
 * 通用的请求方法
 */
  async function request<T>(url: string, config: AxiosRequestConfig) {
    try {
      const res = await axiosInstance({
        ...config,
        url,
      });

      return res as T;
    } catch (error: any) {
      throw error.response ? error.response.data : error;
    }
  }

  return {
    axiosInstance,
    request,
    setGlobalLanguage,
  };
};
