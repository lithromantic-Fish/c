<template>
  <div class="filter-page">
    <div class="form">
      <div class="group">
        <div class="group-title" @click="g1 = !g1">
          <span>常用条件</span>
          <img :src="g1 ? arrowUp : arrowDown" />
        </div>
        <div v-show="g1" class="group-body">
          <van-field
            v-model="form.title"
            label="流程标题"
            placeholder="请输入"
          />
          <van-field
            label="所属路径"
            :model-value="form.pathName || '全部分类'"
            readonly
            is-link
            placeholder="全部分类"
            @click="showCategory = true"
          />
          <van-field
            label="创建日期"
            :model-value="createRangeText || '全部'"
            readonly
            is-link
            placeholder="全部"
            @click="openDate('create')"
          />
          <van-field
            label="创建人姓名"
            :model-value="form.user"
            readonly
            is-link
            placeholder="请选择"
            @click="showUser = true"
          />
          <van-field
            label="创建人部门"
            :model-value="form.dept"
            readonly
            is-link
            placeholder="请选择"
            @click="showDept = true"
          />
          <van-field
            label="接收日期"
            :model-value="receiveRangeText || '全部'"
            readonly
            is-link
            placeholder="全部"
            @click="openDate('receive')"
          />
        </div>
      </div>

      <div class="group">
        <div class="group-title" @click="g2 = !g2">
          <span>其他条件</span>
          <img :src="g2 ? arrowUp : arrowDown" />
        </div>
        <div v-show="g2" class="group-body">
          <van-field
            v-model="form.flowNo"
            label="流程编号"
            placeholder="请输入"
          />
          <van-field
            v-model="form.founderCode"
            label="创建人编号"
            placeholder="请输入"
          />
        </div>
      </div>
    </div>

    <div class="footer">
      <van-button class="btn reset" plain @click="reset">重置</van-button>
      <van-button class="btn confirm" type="primary" @click="confirm"
        >确定</van-button
      >
    </div>

    <!-- 日期选择 -->
    <van-popup
      v-model:show="showDate"
      position="bottom"
      round
      teleport=".app-frame"
    >
      <div class="picker-head">
        <span class="cancel" @click="showDate = false">取消</span>
        <span class="title">{{
          dateField === "receive" ? "选择接收日期" : "选择创建日期"
        }}</span>
        <span class="confirm-text" @click="onDateConfirm">确定</span>
      </div>
      <van-tabs
        v-model:active="dateTab"
        line-width="20"
        title-active-color="#2175E6"
      >
        <van-tab name="start" title="开始日期" />
        <van-tab name="end" title="结束日期" />
      </van-tabs>
      <van-date-picker
        v-model="dateValue"
        :columns-type="['year', 'month', 'day']"
        :min-date="new Date(2017, 0, 1)"
        :max-date="new Date(2030, 11, 31)"
        :show-toolbar="false"
      />
    </van-popup>

    <!-- 部门选择 -->
    <van-popup
      v-model:show="showDept"
      position="bottom"
      round
      teleport=".app-frame"
    >
      <div class="picker-head">
        <span class="cancel" @click="showDept = false">取消</span>
        <span class="title">选择创建人部门</span>
        <span class="confirm-text" @click="onDeptConfirm">确定</span>
      </div>
      <div class="picker-body">
        <div v-show="deptUserTreeLoading" class="user-tree-loading-panel picker-loading-panel">
          <van-loading type="spinner" color="#2175E6" vertical size="32px">
            加载中...
          </van-loading>
        </div>
        <van-picker
          v-show="!deptUserTreeLoading"
          ref="deptPickerRef"
          v-model="deptValue"
          :columns="deptColumns"
          :show-toolbar="false"
        />
      </div>
    </van-popup>

    <!-- 所属路径（分类树） -->
    <van-popup
      v-model:show="showCategory"
      position="bottom"
      round
      teleport=".app-frame"
      :style="{ height: '60%' }"
    >
      <van-cascader
        v-model="categoryValue"
        title="选择所属路径"
        :options="categoryOptions"
        :field-names="{ text: 'text', value: 'value', children: 'children' }"
        @close="showCategory = false"
        @finish="onCategoryFinish"
      />
    </van-popup>

    <!-- 创建人选择（树形） -->
    <van-popup
      v-model:show="showUser"
      position="bottom"
      round
      teleport=".app-frame"
      :style="{ height: '70%' }"
      class="user-picker-popup"
    >
      <div class="user-popup-inner">
        <div class="picker-head">
          <span class="cancel" @click="showUser = false">取消</span>
          <span class="title">选择创建人姓名</span>
          <span class="confirm-text" @click="onUserConfirm">确定</span>
        </div>
        <div class="user-search">
          <img :src="searchIcon" />
          <input
            v-model="userKeyword"
            placeholder="搜索"
            :disabled="deptUserTreeLoading"
          />
        </div>
        <div class="user-tree-wrap">
          <div v-show="deptUserTreeLoading" class="user-tree-loading-panel">
            <van-loading type="spinner" color="#2175E6" vertical size="32px">
              加载中...
            </van-loading>
          </div>
          <div
            v-show="!deptUserTreeLoading"
            class="user-tree"
          >
            <template v-if="deptList.length">
              <div
                v-for="(d, idx) in filteredUserTree"
                :key="d.name + idx"
                class="dept-block"
              >
                <div class="dept-row" @click="d.open = !d.open">
                  <img :src="deptIcon" />
                  <span :class="{ active: d.open }">{{ d.name }}</span>
                </div>
                <div v-show="d.open" class="users">
                  <div
                    v-for="u in d.users"
                    :key="u.id"
                    class="user-row"
                    :class="{ selected: selectedUserId === u.id }"
                    @click="pickUser(u)"
                  >
                    <img :src="userIcon2" class="avatar" />
                    <span class="uname">{{ u.name }}</span>
                    <img
                      v-if="selectedUserId === u.id"
                      :src="selectedIcon"
                      class="check"
                    />
                  </div>
                </div>
              </div>
              <div
                v-if="userKeyword.trim() && !filteredUserTree.length"
                class="empty-tip"
              >
                未找到匹配的人员
              </div>
            </template>
            <div v-else class="empty-tip">暂无人员数据</div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onActivated, nextTick } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { fetchCategoryTreeByTab, fetchDeptTree } from "@/api/process";
import {
  filterState,
  applyAdvanced,
  resetFilter,
} from "@/store/modules/filter";
import arrowDown from "@/assets/icons/ic_ArrowDown.svg";
import arrowUp from "@/assets/icons/ic_ArrowUp.svg";
import searchIcon from "@/assets/icons/ic_Search.svg";
import deptIcon from "@/assets/icons/ic_Department.svg";
import userIcon2 from "@/assets/icons/ic_User2.svg";
import selectedIcon from "@/assets/icons/ic_Selected.svg";

const router = useRouter();
const g1 = ref(true);
const g2 = ref(true);

const form = ref({
  title: "",
  pathName: "",
  parentworkflowcode: "",
  workflowcode: "",
  user: "",
  founderCode: "",
  dept: "",
  flowNo: "",
});

const showCategory = ref(false);
const categoryOptions = ref([]);
const categoryValue = ref("");

/** 与列表分类一致：顶层「全部分类 → 全部」；每个父类下首位「全部」+ 接口子类 */
const ROOT_CASCADER_L1 = "__ROOT_ALL_CATEGORY__";
const ROOT_CASCADER_L2 = "__ROOT_ALL_SUB__";

/** 父级「全部」与父节点共用同一 code 会导致 Vant Cascader 按 modelValue 解析路径时只命中父层、finish 数据错乱；用唯一下标值区分 */
const SUBALL_PREFIX = "__SUBALL__";
function encodeParentAllValue(parentCode) {
  return `${SUBALL_PREFIX}${String(parentCode)}`;
}
function optionApiCode(optionValue) {
  const s = String(optionValue ?? "");
  return s.startsWith(SUBALL_PREFIX)
    ? s.slice(SUBALL_PREFIX.length)
    : s;
}
function normOptCode(x) {
  return x != null && x !== "" ? String(x) : "";
}

async function loadCategories() {
  try {
    const tab = filterState.listTab || "todo";
    const res = await fetchCategoryTreeByTab(tab);
    const rows = res?.data || [];

    const rootNode = {
      text: "全部分类",
      value: ROOT_CASCADER_L1,
      children: [
        {
          text: "全部",
          value: ROOT_CASCADER_L2,
        },
      ],
    };

    const rest = rows.map((top) => {
      const parentCode = top.processClassificationCode;
      const childSubs = (top.children || []).map((c) => ({
        text: c.processClassificationName,
        value: c.processClassificationCode,
      }));
      return {
        text: top.processClassificationName,
        value: parentCode,
        children: [
          { text: "全部", value: encodeParentAllValue(parentCode) },
          ...childSubs,
        ],
      };
    });

    categoryOptions.value = [rootNode, ...rest];
  } catch (e) {
    console.error("[cascader] load failed:", e);
  }
}
function onCategoryFinish({ selectedOptions, value }) {
  form.value.pathName = selectedOptions.map((o) => o.text).join(" / ");

  const last = selectedOptions[selectedOptions.length - 1];
  if (last?.value === ROOT_CASCADER_L2) {
    form.value.parentworkflowcode = "";
    form.value.workflowcode = "";
    showCategory.value = false;
    return;
  }

  if (selectedOptions.length >= 2) {
    const first = selectedOptions[0];
    const second = selectedOptions[1];
    if (second.text === "全部") {
      form.value.parentworkflowcode = normOptCode(
        optionApiCode(second.value) || first.value,
      );
    } else {
      form.value.parentworkflowcode = normOptCode(second.value);
    }
    form.value.workflowcode = "";
  } else if (selectedOptions.length === 1) {
    form.value.parentworkflowcode = normOptCode(value);
    form.value.workflowcode = "";
  }
  showCategory.value = false;
}

/** pathName 缺一级目录时，根据树与 code 补全，并写回 store 便于列表展示 */
function mendPathNameFromTree() {
  const code = normOptCode(form.value.parentworkflowcode);
  if (!code) return;

  const segs = (form.value.pathName || "").trim().split(" / ").filter((s) => s.trim());
  if (segs.length >= 2) return;

  for (const node of categoryOptions.value) {
    if (!node || node.value === ROOT_CASCADER_L1) continue;
    const children = node.children || [];
    for (const ch of children) {
      const api = optionApiCode(ch.value);
      if (normOptCode(api) !== code) continue;
      form.value.pathName = `${node.text} / ${ch.text}`;
      filterState.categoryPathName = form.value.pathName;
      return;
    }
  }
}

function syncCategoryValueForCascader() {
  const path = (form.value.pathName || "").trim();
  const pc = normOptCode(form.value.parentworkflowcode);

  if (
    !pc &&
    (!path || path === "全部分类 / 全部" || path === "全部分类")
  ) {
    categoryValue.value = ROOT_CASCADER_L2;
    return;
  }

  const parts = path
    .split(" / ")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2 && parts[1] === "全部" && pc) {
    categoryValue.value = encodeParentAllValue(pc);
    return;
  }
  if (pc) {
    categoryValue.value = pc;
    return;
  }
  categoryValue.value = ROOT_CASCADER_L2;
}

onMounted(async () => {
  await loadCategories();
  hydrateFromState();
  mendPathNameFromTree();
  await nextTick();
  syncCategoryValueForCascader();
});

onActivated(async () => {
  await loadCategories();
  hydrateFromState();
  mendPathNameFromTree();
  await nextTick();
  syncCategoryValueForCascader();
});

watch(showCategory, async (open) => {
  if (open) {
    await loadCategories();
    mendPathNameFromTree();
    await nextTick();
    syncCategoryValueForCascader();
  }
});

function hydrateFromState() {
  form.value.pathName =
    (filterState.categoryPathName || "").trim() ||
    (!filterState.parentworkflowcode ? "全部分类 / 全部" : "");
  form.value.parentworkflowcode = normOptCode(filterState.parentworkflowcode);
  form.value.workflowcode = "";

  const adv = filterState.advanced;
  if (adv) {
    form.value.title = adv.title || "";
    form.value.user = adv.founderName || "";
    form.value.founderCode = adv.founderCode || "";
    form.value.dept = adv.deptName || "";
    form.value.flowNo = adv.sequenceNo || "";
    createStart.value = adv.startTime || "";
    createEnd.value = adv.endTime || "";
    receiveStart.value = adv.receiveStartDate || "";
    receiveEnd.value = adv.receiveEndDate || "";
    if (adv.deptName) deptValue.value = [adv.deptName];
    else deptValue.value = [];
    if (adv.founderCode) selectedUserId.value = adv.founderCode;
    else selectedUserId.value = "";
  } else {
    form.value.title = "";
    form.value.user = "";
    form.value.founderCode = "";
    form.value.dept = "";
    form.value.flowNo = "";
    createStart.value = "";
    createEnd.value = "";
    receiveStart.value = "";
    receiveEnd.value = "";
    deptValue.value = [];
    selectedUserId.value = "";
  }

  mendPathNameFromTree();
}

// 日期
function today() {
  const d = new Date();
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ];
}
function strToArr(s) {
  if (!s) return today();
  const [y, m, d] = s.split("-");
  return [y, m, d];
}

const showDate = ref(false);
const dateField = ref("create"); // 'create' | 'receive'
const dateTab = ref("start");
const dateValue = ref(today());

const tempStart = ref(today());
const tempEnd = ref(today());
let suppressTabWatch = false;

const createStart = ref("");
const createEnd = ref("");
const receiveStart = ref("");
const receiveEnd = ref("");

const createRangeText = computed(() => {
  if (!createStart.value && !createEnd.value) return "";
  return `${createStart.value || "*"} 至 ${createEnd.value || "*"}`;
});
const receiveRangeText = computed(() => {
  if (!receiveStart.value && !receiveEnd.value) return "";
  return `${receiveStart.value || "*"} 至 ${receiveEnd.value || "*"}`;
});

function openDate(field) {
  dateField.value = field;
  const sNow = field === "create" ? createStart.value : receiveStart.value;
  const eNow = field === "create" ? createEnd.value : receiveEnd.value;
  tempStart.value = strToArr(sNow);
  tempEnd.value = strToArr(eNow);
  suppressTabWatch = true;
  dateTab.value = "start";
  dateValue.value = [...tempStart.value];
  showDate.value = true;
  setTimeout(() => {
    suppressTabWatch = false;
  }, 0);
}

watch(dateTab, (tab, oldTab) => {
  if (suppressTabWatch || !showDate.value) return;
  if (oldTab === "start") tempStart.value = [...dateValue.value];
  if (oldTab === "end") tempEnd.value = [...dateValue.value];
  suppressTabWatch = true;
  dateValue.value = tab === "start" ? [...tempStart.value] : [...tempEnd.value];
  setTimeout(() => {
    suppressTabWatch = false;
  }, 0);
});

function onDateConfirm() {
  if (dateTab.value === "start") tempStart.value = [...dateValue.value];
  else tempEnd.value = [...dateValue.value];
  const s = tempStart.value.join("-");
  const e = tempEnd.value.join("-");
  if (dateField.value === "create") {
    createStart.value = s;
    createEnd.value = e;
  } else {
    receiveStart.value = s;
    receiveEnd.value = e;
  }
  showDate.value = false;
}

// 部门 / 创建人（共用一个接口）
const showDept = ref(false);
const showUser = ref(false);
const userKeyword = ref("");
const deptUserTreeLoading = ref(false);

const deptList = ref([]); // 拍平后的部门列表 [{ deptName, users: [{ username, usercode }] }]

let deptTreeLoadPromise = null;

/** 仅拉取部门/人员树；不包含 loading UI（由弹层 watch 控制） */
async function fetchDeptTreeData() {
  if (deptList.value.length > 0) return;
  if (deptTreeLoadPromise) {
    await deptTreeLoadPromise;
    return;
  }
  deptTreeLoadPromise = (async () => {
    try {
      const res = await fetchDeptTree(2);
      deptList.value = (res?.data || []).map((d) => ({
        deptName: d.deptName,
        users: (d.userBooks || []).map((u) => ({
          usercode: u.usercode,
          username: u.username,
        })),
      }));
      userTree.value = deptList.value.map((d) => ({
        name: d.deptName,
        open: false,
        users: d.users.map((u) => ({
          id: u.usercode,
          name: u.username,
          code: u.usercode,
          deptName: d.deptName,
        })),
      }));
      if (deptList.value.length && !deptValue.value.length) {
        deptValue.value = [deptList.value[0].deptName];
      }
    } catch (e) {
      console.error("[dept] load failed:", e);
    } finally {
      deptTreeLoadPromise = null;
    }
  })();
  await deptTreeLoadPromise;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

watch(showDept, async (open) => {
  if (!open) return;
  deptUserTreeLoading.value = true;
  await nextTick();
  const t0 = Date.now();
  try {
    await fetchDeptTreeData();
  } finally {
    const rest = 220 - (Date.now() - t0);
    if (rest > 0) await delay(rest);
    deptUserTreeLoading.value = false;
  }
});

watch(showUser, async (open) => {
  if (!open) return;
  deptUserTreeLoading.value = true;
  await nextTick();
  const t0 = Date.now();
  try {
    await fetchDeptTreeData();
    await nextTick();
  } finally {
    const rest = 280 - (Date.now() - t0);
    if (rest > 0) await delay(rest);
    deptUserTreeLoading.value = false;
  }
});

// 创建人部门
const deptColumns = computed(() =>
  deptList.value.map((d) => ({ text: d.deptName, value: d.deptName })),
);
const deptValue = ref([]);
const deptPickerRef = ref(null);
const onDeptConfirm = () => {
  const opts = deptPickerRef.value?.getSelectedOptions?.();
  if (opts?.length) {
    form.value.dept = opts[0].text;
  } else if (deptValue.value.length) {
    form.value.dept = deptValue.value[0];
  } else if (deptList.value.length) {
    form.value.dept = deptList.value[0].deptName;
  }
  showDept.value = false;
};

// 创建人姓名树
const userTree = ref([]);
const selectedUserId = ref("");
const filteredUserTree = computed(() => {
  const k = userKeyword.value.trim().toLowerCase();
  if (!k) return userTree.value;
  return userTree.value
    .map((d) => ({
      ...d,
      open: true,
      users: d.users.filter((u) => u.name?.toLowerCase().includes(k)),
    }))
    .filter((d) => d.users.length);
});
function pickUser(u) {
  selectedUserId.value = u.id;
  form.value.user = u.name;
  form.value.founderCode = "";
}
const onUserConfirm = () => {
  showUser.value = false;
};

const reset = () => {
  form.value = {
    title: "",
    pathName: "",
    parentworkflowcode: "",
    workflowcode: "",
    user: "",
    founderCode: "",
    dept: "",
    flowNo: "",
  };
  createStart.value = "";
  createEnd.value = "";
  receiveStart.value = "";
  receiveEnd.value = "";
  deptValue.value = [];
  selectedUserId.value = "";
  resetFilter();
  hydrateFromState();
  syncCategoryValueForCascader();
  showToast("已重置");
};
const confirm = () => {
  applyAdvanced({
    title: form.value.title,
    pathName: form.value.pathName,
    parentworkflowcode: form.value.parentworkflowcode,
    workflowcode: "",
    founderName: form.value.user,
    founderCode: form.value.founderCode || "",
    deptName: form.value.dept,
    startTime: createStart.value,
    endTime: createEnd.value,
    receiveStartDate: receiveStart.value,
    receiveEndDate: receiveEnd.value,
    sequenceNo: form.value.flowNo,
  });
  showToast("筛选已应用");
  setTimeout(() => router.back(), 300);
};
</script>

<style lang="scss" scoped>
.filter-page {
  min-height: 100vh;
  background: var(--page-bg);
  padding-top: var(--safe-top);
  padding-bottom: 80px;
}

.form {
  padding-top: 8px;
}
.group {
  background: #fff;
  margin-bottom: 8px;
}
.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--page-bg);
  font-size: 13px;
  color: var(--text-3);
  img {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }
}
.group-body :deep(.van-field) {
  padding: 14px 16px;
  font-size: 14px;
}
.group-body :deep(.van-field__label) {
  width: 80px;
  color: #323233;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0;
  text-align: left;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16px;
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: #fff;
  border-top: 1px solid var(--border);
  .btn {
    flex: 1;
    height: 44px;
    border-radius: 4px;
    font-size: 16px;
  }
  .reset {
    color: var(--primary);
    border-color: var(--primary);
  }
}

.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
  }
  .cancel {
    color: var(--text-3);
    font-size: 14px;
  }
  .confirm-text {
    color: var(--primary);
    font-size: 14px;
  }
}

.picker-body {
  position: relative;
  min-height: 220px;
}
.user-popup-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.user-tree-wrap {
  position: relative;
  flex: 1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.user-tree-loading-panel {
  flex: 1;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.picker-loading-panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  z-index: 1;
}
.user-search {
  margin: 12px 16px;
  height: 36px;
  border-radius: 4px;
  background: var(--page-bg);
  display: flex;
  align-items: center;
  padding: 0 12px;
  img {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    opacity: 0.55;
  }
  input {
    flex: 1;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 14px;
  }
}
.user-tree {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.empty-tip {
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
  padding: 24px 0;
}
.dept-block {
  margin-bottom: 4px;
}
.dept-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  img {
    width: 18px;
    height: 18px;
    margin-right: 8px;
  }
  span.active {
    color: var(--primary);
    font-weight: 600;
  }
}
.users {
  padding-left: 28px;
}
.user-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  .avatar {
    width: 22px;
    height: 22px;
    margin-right: 8px;
  }
  .uname {
    flex: 1;
    font-size: 14px;
    color: var(--text-1);
  }
  .check {
    width: 18px;
    height: 18px;
  }
  &.selected .uname {
    color: var(--primary);
    font-weight: 600;
  }
}
</style>
