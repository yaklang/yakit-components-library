# MCP 获取结果的导入格式

Agent 将工具真实返回值整理为临时 JSON，用户不需要手工写。仅更新来源时执行：

```sh
pnpm icons:import --input /absolute/path/icon-input.json
```

用户要求同步图标库时，导入后继续执行生成、检查和构建，完整步骤见 SKILL.md。

导入请求使用 `schemaVersion: 1`；落盘的来源 JSON 使用 `schemaVersion: 2`，两者是不同的数据格式。

```json
{
  "schemaVersion": 1,
  "icons": [
    {
      "url": "https://www.figma.com/design/QWct5XE0Bg0bNDQ93eYgEw/Icons?node-id=123-456",
      "family": "outline",
      "name": "Outline/arrow-up",
      "nodeType": "COMPONENT",
      "width": 24,
      "height": 24,
      "svgPath": "/absolute/mcp/downloads/123-456.svg"
    }
  ]
}
```

- URL、名称、类型、尺寸、SVG：来自用户链接和 MCP 实际响应。节点缺少尺寸时使用下载 SVG 根元素尺寸，传 `dimensionsSource: "svg-export"`，避免把导出尺寸冒充组件布局尺寸；默认 `node` 表示实际获取到节点尺寸。不能用生产 SVG 冒充 Figma 原始导出。
- `family`：现有记录优先；新增时根据节点所属分类确定，不明确就询问。
- `exportName`：可选。已有记录固定保留；新增英文名称可以自动转 PascalCase 加后缀。中文或含糊名称由 Agent 翻译建议、用户确认后明确传入。
- `colorBindings`：保存实际取得的颜色绑定，格式见下文。`variableTokens` 单独保存变量 ID 到项目 CSS token 的映射。
- `evidence`：可选对象，保存与图标自身有关的组件关系、提取过程及必要工具响应等补充证据。证据独立保存，通过 `evidenceFile` 引用。不能填入假想的空数组或审核结论。不登记 Figma 中的实例使用位置或实例覆盖；禁止传入 `evidence.placements`，包括空数组，否则整批导入报错。
- `paintReplacements`：可选，例如 `{ "#F28C45": "var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)" }`。只在实际取得变量映射或用户指定时使用。处理明确的 fill/stroke/stop-color 属性颜色，包括渐变色标；需要样式或分层角色判断时不要猜测。
- `groupNodeId`：传实际取得的分组节点 ID，必须属于来源文件中已登记的分组。未传时保留已有记录的已知分组；新增 Outline/Solid 且分组未知时保存 null，不根据分类猜测。
- Colorful 新增必须提供 `groupNodeId`；`category` 可选，用于校验项目分类标识。
- `retrievedAt`：可选的真实采集时间。新增记录或原稿变化时使用本次提供的时间，未提供则省略；原稿相同时保留已有时间，不刷新。
- Outline/Solid 当前自动导入要求实际 COMPONENT；INSTANCE 要先通过 MCP 确认主组件并读取主组件链接，不能将扁平 SVG 当成已核实主组件。不同文件的来源或新分组需要明确迁移，导入器不会自动重设整个分类。

必需信息缺失、批次含重复节点、命名冲突、尺寸不符、下载失败：整批不写。报告失败项，可将有效项组成另一批处理，明确告知跳过项。相同输入不制造文件差异。来源更新整批写入，失败回滚。

导入只更新来源 JSON、独立原始 SVG、必要项目配置及证据文件，不写生产源码。来源使用 schemaVersion 2，SVG 路径为 `config/icon-sources/svg/<fileKey>/<nodeId短横线>.svg`，通过 `svgFile` 引用。生产文件由 `icons:update` 生成。

Outline 生产尺寸为 24×24，Solid 为 20×20；不符合时停止，不能自行缩放。Colorful 保留节点尺寸并统一 preserveAspectRatio。全部 Figma 记录参与生成，无需额外开关。

`colorBindings` 可显式提供 `{ "status": "unknown" | "none" | "captured", "bindings": [] }`。unknown 表示尚未获取，none 表示确认无绑定，captured 保存真实证据。绑定字段包括 figmaVariableId、sourceNodeIds、fallbackHex、targets；targets 的 locator 是从 SVG 根节点开始的元素子节点索引数组，attribute 支持 fill/stroke/stop-color，expectedValue 是原稿中真实颜色。`variableTokens` 单独将变量 ID 映射到项目 CSS token。使用精确绑定时，只转换指定元素的颜色属性，相同色值的其他元素保持固定色；需要转换的绑定若定位重复、缺失或与原稿不匹配则报错。

`paintReplacements` 是明确的项目颜色替换规则，按色值匹配 fill、stroke、stop-color 属性，可能同时影响多个同色元素；需要区分同色元素时使用有真实定位证据的精确绑定。该规则保存于项目 `transform.paintReplacements`，不作为 Figma 绑定证据。原稿变化且没有新的绑定证据时标记 unknown；相同输入保持既有绑定证据。

## 生成规则

- Outline 的真实描边统一为 1.5；纯填充图形保持填充，不补造描边。
- Solid、Colorful 保留原稿的 stroke-width，包括蒙版相关描边；检查和渲染对比也保留该宽度。
- Outline、Solid、Colorful 全部从当前原稿和项目配置生成生产 SVG，内部定义 ID 及引用统一处理，保持蒙版、裁剪和渐变关系完整。原稿文件不做这些转换。
- 生成内容与现有文件完全一致时不写文件。检查以当前原稿和规则为准，不使用历史视觉基线。
- Oldicon 的素材、组件和入口手工维护，不参与来源导入或生产 SVG 生成。
- Loading 组件手工维护，自行定义动画和默认线宽，不参加统一线宽检查。
