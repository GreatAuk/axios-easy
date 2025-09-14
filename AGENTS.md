# 仓库指南

## 项目结构与模块组织
- 源码：`src/`（拦截器与工具，如 `default-request-interceptor/`、`utils/`、`openapi-ts-request-util.ts`）。
- 测试：`test/*.test.ts`，少量用例与源码同层的 `*.test.ts`。
- 构建产物：`dist/`（由 `tsdown` 生成），请勿直接修改。
- 配置：`tsconfig.json`、`tsdown.config.ts`、`vitest.config.ts`、`.vscode/`、CI 在 `.github/workflows/`。

## 构建、测试与开发命令
- `pnpm install`：安装依赖（`postinstall` 会更新陈旧依赖）。
- `pnpm dev`：开发模式，监听构建。
- `pnpm build`：使用 `tsdown` 产出到 `dist/`。
- `pnpm test`：运行 Vitest（交互/监听）。
- `pnpm test:once`：单次运行，CI 风格。
- `pnpm coverage`：生成覆盖率报告到 `coverage/`。
- `pnpm typecheck`：`tsc --noEmit` 严格类型检查。
- `pnpm lint`：使用 `oxlint` 修复风格问题。
- `pnpm release`：版本发布（维护者使用）。

## 代码风格与命名约定
- 语言：TypeScript，ESM；优先使用具名导出。
- 缩进 2 空格；合理使用尾随逗号；避免未使用导出。
- 目录/文件：拦截器目录使用 `kebab-case`；工具函数文件可与函数名对应的 `camelCase`（如 `getFilenameFromContentDisposition.ts`）。
- 类型/接口：`PascalCase`；变量/函数：`camelCase`。
- 保存时格式化（见 `.vscode/settings.json`）；统一通过 `pnpm lint` 处理。

## 测试规范
- 测试框架：Vitest。测试放在 `test/` 或同层 `*.test.ts`。
- 覆盖率：见 `vitest.config.ts`（覆盖 `src/**/*.ts`，排除聚合导出）。新增代码不降低覆盖率。
- 提交前本地执行：`pnpm test:once`。

## 提交与 Pull Request 指南
- 提交信息遵循 Conventional Commits：`feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`。
- PR 需包含：变更说明、关联 Issue（如 `Closes #123`）、必要的截图/日志、行为或 API 变更说明。
- 确保通过检查：`pnpm lint`、`pnpm typecheck`、`pnpm test:once`。

## 环境与工具
- Node `22.16.0`、pnpm `10.15.0`（见 `package.json.engines`）。请使用 `pnpm`，避免锁文件差异。
- 禁止直接修改 `dist/`；在 `src/` 更新源码并执行 `pnpm build`。
