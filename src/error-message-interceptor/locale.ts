/** 支持的语言类型 */
export type SupportedLanguage = 'zh' | 'en';

/** 错误信息多语言映射 */
export const httpMessageMaps: Record<SupportedLanguage, Record<string, string>> = {
  zh: {
    "requestTimeout": "请求超时，请稍后再试。",
    "networkError": "网络异常，请检查您的网络连接后重试。",
    "badRequest": "请求错误。请检查您的输入并重试。",
    "unauthorized": "登录认证过期，请重新登录后继续。",
    "forbidden": "禁止访问, 您没有权限访问此资源。",
    "notFound": "未找到, 请求的资源不存在。",
    "internalServerError": "内部服务器错误，请稍后再试。"
  },
  en: {
    "requestTimeout": "Request timeout, please try again later.",
    "networkError": "Network error, please check your network connection and try again.",
    "badRequest": "Bad request. Please check your input and try again.",
    "unauthorized": "Authentication expired, please log in again to continue.",
    "forbidden": "Access forbidden, you do not have permission to access this resource.",
    "notFound": "Not found, the requested resource does not exist.",
    "internalServerError": "Internal server error, please try again later."
  }
};

/** 全局语言状态管理 */
let globalLanguage: SupportedLanguage | undefined = undefined;

/** 设置全局语言 */
export function setGlobalLanguage(language: SupportedLanguage | undefined): void {
  globalLanguage = language;
}

/** 获取当前全局语言 */
export function getGlobalLanguage(): SupportedLanguage | undefined {
  return globalLanguage;
}

/** 向后兼容的中文错误信息映射 */
export const httpMessageMapZH = httpMessageMaps.zh;

/** 获取指定语言的状态码错误信息映射 */
export function getHttpStatusMsgMap(language: SupportedLanguage = 'zh'): Record<number, string> {
  const messageMap = httpMessageMaps[language];
  return {
    400: messageMap.badRequest,
    401: messageMap.unauthorized,
    403: messageMap.forbidden,
    404: messageMap.notFound,
    408: messageMap.requestTimeout,
  };
}
