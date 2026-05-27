import { ref, computed, watch } from "vue";
import type { TreeNode, TagItem } from "./types";

/**
 * 在给定的节点数组中递归查找 ID 匹配的节点
 */
export function findNodeById(
  nodes: TreeNode[],
  id: string | number,
  labelKey: string,
  valueKey: string,
  childrenKey: string,
): TreeNode | null {
  for (const n of nodes) {
    if (n[valueKey] === id) return n;
    if (n[childrenKey]) {
      const found = findNodeById(
        n[childrenKey],
        id,
        labelKey,
        valueKey,
        childrenKey,
      );
      if (found) return found;
    }
  }
  return null;
}

/**
 * 递归收集节点的所有子孙节点 ID
 */
export function getAllDescendantIds(
  node: TreeNode,
  childrenKey: string,
  valueKey: string,
): (string | number)[] {
  const children = node[childrenKey];
  if (!children || children.length === 0) return [];
  const ids: (string | number)[] = [];
  for (const child of children) {
    ids.push(child[valueKey]);
    ids.push(...getAllDescendantIds(child, childrenKey, valueKey));
  }
  return ids;
}

/**
 * 在树中查找某节点的直接父节点
 */
export function findParentNode(
  nodes: TreeNode[],
  targetNode: TreeNode,
  valueKey: string,
  childrenKey: string,
): TreeNode | null {
  for (const node of nodes) {
    const children = node[childrenKey];
    if (children && children.length > 0) {
      if (
        children.some(
          (child: TreeNode) => child[valueKey] === targetNode[valueKey],
        )
      ) {
        return node;
      }
      const parent = findParentNode(
        children,
        targetNode,
        valueKey,
        childrenKey,
      );
      if (parent) return parent;
    }
  }
  return null;
}

/**
 * 检查是否所有子节点都被勾选
 */
export function isAllChildrenChecked(
  node: TreeNode,
  checkedIds: Set<string | number>,
  childrenKey: string,
  valueKey: string,
): boolean {
  const children = node[childrenKey];
  if (!children || children.length === 0) return false;
  return children.every((child: TreeNode) => checkedIds.has(child[valueKey]));
}

/**
 * 树选择组件核心状态管理
 *
 * 维护选中值、标签列表、勾选键列表等状态，
 * 处理节点选中、标签删除、清空等操作并与外部 v-model 同步。
 */
export function useTreeSelect(
  props: {
    modelValue: any;
    multiple: boolean;
    data: TreeNode[];
    lazy: boolean;
    load?: (node: TreeNode, resolve: (data: TreeNode[]) => void) => void;
  },
  emit: any,
  resolvedProps: import("vue").ComputedRef<{
    label: string;
    value: string;
    children: string;
    isLeaf: string;
  }>,
) {
  /** 当前显示的文字（单选为字符串，多选为字符串数组） */
  const currentLabel = ref<string | string[]>("");
  /** 多选模式下已选标签列表 */
  const selectedTags = ref<TagItem[]>([]);
  /** 多选模式下已勾选节点的 ID 列表 */
  const checkedKeys = ref<(string | number)[]>([]);
  /** 单选模式下当前选中节点的 ID */
  const currentKey = ref<string | number | null>(null);

  /** 根据多个 ID 批量查找对应的显示文本（兜底时直接返回 ID） */
  function findLabelsByIds(
    nodes: TreeNode[],
    ids: (string | number)[],
  ): (string | number)[] {
    return ids.map((id) => {
      const node = findNodeById(
        nodes,
        id,
        resolvedProps.value.label,
        resolvedProps.value.value,
        resolvedProps.value.children,
      );
      return node ? node[resolvedProps.value.label] : id;
    });
  }

  /** 根据单个 ID 查找节点显示文本 */
  function getLabelById(id: string | number): string {
    const node = findNodeById(
      props.data,
      id,
      resolvedProps.value.label,
      resolvedProps.value.value,
      resolvedProps.value.children,
    );
    return node ? node[resolvedProps.value.label] : String(id);
  }

  /**
   * 根据外部 modelValue 同步更新所有内部状态。
   * 在 watch 中被调用，支持外部直接修改 v-model。
   */
  function updateDisplay(value: any) {
    if (value == null || value === "") {
      currentLabel.value = props.multiple ? [] : "";
      selectedTags.value = [];
      checkedKeys.value = [];
      currentKey.value = null;
      return;
    }

    if (props.multiple) {
      const ids = value as (string | number)[];
      checkedKeys.value = ids;
      const labels = findLabelsByIds(props.data, ids);
      selectedTags.value = ids.map((id, i) => ({
        value: id,
        label: labels[i] as string,
      }));
      currentLabel.value = labels as string[];
    } else {
      currentKey.value = value as string | number;
      currentLabel.value = getLabelById(value as string | number);
    }
  }

  /** 监听外部 modelValue 变化并刷新显示 */
  watch(
    () => props.modelValue,
    (val) => {
      updateDisplay(val);
    },
    { immediate: true },
  );

  /**
   * 选中（或取消选中）一个节点。
   * 单选：直接设为选中值；多选：在 checkedKeys 中增删。
   */
  function selectNode(node: TreeNode) {
    const valueKey = resolvedProps.value.value;
    const labelKey = resolvedProps.value.label;

    if (props.multiple) {
      const idx = checkedKeys.value.indexOf(node[valueKey]);
      if (idx > -1) {
        checkedKeys.value = checkedKeys.value.filter(
          (k) => k !== node[valueKey],
        );
      } else {
        checkedKeys.value = [...checkedKeys.value, node[valueKey]];
      }
      selectedTags.value = checkedKeys.value.map((id) => ({
        value: id,
        label: getLabelById(id),
      }));
      currentLabel.value = selectedTags.value.map((t) => t.label);
      emit("update:modelValue", [...checkedKeys.value]);
      emit("change", [...checkedKeys.value]);
    } else {
      currentKey.value = node[valueKey];
      currentLabel.value = node[labelKey];
      emit("update:modelValue", node[valueKey]);
      emit("change", node[valueKey]);
    }
  }

  /** 多选模式下移除指定 tag（取消勾选该节点） */
  function removeTag(value: string | number) {
    checkedKeys.value = checkedKeys.value.filter((k) => k !== value);
    selectedTags.value = selectedTags.value.filter((t) => t.value !== value);
    currentLabel.value = selectedTags.value.map((t) => t.label);
    emit("update:modelValue", [...checkedKeys.value]);
    emit("change", [...checkedKeys.value]);
  }

  /** 清空所有选中状态 */
  function onClear() {
    currentLabel.value = props.multiple ? [] : "";
    selectedTags.value = [];
    checkedKeys.value = [];
    currentKey.value = null;
    emit("update:modelValue", props.multiple ? [] : null);
    emit("change", props.multiple ? [] : null);
    emit("clear");
  }

  return {
    currentLabel,
    selectedTags,
    checkedKeys,
    currentKey,
    selectNode,
    removeTag,
    onClear,
    updateDisplay,
    getLabelById,
  };
}
