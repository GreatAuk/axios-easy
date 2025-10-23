# 自动发布脚本说明

## 功能

这个脚本可以自动完成以下发布任务：

1. **发布到 npm 公共仓库**
   - 执行 `pnpm build` 构建项目
   - 发布到 `https://registry.npmjs.org/`

2. **发布到公司私有 npm 仓库**
   - 备份 `package.json` 文件
   - 修改包名为 `@sp/axios-easy`
   - 发布到 `http://spnpm.sdptest.shengpay.com/`
   - 自动还原 `package.json` 文件

## 使用方法

```bash
# 执行自动发布脚本（发布到两个仓库）
pnpm release:all

# 或者直接运行脚本
node script/index.js
```

## 注意事项

1. 确保已经安装了所有依赖：`pnpm install`
2. 确保已经登录到 npm 和私有 npm 仓库
3. 脚本会自动处理 `package.json` 的备份和还原
4. 如果发布到私有仓库失败，脚本会自动还原 `package.json`
5. 版本号更新由 `bumpp` 交互式完成

## 技术实现

- 使用 `tinyexec` 执行命令行工具
- 使用 Node.js 原生 `fs/promises` 进行文件操作
- 完善的错误处理和日志输出
- 自动还原机制确保 `package.json` 不会被意外修改
