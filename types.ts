export interface TreeNode {
  [key: string]: any;
}

export interface TreeSelectProps {
  data?: TreeNode[];
  modelValue: string | number | (string | number)[] | null | undefined;
  props?: {
    label?: string;
    value?: string;
    children?: string;
    isLeaf?: string;
  };
  multiple?: boolean;
  checkStrictly?: boolean;
  clearable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  filterable?: boolean;
  filterDelay?: number;
  highlightKeyword?: boolean;
  lazy?: boolean;
  load?: (node: TreeNode, resolve: (data: TreeNode[]) => void) => void;
  treeProps?: Record<string, any>;
  collapseTags?: boolean;
  collapseTagsTooltip?: boolean;
  size?: 'default' | 'small' | 'large';
  popperWidth?: string;
  /** 父节点是否可选中，开启后点击父节点也会选中并关闭弹窗（类似 el-tree-select 默认行为） */
  parentSelectable?: boolean;
  /** 多选模式下最多显示的标签数量，超出后显示 +N */
  maxCollapseTags?: number;
}

export interface TagItem {
  value: string | number;
  label: string;
}
