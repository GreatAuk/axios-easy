import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      'index': './src/index.ts',
      'default-request-interceptor': './src/default-request-interceptor/index.ts',
      'default-response-interceptor': './src/default-response-interceptor/index.ts',
      'error-message-interceptor': './src/error-message-interceptor/index.ts',
      'authenticate-interceptor': './src/authenticate-interceptor/index.ts',
      'params-serializer-interceptor': './src/params-serializer-interceptor/index.ts',
      'utils': "./src/utils/index.ts",
      'openapi-ts-request-util': './src/openapi-ts-request-util.ts',
    },
    platform: 'neutral',
    dts: true,
  },
])
