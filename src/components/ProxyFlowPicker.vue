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
import { computed, defineComponent, h, ref, watch } from "vue";
import { Checkbox, Icon } from "vant";

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
    selectedCodes.value = [...props.modelValue];
    openCodes.value = new Set(props.tree.map((node) => node.code));
  },
);

function isOpen(node) {
  return node.children.length > 0 && openCodes.value.has(node.code);
}

function toggleNode(node) {
  if (!node.children.length) {
    const next = new Set(selectedCodes.value);
    if (next.has(node.code)) next.delete(node.code);
    else next.add(node.code);
    selectedCodes.value = [...next];
    return;
  }
  const next = new Set(openCodes.value);
  if (next.has(node.code)) next.delete(node.code);
  else next.add(node.code);
  openCodes.value = next;
}

const FlowRow = defineComponent({
  props: { node: Object, level: Number },
  setup(rowProps) {
    const selectable = computed(() => !rowProps.node.children.length);
    return () =>
      h(
        "button",
        {
          type: "button",
          class: ["flow-row", `level-${rowProps.level}`],
          onClick: () => toggleNode(rowProps.node),
        },
        [
          h("span", { class: "flow-name" }, rowProps.node.name),
          selectable.value
            ? h(Checkbox, {
                name: rowProps.node.code,
                modelValue: selectedCodes.value.includes(rowProps.node.code),
                "onUpdate:modelValue": () => toggleNode(rowProps.node),
                onClick: (event) => event.stopPropagation(),
              })
            : h(Icon, { name: isOpen(rowProps.node) ? "arrow-up" : "arrow-down" }),
        ],
      );
  },
});

function close() {
  emit("update:show", false);
}

function confirm() {
  emit("confirm", [...selectedCodes.value]);
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
  padding-right: 16px;
  border: 0;
  border-bottom: 1px solid #f2f3f5;
  color: #323233;
  background: #fff;
  font-size: 14px;
  text-align: left;

  &.level-1 {
    padding-left: 16px;
    font-weight: 600;
  }

  &.level-2 {
    padding-left: 36px;
  }

  &.level-3 {
    padding-left: 56px;
  }

  .flow-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .van-icon {
    color: #969799;
    font-size: 16px;
  }
}

.empty {
  padding: 100px 16px;
  color: #969799;
  font-size: 14px;
  text-align: center;
}
</style>
