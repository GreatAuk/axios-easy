import type { AxiosResponse } from 'axios';
import { saveAs } from 'file-saver'

import { getFilenameFromContentDisposition } from './getFilenameFromContentDisposition';

type Options = {
  /** 自定义文件名， 不使用 content-disposition 中的文件名 */
  fileName?: string;
  /** 自定义错误信息字段
   * @default 'errorCodeDes
   * 如果你后端的返回数据结构如下：那么 errorMessageField 为 'errorCodeDes'
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
  errorMessageField?: string;
};

/**
 * 处理下载文件场景下，接口返回的文件流
 * - 成功：直接触发浏览器文件下载，文件名来自 content-disposition 或自定义文件名
 * - 失败：返回错误信息。 如果后端返回了错误信息（json 格式），则返回错误信息，否则返回 '导出失败'
 * @param res axios 请求返回的原始响应数据
 * @param options 选项
 * @param options.fileName 自定义文件名， 不使用 content-disposition 中的文件名
 * @param options.errorMessageField 自定义错误信息字段
 * @returns errMsg 失败时返回错误信息， 成功时返回 undefined
 * @example
 * ```
 * const res = await axios.get('/api/export') // 返回文件流， res 是 axios 的原始数据
 * const errMsg = await processFileStream(res)
 * if (errMsg) {
 *  return message.error(errMsg)
 * }
 * message.success('导出成功')
 * ```
 */
export async function processFileStream(
  res: AxiosResponse<any>,
  options?: Options,
) {
  try {
    const { errorMessageField = 'errorCodeDes', fileName: customFileName } = options || {};
    const contentDisposition = res.headers?.['content-disposition'];
    if (res.data.type === 'application/json') {
      const json = JSON.parse(await res.data.text());
      return (json[errorMessageField] as string) || '导出失败';
    }
    const hasCustomFileName = Boolean(customFileName);
    if (!contentDisposition && !hasCustomFileName) {
      throw new Error('下载接口 response header 未定义 content-disposition');
    }
    const fileName = customFileName || getFilenameFromContentDisposition(contentDisposition ?? '');

    if (!fileName) {
      throw new Error('从 content-disposition 中获取文件名失败');
    }

    const blob = new Blob([res.data]);
    saveAs(blob, fileName);
  } catch (err) {
    console.error(err);
    return '导出失败';
  }
}
