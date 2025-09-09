import type { AxiosError, AxiosResponse } from 'axios';
import axios from 'axios'
import { createDefaultResponseInterceptor } from 'simple-axios/default-response-interceptor'
import { createErrorMessageInterceptor } from 'simple-axios/error-message-interceptor'
import { createDefaultRequestInterceptor } from 'simple-axios/default-request-interceptor'
import { createAuthenticateInterceptor } from 'simple-axios/authenticate-interceptor'

// 请求重试功能，如果使用，请安装 axios-retry
// import axiosRetry from 'axios-retry';

/** 接口返回数据结构 */
type Response<T> = {
  /** 状态码 */
  resultCode: 'FAIL' | 'SUCCESS';
  /** 真实数据 */
  data: T;
  /** 错误码 */
  errorCode?: string;
  /** 错误描述, resultCode 为 FAIL 时才有 */
  errorCodeDes?: string;
};

/** 登录失效错误码 */
const AUTH_ERROR_CODES = [
  'KICK_OUT', // Token已被踢下线
  'LOGIN_REPLACE', // 登录被顶下线
  'NOT_TOKEN',
  'TOKEN_DEFAULT_ERROR', // 当前会话未登录
  'TOKEN_TIMEOUT', // Token 已过期
]

const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  responseReturn: 'body',
  timeout: 30 * 1000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8',
  },
})

// 用户自定义请求拦截器
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 默认请求拦截器
createDefaultRequestInterceptor(axiosInstance, {
  extendTimeoutWhenDownload: true,
})

// 默认响应拦截器
createDefaultResponseInterceptor(axiosInstance, {
  codeField: 'resultCode',
  dataField: 'data',
  successCode: 'SUCCESS',
  isThrowWhenFail: true,
})

// 认证拦截器, 支持无感刷新 token。用于登录失效
createAuthenticateInterceptor(axiosInstance, {
  // 判断是否登录失效
  isAuthenticateFailed: (error: AxiosError<Response<any>, any>) => {
    const { errorCode } = error.response?.data || {}
    return error.response?.status === 401 || AUTH_ERROR_CODES.includes(errorCode!)
  },
  // 登录失效或刷新 token 失败后的行为，一般是跳转登录页面
  doReAuthenticate: async (error: AxiosError<Response<any>, any>) => {
    const { errorCode } = error.response?.data || {} // 可以针对后端返回的错误码进行不同处理
    window.location.href = '/login';
  },
  // 调用刷新 token 接口
  doRefreshToken: async (error: AxiosError<Response<any>, any>) => {
    const res = await axiosInstance.post('/refresh-token', { refreshToken: localStorage.getItem('refresh_token') });
    const { token, refreshToken } = res.data;
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken)
  },
  enableRefreshToken: true, // 启用无感刷新 token 功能
})

// 请求重试，如果使用，请安装 axios-retry
// axiosRetry(axiosInstance, {
//   retries: 3
// })

// 错误信息拦截器, 统一处理错误信息提示。
// 这里只需要针对后端返回的错误码进行不同处理。其他的如请求超时、网络异常，http 状态码等，已经在默认响应拦截器中处理成 networkErrMsg 了
createErrorMessageInterceptor(axiosInstance, (error: AxiosResponse<Response<any>, any>, networkErrMsg) => {
  const { data, config } = error;

  // 如果单独配置了不提示错误信息，则直接返回
  if (config?.errorMessageMode === 'none') {
    return;
  }

  const errorMessage = data?.errorCodeDes || networkErrMsg || data?.errorCode

  if (config?.errorMessageMode === 'message') {
    // 如果没有错误信息，则会根据状态码进行提示
    ElMessage({
      message: errorMessage,
      type: 'error',
      plain: true,
      grouping: true,
    });
  } else if (config?.errorMessageMode === 'modal') {
    ElMessageBox({
      title: '错误提示',
      message: errorMessage,
      type: 'error',
      showCancelButton: false,
      confirmButtonText: '知道了',
    }).catch(() => { });
  }
})
