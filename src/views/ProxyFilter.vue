<template>
  <div class="proxy-filter-page">
    <section class="filter-section">
      <div class="section-title">常用条件</div>
      <div class="form-card">
        <div class="form-row static-row">
          <span class="label">被代理人</span>
          <span class="value">{{ principal }}</span>
        </div>
        <button class="form-row" type="button" @click="showAgent = true">
          <span class="label">代理人</span>
          <span class="value" :class="{ placeholder: !draft.agentName }">
            {{ draft.agentName || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
        <button class="form-row" type="button" @click="showScope = true">
          <span class="label">代理范围</span>
          <span class="value">{{ scopeLabel }}</span>
          <van-icon name="arrow" />
        </button>
        <button
          class="form-row"
          type="button"
          @click="openTimeOptions('startTimeState')"
        >
          <span class="label">开始日期</span>
          <span class="value" :class="{ placeholder: !startTimeLabel }">
            {{ startTimeLabel || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
        <button
          class="form-row"
          type="button"
          @click="openTimeOptions('endTimeState')"
        >
          <span class="label">结束日期</span>
          <span class="value" :class="{ placeholder: !endTimeLabel }">
            {{ endTimeLabel || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
      </div>
    </section>

    <footer class="page-footer">
      <button class="secondary" type="button" @click="reset">重置</button>
      <button class="primary" type="button" @click="confirm">确定</button>
    </footer>

    <UserTreePicker
      v-model:show="showAgent"
      :model-value="draft.agentId"
      title="选择代理人"
      :departments="proxyDepartmentTree"
      @confirm="selectAgent"
    />
    <van-action-sheet
      v-model:show="showScope"
      title="选择代理范围"
      :actions="scopeActions"
      teleport=".app-frame"
      @select="selectScope"
    />
    <van-action-sheet
      v-model:show="showTimeOptions"
      :title="timeOptionsTitle"
      :actions="proxyTimeOptions"
      teleport=".app-frame"
      @select="selectTimeOption"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import UserTreePicker from "@/components/UserTreePicker.vue";
import { getClamcUserDisplayName } from "@/utils/clamcUser";
import {
  PROXY_SCOPE_ALL,
  PROXY_SCOPE_PARTIAL,
  ensureProxyPeople,
  ensureProxyTimeOptions,
  proxyDepartmentTree,
  proxyFilterState,
  proxyTimeOptions,
  resetProxyFilter,
} from "@/store/proxy";

const router = useRouter();
const principal = getClamcUserDisplayName("");
const draft = reactive({
  agentId: "",
  agentName: "",
  scope: "",
  workflowCode: "",
  workflowName: "",
  startTimeState: "",
  endTimeState: "",
});
const showAgent = ref(false);
const showScope = ref(false);
const showTimeOptions = ref(false);
const timeStateField = ref("startTimeState");

const scopeActions = [
  { name: "全部代理", value: PROXY_SCOPE_ALL },
  { name: "部分代理", value: PROXY_SCOPE_PARTIAL },
];
const scopeLabel = computed(() => {
  if (draft.scope === PROXY_SCOPE_PARTIAL) return "部分代理";
  if (draft.scope === PROXY_SCOPE_ALL) return "全部代理";
  return "全部代理";
});
const startTimeLabel = computed(() => timeStateLabel(draft.startTimeState));
const endTimeLabel = computed(() => timeStateLabel(draft.endTimeState));
const timeOptionsTitle = computed(() =>
  timeStateField.value === "startTimeState" ? "选择开始日期" : "选择结束日期",
);

function hydrate() {
  Object.assign(draft, proxyFilterState);
  document.title = "高级筛选";
}

function selectAgent(action) {
  draft.agentId = action.id;
  draft.agentName = action.name;
  showAgent.value = false;
}

function selectScope(action) {
  draft.scope = action.value;
  showScope.value = false;
}

function timeStateLabel(value) {
  const option = proxyTimeOptions.value.find(
    (item) => String(item.value) === String(value),
  );
  return option?.name || "";
}

function openTimeOptions(field) {
  timeStateField.value = field;
  showTimeOptions.value = true;
}

function selectTimeOption(action) {
  draft[timeStateField.value] = action.value;
  showTimeOptions.value = false;
}

function reset() {
  resetProxyFilter();
  hydrate();
  showToast("已重置");
}

function confirm() {
  Object.assign(proxyFilterState, draft);
  showToast("筛选已应用");
  router.back();
}

async function initialize() {
  hydrate();
  await Promise.all([
    ensureProxyPeople().catch((error) => {
      console.error("[proxy-filter] people load failed:", error);
      showToast(error?.message || "获取代理人失败");
    }),
    ensureProxyTimeOptions().catch((error) => {
      console.error("[proxy-filter] time options load failed:", error);
      showToast(error?.message || "获取时间筛选选项失败");
    }),
  ]);
}

onMounted(initialize);
onActivated(hydrate);
</script>

<style lang="scss" scoped>
.proxy-filter-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--safe-top) 0 calc(76px + var(--safe-bottom));
  background: var(--page-bg);
  color: #323233;
}

.section-title {
  height: 40px;
  padding: 10px 16px;
  color: #646566;
  font-size: 14px;
  line-height: 20px;
}

.form-card {
  padding: 0 16px;
  background: #fff;
}

.form-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  margin: 0;
  padding: 0;
  border: 0;
  border-bottom: 1px solid #ebedf0;
  color: #323233;
  background: #fff;
  font-size: 14px;
  text-align: left;

  &:last-child {
    border-bottom: 0;
  }

  .label {
    flex: 0 0 96px;
  }

  .value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .placeholder {
    color: #969799;
  }

  .van-icon {
    flex: 0 0 auto;
    color: #969799;
    font-size: 18px;
  }
}

.page-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  gap: 16px;
  width: min(100%, 430px);
  margin: 0 auto;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  border-top: 1px solid #ebedf0;
  background: #fff;

  button {
    flex: 1;
    height: 48px;
    border-radius: 4px;
    font-size: 16px;
  }

  .secondary {
    border: 1px solid var(--primary);
    color: var(--primary);
    background: #fff;
  }

  .primary {
    border: 1px solid var(--primary);
    color: #fff;
    background: var(--primary);
  }
}
</style>
