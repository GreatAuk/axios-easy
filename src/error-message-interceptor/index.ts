import type { AxiosResponse, AxiosInstance } from 'axios';

import { isCancel, isAxiosError } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Error message prompt type。这个提示 ui 需要开发自己定义   client.addResponseInterceptor(errorMessageResponseInterceptor（...））
     * - message: 使用 message 提示错误信息, 如 Element Plus 或 antdv 的 message.error
     * - modal: 使用 modal 提示错误信息, 如 antdv 的 Modal.error 或 Element Plus 的 ElMessage.error
     * - none: 不提示错误信息
     * @default 'message'
     */
    errorMessageMode?: 'message' | 'modal' | 'none';
  }
}

export const httpMessageMap = {
  "requestTimeout": "请求超时，请稍后再试。",
  "networkError": "网络异常，请检查您的网络连接后重试。",
  "badRequest": "请求错误。请检查您的输入并重试。",
  "unauthorized": "登录认证过期，请重新登录后继续。",
  "forbidden": "禁止访问, 您没有权限访问此资源。",
  "notFound": "未找到, 请求的资源不存在。",
  "internalServerError": "内部服务器错误，请稍后再试。"
};

/** 4xx 状态码对应的错误信息 */
const httpStatusMsgMap: Record<number, string> = {
  400: httpMessageMap.badRequest,
  401: httpMessageMap.unauthorized,
  403: httpMessageMap.forbidden,
  404: httpMessageMap.notFound,
  408: httpMessageMap.requestTimeout,
}

/** 自定义错误信息处理函数
 * @param errorMessage 错误信息, 在服务器返回4xx或5xx状态码，无法连接到服务器或CORS错误，请求超时的情况(axios 内部错误)，才有预置的错误信息，或者是空字符串
 * @param error 错误对象
 * @returns void
 */
export type HandleErrorMessage = (error: AxiosResponse<any, any>, networkErrMsg: string) => void;

/**
 * 创建错误提示拦截器
 * @param axiosInstance axios 实例
 * @param handleErrorMessage 自定义错误信息处理函数
 * @returns 响应拦截器 ID, 用于移除拦截器
 */
export function createErrorMessageInterceptor(axiosInstance: AxiosInstance, handleErrorMessage: HandleErrorMessage): number {
  const responseInterceptorId = axiosInstance.interceptors.response.use(
    null,
    (error: any) => {
      // 如果请求被取消，则直接返回错误
      if (isCancel(error)) {
        return Promise.reject(error);
      }

      let networkErrMsg = '';

      // 如果请求是 axios 错误，则生成错误提示信息
      if (isAxiosError(error)) {
        const { response, message, code } = error
        const { status } = response || {}

        networkErrMsg = status ? httpStatusMsgMap[status] : ''

        if (code === 'ECONNABORTED' || message?.includes?.('timeout')) {
          networkErrMsg = httpMessageMap.requestTimeout;
        }

        if (code === 'ERR_NETWORK' || message?.includes?.('Network Error')) {
          networkErrMsg = httpMessageMap.networkError;
        }

        if (!networkErrMsg) {
          networkErrMsg = httpMessageMap.networkError;
        }
      }

      handleErrorMessage?.(error, networkErrMsg);
      return Promise.reject(error);
    });

  return responseInterceptorId;
};
