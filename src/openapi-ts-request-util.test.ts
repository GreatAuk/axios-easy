import { describe, it, expect } from 'vitest';

import {
  toUpperFirstLetter,
  camelize,
  patchApiJSON,
} from './openapi-ts-request-util';

// 单元测试：toUpperFirstLetter
describe('toUpperFirstLetter', () => {
  it('应该把首字母转为大写', () => {
    expect(toUpperFirstLetter('hello')).toBe('Hello');
  });

  it('如果首字母已经是大写则保持不变', () => {
    expect(toUpperFirstLetter('Hello')).toBe('Hello');
  });

  it('空字符串应返回空字符串', () => {
    expect(toUpperFirstLetter('')).toBe('');
  });
});

// 单元测试：camelize
describe('camelize', () => {
  it('应将空格分隔的单词转成驼峰命名', () => {
    expect(camelize('hello world')).toBe('helloWorld');
    expect(camelize('Hello World')).toBe('helloWorld');
  });

  it('空字符串返回空字符串', () => {
    expect(camelize('')).toBe('');
  });
});

// 单元测试：patchApiJSON
describe('patchApiJSON', () => {
  it('应按照规则修改 tags 及 path 中的 tag', () => {
    const apiJSON = {
      tags: [
        {
          name: '用户管理',
          description: 'User Management',
        },
        {
          name: '订单管理',
          description: 'Order Management',
        },
      ],
      paths: {
        '/api/user/list': {
          get: {
            tags: ['用户管理'],
          },
        },
        '/api/order/list': {
          post: {
            tags: ['订单管理'],
          },
        },
      },
    };

    const patched = patchApiJSON(apiJSON);

    // tags 的 name 应被替换为 description 的驼峰命名
    expect(patched.tags[0].name).toBe('userManagement');
    expect(patched.tags[1].name).toBe('orderManagement');

    // paths 内部的 tags 应替换为 description
    expect(patched.paths['/api/user/list'].get.tags).toEqual([
      'User Management',
    ]);
    expect(patched.paths['/api/order/list'].post.tags).toEqual([
      'Order Management',
    ]);
  });
});
