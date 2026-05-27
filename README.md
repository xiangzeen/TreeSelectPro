# TreeSelectPro
`el-tree-select` 开启 `lazy`（懒加载）后，无法使用 `filterable`（搜索过滤）功能。原因是 lazy 模式下树节点并未全部加载到前端，组件内置的 filter 只对已加载的节点生效。
