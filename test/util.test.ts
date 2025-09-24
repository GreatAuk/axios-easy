import { describe, it, expect } from 'vitest';
import { isFunction, isUndefined } from '../src/util';

describe('share util functions', () => {
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

  describe('isUndefined', () => {
    it('should return true if the value is undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
    });
    it('should return false if the value is null', () => {
      expect(isUndefined(null)).toBe(false);
    });
  });
});
