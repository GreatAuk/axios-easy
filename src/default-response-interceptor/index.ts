import type { AxiosInstance } from 'axios';

import { isFunction, isUndefined } from '../util';

export type ResponseReturn = 'body' | 'data' | 'raw';

declare module 'axios' {
  export interface AxiosRequestConfig {
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
    responseReturn?: ResponseReturn;
  }
}

export type DefaultResponseInterceptorOptions = {
  /** 响应数据中代表访问结果的字段名
   * @default 'code'
   */
  codeField: string;
  /** 响应数据中装载实际数据的字段名，或者提供一个函数从响应数据中解析需要返回的数据
   * @default 'data'
   */
  dataField: ((response: any) => any) | string;
  /** 当 codeField 所指定的字段值与 successCode 相同时，代表接口访问成功。如果提供一个函数，则返回 true 代表接口访问成功
   * @default 0
   */
  successCode: ((code: any) => boolean) | number | string;
  /** 是否在接口访问失败时(业务报错)抛出错误。 如 codeField 所指定的字段值与 successCode 不相同时，抛出错误
   *
   * 设置为 `true` 后，业务错误将进入 `catch` 块。
   * @default true
   */
  isThrowWhenFail?: boolean;
};

/**
 * 返回结构-响应拦截器
 * @param options.codeField - 响应数据中代表访问结果的字段名, 默认值为 'code'
 * @param options.dataField - 响应数据中装载实际数据的字段名，或者提供一个函数从响应数据中解析需要返回的数据, 默认值为 'data'
 * @param options.successCode - 当 codeField 所指定的字段值与 successCode 相同时，代表接口访问成功。如果提供一个函数，则返回 true 代表接口访问成功, 默认值为 0
 * @param options.isThrowWhenFail - 是否在接口访问失败时(业务报错)抛出错误。 如 codeField 所指定的字段值与 successCode 不相同时，抛出错误, 默认值为 true
 * @returns 拦截器 ID, 用于移除拦截器
 *
 * 如果后端返回的数据结构如下：那么 codeField 为 'resultCode'，dataField 为 'data'，successCode 为 'SUCCESS'
 * ```ts
 * type Response<T> = {
 *   // 结果码
 *   resultCode: 'FAIL' | 'SUCCESS';
 *   // 数据
 *   data: T;
 *   // 错误码
 *   errorCode?: string;
 *   // 错误描述, resultCode 为 FAIL 时才有
 *   errorCodeDes?: string;
 * };
 * ```
 */
export const createDefaultResponseInterceptor = (axiosInstance: AxiosInstance, {
  codeField = 'code',
  dataField = 'data',
  successCode = 0,
  isThrowWhenFail = true,
}: DefaultResponseInterceptorOptions): number => {

  const responseInterceptorId = axiosInstance.interceptors.response.use(
    (response) => {
      const { config, data } = response;
      const { responseReturn } = config;
      // 直接返回未经处理的 axios 响应对象
      if (responseReturn === 'raw') {
        return response;
      }

      // 当接口返回 204 No Content、HEAD 请求或其它无正文响应时，data 可能为 undefined
      if (isUndefined(data)) {
        return data;
      }

      const codeValue = (data as any)?.[codeField];

      const isSuccess = isFunction(successCode)
        ? successCode(codeValue)
        : codeValue === successCode;

      if (!isSuccess && isThrowWhenFail) {
        return Promise.reject(response)
      }

      // 返回完整响应体
      if (responseReturn === 'body') {
        return data;
      }

      // 返回业务数据字段
      return isFunction(dataField) ? dataField(data) : data[dataField];
    },
    null,
  )

  return responseInterceptorId;
};
