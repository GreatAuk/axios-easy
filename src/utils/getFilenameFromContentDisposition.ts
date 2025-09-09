/**
 * 从 content-disposition 中获取文件名, 支持 filename*=(RFC-5987) 和 filename= 格式
 * @param contentDisposition content-disposition
 * @returns 文件名
 */
export function getFilenameFromContentDisposition(contentDisposition: string) {
  if (!contentDisposition) return null

  // 1. 优先尝试 RFC-5987 的 filename* 格式 (例如: filename*=UTF-8''%e2%82%ac%20rates.pdf)
  const filenameStarRegex = /filename\*=(?:utf-8|UTF-8)''([^;]+)/i;
  const rfc5987Match = contentDisposition.match(filenameStarRegex);

  if (rfc5987Match && rfc5987Match[1]) {
    return decodeFilename(rfc5987Match[1]);
  }

  // 2. 尝试匹配标准 filename= 格式
  const filenameRegex = /filename=\s*("([^"]+)"|([^;]+))/i;
  const filenameMatch = contentDisposition.match(filenameRegex);

  if (filenameMatch && filenameMatch[1]) {
    return decodeFilename(filenameMatch[1]);
  }

  return null;
}

function decodeFilename(filename: string) {
  try {
    return decodeURIComponent(filename.replace(/\\"/g, '"').replace(/^"|"$/g, ''));
  } catch {
    return filename;
  }
}