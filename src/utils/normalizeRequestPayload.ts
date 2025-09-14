export type NormalizeRequestPayloadOptions = {
  /** 是否去除字符串首尾空白字符 @default true */
  trim?: boolean;
  /** 是否删除值为 undefined 的键 @default false */
  dropUndefined?: boolean;
  /** 是否将空字符串转换为 null @default false */
  emptyStringToNull?: boolean;
};

/** 判断是否为普通对象（不包含 Date、FormData、URLSearchParams 等） */
function isPlainObject(val: unknown): val is Record<string, any> {
  if (Object.prototype.toString.call(val) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

/** 是否为可遍历的容器对象（数组或普通对象） */
function isContainer(val: unknown): val is any[] | Record<string, any> {
  return Array.isArray(val) || isPlainObject(val);
}

function normalizeDeep<T>(value: T, opts: Required<NormalizeRequestPayloadOptions>): T {
  const { trim, emptyStringToNull, dropUndefined } = opts;

  const handlePrimitive = (v: any) => {
    if (typeof v === 'string') {
      const s = trim ? v.trim() : v;
      if (emptyStringToNull && s === '') return null;
      return s as any;
    }
    return v;
  };

  if (!isContainer(value)) return handlePrimitive(value) as T;

  if (Array.isArray(value)) {
    const out: any[] = [];
    for (const item of value) {
      const next = normalizeDeep(item, opts);
      if (!(dropUndefined && typeof next === 'undefined')) out.push(next);
    }
    return out as any as T;
  }

  const obj = value as Record<string, any>;
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    const next = isContainer(v) ? normalizeDeep(v, opts) : handlePrimitive(v);
    if (dropUndefined && typeof next === 'undefined') continue;
    out[key] = next;
  }
  return out as any as T;
}

/**
 * 规范化请求负载（对象/数组）
 * - trim 字符串（可选，默认开）
 * - 删除值为 undefined 的键（可选，默认关）；数组元素中的 undefined 也会被移除
 * - 将空字符串转为 null（可选，默认关）
 * - 不会修改非普通对象：Date、FormData、Blob、File、URLSearchParams、Buffer、Stream 等
 */
export function normalizeRequestPayload<T = any>(
  payload: T,
  options?: NormalizeRequestPayloadOptions,
): T {
  const opts: Required<NormalizeRequestPayloadOptions> = {
    trim: true,
    dropUndefined: false,
    emptyStringToNull: false,
    ...options,
  }

  return normalizeDeep(payload, opts);
}
