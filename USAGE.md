# TreeSelectPro — 完整用法文档

基于 `el-popover` + `el-input` + `el-tree-v2` 封装，替代 `el-tree-select`，支持搜索 + 懒加载 + 多选折叠等功能。

***

## 安装

```bash
npm install @element-plus/icons-vue
```

组件需要同时安装 `vue@3`、`element-plus@2`、`@element-plus/icons-vue`。

***

## 快速开始

```vue
<script setup lang="ts">
import { ref } from 'vue'
import TreeSelectPro from './TreeSelectPro/index.ts'
import type { TreeNode } from './TreeSelectPro/types.ts'

const selectedId = ref<number | null>(null)
const treeData: TreeNode[] = [
  {
    id: 1,
    name: '产品研发中心',
    children: [
      { id: 11, name: '前端组' },
      { id: 12, name: '后端组' },
    ],
  },
]
</script>

<template>
  <TreeSelectPro
    v-model="selectedId"
    :data="treeData"
    :props="{ label: 'name', value: 'id', children: 'children' }"
    filterable
    clearable
    placeholder="请选择"
  />
</template>
```

***

## Props

| Prop                  | 类型                                                 | 默认值                                                                       | 说明                                                    |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `modelValue`          | `string \| number \| (string \| number)[] \| null` | —                                                                         | v-model 绑定值                                           |
| `data`                | `TreeNode[]`                                       | `[]`                                                                      | 树数据                                                   |
| `props`               | `{ label?, value?, children?, isLeaf? }`           | `{ label: 'label', value: 'id', children: 'children', isLeaf: 'isLeaf' }` | 字段映射                                                  |
| `multiple`            | `boolean`                                          | `false`                                                                   | 是否多选                                                  |
| `checkStrictly`       | `boolean`                                          | `false`                                                                   | 多选时父子是否独立勾选（`true` 表示不关联）                             |
| `clearable`           | `boolean`                                          | `false`                                                                   | 是否可清除                                                 |
| `placeholder`         | `string`                                           | `'请选择'`                                                                   | 占位文本                                                  |
| `disabled`            | `boolean`                                          | `false`                                                                   | 是否禁用                                                  |
| `filterable`          | `boolean`                                          | `true`                                                                    | 是否启用搜索                                                |
| `filterDelay`         | `number`                                           | `300`                                                                     | 搜索防抖延迟（ms）                                            |
| `highlightKeyword`    | `boolean`                                          | `true`                                                                    | 是否高亮搜索结果中的匹配文字                                        |
| `lazy`                | `boolean`                                          | `false`                                                                   | 是否懒加载子节点                                              |
| `load`                | `(node, resolve) => void`                          | —                                                                         | 懒加载函数，配合 `lazy` 使用                                    |
| `treeProps`           | `Record<string, any>`                              | —                                                                         | 传递给 `el-tree-v2` 的额外属性，如 `{ defaultExpandAll: true }` |
| `collapseTags`        | `boolean`                                          | `false`                                                                   | 多选时是否折叠标签（仅显示第一个 + N）                                 |
| `collapseTagsTooltip` | `boolean`                                          | `false`                                                                   | 折叠标签后鼠标悬停 "+N" 弹出浮窗显示全部选中项                            |
| `size`                | `'default' \| 'small' \| 'large'`                  | `'default'`                                                               | 尺寸                                                    |
| `popperWidth`         | `string`                                           | —                                                                         | 下拉面板宽度，不传则跟随触发元素宽度                                    |
| `parentSelectable`    | `boolean`                                          | `false`                                                                   | 单选模式下父节点是否可被选中，开启后点击父节点也会选中并关闭弹窗                      |
| `maxCollapseTags`     | `number`                                           | `1`                                                                       | 多选模式下最多显示的标签数量，超出后显示 +N                               |

***

## Events

| 事件                  | 参数                 | 说明         |
| ------------------- | ------------------ | ---------- |
| `update:modelValue` | `val`              | v-model 更新 |
| `change`            | `val`              | 选中值变化      |
| `clear`             | —                  | 点击清除按钮     |
| `visible-change`    | `visible: boolean` | 下拉面板展开/收起  |
| `node-click`        | `node: TreeNode`   | 点击树节点      |

***

## 使用示例

### 1. 基础单选 + 搜索

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  filterable
  clearable
  placeholder="请选择部门"
  @change="onChange"
/>
```

### 2. 多选 + 级联选择（默认 checkStrictly=false）

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  filterable
  clearable
  placeholder="请选择角色（多选）"
/>
```

选中父节点时自动选中所有子节点，取消父节点时自动取消所有子节点。

### 3. 多选 + 父子独立勾选（checkStrictly=true）

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  :check-strictly="true"
  filterable
  clearable
  placeholder="父子独立勾选"
/>
```

每个节点独立勾选，父节点和子节点互不影响。

### 4. 多选 + 折叠标签

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  collapse-tags
  filterable
  clearable
  placeholder="多选折叠"
/>
```

仅显示第一个已选项，其余折叠为 "+N" 文本。

### 5. 多选 + 折叠标签 + 悬停浮窗

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  collapse-tags
  collapse-tags-tooltip
  filterable
  clearable
  placeholder="多选折叠 + 浮窗"
/>
```

鼠标悬停 "+N" 标签时弹出浮窗，浮窗内显示所有已选项并可逐个删除。

### 6. 不同尺寸

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  size="small"
  filterable
  clearable
/>
```

可选值：`default` / `small` / `large`

### 7. 单选模式下父节点可选（parentSelectable）

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  :parent-selectable="true"
  filterable
  clearable
  placeholder="父节点可选"
/>
```

默认情况下单选模式只能选中叶子节点，开启 `parentSelectable` 后点击父节点也会被选中并关闭弹窗。

### 8. 自定义折叠标签数量（maxCollapseTags）

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  collapse-tags
  :max-collapse-tags="3"
  filterable
  clearable
  placeholder="最多显示3个标签"
/>
```

默认最多显示 1 个标签，可通过 `maxCollapseTags` 自定义数量。

### 9. 懒加载

```vue
<script setup>
const loadNode = (node: TreeNode, resolve: (data: TreeNode[]) => void) => {
  setTimeout(() => {
    resolve([
      { id: Date.now(), name: `子节点 ${Math.random().toFixed(2)}` },
    ])
  }, 300)
}
</script>

<template>
  <TreeSelectPro
    v-model="selectedId"
    :data="treeData"
    :props="{ label: 'name', value: 'id', children: 'children', isLeaf: 'isLeaf' }"
    lazy
    :load="loadNode"
    filterable
    clearable
    placeholder="懒加载子节点"
  />
</template>
```

### 10. 关键词高亮（highlightKeyword）

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  :highlight-keyword="true"
  filterable
  clearable
  placeholder="搜索时高亮匹配文字"
/>
```

搜索结果中会高亮显示匹配的关键词。匹配文字会被包裹在 `<span class="tree-select-highlight">` 中，可自定义样式覆盖。

### 11. 搜索时自动切换父子独立勾选

搜索模式下组件会自动切换为 `checkStrictly=true`，确保搜索结果准确：

```vue
<TreeSelectPro
  v-model="selectedIds"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  multiple
  :check-strictly="false"
  filterable
  clearable
  placeholder="搜索时自动父子独立勾选"
/>
```

### 12. 自定义树展开行为（treeProps）

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  :tree-props="{ defaultExpandAll: true }"
  filterable
  clearable
/>
```

通过 `treeProps` 传递 `el-tree-v2` 支持的所有属性，如 `defaultExpandAll`、`defaultExpandedKeys` 等。

### 13. 自定义下拉面板宽度

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  popper-width="400px"
  filterable
  clearable
/>
```

不传 `popperWidth` 时，下拉面板宽度默认跟随触发元素宽度。

### 14. 监听下拉面板显隐

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  filterable
  clearable
  @visible-change="onVisibleChange"
/>

<script setup>
const onVisibleChange = (visible: boolean) => {
  console.log('下拉面板', visible ? '打开' : '关闭')
}
</script>
```

### 15. 监听节点点击

```vue
<TreeSelectPro
  v-model="selectedId"
  :data="treeData"
  :props="{ label: 'name', value: 'id', children: 'children' }"
  filterable
  clearable
  @node-click="onNodeClick"
/>

<script setup>
const onNodeClick = (node: TreeNode) => {
  console.log('点击节点:', node)
}
</script>
```

***

## 样式覆盖

关键词高亮样式可通过 CSS 覆盖：

```css
.tree-select-highlight {
  color: #409eff;
  font-weight: bold;
}
```

***

## 类型定义

```ts
import type { TreeNode, TreeSelectProps, TagItem } from './TreeSelectPro/types'
```

