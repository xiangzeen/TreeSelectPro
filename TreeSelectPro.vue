<template>
  <el-popover
    v-model:visible="popoverVisible"
    trigger="manual"
    placement="bottom-start"
    :width="popperWidth || triggerWidth"
    popper-class="tree-select-popper"
    :disabled="disabled"
    append-to-body
    :popper-options="{ strategy: 'fixed' }"
  >
    <template #reference>
      <div
        ref="triggerRef"
        class="tree-select-trigger"
        :class="[
          `tree-select-${size}`,
          {
            'is-disabled': disabled,
            'is-focused': popoverVisible,
            'is-multiple': multiple
          }
        ]"
        @click="onTriggerClick"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
      >
        <div v-if="!multiple" class="tree-select-single">
          <el-input
            :model-value="currentLabel as string"
            :placeholder="placeholder"
            :disabled="disabled"
            readonly
            :size="size"
            @clear="handleClear"
          >
            <template #suffix>
              <el-icon v-if="showClear" class="tree-select-suffix-clear" @click.stop="handleClear">
                <Close />
              </el-icon>
              <el-icon v-else class="tree-select-arrow" :class="{ 'is-open': popoverVisible }">
                <ArrowDown />
              </el-icon>
            </template>
          </el-input>
        </div>
        <div v-else class="tree-select-multiple-wrap">
          <el-tag
            v-for="tag in visibleTags"
            :key="tag.value"
            :closable="!disabled"
            size="small"
            :disable-transitions="true"
            class="tree-select-tag"
            @close.stop="handleRemoveTag(tag.value)"
          >
            {{ tag.label }}
          </el-tag>
          <el-popover
            v-if="collapsedCount > 0 && collapseTagsTooltip"
            trigger="hover"
            placement="top"
            popper-class="tree-select-collapse-popover"
            :width="triggerWidth"
          >
            <template #reference>
              <el-tag size="small" class="tree-select-tag tree-select-collapsed-tag"> +{{ collapsedCount }} </el-tag>
            </template>
            <div class="tree-select-collapse-list">
              <el-tag
                v-for="tag in selectedTags.slice(maxCollapseTags)"
                :key="tag.value"
                :closable="!disabled"
                size="small"
                :disable-transitions="true"
                @close.stop="handleRemoveTag(tag.value)"
                class="tree-select-collapse-tag-item"
              >
                {{ tag.label }}
              </el-tag>
            </div>
          </el-popover>
          <el-tag v-else-if="collapsedCount > 0" size="small" class="tree-select-tag tree-select-collapsed-tag">
            +{{ collapsedCount }}
          </el-tag>
          <el-input
            ref="triggerInputRef"
            v-model="keyword"
            :placeholder="selectedTags.length ? '' : placeholder"
            :disabled="disabled"
            :size="size"
            class="tree-select-search-input"
          />
          <span class="tree-select-suffix">
            <el-icon v-if="showClear" class="tree-select-suffix-clear" @click.stop="handleClear">
              <Close />
            </el-icon>
            <el-icon v-else class="tree-select-arrow" :class="{ 'is-open': popoverVisible }">
              <ArrowDown />
            </el-icon>
          </span>
        </div>
      </div>
    </template>

    <div class="tree-select-dropdown">
      <el-input
        v-if="filterable"
        ref="searchInputRef"
        v-model="keyword"
        placeholder="搜索..."
        clearable
        :size="size === 'small' ? 'small' : 'default'"
        class="tree-select-search-box"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div v-if="filteredData.length === 0" class="tree-select-empty"> 无匹配数据 </div>

      <el-tree-v2
        v-else
        ref="treeRef"
        :data="filteredData"
        :props="treeV2Props"
        :height="treeHeight"
        :highlight-current="!multiple"
        :show-checkbox="multiple"
        :check-strictly="effectiveCheckStrictly"
        :default-expanded-keys="expandedKeys"
        :expand-on-click-node="true"
        :node-key="nodeKey"
        :lazy="lazy"
        :load="lazyLoad"
        @node-click="onNodeClick"
        @check="onCheckChange"
      >
        <template #default="{ node, data: nodeData }">
          <span v-if="highlightKeyword && debouncedKeyword" v-html="highlightText(node.label)" />
          <span v-else>{{ node.label }}</span>
        </template>
      </el-tree-v2>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { ArrowDown, Search, Close } from '@element-plus/icons-vue';
import type { TreeNode, TreeSelectProps, TagItem } from './types';
import { useTreeFilter } from './useTreeFilter';
import {
  useTreeSelect,
  findNodeById,
  getAllDescendantIds,
  findParentNode,
  isAllChildrenChecked
} from './useTreeSelect';

const props = withDefaults(defineProps<TreeSelectProps>(), {
  data: () => [],
  props: () => ({
    label: 'label',
    value: 'value',
    children: 'children',
    isLeaf: 'isLeaf'
  }),
  multiple: false,
  checkStrictly: false,
  clearable: false,
  placeholder: '请选择',
  disabled: false,
  filterable: true,
  filterDelay: 300,
  highlightKeyword: true,
  lazy: false,
  collapseTags: false,
  collapseTagsTooltip: false,
  size: 'default',
  parentSelectable: true,
  maxCollapseTags: 1
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
  (e: 'change', val: any): void;
  (e: 'clear'): void;
  (e: 'visible-change', visible: boolean): void;
  (e: 'node-click', node: TreeNode): void;
}>();

/** 将用户传入的 props 字段名映射为组件内部使用的字段名，缺失时取默认值 */
const resolvedProps = computed(() => ({
  label: props.props?.label || 'label',
  value: props.props?.value || 'id',
  children: props.props?.children || 'children',
  isLeaf: props.props?.isLeaf || 'isLeaf'
}));

/** el-tree-v2 的 node-key，对应数据中的唯一标识字段 */
const nodeKey = computed(() => resolvedProps.value.value);
/** 透传给 el-tree-v2 的 :props 配置 */
const treeV2Props = computed(() => ({
  label: resolvedProps.value.label,
  children: resolvedProps.value.children,
  isLeaf: resolvedProps.value.isLeaf,
  value: resolvedProps.value.value
}));

/** 搜索关键词（与弹窗内搜索框、多选模式触发区输入框双向绑定） */
const keyword = ref('');
/** 下拉弹窗显隐 */
const popoverVisible = ref(false);
/** 触发区是否 hover */
const isHovered = ref(false);
/** 触发区容器元素引用 */
const triggerRef = ref<HTMLElement | null>(null);
/** el-tree-v2 实例引用 */
const treeRef = ref<any>(null);
/** 弹窗内搜索框引用 */
const searchInputRef = ref<any>(null);
/** 多选模式触发区输入框引用 */
const triggerInputRef = ref<any>(null);
/** 触发区宽度，用于撑开弹窗 */
const triggerWidth = ref('100%');
/** 虚拟滚动树视口高度 */
const treeHeight = ref(300);

const { debouncedKeyword, filteredData, allExpandKeys, getAllNodeIds } = useTreeFilter(
  computed(() => props.data),
  keyword,
  resolvedProps,
  props.filterDelay
);

const effectiveCheckStrictly = computed(() => {
  return debouncedKeyword.value.trim() ? true : props.checkStrictly;
});

const { currentLabel, selectedTags, checkedKeys, currentKey, selectNode, removeTag, onClear, updateDisplay } =
  useTreeSelect(props as any, emit, resolvedProps);

const lazy = computed(() => props.lazy);

/** 懒加载加载函数，仅在 lazy 模式下有效 */
const lazyLoad = computed(() => {
  if (!props.lazy || !props.load) return undefined;
  return props.load;
});

/**
 * 传递给 el-tree-v2 的 :default-expanded-keys。
 * 搜索时展开所有匹配节点的父路径；未搜索时使用 treeProps 透传配置。
 */
const expandedKeys = computed(() => {
  if (keyword.value.trim()) {
    return allExpandKeys.value;
  }
  if (props.treeProps?.defaultExpandAll) {
    return getAllNodeIds(props.data, resolvedProps.value.children, nodeKey.value);
  }
  return props.treeProps?.defaultExpandedKeys || [];
});

/** 多选模式下实际渲染的标签列表（collapse-tags 时只保留 maxCollapseTags 个） */
const visibleTags = computed(() => {
  if (!props.collapseTags || props.multiple === false) return selectedTags.value;
  return selectedTags.value.slice(0, props.maxCollapseTags);
});
/** 被折叠的标签数量 */
const collapsedCount = computed(() => {
  if (!props.collapseTags) return 0;
  return Math.max(0, selectedTags.value.length - props.maxCollapseTags);
});
/** 折叠标签的 tooltip 文本（已弃用，保留兼容） */
const hiddenTagsLabel = computed(() => {
  return selectedTags.value
    .slice(props.maxCollapseTags)
    .map((t) => t.label)
    .join(', ');
});
/** 是否显示清除图标 */
const showClear = computed(() => {
  if (!props.clearable || props.disabled) return false;
  if (props.multiple) return isHovered.value && selectedTags.value.length > 0;
  return isHovered.value && !!currentLabel.value;
});

/** 将搜索关键词在文本中高亮，返回 HTML 字符串 */
function highlightText(label: string): string {
  if (!debouncedKeyword.value) return label;
  const kw = debouncedKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${kw})`, 'gi');
  return label.replace(regex, '<span class="tree-select-highlight">$1</span>');
}

/** 单选模式下点击树节点：叶子节点始终可选并关闭弹窗，父节点根据 parentSelectable 决定是否可选 */
function onNodeClick(node: TreeNode) {
  if (!props.multiple) {
    const childrenKey = resolvedProps.value.children;
    const isLeafKey = resolvedProps.value.isLeaf;
    const hasChildren = Array.isArray(node[childrenKey]) && node[childrenKey].length > 0;
    const isLeaf = node[isLeafKey] !== false && !hasChildren;
    const isParent = !!hasChildren;
    const canSelect = props.parentSelectable || !isParent;
    if (canSelect) {
      selectNode(node);
      popoverVisible.value = false;
    }
  }
  emit('node-click', node);
}

/** 多选模式下点击 tag 的关闭按钮：删除后同步树的勾选状态 */
function handleRemoveTag(value: string | number) {
  removeTag(value);
  nextTick(() => {
    treeRef.value?.setCheckedKeys(checkedKeys.value);
  });
}

/** 清除全部选中：清空数据后同步树的勾选与高亮 */
function handleClear() {
  onClear();
  nextTick(() => {
    treeRef.value?.setCheckedKeys([]);
  });
}

/** el-tree-v2 勾选状态变化时同步到组件内部状态与 v-model */
function onCheckChange(_data: TreeNode, info: { checkedKeys: (string | number)[] }) {
  let keys: (string | number)[];
  if (debouncedKeyword.value.trim()) {
    const valueKey = resolvedProps.value.value;
    const nodeId = _data[valueKey];
    const idx = checkedKeys.value.indexOf(nodeId);
    keys = idx > -1 ? checkedKeys.value.filter((k) => k !== nodeId) : [...checkedKeys.value, nodeId];
  } else {
    keys = [...info.checkedKeys];
    if (!effectiveCheckStrictly.value) {
      const valueKey = resolvedProps.value.value;
      const childrenKey = resolvedProps.value.children;
      for (const id of info.checkedKeys) {
        if (!checkedKeys.value.includes(id)) {
          const node = findNodeById(props.data, id, resolvedProps.value.label, valueKey, childrenKey);
          if (node) {
            const descendantIds = getAllDescendantIds(node, childrenKey, valueKey);
            for (const descendantId of descendantIds) {
              if (!keys.includes(descendantId)) {
                keys.push(descendantId);
              }
            }
          }
        }
      }
    }
  }
  checkedKeys.value = keys;
  selectedTags.value = keys.map((id: string | number) => {
    const node = treeRef.value?.getNode(id);
    return {
      value: id,
      label: node?.label ?? getLabelById(id)
    };
  });
  currentLabel.value = selectedTags.value.map((t) => t.label);
  emit('update:modelValue', [...keys]);
  emit('change', [...keys]);
}

/** 通过遍历原始数据根据 ID 查找节点 label（作为 getNode 的兜底方案） */
function getLabelById(id: string | number): string {
  const { value, label, children } = resolvedProps.value;
  function find(nodes: TreeNode[]): string | null {
    for (const n of nodes) {
      if (n[value] === id) return n[label];
      if (n[children]) {
        const r = find(n[children]);
        if (r) return r;
      }
    }
    return null;
  }
  return find(props.data) || String(id);
}

/** 点击触发区切换弹窗显隐 */
function onTriggerClick() {
  if (props.disabled) return;
  popoverVisible.value = !popoverVisible.value;
}

/**
 * 弹窗显隐变化时：
 * - 打开时清空搜索关键词，重新计算触发器宽度，并尝试恢复多选勾选状态
 * - 通过 visible-change 事件通知外部
 */
watch(popoverVisible, (val) => {
  emit('visible-change', val);
  if (val) {
    keyword.value = '';
    debouncedKeyword.value = '';
    nextTick(() => {
      if (triggerRef.value) {
        triggerWidth.value = `${triggerRef.value.offsetWidth}px`;
      }
      if (props.multiple && treeRef.value) {
        if (!effectiveCheckStrictly.value) {
          const valueKey = resolvedProps.value.value;
          const childrenKey = resolvedProps.value.children;
          const checkedSet = new Set(checkedKeys.value);
          const allParentIds: (string | number)[] = [];

          for (const id of checkedKeys.value) {
            const node = findNodeById(props.data, id, resolvedProps.value.label, valueKey, childrenKey);
            if (node) {
              const parent = findParentNode(props.data, node, valueKey, childrenKey);
              if (parent && isAllChildrenChecked(parent, checkedSet, childrenKey, valueKey)) {
                const parentId = parent[valueKey];
                if (!checkedSet.has(parentId)) {
                  allParentIds.push(parentId);
                  checkedSet.add(parentId);
                }
              }
            }
          }

          if (allParentIds.length > 0) {
            checkedKeys.value = [...checkedKeys.value, ...allParentIds];
            emit('update:modelValue', [...checkedKeys.value]);
            emit('change', [...checkedKeys.value]);
          }
        }
        (treeRef.value as any).setCheckedKeys(checkedKeys.value);
        nextTick(() => {
          const actualCheckedKeys = (treeRef.value as any).getCheckedKeys() || [];
          if (actualCheckedKeys.length > checkedKeys.value.length) {
            checkedKeys.value = actualCheckedKeys;
            emit('update:modelValue', [...checkedKeys.value]);
            emit('change', [...checkedKeys.value]);
          }
        });
      }
      (searchInputRef.value as any)?.focus?.();
    });
  }
});

/**
 * 树数据变化时：
 * - 搜索中：展开所有匹配节点，同时恢复勾选状态（防止 checkStrictly 变化导致状态丢失）
 * - 数据恢复全量 且 多选模式：重新同步勾选状态
 */
watch(filteredData, () => {
  nextTick(() => {
    if (!treeRef.value) return;
    if (keyword.value.trim()) {
      (treeRef.value as any).setExpandedKeys(allExpandKeys.value);
    }
    if (props.multiple) {
      (treeRef.value as any).setCheckedKeys(checkedKeys.value);
    }
  });
});

/** 挂载后将触发区实际宽度设为弹窗宽度 */
onMounted(() => {
  if (triggerRef.value) {
    triggerWidth.value = `${triggerRef.value.offsetWidth}px`;
  }
});
</script>

<style scoped>
.tree-select-trigger {
  width: 100%;
  cursor: pointer;
}
.tree-select-trigger.is-disabled {
  cursor: not-allowed;
}
.tree-select-trigger.is-focused :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.tree-select-arrow {
  transition: transform 0.25s;
}
.tree-select-arrow.is-open {
  transform: rotate(180deg);
}

.tree-select-multiple-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 1px 28px 1px 8px;
  position: relative;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-input-bg-color, #fff);
  transition: border-color 0.25s;
}
.tree-select-multiple-wrap:hover {
  border-color: var(--el-border-color-hover);
}
.tree-select-trigger.is-focused .tree-select-multiple-wrap {
  border-color: var(--el-color-primary);
}
.tree-select-single :deep(.el-input__wrapper) {
  cursor: pointer;
}
.tree-select-trigger.is-disabled .tree-select-multiple-wrap {
  background: var(--el-disabled-bg-color);
  color: var(--el-disabled-text-color);
  cursor: not-allowed;
}

.tree-select-search-input {
  flex: 1;
  min-width: 60px;
}
.tree-select-search-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0;
}
.tree-select-search-input :deep(.el-input__inner) {
  border: none;
  background: transparent;
}

.tree-select-tag {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-select-collapsed-tag {
  cursor: default;
  border-style: dashed;
}

.tree-select-suffix {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tree-select-suffix-clear,
.tree-select-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}
.tree-select-suffix-clear {
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: color 0.2s;
}
.tree-select-suffix-clear:hover {
  color: var(--el-text-color-secondary);
}
.tree-select-single .tree-select-suffix-clear {
  margin-right: 4px;
}

.tree-select-dropdown {
  max-height: 400px;
  overflow: hidden;
}
.tree-select-dropdown .tree-select-search-box {
  padding: 0 0 8px;
}

.tree-select-empty {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 32px 0;
  font-size: 14px;
}

.tree-select-small .tree-select-multiple-wrap {
  min-height: 28px;
}
.tree-select-large .tree-select-multiple-wrap {
  min-height: 40px;
}
</style>

<style>
.tree-select-highlight {
  color: var(--el-color-primary);
  font-weight: 700;
}
.tree-select-popper {
  padding: 8px !important;
}
.el-popover.tree-select-collapse-popover {
  padding: 6px;
}
.tree-select-collapse-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.tree-select-collapse-tag-item {
  flex-shrink: 0;
}
</style>
