import type { NormalizeRequestPayloadOptions } from './utils/normalizeRequestPayload';
import type { SupportedLanguage } from './error-message-interceptor';

declare module 'axios' {
  export interface AxiosRequestConfig {
    // createDefaultRequestInterceptor 相关配置
    /**
     * 是否在请求前规范化传参（仅处理普通对象/数组）
     * - trim: 是否去除字符串首尾空白，默认 false
     * - dropUndefined: 是否删除值为 undefined 的键/数组元素，默认 false
     * - emptyStringToNull: 是否将空字符串转换为 null，默认 false
     *
     * 未设置时，等价于 `{ trim: false, dropUndefined: false, emptyStringToNull: false }`
     */
    normalizePayload?: NormalizeRequestPayloadOptions;

    // createDefaultResponseInterceptor 相关配置
    /**
     * 响应数据的返回方式。
     * - raw: 原始的 AxiosResponse，包括 headers、status 等，不做是否成功请求的检查。（返回 `axiosRes`）
     * - body: 返回响应数据的 body 部分。（返回 `axiosRes.data` ）
     * - data: 解构响应的 body 数据，只返回其中的 dataField 节点数据。（返回 `axiosRes.data.list`）
     * @default 'body'
     *
     * **axiosRes 是 axios 的默认响应对象**
     * ```ts
     * const axiosRes = {
        // `data` 由服务器提供的响应
        data: {
          code: 0,
          list: [],
          errorMessage: '',
        },
        // `status` 来自服务器响应的 HTTP 状态码
        status: 200,,
        // `headers` 是服务器响应头
        headers: {},
        ...
      }
     * ```
     */
    responseReturn?: 'body' | 'data' | 'raw';

    // createErrorMessageInterceptor 相关配置
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

export { }