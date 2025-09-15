import type { AxiosResponse, AxiosInstance } from 'axios';

import { isCancel, isAxiosError } from 'axios';
import { httpMessageMaps, getHttpStatusMsgMap, getGlobalLanguage, type SupportedLanguage } from './locale';

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
    /**
     * 错误信息语言
     * - zh: 中文
     * - en: 英文
     * @default 'zh'
     */
    errorMessageLanguage?: SupportedLanguage;
  }
}

// 导出类型和常量以便外部使用
export type { SupportedLanguage };
export { httpMessageMaps, httpMessageMapZH, setGlobalLanguage, getGlobalLanguage } from './locale';

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
 * @param defaultLanguage 默认语言，默认为中文。如果不提供，将使用全局语言设置
 * @returns 响应拦截器 ID, 用于移除拦截器
 */
export function createErrorMessageInterceptor(
  axiosInstance: AxiosInstance,
  handleErrorMessage: HandleErrorMessage,
  defaultLanguage: SupportedLanguage = 'zh'
): number {
  const responseInterceptorId = axiosInstance.interceptors.response.use(
    null,
    (error: any) => {
      // 如果请求被取消，则直接返回错误
      if (isCancel(error)) {
        return Promise.reject(error);
      }

      // 语言优先级：请求配置 > 全局语言设置 > createErrorMessageInterceptor 拦截器默认语言
      const requestLanguage = error?.config?.errorMessageLanguage as SupportedLanguage;
      const fallbackLanguage = getGlobalLanguage() || defaultLanguage;
      const language: SupportedLanguage = (requestLanguage && httpMessageMaps[requestLanguage])
        ? requestLanguage
        : fallbackLanguage;
      const messageMap = httpMessageMaps[language];
      const httpStatusMsgMap = getHttpStatusMsgMap(language);

      let networkErrMsg = '';

      // 如果请求是 axios 错误，则生成错误提示信息
      if (isAxiosError(error)) {
        const { response, message, code } = error
        const { status } = response || {}

        networkErrMsg = status ? httpStatusMsgMap[status] : ''

        if (code === 'ECONNABORTED' || message?.includes?.('timeout')) {
          networkErrMsg = messageMap.requestTimeout;
        }

        if (code === 'ERR_NETWORK' || message?.includes?.('Network Error')) {
          networkErrMsg = messageMap.networkError;
        }

        if (!networkErrMsg) {
          networkErrMsg = messageMap.networkError;
        }
      }

      handleErrorMessage?.(error, networkErrMsg);
      return Promise.reject(error);
    });

  return responseInterceptorId;
};
