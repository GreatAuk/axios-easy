import { describe, it, expect } from 'vitest'
import { getFilenameFromContentDisposition } from '../../src/utils/getFilenameFromContentDisposition'

// RFC-5987 格式示例
describe('getFilenameFromContentDisposition', () => {
  it('happy path', () => {
    const header1 = "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6.zip"; // 包含中文 "测试文件.zip"
    expect(getFilenameFromContentDisposition(header1)).toBe('测试文件.zip')
    const header2 = 'attachment; filename="a simple file.txt"';
    expect(getFilenameFromContentDisposition(header2)).toBe('a simple file.txt')
    const header3 = 'inline; filename=another-file.pdf';
    expect(getFilenameFromContentDisposition(header3)).toBe('another-file.pdf')
    const header4 = 'form-data; name="file"; filename="report with spaces.docx"';
    expect(getFilenameFromContentDisposition(header4)).toBe('report with spaces.docx')
    const header5 = 'attachment; filename="semicolon;.txt"'; // 包含分号的带引号文件名
    expect(getFilenameFromContentDisposition(header5)).toMatchInlineSnapshot(`"semicolon;.txt"`)
    const header6 = 'invalid header';
    expect(getFilenameFromContentDisposition(header6)).toBeNull()
  })
  it('should return null when content-disposition is empty', () => {
    // @ts-expect-error test empty
    expect(getFilenameFromContentDisposition()).toBeNull()
    expect(getFilenameFromContentDisposition('')).toBeNull()
  })

  it('should parse RFC-5987 filename* format', () => {
    const cd = "attachment; filename*=UTF-8''%e2%82%ac%20rates.pdf"
    expect(getFilenameFromContentDisposition(cd)).toBe('€ rates.pdf')
  })

  it('should parse standard filename="" format', () => {
    const cd = 'attachment; filename="example.pdf"'
    expect(getFilenameFromContentDisposition(cd)).toBe('example.pdf')
  })

  it('should parse standard filename without quotes', () => {
    const cd = 'attachment; filename=example.pdf'
    expect(getFilenameFromContentDisposition(cd)).toBe('example.pdf')
  })

  it('should decode percent-encoded filename', () => {
    const cd = 'attachment; filename="%E4%B8%AD%E6%96%87.pdf"'
    expect(getFilenameFromContentDisposition(cd)).toBe('中文.pdf')
  })

  it('should fallback to raw value if decode fails', () => {
    // %E4%B8% invalid encoding will cause decodeURIComponent to throw
    const raw = '%E4%23432B8%ad.pdf'
    const cd = `attachment; filename*=UTF-8''${raw}`
    expect(getFilenameFromContentDisposition(cd)).toBe(raw)
  })
})
