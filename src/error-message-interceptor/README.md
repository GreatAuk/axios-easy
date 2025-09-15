# 错误信息拦截器 (Error Message Interceptor)

错误信息拦截器用于统一处理 HTTP 请求错误，并提供用户友好的错误提示信息。支持中英文国际化。

## 功能特性

- 🌐 **国际化支持**：支持中文和英文错误信息
- 🔄 **自动错误识别**：自动识别网络错误、超时错误和 HTTP 状态码错误
- ⚙️ **灵活配置**：支持全局默认语言和单个请求语言设置
- 🎯 **向后兼容**：保持与现有代码的完全兼容性

## 基本使用

```typescript
import axios from 'axios';
import { createErrorMessageInterceptor } from 'axios-easy';

const axiosInstance = axios.create();

// 创建错误信息拦截器（默认中文）
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    console.error('错误信息:', errorMessage);
    // 这里可以调用你的 UI 组件显示错误，如：
    // message.error(errorMessage); // Element Plus
    // notification.error({ message: errorMessage }); // Ant Design
  }
);
```

## 国际化使用

### 全局语言设置（推荐）

```typescript
import { setGlobalLanguage, getGlobalLanguage } from 'axios-easy';

// 设置全局语言为英文
setGlobalLanguage('en');

// 创建拦截器时不需要指定语言，会自动使用全局设置
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    console.error('Error:', errorMessage);
  }
);

// 动态切换语言
setGlobalLanguage('zh'); // 切换到中文
console.log(getGlobalLanguage()); // 输出: 'zh'
```

### 拦截器级别设置默认语言

```typescript
// 设置默认为英文（优先于全局语言设置）
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    console.error('Error:', errorMessage);
  },
  'en' // 拦截器默认语言为英文
);
```

### 单个请求设置语言

```typescript
// 全局默认中文，但某个请求使用英文
try {
  const response = await axiosInstance.get('/api/users', {
    errorMessageLanguage: 'en' // 这个请求使用英文错误信息
  });
} catch (error) {
  // 错误信息将使用英文显示
}
```

### 语言优先级

语言选择遵循以下优先级（从高到低）：

1. **请求配置语言** - 单个请求中的 `errorMessageLanguage`
2. **全局语言设置** - 通过 `setGlobalLanguage()` 设置的全局语言
3. **拦截器默认语言** - 创建拦截器时指定的默认语言

```typescript
// 示例：演示语言优先级
setGlobalLanguage('zh'); // 全局设置为中文

const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    console.error(errorMessage);
  },
  'en' // 拦截器默认为英文，优先于全局设置
);

try {
  // 这个请求将使用中文错误信息，优先于拦截器默认语言和全局语言
  const response = await axiosInstance.get('/api/data', {
    errorMessageLanguage: 'zh'
  });
} catch (error) {
  // 错误信息将显示中文
}
```

### 实际应用场景

```typescript
// 应用启动时根据用户偏好设置全局语言
const userLanguage = localStorage.getItem('language') || 'zh';
setGlobalLanguage(userLanguage as 'zh' | 'en');

// 创建拦截器，自动使用全局语言设置
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    message.error(errorMessage);
  }
);

// 用户切换语言时
function switchLanguage(newLanguage: 'zh' | 'en') {
  setGlobalLanguage(newLanguage);
  localStorage.setItem('language', newLanguage);
  // 后续所有请求的错误信息都会使用新语言
}
```

## 错误信息映射

### 中文错误信息

- **400**: "请求错误。请检查您的输入并重试。"
- **401**: "登录认证过期，请重新登录后继续。"
- **403**: "禁止访问, 您没有权限访问此资源。"
- **404**: "未找到, 请求的资源不存在。"
- **408**: "请求超时，请稍后再试。"
- **网络错误**: "网络异常，请检查您的网络连接后重试。"
- **请求超时**: "请求超时，请稍后再试。"

### 英文错误信息

- **400**: "Bad request. Please check your input and try again."
- **401**: "Authentication expired, please log in again to continue."
- **403**: "Access forbidden, you do not have permission to access this resource."
- **404**: "Not found, the requested resource does not exist."
- **408**: "Request timeout, please try again later."
- **Network Error**: "Network error, please check your network connection and try again."
- **Request Timeout**: "Request timeout, please try again later."

## 高级用法

### 与 UI 框架集成

```typescript
// Element Plus 集成
import { ElMessage } from 'element-plus';

const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    ElMessage.error(errorMessage);
  },
  'zh'
);

// Ant Design 集成
import { message } from 'antd';

const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    message.error(errorMessage);
  },
  'en'
);
```

### 错误分类处理

```typescript
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    if (error.response?.status === 401) {
      // 处理认证错误，跳转到登录页
      router.push('/login');
    } else if (error.response?.status >= 500) {
      // 服务器错误，显示通用错误信息
      showErrorModal(errorMessage);
    } else {
      // 其他错误，显示具体错误信息
      showErrorToast(errorMessage);
    }
  }
);
```

## API 参考

### createErrorMessageInterceptor

```typescript
function createErrorMessageInterceptor(
  axiosInstance: AxiosInstance,
  handleErrorMessage: HandleErrorMessage,
  defaultLanguage?: SupportedLanguage
): number
```

**参数**：

- `axiosInstance`: Axios 实例
- `handleErrorMessage`: 错误处理函数
- `defaultLanguage`: 拦截器默认语言，可选。如果不提供，将使用全局语言设置

**返回值**：

- `number`: 拦截器 ID，用于移除拦截器

### setGlobalLanguage

```typescript
function setGlobalLanguage(language: SupportedLanguage): void
```

设置全局默认语言。

**参数**：

- `language`: 要设置的语言 ('zh' | 'en')

### getGlobalLanguage

```typescript
function getGlobalLanguage(): SupportedLanguage
```

获取当前全局语言设置。

**返回值**：

- `SupportedLanguage`: 当前全局语言

### HandleErrorMessage

```typescript
type HandleErrorMessage = (error: AxiosResponse<any, any>, networkErrMsg: string) => void;
```

**参数**：

- `error`: Axios 错误对象
- `networkErrMsg`: 格式化后的错误信息

### SupportedLanguage

```typescript
type SupportedLanguage = 'zh' | 'en';
```

支持的语言类型：

- `'zh'`: 中文
- `'en'`: 英文

## 移除拦截器

```typescript
// 移除拦截器
axiosInstance.interceptors.response.eject(interceptorId);
```

## 向后兼容性

现有的代码无需任何修改即可继续使用，所有新功能都是可选的：

```typescript
// 现有代码保持不变
const interceptorId = createErrorMessageInterceptor(
  axiosInstance,
  (error, errorMessage) => {
    message.error(errorMessage); // 默认显示中文错误信息
  }
);
```

## 最佳实践

### 1. 推荐使用全局语言设置

```typescript
// ✅ 推荐：使用全局语言设置
setGlobalLanguage('en');
const interceptorId = createErrorMessageInterceptor(axiosInstance, handleError);

// ❌ 不推荐：每个拦截器都指定语言
const interceptorId = createErrorMessageInterceptor(axiosInstance, handleError, 'en');
```

### 2. 应用初始化时设置语言

```typescript
// 应用启动时设置
function initializeApp() {
  const savedLanguage = localStorage.getItem('language') || 'zh';
  setGlobalLanguage(savedLanguage as 'zh' | 'en');

  // 创建 axios 拦截器
  createErrorMessageInterceptor(axiosInstance, handleError);
}
```

### 3. 响应式语言切换

```typescript
// React 示例
function useLanguage() {
  const [language, setLanguage] = useState<'zh' | 'en'>(() => getGlobalLanguage());

  const switchLanguage = (newLanguage: 'zh' | 'en') => {
    setGlobalLanguage(newLanguage);
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  return { language, switchLanguage };
}
```

### 4. 特殊场景使用请求级语言

```typescript
// 只在特殊情况下使用请求级语言设置
async function fetchDataForSpecificLocale(locale: 'zh' | 'en') {
  try {
    const response = await axiosInstance.get('/api/data', {
      errorMessageLanguage: locale // 特定请求使用特定语言
    });
    return response.data;
  } catch (error) {
    // 错误信息会使用指定的语言显示
    throw error;
  }
}
```
