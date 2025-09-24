export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

export const isUndefined = (val: unknown): val is undefined =>
  typeof val === 'undefined'