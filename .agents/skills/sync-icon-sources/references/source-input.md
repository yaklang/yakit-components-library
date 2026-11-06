# MCP 获取结果的导入格式

Agent 将工具真实返回值整理为临时 JSON，用户不需要手工写。执行：

```sh
pnpm icons:import --input /absolute/path/icon-input.json
pnpm icons:update
pnpm icons:update --check
```

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
- `x`、`y`：可选，MCP 实际返回的节点坐标；未返回时不猜测。
- `evidence`：可选对象，原样保存实际返回的变量绑定、组件信息等补充证据。不能填入假想的空数组或审核结论。
- `paintReplacements`：可选，例如 `{ "#F28C45": "var(--Colors-Use-Neutral-Text-2-Primary, #F28C45)" }`。只在实际取得变量映射或用户指定时使用。目前只处理明确的 fill/stroke 属性颜色；需要样式或分层角色判断时不要猜测。
- Colorful 新增还需 `groupNodeId`，必须属于来源文件已有分组；`category` 可选校验。`retrievedAt` 可传真实采集时间；未传由导入器记录本次时间，重复导入不刷新。
- Outline/Solid 当前自动导入要求实际 COMPONENT；INSTANCE 要先通过 MCP 确认主组件并读取主组件链接，不能将扁平 SVG 当成已核实主组件。不同文件的来源或新分组需要明确迁移，导入器不会自动重设整个分类。

必需信息缺失、批次含重复节点、命名冲突、尺寸不符、下载失败：整批不写。报告失败项，可将有效项组成另一批处理，明确告知跳过项。已经拥有真实 raw SVG 的记录不会重复保存抓取时间。历史 Colorful 只有原始文件哈希时保留该事实，首次重新获取后才能保存完整 raw SVG。

导入仅更新来源 JSON，原始 SVG 位于记录的 `raw.svg`（Outline/Solid）或 `rawSvg`（Colorful）。生产文件由生成步骤写入原目录。`metadata` 与 `rawMetadata` 中旧的工具和审核信息属于历史采集，不代表本次 Agent 审核。

Outline 的生产尺寸为 24×24，Solid 为 20×20；不符合时停止，不能自行缩放来凑尺寸。Colorful 保留节点尺寸并统一 preserveAspectRatio。实际 Figma 变量证据可放在 `evidence.themePaintBindings`（token、fallbackHex、figmaVariableId、sourceNodeIds）。明确指定的 paintReplacements 单独作为项目颜色配置保存，不伪装成 Figma 变量证据；生成器仍检查变量名是否属于项目颜色包。

Solid 保留原始 stroke-width（包括遮罩配合的外侧描边），不套用 Outline 的 1.5 规则。检查与渲染对比也必须保留该宽度，不能先统一线宽再声称与远端一致。
