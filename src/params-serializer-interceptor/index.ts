import type { AxiosInstance } from 'axios';
import qs from 'qs';

/**
 * 参数序列化拦截器配置选项
 */
export type ParamsSerializerInterceptorOptions = {
  /**
   * 全局数组参数序列化格式
   *
   * @default 'indices' (qs 库默认格式)
   *
   * 格式说明：
   * - 'brackets': arr[]=1&arr[]=2
   * - 'indices': arr[0]=1&arr[1]=2
   * - 'repeat': arr=1&arr=2
   * - 'comma': arr=1,2
   */
  qsStringifyArrayFormat?: 'brackets' | 'indices' | 'repeat' | 'comma';
};

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * [createParamsSerializerInterceptor] 请求级别的数组参数序列化格式
     *
     * 当设置此属性时，会覆盖拦截器的全局配置，仅对当前请求生效。
     *
     * @example
     * ```typescript
     * // 覆盖全局配置，本次请求使用 comma 格式
     * axiosInstance.get('/api/data', {
     *   params: { tags: ['a', 'b'] },
     *   qsStringifyArrayFormat: 'comma' // tags=a,b
     * });
     * ```
     */
    qsStringifyArrayFormat?: 'brackets' | 'indices' | 'repeat' | 'comma';
  }
}

/**
 * 创建参数序列化请求拦截器
 *
 * 使用 qs 库对请求参数进行序列化，特别适用于需要发送 application/x-www-form-urlencoded 格式数据的场景。
 *
 * **功能特性：**
 * - 使用 qs 库自动序列化请求参数
 * - 支持多种数组参数序列化格式
 * - 支持全局配置和请求级别配置
 * - 请求级别配置会覆盖全局配置
 *
 * **类型扩展：**
 * 此拦截器会为 `AxiosRequestConfig` 扩展一个新的属性：
 * - `qsStringifyArrayFormat?: 'brackets' | 'indices' | 'repeat' | 'comma'`
 *
 * 这意味着在使用 axios 发送请求时，可以在请求配置中直接设置 `qsStringifyArrayFormat` 参数。
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { createParamsSerializerInterceptor } from 'axios-easy/params-serializer-interceptor';
 *
 * const axiosInstance = axios.create();
 *
 * // 1. 安装拦截器并设置全局配置
 * const interceptorId = createParamsSerializerInterceptor(axiosInstance, {
 *   qsStringifyArrayFormat: 'brackets' // 全局默认使用 arr[]=1&arr[]=2 格式
 * });
 *
 * // 2. 普通请求 - 使用全局配置
 * axiosInstance.get('/api/users', {
 *   params: {
 *     tags: ['frontend', 'backend'], // 序列化为: tags[]=frontend&tags[]=backend
 *     active: true,
 *     page: 1
 *   }
 * });
 *
 * // 3. 使用请求级别配置 - 覆盖全局配置
 * // 注意：qsStringifyArrayFormat 现在是 AxiosRequestConfig 的合法属性
 * axiosInstance.get('/api/search', {
 *   params: {
 *     categories: ['tech', 'news'],
 *     keywords: ['react', 'vue']
 *   },
 *   qsStringifyArrayFormat: 'comma' // 本次请求使用逗号分隔: categories=tech,news&keywords=react,vue
 * });
 *
 * // 4. POST 请求也支持
 * axiosInstance.post('/api/filter', {
 *   name: 'search'
 * }, {
 *   params: {
 *     filters: ['price', 'brand']
 *   },
 *   qsStringifyArrayFormat: 'repeat' // filters=price&filters=brand
 * });
 *
 * // 5. 不同格式对比示例
 * const testParams = { items: ['a', 'b', 'c'] };
 *
 * // brackets 格式 (默认)
 * axiosInstance.get('/test1', {
 *   params: testParams,
 *   qsStringifyArrayFormat: 'brackets'
 * }); // items[]=a&items[]=b&items[]=c
 *
 * // indices 格式
 * axiosInstance.get('/test2', {
 *   params: testParams,
 *   qsStringifyArrayFormat: 'indices'
 * }); // items[0]=a&items[1]=b&items[2]=c
 *
 * // repeat 格式
 * axiosInstance.get('/test3', {
 *   params: testParams,
 *   qsStringifyArrayFormat: 'repeat'
 * }); // items=a&items=b&items=c
 *
 * // comma 格式
 * axiosInstance.get('/test4', {
 *   params: testParams,
 *   qsStringifyArrayFormat: 'comma'
 * }); // items=a,b,c
 *
 * // 6. 移除拦截器
 * axiosInstance.interceptors.request.eject(interceptorId);
 * ```
 *
 * @param axiosInstance - axios 实例
 * @param options - 拦截器配置选项（可选）
 * @param options.qsStringifyArrayFormat - 全局数组参数序列化格式
 *   - 'brackets': arr[]=1&arr[]=2
 *   - 'indices': arr[0]=1&arr[1]=2 (qs 库默认格式)
 *   - 'repeat': arr=1&arr=2
 *   - 'comma': arr=1,2
 * @returns 请求拦截器 ID，用于移除拦截器
 */
export const createParamsSerializerInterceptor = (axiosInstance: AxiosInstance, options?: ParamsSerializerInterceptorOptions): number => {
  const { qsStringifyArrayFormat } = options || {};
  const requestInterceptorId = axiosInstance.interceptors.request.use((config) => {
    config.paramsSerializer = (params) => qs.stringify(params, {
      arrayFormat: config.qsStringifyArrayFormat || qsStringifyArrayFormat
    });
    return config;
  });

  return requestInterceptorId;
};
