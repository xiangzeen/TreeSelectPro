# TreeSelectPro 组件设计文档

## 1. 背景与目标

### 1.1 问题

`el-tree-select` 开启 `lazy`（懒加载）后，无法使用 `filterable`（搜索过滤）功能。原因是 lazy 模式下树节点并未全部加载到前端，组件内置的 filter 只对已加载的节点生效。

### 1.2 目标

构建一个替代组件，同时支持：

- 树形结构选择（单选 / 多选）
- 懒加载 + 搜索 同时工作
- 全量数据本地搜索
- 虚拟滚动（大数据量性能）
- 与 el-tree-select 相近的 API 和视觉风格

***

## 2. 技术选型

| 模块   | 方案                         | 理由                              |
| ---- | -------------------------- | ------------------------------- |
| 下拉容器 | `el-popover`               | 完全控制显隐，不受 el-select 内置过滤逻辑干扰    |
| 搜索框  | `el-input`                 | 独立 v-model，通过 watch 触发过滤，不受组件限制 |
| 树渲染  | `el-tree-v2`               | 虚拟滚动，支持万级节点无卡顿                  |
| 选中展示 | `el-tag` + `el-input`      | 模拟 el-select 多选/单选样式            |
| 状态管理 | Composition API (`useXxx`) | 逻辑拆分，可测试，可复用                    |

***

## 3. 架构概览

```
TreeSelectPro.vue（主组件）
├── useTreeFilter.ts（树过滤逻辑）
│   ├── filterTree() 递归过滤
│   ├── debouncedKeyword 防抖
│   └── allExpandKeys 展开计算
│
├── useTreeSelect.ts（选中逻辑）
│   ├── findNodeById() 节点查找
│   ├── selectNode() 选中/取消
│   ├── removeTag() 多选删除
│   └── updateDisplay() 值回显
│
└── types.ts（类型定义）
```

***

## 4. 数据流

### 4.1 搜索模式数据流

```
用户输入 keyword
    │
    ▼
watch(keyword) → debounce(300ms) → debouncedKeyword
    │
    ▼
useTreeFilter.filterTree(data, keyword)
    │
    ├── keyword == '' → 返回原始 data
    └── keyword != '' → 递归过滤，保留匹配节点及其祖先
    │
    ▼
filteredData（computed）→ 绑定 el-tree-v2 :data
    │
    ▼
keyword != '' → allExpandKeys 展开所有非叶节点
```

### 4.2 选中数据流

```
用户点击节点
    │
    ▼
useTreeSelect.selectNode(node)
    │
    ├── 单选: 记录 currentKey，计算 currentLabel，emit update:modelValue
    │        关闭 popover
    └── 多选: 切换 checkedKeys，更新 selectedTags，emit update:modelValue
    │        不关闭 popover
    │
    ▼
父组件 v-model 更新
```

### 4.3 回显数据流

```
组件 mounted / modelValue 变化
    │
    ▼
useTreeSelect.updateDisplay(value)
    │
    ├── null/undefined → 清空展示
    ├── 单选 → findNodeById → 取出 label → 显示在 el-input
    └── 多选 → 遍历 ids → 查找 label → 生成 selectedTags
```

***

## 5. 核心算法

### 5.1 树过滤算法

```typescript
function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  if (!keyword.trim()) return nodes

  return nodes.reduce<TreeNode[]>((acc, node) => {
    const nodeMatched = String(node[labelKey]).includes(keyword)
    const filteredChildren = node[childrenKey]
      ? filterTree(node[childrenKey], keyword)
      : []

    if (nodeMatched || filteredChildren.length > 0) {
      acc.push({ ...node, [childrenKey]: filteredChildren })
    }
    return acc
  }, [])
}
```

- 时间复杂度：**O(n)**，n = 总节点数
- 空间复杂度：**O(n)**，最坏情况全保留
- 策略：节点匹配 **或** 子孙中有匹配 → 保留该节点；否则移除

### 5.2 节点查找算法

```typescript
function findNodeById(nodes, id): TreeNode | null {
  for (const n of nodes) {
    if (n[valueKey] === id) return n
    if (n[childrenKey]) {
      const found = findNodeById(n[childrenKey], id)
      if (found) return found
    }
  }
  return null
}
```

用于回显时根据 value 查找 label。

***

## 6. 关键功能详解

### 6.1 懒加载 + 搜索（lazy: true）

当 `lazy: true` 且传入 `load` 函数时：

- **浏览模式**（keyword 为空）：`el-tree-v2` 按 lazy 模式工作，点击展开才触发 `load` 加载子节点
- **搜索模式**（keyword 非空）：使用 `filteredData`（从 `data` prop 过滤得到）替换 `el-tree-v2` 的 `:data`
  - 需要在搜索时**将全量数据通过 data prop 传入**
  - 搜索结果中自动展开所有非叶节点，使匹配节点可见
  - 选中搜索结果中的节点后，下次打开仍按 lazy 模式工作

> 注意：lazy + search 模式下，用户需要同时提供 `data`（用于搜索）和 `load`（用于懒加载）。搜索只在已提供的 `data` 范围内进行。

### 6.2 全量数据搜索（lazy: false）

当 `lazy: false` 时：

- **浏览模式**：直接渲染 `data` 完整树
- **搜索模式**：对 `data` 做本地过滤，替换 `:data` 为 `filteredData`

### 6.3 搜索高亮

使用 `el-tree-v2` 的 `#default` 插槽自定义渲染：

```typescript
function highlightText(label: string): string {
  const regex = new RegExp(`(${escape(keyword)})`, 'gi')
  return label.replace(regex, '<span class="tree-select-highlight">$1</span>')
}
```

通过 `v-html` 渲染，样式 `tree-select-highlight` 使用主题色高亮。

### 6.4 多选模式

- 启用 `show-checkbox` + `check-strictly` 严格模式
- 通过 `getCheckedKeys()` 获取选中值
- 触发器区域以 `el-tag` 形式展示已选项
- 可点击 tag 的 `closable` 按钮移除

### 6.5 键盘交互

| 按键            | 行为              |
| ------------- | --------------- |
| 点击触发器         | 打开 / 关闭 popover |
| 点击搜索框         | 自动聚焦            |
| 点击节点          | 选中（单选关闭，多选保持）   |
| 点击 tag 关闭     | 移除选中项           |
| 清除按钮          | 清空所有选中          |
| popover 打开时搜索 | 自动聚焦搜索框         |

***

## 7. Props 详细说明

| Prop               | 类型                                         | 默认值                                                                       | 说明                              |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------- |
| `modelValue`       | `string \| number \| (string \| number)[]` | —                                                                         | v-model 绑定值                     |
| `data`             | `TreeNode[]`                               | `[]`                                                                      | 树数据（全量或初始根节点）                   |
| `props`            | `{ label, value, children, isLeaf }`       | `{ label: 'label', value: 'id', children: 'children', isLeaf: 'isLeaf' }` | 字段映射                            |
| `multiple`         | `boolean`                                  | `false`                                                                   | 是否多选                            |
| `clearable`        | `boolean`                                  | `false`                                                                   | 是否可清除                           |
| `placeholder`      | `string`                                   | `'请选择'`                                                                   | 占位文字                            |
| `disabled`         | `boolean`                                  | `false`                                                                   | 是否禁用                            |
| `filterable`       | `boolean`                                  | `true`                                                                    | 是否启用搜索                          |
| `filterDelay`      | `number`                                   | `300`                                                                     | 搜索防抖延迟（ms）                      |
| `highlightKeyword` | `boolean`                                  | `true`                                                                    | 是否高亮搜索关键字                       |
| `lazy`             | `boolean`                                  | `false`                                                                   | 是否启用懒加载                         |
| `load`             | `Function`                                 | —                                                                         | 懒加载函数 `(node, resolve) => void` |
| `treeProps`        | `Record<string, any>`                      | —                                                                         | 透传给 el-tree-v2 的额外 props        |
| `size`             | `'default' \| 'small' \| 'large'`          | `'default'`                                                               | 尺寸                              |
| `popperWidth`      | `string`                                   | —                                                                         | 下拉面板宽度，默认与触发器同宽                 |

***

## 8. Events

| Event               | 参数                 | 说明         |
| ------------------- | ------------------ | ---------- |
| `update:modelValue` | `value`            | v-model 更新 |
| `change`            | `value`            | 选中值变化      |
| `clear`             | —                  | 清空         |
| `visible-change`    | `visible: boolean` | 下拉显隐变化     |
| `node-click`        | `node: TreeNode`   | 节点点击       |

***

## 9. 文件结构

```
TreeSelectPro/
├── index.ts              # 导出入口
├── types.ts              # TypeScript 类型定义
├── TreeSelectPro.vue     # 主组件
├── useTreeFilter.ts      # 树过滤逻辑（Composition API）
├── useTreeSelect.ts      # 选中逻辑（Composition API）
└── design.md             # 设计文档
```

***

## 10. 边界情况处理

| 场景                         | 处理方式                              |
| -------------------------- | --------------------------------- |
| modelValue 对应节点不存在于 data 中 | 显示 value 原始值，控制台 `console.warn`   |
| 搜索无匹配                      | 显示 "无匹配数据" 居中占位文字                 |
| 大数据量（1w+ 节点）               | el-tree-v2 虚拟滚动只渲染可视区域            |
| 搜索后选中                      | 下次打开 popover 时 keyword 自动清空，恢复完整树 |
| 多选删除 tag                   | 同步更新 checkedKeys 和 selectedTags   |
| 外部更新 data                  | data 变化时通过 watch 重新回显             |
| disabled 状态                | 禁止点击，显示禁用样式                       |
| clearable 点击               | 清空 modelValue + checkedKeys + 展示  |
| lazy + 搜索                  | 搜索使用 data 过滤，浏览使用 load 懒加载        |
| 搜索时展开过多节点                  | allExpandKeys 展开所有含子节点的节点         |

***

## 11. 使用示例

### 11.1 基础单选

```vue
<template>
  <TreeSelectPro
    v-model="selectedId"
    :data="treeData"
    :props="{ label: 'name', value: 'id' }"
    filterable
    clearable
    placeholder="请选择部门"
    @change="onChange"
  />
</template>
```

### 11.2 多选

```vue
<template>
  <TreeSelectPro
    v-model="selectedIds"
    :data="treeData"
    multiple
    filterable
    placeholder="请选择角色"
  />
</template>
```

### 11.3 懒加载 + 搜索

```vue
<template>
  <TreeSelectPro
    v-model="selectedId"
    :data="treeData"
    lazy
    :load="lazyLoad"
    filterable
    placeholder="请选择地区"
  />
</template>

<script setup>
const treeData = [
  { id: 1, label: '中国', isLeaf: false },
  { id: 2, label: '美国', isLeaf: false },
]

function lazyLoad(node, resolve) {
  // 根据 node.id 请求后端获取子节点
  const children = await fetchChildren(node.id)
  resolve(children)
}
</script>
```

### 11.4 全量数据搜索 + 小尺寸

```vue
<template>
  <TreeSelectPro
    v-model="selectedId"
    :data="largeTreeData"
    filterable
    size="small"
    :tree-props="{ defaultExpandAll: false }"
  />
</template>
```

***

## 12. 与 el-tree-select 对比

| 功能特性           | el-tree-select (lazy) | TreeSelectPro |
| -------------- | :-------------------: | :-----------: |
| 树形展示           |           ✔           |       ✔       |
| 懒加载            |           ✔           |       ✔       |
| 搜索（filterable） |      ✗（lazy 下无效）      |       ✔       |
| 搜索 + lazuy 同时  |           ✗           |       ✔       |
| 虚拟滚动（大数量）      |           ✗           | ✔（el-tree-v2） |
| 多选 + 复选框       |           ✔           |       ✔       |
| 清除             |           ✔           |       ✔       |
| 键盘导航           |           ✔           |      部分支持     |
| 搜索高亮           |           ✗           |       ✔       |
| 远程搜索           |          需改造          |   也支持（换数据源）   |

***

## 13. 性能考虑

| 场景           | 性能表现                                   |
| ------------ | -------------------------------------- |
| 100 节点       | 瞬间渲染，无压力                               |
| 10,000 节点    | el-tree-v2 虚拟滚动，渲染流畅                   |
| 100,000 节点搜索 | 过滤 O(n) \~ 100ms，可接受                   |
| 搜索后展开全部节点    | allExpandKeys 一次性设置，el-tree-v2 虚拟渲染无压力 |

***

## 14. 扩展方向

- **远程搜索**：keyword 变化时调用后端接口，替换 `filteredData` 数据源
- **自定义节点插槽**：暴露更灵活的 `#node` 插槽给使用者
- **层级展示**：选中时展示完整路径（如 "根节点 / 父节点 / 子节点"）
- **异步搜索 + 懒加载**：搜索时调接口，浏览时懒加载

