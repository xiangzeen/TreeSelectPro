<template>
  <div class="app-container">
    <h1>TreeSelectPro Demo</h1>

    <el-divider content-position="left">基础单选 + 全量数据搜索</el-divider>
    <TreeSelectPro
      v-model="selectedId"
      :data="treeData"
      :props="{ label: 'label', value: 'value', children: 'children' }"
      filterable
      clearable
      :parentSelectable="false"
      placeholder="请选择部门"
      @change="onChange"
    />
    <p class="result">选中值: {{ selectedId }}</p>

    <el-divider content-position="left"
      >多选 + 全量数据搜索（checkStrictly=false，级联选择）</el-divider
    >
    <TreeSelectPro
      v-model="selectedIds"
      :data="treeData"
      :props="{ label: 'label', value: 'value', children: 'children' }"
      multiple
      filterable
      clearable
      placeholder="请选择角色（多选）"
      @change="onMultiChange"
    />
    <p class="result">选中值: {{ JSON.stringify(selectedIds) }}</p>

    <el-divider content-position="left"
      >多选 + checkStrictly（父子独立）</el-divider
    >
    <TreeSelectPro
      v-model="selectedIds2"
      :data="treeData"
      :props="{ label: 'label', value: 'value', children: 'children' }"
      multiple
      :check-strictly="true"
      filterable
      clearable
      placeholder="父子独立勾选"
    />
    <p class="result">选中值: {{ JSON.stringify(selectedIds2) }}</p>

    <el-divider content-position="left">不同尺寸 small</el-divider>
    <TreeSelectPro
      v-model="selectedId2"
      :data="treeData"
      :props="{ label: 'label', value: 'value', children: 'children' }"
      size="small"
      filterable
      clearable
      placeholder="小尺寸选择"
    />

    <el-divider content-position="left">大型树（3000 节点）性能演示</el-divider>
    <TreeSelectPro
      v-model="largeSelected"
      :data="largeTree"
      :props="{ label: 'name', value: 'id', children: 'children' }"
      filterable
      clearable
      placeholder="大数据量搜索..."
    />
    <p class="result">选中值: {{ largeSelected }}</p>

    <el-divider content-position="left"
      >大型树多选（collapse-tags + collapse-tags-tooltip）</el-divider
    >
    <TreeSelectPro
      v-model="largeMultiSelected"
      :data="largeTree"
      :props="{ label: 'name', value: 'id', children: 'children' }"
      multiple
      collapse-tags
      collapse-tags-tooltip
      filterable
      clearable
      placeholder="大数据量多选..."
    />
    <p class="result">选中值: {{ JSON.stringify(largeMultiSelected) }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TreeSelectPro from "./TreeSelectPro/index.ts";
import type { TreeNode } from "./TreeSelectPro/types.ts";

const selectedId = ref<number | null>(null);
const selectedIds = ref<number[]>([]);
const selectedIds2 = ref<number[]>([]);
const selectedId2 = ref<number | null>(null);
const largeSelected = ref<number | null>(null);
const largeMultiSelected = ref<number[]>([]);

const treeData: TreeNode[] = [
  {
    value: 1,
    label: "产品研发中心",
    children: [
      {
        value: 11,
        label: "前端组",
        children: [
          { value: 111, label: "Vue 组" },
          { value: 112, label: "React 组" },
          { value: 113, label: "小程序组" },
        ],
      },
      {
        value: 12,
        label: "后端组",
        children: [
          { value: 121, label: "Java 组" },
          { value: 122, label: "Go 组" },
        ],
      },
      { value: 13, label: "测试组" },
    ],
  },
  {
    value: 2,
    label: "市场营销中心",
    children: [
      { value: 21, label: "品牌部" },
      {
        value: 22,
        label: "渠道部",
        children: [
          { value: 221, label: "线上渠道" },
          { value: 222, label: "线下渠道" },
        ],
      },
    ],
  },
  {
    value: 3,
    label: "行政中心",
    children: [
      {
        value: 31,
        label: "人力资源部",
        children: [
          { value: 311, label: "招聘组" },
          { value: 312, label: "薪酬组" },
          { value: 313, label: "培训组" },
        ],
      },
      { value: 32, label: "财务部" },
      { value: 33, label: "法务部" },
    ],
  },
];

function buildLargeTree(
  depth: number,
  breadth: number,
  prefix = "",
): TreeNode[] {
  const nodes: TreeNode[] = [];
  let id = 1;
  function create(level: number, parentName: string): TreeNode[] {
    if (level > depth) return [];
    const result: TreeNode[] = [];
    for (let i = 1; i <= breadth; i++) {
      const name = `${parentName}-${i}`;
      const nodeId = id++;
      result.push({
        id: nodeId,
        name,
        children: level < depth ? create(level + 1, name) : undefined,
      });
    }
    return result;
  }
  return create(1, "部门");
}

const largeTree = buildLargeTree(4, 5);

function onChange(val: any) {
  console.log("change:", val);
}

function onMultiChange(val: any) {
  console.log("multi change:", val);
}
</script>

<style>
body {
  margin: 0;
  background: #f5f7fa;
  font-family:
    "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.app-container {
  max-width: 600px;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
h1 {
  text-align: center;
  color: #303133;
  margin-bottom: 24px;
}
.result {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
