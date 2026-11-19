# 图标怎么添加和更新

公共图标由 `packages/yakit-ui-icons` 维护。UI 通过图标包的公开入口使用，组件内部的私有 SVG 仍归 UI。

## 日常流程

1. 设计师修改 Figma，或业务反馈图标有问题。
2. 把需要更新的 Figma 节点链接或 nodeId 发给 Agent，说明要更新来源还是同步到图标库。
3. Agent 获取指定节点的信息与 SVG，通过 `pnpm icons:import` 保存来源信息和独立原稿。仅要求更新来源时，到此结束。
4. 运行 `pnpm icons:update`，生成本地 SVG、组件导出、名称目录、Storybook 展示数据和离线查询页。
5. 运行 `pnpm icons:check`，验证当前来源、生成结果、规则、功能和类型。
6. 需要检查发布产物时单独构建，再提交 PR。

Figma 后续又有变化，需要通过下一次更新 PR 进入仓库。检查不访问远端，也不声称已经与此刻的远端一致。

## 命令有什么区别

| 命令                                                 | 做什么                                       | 是否写来源或生成文件 |
| ---------------------------------------------------- | -------------------------------------------- | -------------------- |
| `pnpm icons:import --input <文件绝对路径>`           | 导入 Agent 获取的原稿和节点信息              | 是                   |
| `pnpm icons:update`                                  | 生成 SVG、导出和相关配置                     | 是                   |
| `pnpm icons:update --family outline`                 | 更新指定分类                                 | 是                   |
| `pnpm icons:update --check`                          | 检查是否漏生成、生成结果是否过期             | 否                   |
| `pnpm icons:check`                                   | 生成检查、来源与规则审计、功能测试、类型检查 | 否                   |
| `pnpm --filter @yakit-libs/yakit-ui-icons run build` | 生成可以发布的组件代码和类型                 | 只写构建产物         |

`icons:check` 已包含生成检查，不需要再单独运行 `icons:update --check`。测试会生成临时文件和测试结果，但不会重写原稿或生产 SVG。图标包内也有独立的 `icons:check`，不依赖 UI 源码；根目录入口额外检查私有资源登记和展示集成。

生成前先验证完整结果，失败不写入；写入中失败会撤回本次写入。重复执行应没有差异。删来源记录不会自动删公开导出，改名、删除要作为明确的兼容性变更处理。

## 哪些文件需要维护

- `packages/yakit-ui-icons/config/icon-sources/` 是三个 Figma 分类的来源入口，保存节点身份、原稿引用和实际颜色绑定。
- `src/` 中的 SVG 是实际使用的素材；Outline、Solid、Colorful 全部由原稿和项目规则生成；Oldicon 手工维护。
- 分类入口、名称目录、描边能力表和 Storybook 分组由脚本生成，不手填数量或哈希。
- `test/fixtures/icons/` 只保存转换、颜色、引用和渲染功能样本，不保存业务图标的历史外观标准。

当前 Figma 原稿用于核对生成结果，确认转换没有丢失图形；项目声明的主题颜色、Outline 线宽和内部 ID 转换允许与原稿不同。

## 来源结构与字段约定

| 文件                                                         | 保存内容                                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/icon-sources/{outline,solid,colorful}.json`          | schemaVersion 2、分类、fileKey、真实分组；逐图 nodeId、原始名称、groupNodeId、svgFile、colorBindings，以及已取得的节点类型、尺寸、采集时间、evidenceFile |
| `config/icon-sources/svg/<fileKey>/<nodeId短横线>.svg`       | Figma 来源 SVG；确认存在展开描边的 Outline 保存提取中心线后的 SVG                                                                                                               |
| `config/icon-project/<分类>.json`                            | 导出名、生产路径、默认颜色、变量到 CSS token 的映射、按色值替换和必要转换例外                                                                            |
| `config/icon-display.json`                                   | 项目分类标识、Storybook 标签、导航和人工顺序                                                                                                             |
| `config/icon-sources/evidence/<fileKey>/<nodeId短横线>.json` | 仍影响提取或图形语义的采集证据                                                                                                                           |

图标来源只维护图标自身，不登记 Figma 中的实例使用位置、实例覆盖或实例数量。导入请求不接受 `evidence.placements`（包括空数组），会在写入前报错。其他必要的图形提取证据继续通过 `evidenceFile` 保存。

`groupNodeId` 保存实际取得的分组节点 ID。导入时未提供分组，则保留已有记录的已知分组；新增 Outline/Solid 且分组未知时保存 null，不根据分类推测远端父节点。Colorful 新增记录必须指定已登记的实际分组。

审计清单由当前来源与产物在内存计算，`#manifest`、`#raw`、`#placement` 是只读视图。Loading 的手写组件入口配置保存在 `config/icon-sources/loading.json`。导入请求的 schemaVersion 为 1，落盘的 Figma 来源 JSON 为 2，两者分别定义输入格式和存储格式。

`colorBindings.status` 的 `unknown` 表示未取得证据，`none` 表示已确认无绑定，`captured` 保存真实绑定；缺失信息不补造。绑定可保留 `figmaVariableId`、`sourceNodeIds`、解析颜色 `fallbackHex`，并用 `targets: [{ locator: [0, 1], attribute: "fill", expectedValue: "#F28C45" }]` 精确定位原稿元素及颜色属性。locator 从 SVG 根节点沿元素子节点索引定位；支持 fill、stroke、stop-color。CSS token 单独在项目配置的 `variableTokens` 中映射。定位重复或与原稿不符时失败，不按相同颜色猜测目标。

按色值替换保存在项目 `transform.paintReplacements`，可能同时影响多个同色元素，不作为精确 Figma 绑定证据。需要区分同色元素时使用有真实定位证据的绑定。三个 Figma 分类的全部记录每次都重新计算，生成文本与现有文件完全一致时不写文件；原稿修改但归一化结果相同也不会重写产物。

Outline 下载结果中可能同时存在原生描边、实心细节和已展开的描边。导入器用当前 Figma 节点的中心线还原可确认的描边图层，按原线宽与本次下载结果做渲染对照；其他图层原样保留。采集参数和离线导入格式见[图标来源输入说明](../.agents/skills/sync-icon-sources/references/source-input.md)。

## SVG 结构核对

Outline、Solid 的结构测试读取 `config/icon-sources/svg/` 中当前原稿，对照生产 SVG 的标签、嵌套和属性。允许的差异必须来自项目声明的转换，例如主题前景色、Outline 1.5 描边和内部引用 ID。Solid 保留原稿描边；纯填充 Outline 保持填充，由生成器计算固定填充能力，不要求重画中心线。

生产 SVG 与当前原稿不匹配时，检查导入、项目配置和转换逻辑；设计变化时重新获取原稿，通过生成和检查后提交 PR。检查以当前原稿和规则为准，不访问远端，也不使用历史截图或旧版图形基线。

## 离线图标查询页

克隆仓库后直接用浏览器打开 `packages/yakit-ui-icons/catalog/index.html`，不需要安装依赖或启动服务。页面只包含 Outline、Solid、Colorful，每页 60 个，显示 Figma 名称、组件名和 nodeId。

搜索仅精准匹配完整 nodeId，支持 `123:456` 和 `123-456`，忽略首尾空格；不搜索名称，不接受模糊查询。可筛选分类、翻页、点击组件名或 nodeId 复制。浏览器不允许离线剪贴板操作时可手动选中文字复制。

页面内嵌当前生产 SVG、查询数据、脚本和六套品牌配色，每个图标的内部 ID 独立。Yakit、irify、memfit 各支持亮暗模式；固定颜色保持原色，绑定主题变量的颜色随主题切换。品牌主色统一维护在 `packages/yakit-ui-icons/config/brand-themes.json`，Storybook 复用该配置。

目录只保留生成同步、数据覆盖和内部引用的非浏览器测试；搜索、分页、复制、主题和窄屏交互由内部使用人员手动检查。图标组件本身仍运行浏览器、SSR、水合和类型测试。

页面由 `scripts/catalog/` 模板和生成器输出，不手改 HTML。根目录及图标包的 `icons:update` 均生成页面；指定三个分类中的任一分类时也会刷新完整目录。生成结果随图标改动一起提交，`icons:update --check` 和 `icons:check` 会检查是否同步，PR CI 已执行该检查。仅修改页面产物仍会触发图标检查，修改模板、生成器或品牌配置还会触发平台检查。不等待 Version Packages PR 才生成，因此目录始终对应当前仓库内容，不代表 npm 最新发布版本。

## 获取、命名和分类

Agent 使用 `.agents/skills/sync-icon-sources/SKILL.md`。先通过 fileKey + nodeId 查所有分类及 UI 私有来源，已有图标保留公开名称、分类和兼容路径。只给 nodeId 且无法确认文件时才补充询问；已经明确要求同步时不重复确认。

新增 Figma SVG 用 nodeId 文件名，例如 `47351-7055.svg`。英文组件名使用 PascalCase，并加 `Outlined`、`Solid` 或 `Colorful`。名称含义不清楚、分类不明确或重名时再询问。

- Outline 的真实描边统一为 1.5。纯填充原稿允许保留，标记为固定填充，不猜测中心线，也不承诺能通过 `strokeWidth` 改粗细。
- Solid 保留原稿描边，Colorful 保留多色。只有明确的变量绑定或指定映射才转换主题颜色。
- 蒙版、渐变和内部引用要完整；无法可靠转换时报告具体节点，不通过修改测试答案掩盖问题。
- Oldicon 以 `src/oldicon/assets/` 为准，不登记来源，不由 `icons:update` 生成。修改素材不需要改文件名；新增时手写 `icons/<组件名>.tsx` 并在 `src/oldicon/index.tsx` 注册，保留现有别名和深层路径。`--family oldicon` 会提示手工维护。Loading 的动画及参数逻辑继续手写。

## CI 和平台

PR 按改动模块检查；图标模块检查当前全量图标。合并到 main 不再启动普通质量 CI，发布工作流仍独立判断版本准备和发布。pre/\*\* 推送保留现有触发。

脚本、依赖或构建配置变化时，验证 Windows、Linux、macOS；普通 SVG 更新不重复跑三个平台。脚本通过 Node.js 处理文件和启动工具，不依赖 macOS 路径或 Unix shell。浏览器使用当前可用的 Playwright 环境，不比较历史系统或浏览器哈希。

维护和校验不会自动提交、推送或发布。
