<template>
  <div class="proxy-form-page">
    <section class="form-section">
      <div class="section-title required">基本信息</div>
      <div class="form-card">
        <div class="form-row static-row">
          <span class="label">被代理人</span>
          <span class="value">{{ form.principal }}</span>
        </div>
        <button class="form-row" type="button" @click="showAgent = true">
          <span class="label">代理人</span>
          <span class="value" :class="{ placeholder: !form.agentName }">
            {{ form.agentName || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
      </div>
    </section>

    <section class="form-section">
      <div class="section-title required">流程信息</div>
      <div class="form-card">
        <button class="form-row" type="button" @click="showScope = true">
          <span class="label">代理范围</span>
          <span class="value">{{ scopeLabel }}</span>
          <van-icon name="arrow" />
        </button>
        <button
          v-if="form.scope === PROXY_SCOPE_PARTIAL"
          class="form-row"
          type="button"
          @click="showFlows = true"
        >
          <span class="label">流程名称</span>
          <span class="value ellipsis" :class="{ placeholder: !form.flows.length }">
            {{ flowLabel }}
          </span>
          <van-icon name="arrow" />
        </button>
      </div>
    </section>

    <section class="form-section">
      <div class="section-title required">代理时间</div>
      <div class="form-card">
        <button class="form-row" type="button" @click="openDate('startDate')">
          <span class="label">开始时间</span>
          <span class="value" :class="{ placeholder: !form.startDate }">
            {{ form.startDate || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
        <button class="form-row" type="button" @click="openDate('endDate')">
          <span class="label">结束时间</span>
          <span class="value" :class="{ placeholder: !form.endDate }">
            {{ form.endDate || "请选择" }}
          </span>
          <van-icon name="arrow" />
        </button>
      </div>
    </section>

    <footer class="page-footer">
      <button class="secondary" type="button" @click="router.back()">取消</button>
      <button class="primary" type="button" :disabled="submitting" @click="submit">
        {{ submitting ? "提交中..." : isEditing ? "保存" : "确定" }}
      </button>
    </footer>

    <van-action-sheet
      v-model:show="showAgent"
      title="选择代理人"
      :actions="agentActions"
      teleport=".app-frame"
      @select="selectAgent"
    />
    <van-action-sheet
      v-model:show="showScope"
      title="选择代理范围"
      :actions="scopeActions"
      teleport=".app-frame"
      @select="selectScope"
    />
    <van-popup v-model:show="showFlows" position="bottom" round teleport=".app-frame">
      <div class="flow-picker">
        <div class="picker-head">
          <button type="button" @click="showFlows = false">取消</button>
          <strong>选择流程</strong>
          <button type="button" @click="confirmFlows">确定</button>
        </div>
        <van-checkbox-group v-model="selectedFlowCodes">
          <van-cell-group inset>
            <van-cell
              v-for="flow in proxyFlowOptions"
              :key="flow.code"
              clickable
              :title="flow.name"
              @click="toggleFlow(flow)"
            >
              <template #right-icon>
                <van-checkbox :name="flow.code" @click.stop />
              </template>
            </van-cell>
          </van-cell-group>
        </van-checkbox-group>
      </div>
    </van-popup>
    <van-popup v-model:show="showDate" position="bottom" round teleport=".app-frame">
      <van-date-picker
        v-model="dateValue"
        title="选择日期"
        :min-date="new Date(2020, 0, 1)"
        :max-date="new Date(2035, 11, 31)"
        @confirm="confirmDate"
        @cancel="showDate = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast } from "vant";
import { addProxy, updateProxy } from "@/api/proxy";
import { getStorage } from "@/utils/storage";
import {
  PROXY_SCOPE_ALL,
  PROXY_SCOPE_PARTIAL,
  assertProxySuccess,
  ensureProxyFlows,
  ensureProxyPeople,
  getProxyRecord,
  proxyFlowOptions,
  proxyPeople,
} from "@/store/proxy";

const route = useRoute();
const router = useRouter();
const isEditing = computed(() => !!route.query.id);
const form = reactive({
  id: "",
  objectIds: [],
  principal: getStorage("clamc_user") || "",
  agentId: "",
  agentName: "",
  scope: PROXY_SCOPE_ALL,
  flows: [],
  flowCodes: [],
  startDate: "",
  endDate: "",
});
const showAgent = ref(false);
const showScope = ref(false);
const showFlows = ref(false);
const showDate = ref(false);
const selectedFlowCodes = ref([]);
const dateField = ref("startDate");
const dateValue = ref([]);
const submitting = ref(false);

const agentActions = computed(() =>
  proxyPeople.value.map((person) => ({ ...person, name: person.name })),
);
const scopeActions = [
  { name: "全部代理", value: PROXY_SCOPE_ALL },
  { name: "部分代理", value: PROXY_SCOPE_PARTIAL },
];
const scopeLabel = computed(() => form.scope === PROXY_SCOPE_PARTIAL ? "部分代理" : "全部代理");
const flowLabel = computed(() => form.flows.length ? form.flows.join("、") : "请选择");

function hydrate() {
  const record = getProxyRecord(String(route.query.id || ""));
  if (record) {
    Object.assign(form, {
      ...record,
      objectIds: [...record.objectIds],
      flows: [...record.flows],
      flowCodes: [...record.flowCodes],
    });
  }
  document.title = record ? "编辑代理" : "新建代理";
}

function selectAgent(action) {
  form.agentId = action.id;
  form.agentName = action.name;
  showAgent.value = false;
}

function selectScope(action) {
  form.scope = action.value;
  if (action.value === PROXY_SCOPE_ALL) {
    form.flows = [];
    form.flowCodes = [];
    selectedFlowCodes.value = [];
  }
  showScope.value = false;
}

function toggleFlow(flow) {
  const index = selectedFlowCodes.value.indexOf(flow.code);
  if (index >= 0) selectedFlowCodes.value.splice(index, 1);
  else selectedFlowCodes.value.push(flow.code);
}

function confirmFlows() {
  form.flowCodes = [...selectedFlowCodes.value];
  form.flows = proxyFlowOptions.value
    .filter((flow) => form.flowCodes.includes(flow.code))
    .map((flow) => flow.name);
  showFlows.value = false;
}

function dateArray(value) {
  if (value) return value.split("-");
  const now = new Date();
  return [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")];
}

function openDate(field) {
  dateField.value = field;
  dateValue.value = dateArray(form[field]);
  showDate.value = true;
}

function confirmDate({ selectedValues }) {
  form[dateField.value] = selectedValues.join("-");
  showDate.value = false;
}

async function submit() {
  if (submitting.value) return;
  if (!form.agentName) return showToast("请选择代理人");
  if (form.scope === PROXY_SCOPE_PARTIAL && !form.flowCodes.length) return showToast("请选择代理流程");
  if (!form.startDate || !form.endDate) return showToast("请选择代理时间");
  if (form.startDate > form.endDate) return showToast("结束时间不能早于开始时间");
  const payload = {
    agentId: form.agentId,
    startTime: form.startDate,
    endTime: form.endDate,
    isAllworkflow: form.scope === PROXY_SCOPE_ALL ? 999 : 0,
    workFlowCodes: form.scope === PROXY_SCOPE_ALL ? [] : [...form.flowCodes],
  };
  if (isEditing.value) {
    if (!form.objectIds.length) return showToast("代理记录缺少编辑标识");
    payload.objectIds = [...form.objectIds];
  }

  submitting.value = true;
  try {
    const response = isEditing.value
      ? await updateProxy(payload)
      : await addProxy(payload);
    assertProxySuccess(response, isEditing.value ? "保存代理失败" : "新建代理失败");
    showToast(isEditing.value ? "保存成功" : "新建成功");
    router.back();
  } catch (error) {
    console.error("[proxy-form] submit failed:", error);
    showToast(error?.message || (isEditing.value ? "保存代理失败" : "新建代理失败"));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  hydrate();
  try {
    await Promise.all([ensureProxyPeople(), ensureProxyFlows()]);
    if (!form.flowCodes.length && form.flows.length) {
      form.flowCodes = proxyFlowOptions.value
        .filter((flow) => form.flows.includes(flow.name))
        .map((flow) => flow.code);
    }
    selectedFlowCodes.value = [...form.flowCodes];
  } catch (error) {
    console.error("[proxy-form] options load failed:", error);
    showToast(error?.message || "获取代理选项失败");
  }
});
</script>

<style lang="scss" scoped>
.proxy-form-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--safe-top) 0 calc(76px + var(--safe-bottom));
  background: var(--page-bg);
  color: #323233;
}

.form-section {
  margin: 0;
}

.section-title {
  height: 40px;
  padding: 10px 16px;
  color: #646566;
  font-size: 14px;
  line-height: 20px;

  &.required::before {
    margin-right: 6px;
    color: #e81515;
    content: "*";
  }
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
  }

  .ellipsis {
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

    &:disabled {
      opacity: 0.6;
    }
  }
}

.flow-picker {
  padding-bottom: calc(16px + var(--safe-bottom));
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;

  button {
    border: 0;
    color: var(--primary);
    background: transparent;
    font-size: 14px;
  }

  strong {
    font-size: 16px;
  }
}
</style>
