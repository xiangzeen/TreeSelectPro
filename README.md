# TreeSelectPro
`el-tree-select` 开启 `lazy`（懒加载）后，无法使用 `filterable`（搜索过滤）功能。原因是 lazy 模式下树节点并未全部加载到前端，组件内置的 filter 只对已加载的节点生效。


### 问题复现 ：

1. 搜索"前端组"，勾选了所有子节点（因为搜索时 checkStrictly 强制为 true ，父子联动关闭）
2. 关闭下拉框， checkedKeys 保存的是子节点 ID
3. 再次打开， checkStrictly 恢复为 false ，el-tree-v2 自动勾选了所有子节点都被选中的父节点
4. 但 checkedKeys 没有父节点 ID → 数据不一致

### 问题
- 搜索"前端"，勾选 父节点 （搜索时只能勾选父节点）
- 关闭下拉框
- 再次打开全量下拉框
- el-tree-v2 父子联动自动勾选了 子节点 （因为父节点勾选了）
- 但你的 checkedKeys 只有父节点，没有子节点


### 问题
当 TreeSelectPro 组件设置 disabled 属性时：

1. 标签的关闭按钮仍然显示
2. 清除按钮（clearable）仍然显示
3. 与 el-tree-select 的 disabled 效果不一致
