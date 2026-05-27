import { ref, computed, watch } from "vue";
import type { TreeNode } from "./types";

/**
 * 树数据搜索与过滤逻辑
 *
 * @param data       原始树数据
 * @param keyword    搜索关键词（双向绑定引用）
 * @param props      字段映射配置
 * @param filterDelay 防抖延迟（ms）
 */
export function useTreeFilter(
  data: import("vue").Ref<TreeNode[]>,
  keyword: import("vue").Ref<string>,
  props: import("vue").ComputedRef<{
    label: string;
    value: string;
    children: string;
    isLeaf: string;
  }>,
  filterDelay: number,
) {
  /** 防抖后的搜索关键词 */
  const debouncedKeyword = ref("");
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** 对 keyword 进行防抖，避免频繁过滤 */
  watch(keyword, (val) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      debouncedKeyword.value = val;
    }, filterDelay);
  });

  /**
   * 递归遍历树节点，返回 label 包含 kw 的子树。
   * 空关键词直接返回原始数据，不做过滤。
   */
  function filterTree(nodes: TreeNode[], kw: string): TreeNode[] {
    if (!kw.trim()) return nodes;
    const childrenKey = props.value.children;

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const labelKey = props.value.label;
      const nodeMatched = String(node[labelKey]).includes(kw);
      const childNodes = node[childrenKey];
      const filteredChildren = childNodes ? filterTree(childNodes, kw) : [];

      if (nodeMatched) {
        acc.push({ ...node });
      } else if (filteredChildren.length > 0) {
        acc.push({
          ...node,
          [childrenKey]: filteredChildren,
        });
      }
      return acc;
    }, []);
  }

  /** 过滤后的树数据（搜索框中-标签匹配-子树保留） */
  const filteredData = computed(() => {
    return filterTree(data.value, debouncedKeyword.value);
  });

  /** 搜索时需要展开的所有节点 ID（含所有匹配分支的父节点） */
  const allExpandKeys = computed(() => {
    if (!debouncedKeyword.value.trim()) return [];
    return getAllNodeIds(
      filteredData.value,
      props.value.children,
      props.value.value,
    );
  });

  /** 递归收集所有包含子节点的节点 ID */
  function getAllNodeIds(
    nodes: TreeNode[],
    childrenKey: string,
    valueKey: string,
  ): (string | number)[] {
    const ids: (string | number)[] = [];
    for (const n of nodes) {
      const childs = n[childrenKey];
      if (childs && childs.length > 0) {
        ids.push(n[valueKey]);
        ids.push(...getAllNodeIds(childs, childrenKey, valueKey));
      }
    }
    return ids;
  }

  return {
    debouncedKeyword,
    filteredData,
    allExpandKeys,
    filterTree,
    getAllNodeIds,
  };
}
