# yakit-components-library

Yakit 业务组件库 monorepo（pnpm workspace + Turborepo），对外发布两个独立遵循 SemVer 的 npm 包：

- **`@yakit-libs/yakit-ui`** — Yakit 的 React 组件库。npm 包附带与组件版本一致的静态 Storybook，可本地离线浏览。`@yakit-libs/yakit-ui/icons` 等路径是组件包里的兼容入口。
- **`@yakit-libs/yakit-ui-icons`** — 图标的规范包，源码在 `packages/yakit-ui-icons`。适合只需要图标、不想引入组件 peer dependencies 的场景。

图标源码在 `@yakit-libs/yakit-ui-icons`。`packages/yakit-ui/src/icons` 从该包再导出。两个包独立发版，版本号不要求一致。使用说明见 [packages/yakit-ui/README.md](packages/yakit-ui/README.md)。

## 仓库结构

```
├── packages/
│   ├── yakit-ui/         # 组件库 + 图标兼容入口 + Storybook（发布）
│   └── yakit-ui-icons/   # 图标源码（发布）
├── scripts/release/      # 发布流水线脚本
├── test/                 # 根级契约测试（发布状态机、自动导入契约）
└── docs/                 # 发布流程文档
```

## 离线图标目录

克隆仓库后，用浏览器直接打开 [图标目录](packages/yakit-ui-icons/catalog/index.html)，无需安装依赖或启动服务。包含 Outline、Solid、Colorful，支持 nodeId 精准搜索、分类分页，以及 Yakit、irify、memfit 三套品牌的亮暗主题。

维护时运行 `pnpm icons:update` 生成页面并随改动提交；`pnpm icons:check` 和 PR CI 会检查是否同步。详见 [图标维护说明](docs/icon-maintenance.md#离线图标查询页)。

## 环境要求

- Node.js `^22.11.0 || ^24.0.0 || >=26.0.0`
- pnpm `>=10.0.0 <11.0.0`（仓库通过 `packageManager` 锁定 `pnpm@10.34.5`，可用 `corepack pnpm ...` 调用）

## 常用命令

```bash
pnpm install                                        # 安装依赖
pnpm --filter @yakit-libs/yakit-ui storybook        # 本地启动组件文档站（端口 6006）
pnpm build                                          # turbo 构建全部包
pnpm lint                                           # turbo lint
pnpm check-types                                    # turbo 类型检查
pnpm --filter @yakit-libs/yakit-ui test             # 组件库测试（Vitest）
pnpm release:test                                   # 发布契约测试（node:test）
pnpm release:dry-run                                # 发布全链路演练（构建、校验、消费者试装、pack 预检）
```

## 发布

版本管理基于 Changesets，npm 发布走 Trusted Publishing（不在仓库保存任何 npm token），完整流程见 [docs/releasing-yakit-ui.md](docs/releasing-yakit-ui.md)。

## License

MIT
