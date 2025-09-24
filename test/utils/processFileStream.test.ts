import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processFileStream } from '../../src/utils/processFileStream';
import { saveAs as originSaveAs } from 'file-saver';

// 将 saveAs 断言为 vitest 的 mock 以便访问调用信息
const mockedSaveAs = originSaveAs as unknown as ReturnType<typeof vi.fn>;

// mock file-saver 的 saveAs 方法
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const createAxiosResponse = (data: any, headers: Record<string, string> = {}) => ({
  data,
  headers,
  // 下面这些字段在此测试中不会用到，但为保证类型完整简单填充
  status: 200,
  statusText: 'OK',
  config: {},
  request: {},
} as any);


describe('processFileStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功下载：应触发 saveAs 并返回 undefined', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const res = createAxiosResponse(blob, {
      'content-disposition': 'attachment; filename="test.txt"',
    });
    const ret = await processFileStream(res as any);

    expect(ret).toBeUndefined();
    expect(mockedSaveAs).toHaveBeenCalledTimes(1);
    const [calledBlob, fileName] = mockedSaveAs.mock.calls[0];
    // 验证文件名
    expect(fileName).toBe('test.txt');
    // 验证 blob 内容长度
    expect((calledBlob as Blob).size).toBe(blob.size);
  });

  it('后端返回 json 错误信息：应返回错误信息字符串', async () => {
    const errJson = { errorCodeDes: '出错啦' };
    const blob = new Blob([JSON.stringify(errJson)], { type: 'application/json' });
    // Blob.text() 会返回 json 字符串，符合实现要求
    const res = createAxiosResponse(blob);
    const ret = await processFileStream(res as any);

    expect(ret).toBe('出错啦');
    expect(mockedSaveAs).not.toHaveBeenCalled();
  });

  it('后端返回 json 但无 error 字段：应返回 "导出失败"', async () => {
    const errJson = { message: '其他字段' };
    const blob = new Blob([JSON.stringify(errJson)], { type: 'application/json' });
    const res = createAxiosResponse(blob);
    const ret = await processFileStream(res as any);

    expect(ret).toBe('导出失败');
    expect(mockedSaveAs).not.toHaveBeenCalled();
  });

  it('后端返回 json 错误信息，使用自定义 errorMessageField：应返回对应错误信息', async () => {
    const errJson = { msg: '自定义错误' };
    const blob = new Blob([JSON.stringify(errJson)], { type: 'application/json' });
    const res = createAxiosResponse(blob);
    const ret = await processFileStream(res as any, { errorMessageField: 'msg' });

    expect(ret).toBe('自定义错误');
    expect(mockedSaveAs).not.toHaveBeenCalled();
  });

  it('传入 options.fileName：应使用自定义文件名而非 content-disposition', async () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    const res = createAxiosResponse(blob, {
      'content-disposition': 'attachment; filename="server.txt"',
    });
    const ret = await processFileStream(res as any, { fileName: 'custom.txt' });

    expect(ret).toBeUndefined();
    expect(mockedSaveAs).toHaveBeenCalledTimes(1);
    const [_, fileName] = mockedSaveAs.mock.calls[0];
    expect(fileName).toBe('custom.txt');
  });

  it('缺少 content-disposition 但提供自定义文件名：应使用自定义文件名', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const res = createAxiosResponse(blob, undefined as any);

    const ret = await processFileStream(res as any, { fileName: 'custom.txt' });

    expect(ret).toBeUndefined();
    expect(mockedSaveAs).toHaveBeenCalledTimes(1);
    const [_, fileName] = mockedSaveAs.mock.calls[0];
    expect(fileName).toBe('custom.txt');
  });

  it('缺少 content-disposition 且非 json：应返回 "导出失败"', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const res = createAxiosResponse(blob);

    const ret = await processFileStream(res as any).catch((_) => { });

    expect(ret).toBe('导出失败');
    expect(mockedSaveAs).not.toHaveBeenCalled();
  });
});
