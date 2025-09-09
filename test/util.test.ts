import { describe, it, expect } from 'vitest';
import { isFunction } from '../src/util';

describe('isFunction', () => {
  it('should return true if the value is a function', () => {
    expect(isFunction(() => { })).toBe(true);
  });
  it('should return false if the value is not a function', () => {
    expect(isFunction(1)).toBe(false);
  });
  it('should return false if the value is null', () => {
    expect(isFunction(null)).toBe(false);
  });
  it('should return false if the value is undefined', () => {
    expect(isFunction(undefined)).toBe(false);
  });
  it('should return false if the value is an object', () => {
    expect(isFunction({})).toBe(false);
  });
  it('should return false if the value is an array', () => {
    expect(isFunction([])).toBe(false);
  });
  it('should return false if the value is a string', () => {
    expect(isFunction('')).toBe(false);
  });
});