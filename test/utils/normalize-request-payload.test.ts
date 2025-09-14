import { describe, it, expect } from 'vitest';

import { normalizeRequestPayload } from '../../src/utils';

describe('normalizeRequestPayload', () => {
  describe('默认行为', () => {
    it('应 trim 字符串但不删除 undefined（dropUndefined 默认为 false）', () => {
      const input = {
        name: ' John ',
        nick: undefined as unknown as string,
        nested: {
          title: '  hi  ',
          skip: undefined as unknown as string,
        },
        arr: [' a ', 'b', undefined as unknown as string],
      };

      const out = normalizeRequestPayload(input);
      expect(out).toEqual({
        name: 'John',
        nick: undefined,
        nested: { title: 'hi', skip: undefined },
        arr: ['a', 'b', undefined],
      });
    });

    it('应处理基本数据类型', () => {
      const input = {
        str: ' text ',
        num: 42,
        bool: true,
        nullVal: null,
        undefinedVal: undefined,
      };

      const out = normalizeRequestPayload(input);
      expect(out).toEqual({
        str: 'text',
        num: 42,
        bool: true,
        nullVal: null,
        undefinedVal: undefined,
      });
    });
  });

  describe('边界情况', () => {
    it('应处理 null 输入', () => {
      expect(normalizeRequestPayload(null)).toBe(null);
    });

    it('应处理 undefined 输入', () => {
      expect(normalizeRequestPayload(undefined)).toBe(undefined);
    });

    it('应处理空对象', () => {
      expect(normalizeRequestPayload({})).toEqual({});
    });

    it('应处理空数组', () => {
      expect(normalizeRequestPayload([])).toEqual([]);
    });

    it('应处理只包含空字符串的对象', () => {
      const input = { a: '', b: '   ', c: 'text' };
      const out = normalizeRequestPayload(input);
      expect(out).toEqual({ a: '', b: '', c: 'text' });
    });

    it('应处理深层嵌套对象', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              text: '  deep  ',
              arr: [' a ', { nested: '  b  ' }],
            },
          },
        },
      };

      const out = normalizeRequestPayload(input);
      expect(out).toEqual({
        level1: {
          level2: {
            level3: {
              text: 'deep',
              arr: ['a', { nested: 'b' }],
            },
          },
        },
      });
    });

    it('应处理混合类型数组', () => {
      const input = [' str ', 42, true, null, undefined, { key: ' val ' }];
      const out = normalizeRequestPayload(input);
      expect(out).toEqual(['str', 42, true, null, undefined, { key: 'val' }]);
    });

    it('应处理嵌套数组', () => {
      const input = [
        [' a ', ' b '],
        [{ text: ' c ' }, [' d ']],
      ];
      const out = normalizeRequestPayload(input);
      expect(out).toEqual([
        ['a', 'b'],
        [{ text: 'c' }, ['d']],
      ]);
    });
  });

  describe('dropUndefined 选项', () => {
    it('当 dropUndefined=true 时应删除 undefined 值', () => {
      const input = {
        name: ' John ',
        nick: undefined as unknown as string,
        nested: {
          title: '  hi  ',
          skip: undefined as unknown as string,
        },
        arr: [' a ', 'b', undefined as unknown as string],
      };

      const out = normalizeRequestPayload(input, { dropUndefined: true });
      expect(out).toEqual({
        name: 'John',
        nested: { title: 'hi' },
        arr: ['a', 'b'],
      });
    });

    it('当 dropUndefined=false 时应保留 undefined 值', () => {
      const input = { a: undefined, b: 'text' };
      const out = normalizeRequestPayload(input, { dropUndefined: false });
      expect(out).toEqual({ a: undefined, b: 'text' });
    });

    it('应从数组中移除 undefined 元素（当 dropUndefined=true）', () => {
      const input = [undefined, 'a', undefined, 'b', undefined];
      const out = normalizeRequestPayload(input, { dropUndefined: true });
      expect(out).toEqual(['a', 'b']);
    });
  });

  describe('emptyStringToNull 选项', () => {
    it('当 emptyStringToNull=true 时，空字符串应转为 null（trim 后判断）', () => {
      const out = normalizeRequestPayload(
        { a: '   ', b: ['', '  ', 'x'] },
        { emptyStringToNull: true },
      );
      expect(out).toEqual({ a: null, b: [null, null, 'x'] });
    });

    it('当 emptyStringToNull=false 时应保留空字符串', () => {
      const out = normalizeRequestPayload(
        { a: '', b: '  ' },
        { emptyStringToNull: false },
      );
      expect(out).toEqual({ a: '', b: '' });
    });

    it('emptyStringToNull 应与 trim 配合工作', () => {
      const out = normalizeRequestPayload(
        { a: '   ', b: 'text' },
        { trim: true, emptyStringToNull: true },
      );
      expect(out).toEqual({ a: null, b: 'text' });
    });
  });

  describe('trim 选项', () => {
    it('当 trim=false 时应保留字符串空白', () => {
      const out = normalizeRequestPayload(
        { s: ' a ', arr: [' b ', '  c  '] },
        { trim: false },
      );
      expect(out).toEqual({ s: ' a ', arr: [' b ', '  c  '] });
    });

    it('当 trim=true 时应去除字符串空白', () => {
      const out = normalizeRequestPayload(
        { s: ' a ', arr: [' b ', '  c  '] },
        { trim: true },
      );
      expect(out).toEqual({ s: 'a', arr: ['b', 'c'] });
    });

    it('应只对字符串类型进行 trim 处理', () => {
      const input = {
        str: ' text ',
        num: 42,
        bool: true,
        nullVal: null,
      };
      const out = normalizeRequestPayload(input, { trim: true });
      expect(out).toEqual({
        str: 'text',
        num: 42,
        bool: true,
        nullVal: null,
      });
    });
  });

  describe('选项组合', () => {
    it('禁用所有选项时应保持原样', () => {
      const out = normalizeRequestPayload(
        { s: ' a ', x: undefined, arr: [' a ', undefined] },
        { trim: false, dropUndefined: false, emptyStringToNull: false },
      );
      expect(out).toEqual({ s: ' a ', x: undefined, arr: [' a ', undefined] });
    });

    it('启用所有选项时应全部生效', () => {
      const input = {
        text: ' hello ',
        empty: '  ',
        undef: undefined,
        arr: [' a ', '', undefined],
      };
      const out = normalizeRequestPayload(input, {
        trim: true,
        dropUndefined: true,
        emptyStringToNull: true,
      });
      expect(out).toEqual({
        text: 'hello',
        empty: null,
        arr: ['a', null],
      });
    });

    it('trim + dropUndefined 组合', () => {
      const input = {
        text: ' hello ',
        undef: undefined,
        nested: { text: ' world ', undef: undefined },
      };
      const out = normalizeRequestPayload(input, {
        trim: true,
        dropUndefined: true,
      });
      expect(out).toEqual({
        text: 'hello',
        nested: { text: 'world' },
      });
    });

    it('emptyStringToNull + dropUndefined 组合', () => {
      const input = {
        empty: '  ',
        undef: undefined,
        text: 'hello',
      };
      const out = normalizeRequestPayload(input, {
        emptyStringToNull: true,
        dropUndefined: true,
      });
      expect(out).toEqual({
        empty: null,
        text: 'hello',
      });
    });
  });

  describe('非普通对象保持不变', () => {
    it('应保持 Date、Buffer、FormData、URLSearchParams 不变', () => {
      const d = new Date('2024-01-01T00:00:00.000Z');
      const buf = Buffer.from(' hello ');
      const fd = new FormData();
      fd.append('file', new Blob([' x '], { type: 'text/plain' }), 'x.txt');
      const usp = new URLSearchParams('q=  hi  ');

      const out = normalizeRequestPayload({ d, buf, fd, usp });
      expect(out.d).toBe(d);
      expect(out.buf).toBe(buf);
      expect(out.fd).toBe(fd);
      expect(out.usp).toBe(usp);
    });

    it('应保持 Blob 和 File 对象不变', () => {
      const blob = new Blob([' content '], { type: 'text/plain' });
      const file = new File([' file content '], 'test.txt', { type: 'text/plain' });

      const out = normalizeRequestPayload({ blob, file });
      expect(out.blob).toBe(blob);
      expect(out.file).toBe(file);
    });

    it('应保持正则表达式对象不变', () => {
      const regex = /test\s+pattern/gi;
      const out = normalizeRequestPayload({ regex });
      expect(out.regex).toBe(regex);
    });

    it('应保持 Map 和 Set 对象不变', () => {
      const map = new Map([['key', ' value ']]);
      const set = new Set([' item ']);

      const out = normalizeRequestPayload({ map, set });
      expect(out.map).toBe(map);
      expect(out.set).toBe(set);
    });

    it('应保持 Error 对象不变', () => {
      const error = new Error('test error');
      const out = normalizeRequestPayload({ error });
      expect(out.error).toBe(error);
    });

    it('应保持函数不变', () => {
      const fn = () => 'test';
      const out = normalizeRequestPayload({ fn });
      expect(out.fn).toBe(fn);
    });
  });

  describe('类型安全', () => {
    it('应保持输入类型', () => {
      interface TestInput {
        name: string;
        age?: number;
      }

      const input: TestInput = { name: ' John ', age: 25 };
      const out = normalizeRequestPayload(input);

      /* 验证类型推断正确 */
      expect(typeof out.name).toBe('string');
      expect(typeof out.age).toBe('number');
      expect(out).toEqual({ name: 'John', age: 25 });
    });

    it('应正确处理泛型约束', () => {
      const input = [' a ', ' b ', ' c '];
      const out = normalizeRequestPayload<string[]>(input);

      expect(Array.isArray(out)).toBe(true);
      expect(out).toEqual(['a', 'b', 'c']);
    });
  });
});