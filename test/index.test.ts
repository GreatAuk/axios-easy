import type { AxiosInstance, AxiosResponse } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createErrorMessageInterceptor } from '../src/error-message-interceptor';
import { createDefaultResponseInterceptor } from '../src/default-response-interceptor';

type Response = {
  resultCode: 'SUCCESS' | 'FAIL';
  data: any;
  errorCode?: string;
  errorCodeDes?: string;
}

function makeResponseError(message: string, errorCode: string) {
  return {
    resultCode: 'FAIL',
    errorCode,
    errorCodeDes: message,
  };
}

describe('组合使用拦截器', () => {
  const axiosInstance: AxiosInstance = axios.create()
  let interceptorIds: number[] = []
  const mock: MockAdapter = new MockAdapter(axiosInstance);

  afterEach(() => {
    mock.reset();
    interceptorIds.forEach(interceptorId => {
      axiosInstance.interceptors.response.eject(interceptorId);
    })
    interceptorIds = []
    vi.restoreAllMocks()
  });

  it('处理业务报错', async () => {
    const mockMessage = vi.fn();
    const mockDialog = vi.fn();

    interceptorIds.push(
      createDefaultResponseInterceptor(axiosInstance, {
        codeField: 'resultCode',
        dataField: 'data',
        successCode: 'SUCCESS',
        isThrowWhenFail: true,
      }),
      createErrorMessageInterceptor(axiosInstance, {
        handler: (error: AxiosResponse<Response, any>, errMsg) => {
          const { data, config } = error;
          if (config?.errorMessageMode === 'none') {
            return;
          }

          const errorMessage = data?.errorCodeDes || errMsg || data?.errorCode

          if (config?.errorMessageMode === 'message') {
            mockMessage(errorMessage);
          } else if (config?.errorMessageMode === 'modal') {
            mockDialog(errorMessage);
          }
        }
      })
    )

    const errorMessage = 'Pet not found';
    const mockResponse = makeResponseError(errorMessage, 'PET_NOT_FOUND');

    mock.onGet('/api/pet/1').reply(200, mockResponse);
    mock.onGet('/api/pet/2').reply(200, mockResponse);

    const response = await axiosInstance.get<typeof mockResponse>('/api/pet/1', {
      errorMessageMode: 'message',
    }).catch((_) => { })
    const response2 = await axiosInstance.get<typeof mockResponse>('/api/pet/2', {
      errorMessageMode: 'modal',
    }).catch((_) => { })

    expect(mockMessage).toHaveBeenCalledWith(errorMessage)
    expect(response).toMatchInlineSnapshot(`undefined`)

    expect(mockDialog).toHaveBeenCalledWith(errorMessage)
    expect(response2).toMatchInlineSnapshot(`undefined`)
  })
});