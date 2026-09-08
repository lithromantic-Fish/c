<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    teleport=".app-frame"
    :style="{ height: '70%' }"
    @update:show="close"
  >
    <div class="flow-picker">
      <div class="picker-head">
        <button type="button" @click="close">取消</button>
        <strong>选择流程</strong>
        <button type="button" @click="confirm">确定</button>
      </div>
      <div class="flow-tree">
        <template v-for="levelOne in tree" :key="levelOne.code">
          <FlowRow :node="levelOne" :level="1" />
          <template v-if="isOpen(levelOne)">
            <template v-for="levelTwo in levelOne.children" :key="levelTwo.code">
              <FlowRow :node="levelTwo" :level="2" />
              <template v-if="isOpen(levelTwo)">
                <FlowRow
                  v-for="levelThree in levelTwo.children"
                  :key="levelThree.code"
                  :node="levelThree"
                  :level="3"
                />
              </template>
            </template>
          </template>
        </template>
        <div v-if="!tree.length" class="empty">暂无流程数据</div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { defineComponent, h, ref, watch } from "vue";
import { Icon } from "vant";

const props = defineProps({
  show: Boolean,
  tree: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:show", "confirm"]);
const selectedCodes = ref([]);
const openCodes = ref(new Set());

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    selectedCodes.value = normalizeSelectedCodes(props.modelValue);
    openCodes.value = new Set(props.tree.map((node) => node.code));
  },
);

function collectLeafCodes(node, result = []) {
  if (!node.children.length) {
    result.push(node.code);
    return result;
  }
  node.children.forEach((child) => collectLeafCodes(child, result));
  return result;
}

function allLeafCodes() {
  return props.tree.flatMap((node) => collectLeafCodes(node));
}

function normalizeSelectedCodes(codes = []) {
  const requested = new Set(codes.map(String));
  const normalized = new Set();

  function visit(node) {
    if (requested.has(node.code)) {
      collectLeafCodes(node).forEach((code) => normalized.add(code));
    }
    node.children.forEach(visit);
  }

  props.tree.forEach(visit);
  return [...normalized];
}

function isOpen(node) {
  return node.children.length > 0 && openCodes.value.has(node.code);
}

function toggleOpen(node) {
  const next = new Set(openCodes.value);
  if (next.has(node.code)) next.delete(node.code);
  else next.add(node.code);
  openCodes.value = next;
}

function isSelected(node) {
  const leafCodes = collectLeafCodes(node);
  return leafCodes.length > 0 && leafCodes.every((code) => selectedCodes.value.includes(code));
}

function toggleSelection(node) {
  const leafCodes = collectLeafCodes(node);
  const next = new Set(selectedCodes.value);
  const shouldSelect = leafCodes.some((code) => !next.has(code));
  leafCodes.forEach((code) => {
    if (shouldSelect) next.add(code);
    else next.delete(code);
  });
  selectedCodes.value = [...next];
}

const FlowRow = defineComponent({
  props: { node: Object, level: Number },
  setup(rowProps) {
    return () => {
      const hasChildren = rowProps.node.children.length > 0;
      const selected = isSelected(rowProps.node);
      return h("div", { class: ["flow-row", `level-${rowProps.level}`] }, [
        hasChildren
          ? h(
              "button",
              {
                type: "button",
                class: "expand-button",
                "aria-label": `${isOpen(rowProps.node) ? "收起" : "展开"}${rowProps.node.name}`,
                onClick: () => toggleOpen(rowProps.node),
              },
              [h(Icon, { name: isOpen(rowProps.node) ? "arrow-up" : "arrow-down" })],
            )
          : h("span", { class: "expand-placeholder", "aria-hidden": "true" }),
        h(
          "button",
          {
            type: "button",
            class: ["select-button", { selected }],
            "aria-pressed": String(selected),
            onClick: () => toggleSelection(rowProps.node),
          },
          [
            h("span", { class: "flow-name" }, rowProps.node.name),
            selected ? h(Icon, { name: "success", class: "selected-icon" }) : null,
          ],
        ),
      ]);
    };
  },
});

function close() {
  emit("update:show", false);
}

function confirm() {
  const selected = new Set(selectedCodes.value);
  emit("confirm", allLeafCodes().filter((code) => selected.has(code)));
  close();
}
</script>

<style lang="scss" scoped>
.flow-picker {
  display: flex;
  height: 100%;
  flex-direction: column;
  color: #323233;
  background: #fff;
}

.picker-head {
  display: grid;
  flex: 0 0 52px;
  grid-template-columns: 72px 1fr 72px;
  align-items: center;
  border-bottom: 1px solid #f2f3f5;

  strong {
    font-size: 16px;
    text-align: center;
  }

  button {
    height: 100%;
    padding: 0 16px;
    border: 0;
    color: #969799;
    background: transparent;
    font-size: 14px;
    text-align: left;

    &:last-child {
      color: var(--primary);
      text-align: right;
    }
  }
}

.flow-tree {
  flex: 1;
  min-height: 0;
  padding-bottom: calc(16px + var(--safe-bottom));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.flow-row) {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  border-bottom: 1px solid #f2f3f5;
  color: #323233;
  background: #fff;
  font-size: 14px;
  text-align: left;

  &.level-1 {
    padding-left: 8px;
    font-weight: 600;
  }

  &.level-2 {
    padding-left: 28px;
  }

  &.level-3 {
    padding-left: 48px;
  }

  .expand-button,
  .expand-placeholder {
    flex: 0 0 32px;
    width: 32px;
    height: 100%;
  }

  .expand-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    color: #969799;
    background: transparent;
  }

  .select-button {
    display: flex;
    flex: 1;
    align-items: center;
    align-self: stretch;
    min-width: 0;
    padding: 0 16px 0 4px;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    font-weight: inherit;
    text-align: left;
  }

  .flow-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .van-icon {
    font-size: 16px;
  }

  .selected-icon {
    flex: 0 0 auto;
    color: var(--primary);
    font-size: 18px;
    font-weight: 600;
  }
}

.empty {
  padding: 100px 16px;
  color: #969799;
  font-size: 14px;
  text-align: center;
}
</style>
