<template>
  <div class="climb">
    <div class="sticky-header">
      <van-tabs
        ref="tabsRef"
        v-model:active="activeTab"
        line-width="22"
        line-height="3"
        title-active-color="#2175E6"
      >
        <van-tab v-for="t in tabs" :key="`${t.key}-${t.count}`" :name="t.key">
          <template #title>
            <span class="tab-title">
              {{ t.label }}
              <span class="tab-badge">{{ t.count }}</span>
            </span>
          </template>
        </van-tab>
      </van-tabs>

      <div class="toolbar">
        <div
          class="cat-btn"
          :class="{ active: catOpen || !!filterState.parentworkflowcode }"
          @click="catOpen = !catOpen"
        >
          <span class="cat-label">{{ catLabel }}</span>
          <img :src="catOpen ? arrowUp : arrowDown" class="cat-arrow" />
        </div>

        <div v-if="!searching" class="search-box" @click="enterSearch">
          <img :src="searchIcon" class="s-icon" />
          <span class="placeholder">流程标题、创建人...</span>
        </div>
        <div v-else class="search-box active">
          <img :src="searchIcon" class="s-icon" />
          <input
            ref="searchInput"
            v-model="keyword"
            class="s-input"
            placeholder="流程标题、创建人..."
            @keydown.enter="onSearch"
          />
          <img
            v-if="keyword"
            :src="deleteIcon"
            class="s-clear"
            @click="keyword = ''"
          />
        </div>

        <button
          v-if="!searching"
          class="filter-btn"
          :class="{ active: hasFilter }"
          @click="goFilter"
        >
          <img :src="hasFilter ? filterIconActive : filterIcon" />
        </button>
        <span v-else class="cancel-btn" @click="cancelSearch">取消</span>
      </div>
    </div>

    <div class="list-scroll" :class="{ 'is-refreshing': refreshing }">
      <div v-if="searching && keyword" class="search-summary">
        共搜索出{{ total }}个结果
      </div>

      <van-pull-refresh
        v-model="refreshing"
        @refresh="onRefresh"
        success-text="刷新完成"
        pulling-text="下拉刷新"
        loosing-text="松手刷新"
        loading-text="加载中..."
      >
        <van-list
          v-if="filteredList.length || loading"
          v-model:loading="loading"
          :finished="finished"
          :immediate-check="false"
          finished-text="没有更多了"
          loading-text="加载中..."
          error-text="加载失败，点击重试"
          v-model:error="loadError"
          @load="onLoad"
        >
          <div class="list">
            <FlowItem
              v-for="item in filteredList"
              :key="item.id"
              :item="item"
              :status="activeTab"
              @click="onItemClick(item)"
            />
          </div>
        </van-list>
        <div v-else class="empty">
          <img :src="picNull" />
          <p>未筛选出满足条件的{{ tabLabel }}</p>
        </div>
      </van-pull-refresh>
    </div>

    <!-- 分类下拉面板 -->
    <van-popup
      v-model:show="catOpen"
      class="category-popup"
      overlay-class="category-overlay"
      position="top"
      round
      :style="{ top: categoryPopupTop, maxHeight: '60%' }"
      :overlay-style="{ top: categoryPopupTop }"
      teleport=".app-frame"
    >
      <div class="cat-panel">
        <div class="cat-left">
          <div
            v-for="c in categories"
            :key="c.name"
            :class="[
              'l1',
              {
                active: committedL1 === c.name,
                viewing: l1 === c.name && committedL1 !== c.name,
              },
            ]"
            @click="l1 = c.name"
          >
            {{ c.name }}
          </div>
        </div>
        <div class="cat-right">
          <div
            v-for="s in currentSubs"
            :key="s.name"
            :class="[
              'l2',
              { active: l1 === committedL1 && committedL2 === s.name },
            ]"
            @click="pickSub(s)"
          >
            <span>{{ s.name }}</span>
            <span class="count">{{ displaySubCount(s) }}</span>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import FlowItem from "@/components/FlowItem.vue";
import {
  fetchTaskList,
  fetchAlreadyHandleList,
  fetchUnReadProcessList,
  fetchReadProcessList,
  fetchCommissionTabCounts,
  fetchCategoryTreeByTab,
  updateReadedProcess,
  UPDATE_READED_PROCESS_TYPE,
} from "@/api/process";
import { showToast } from "vant";
import {
  filterState,
  pickCategory,
  advancedHasConditions,
  resetFilter,
} from "@/store/modules/filter";
import { resumePendingPcenterOpen, toDeal } from "@/utils/workflowOpen";
import searchIcon from "@/assets/icons/ic_Search.svg";
import filterIcon from "@/assets/icons/ic_Filter.svg";
import filterIconActive from "@/assets/icons/ic_Filter_Active.svg";
import arrowDown from "@/assets/icons/ic_ArrowDown.svg";
import arrowUp from "@/assets/icons/ic_ArrowUp.svg";
import deleteIcon from "@/assets/icons/ic_Delete.svg";
import picNull from "@/assets/icons/Pic_Null.svg";

const router = useRouter();

const VALID_LIST_TABS = ["todo", "done", "unread", "read"];
const PAGE_TITLE = "CLIMB流程";

function syncPageTitle() {
  document.title = PAGE_TITLE;
}

/** 从 store 恢复列表 Tab，避免从高级筛选返回时组件重挂载又回到默认「待办」 */
function initialListTab() {
  const t = filterState.listTab;
  return VALID_LIST_TABS.includes(t) ? t : "todo";
}

/** 原 97px（nav + tabs + 工具条）；去掉顶栏后 tabs+工具条约 92px，并与 sticky-header 的 safe-top 对齐 */
const categoryPopupTop = "calc(var(--safe-top) + 92px)";

const tabsRef = ref(null);

const tabCounts = ref({ todo: 0, done: 0, unread: 0, read: 0 });
const tabs = computed(() => [
  { key: "todo", label: "待办", count: tabCounts.value.todo },
  { key: "done", label: "已办", count: tabCounts.value.done },
  { key: "unread", label: "待阅", count: tabCounts.value.unread },
  { key: "read", label: "已阅", count: tabCounts.value.read },
]);
const activeTab = ref(initialListTab());
const tabLabel = computed(
  () => tabs.value.find((t) => t.key === activeTab.value)?.label || "",
);

const ALL = {
  name: "全部分类",
  code: "",
  subs: [{ name: "全部", code: "", count: 0 }],
};
const categories = ref([ALL]);

async function loadCategories() {
  try {
    const res = await fetchCategoryTreeByTab(filterState.listTab);
    const tree = (res?.data || []).map((node) => ({
      name: node.processClassificationName,
      code: node.processClassificationCode,
      subs: [
        {
          name: "全部",
          code: node.processClassificationCode,
          count: node.size || 0,
        },
        ...(node.children || []).map((c) => ({
          name: c.processClassificationName,
          code: c.processClassificationCode,
          count: c.size || 0,
        })),
      ],
    }));
    categories.value = [
      {
        name: "全部分类",
        code: "",
        subs: [{ name: "全部", code: "", count: 0 }],
      },
      ...tree,
    ];
  } catch (e) {
    console.error("[category] load failed:", e);
  }
}

const catOpen = ref(false);
const l1 = ref("全部分类");
const committedL1 = ref("全部分类");
const committedL2 = ref("全部");
const catLabel = computed(() => {
  const name = filterState.parentworkflowname || "全部分类";
  if (name === "全部分类") return "全部分类";
  return name.length > 4 ? name.slice(0, 4) + "..." : name;
});

function normCode(x) {
  return x != null && x !== "" ? String(x) : "";
}

function persistCategoryPathToStore() {
  const nextPath =
    committedL1.value === "全部分类" && committedL2.value === "全部"
      ? "全部分类 / 全部"
      : `${committedL1.value} / ${committedL2.value}`;
  if ((filterState.categoryPathName || "").trim() !== nextPath) {
    filterState.categoryPathName = nextPath;
  }
}

function syncCategoryFromFilterState() {
  const code = normCode(filterState.parentworkflowcode);
  const path = (filterState.categoryPathName || "").trim();

  if (
    !code &&
    (!path ||
      path === "全部分类 / 全部" ||
      path === "全部分类" ||
      (path.startsWith("全部分类") && path.includes("全部")))
  ) {
    committedL1.value = "全部分类";
    committedL2.value = "全部";
    l1.value = committedL1.value;
    persistCategoryPathToStore();
    return;
  }

  if (code) {
    for (const c of categories.value) {
      if (!c || c.name === "全部分类") continue;
      const subs = c.subs || [];
      const match = subs.find((s) => normCode(s.code) === code);
      if (match) {
        committedL1.value = c.name;
        committedL2.value = match.name;
        l1.value = c.name;
        persistCategoryPathToStore();
        return;
      }
    }
  }

  const parts = path.split(" / ").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const p0 = parts[0];
    const p1 = parts[1];
    if (p0 === "全部分类") {
      committedL1.value = "全部分类";
      committedL2.value = p1 === "全部" ? "全部" : p1;
    } else {
      committedL1.value = p0;
      committedL2.value = p1;
    }
    l1.value = committedL1.value;
    persistCategoryPathToStore();
    return;
  }

  if (parts.length === 1 && parts[0] && parts[0] !== "全部分类") {
    committedL1.value = parts[0];
    committedL2.value = "全部";
    l1.value = committedL1.value;
    persistCategoryPathToStore();
    return;
  }

  committedL1.value = "全部分类";
  committedL2.value = "全部";
  l1.value = committedL1.value;
  persistCategoryPathToStore();
}

const currentSubs = computed(
  () => categories.value.find((c) => c.name === l1.value)?.subs || [],
);

/** 「全部分类 / 全部」数量与 Tab 角标一致 */
function displaySubCount(s) {
  if (l1.value === "全部分类" && s.name === "全部") {
    return tabCounts.value[activeTab.value] ?? 0;
  }
  return s.count ?? 0;
}

watch(catOpen, (open) => {
  if (open) l1.value = committedL1.value;
});
const pickSub = (s) => {
  committedL1.value = l1.value;
  committedL2.value = s.name;
  const displayName =
    l1.value === "全部分类"
      ? "全部分类"
      : s.name === "全部"
        ? l1.value
        : s.name;
  const fullPath =
    l1.value === "全部分类"
      ? "全部分类 / 全部"
      : s.name === "全部"
        ? `${l1.value} / 全部`
        : `${l1.value} / ${s.name}`;
  catOpen.value = false;
  pickCategory(s.code || "", displayName, fullPath);
  resetAndLoad();
};

const list = ref([]);
const page = ref(0);
const pageSize = 10;
const total = ref(0);
const loading = ref(false);
const finished = ref(false);
const loadError = ref(false);

/** 接口可能直接返回数字段，或在 message 包裹下的 data 里，或与列表一样再包一层 data */
function unpackTabStatsPayload(res) {
  if (res == null || typeof res !== "object") return {};
  if ("unfinishedWorkItemCount" in res) return res;
  const inner = res.data;
  if (inner && typeof inner === "object") {
    if ("unfinishedWorkItemCount" in inner) return inner;
    const nested = inner.data;
    if (
      nested &&
      typeof nested === "object" &&
      "unfinishedWorkItemCount" in nested
    )
      return nested;
  }
  return {};
}

function mapTabCountsFromApi(data) {
  const d = unpackTabStatsPayload(data);
  return {
    todo: Number(d.unfinishedWorkItemCount) || 0,
    done: Number(d.finishedWorkItemCount) || 0,
    unread: Number(d.unreadWorkItemCount) || 0,
    read: Number(d.readWorkItemCount) || 0,
  };
}

async function refreshTabCounts() {
  try {
    const res = await fetchCommissionTabCounts(buildParams(1));
    tabCounts.value = mapTabCountsFromApi(res);
  } catch (e) {
    console.error("[tab-counts] failed:", e);
  }
}

function resizeTabsLine() {
  nextTick(() => {
    requestAnimationFrame(() => {
      tabsRef.value?.resize?.();
    });
  });
}

function mapRow(row) {
  const dept = row.originatorDept || row.originatordept;
  return {
    id: row.objectId,
    objectId: row.objectId,
    instanceId: row.instanceId,
    sequenceNo: row.sequenceNo,
    workflowCode: row.workflowCode,
    activityCode: row.activityCode,
    formUrl: row.formUrl,
    folderName: row.folderName,
    mobiletype: row.mobiletype,
    title: row.instanceName,
    subType: row.workflowName,
    category: row.folderName || row.workflowName,
    creator: dept ? `${row.originatorName} (${dept})` : row.originatorName,
    time: row.instanceCreatedTime,
    receiveTime: row.receiveTime,
    node: row.displayName,
    unread: row.isRead === 0,
    raw: row,
  };
}

function buildParams(pageNum) {
  const params = {
    pageNum,
    pageSize,
    parentworkflowcode: filterState.parentworkflowcode || "",
    workflowcode: "",
    instanceName: "",
    founderName: "",
    founderCode: "",
    deptName: "",
    startTime: "",
    endTime: "",
    receiveStartDate: "",
    receiveEndDate: "",
    sequenceNo: "",
  };
  const adv = filterState.advanced;
  if (adv) {
    if (adv.title) params.instanceName = adv.title;
    if (adv.founderName) params.founderName = adv.founderName;
    if (adv.founderCode) params.founderCode = adv.founderCode;
    if (adv.deptName) params.deptName = adv.deptName;
    if (adv.startTime) params.startTime = adv.startTime;
    if (adv.endTime) params.endTime = adv.endTime;
    if (adv.receiveStartDate) params.receiveStartDate = adv.receiveStartDate;
    if (adv.receiveEndDate) params.receiveEndDate = adv.receiveEndDate;
    if (adv.sequenceNo) params.sequenceNo = adv.sequenceNo;
    if (adv.startTime || adv.endTime) params.creatDayState = 10;
    if (adv.receiveStartDate || adv.receiveEndDate) params.receiveDayState = 10;
  }
  if (keyword.value.trim()) params.instanceName = keyword.value.trim();
  return params;
}

async function onLoad() {
  if (finished.value) {
    loading.value = false;
    return;
  }
  await fetchNextPage();
}

function requestListForTab(params) {
  switch (activeTab.value) {
    case "done":
      return fetchAlreadyHandleList(params);
    case "unread":
      return fetchUnReadProcessList(params);
    case "read":
      return fetchReadProcessList(params);
    case "todo":
    default:
      return fetchTaskList(params);
  }
}

/** 递增后会使进行中的请求结果作废，避免重复 reset / 并发导致的二次追加 */
let listFetchGen = 0;

async function fetchNextPage() {
  const gen = listFetchGen;
  try {
    loadError.value = false;
    const nextPage = page.value + 1;
    const res = await requestListForTab(buildParams(nextPage));
    if (gen !== listFetchGen) return;

    page.value = nextPage;
    const rows = res?.data?.rows || [];
    total.value = res?.data?.total || 0;
    list.value.push(...rows.map(mapRow));
    if (list.value.length >= total.value || rows.length < pageSize)
      finished.value = true;
  } catch (e) {
    if (gen === listFetchGen) {
      console.error("[list] load failed:", e);
      loadError.value = true;
    }
  } finally {
    if (gen === listFetchGen) loading.value = false;
  }
}

async function resetAndLoad() {
  listFetchGen++;
  list.value = [];
  page.value = 0;
  total.value = 0;
  finished.value = false;
  loadError.value = false;
  loading.value = true;
  await fetchNextPage();
}

/** 切换事项 Tab 时清空分类与高级筛选，避免沿用上一切口的分类体系 */
const suppressFilterStateWatch = ref(false);

watch(activeTab, async (tab) => {
  filterState.listTab = tab;
  suppressFilterStateWatch.value = true;
  resetFilter();
  try {
    await loadCategories();
    syncCategoryFromFilterState();
    await resetAndLoad();
    await refreshTabCounts();
  } finally {
    await nextTick();
    suppressFilterStateWatch.value = false;
  }
  resizeTabsLine();
});
watch(
  () =>
    [filterState.parentworkflowcode, filterState.categoryPathName, filterState.advanced],
  () => {
    if (suppressFilterStateWatch.value) return;
    syncCategoryFromFilterState();
    resetAndLoad();
    void refreshTabCounts();
  },
  { deep: true },
);
watch(categories, () => syncCategoryFromFilterState(), { deep: true });

watch(
  tabCounts,
  () => {
    resizeTabsLine();
  },
  { deep: true },
);

onMounted(async () => {
  syncPageTitle();
  if (resumePendingPcenterOpen()) return;
  filterState.listTab = activeTab.value;
  await loadCategories();
  syncCategoryFromFilterState();
  await refreshTabCounts();
  await resetAndLoad();
  resizeTabsLine();
});
/** keep-alive 下首屏会依次触发 onMounted（异步未完成）与 onActivated，二者都调 load 会并发请求同一页并追加两次 */
const skipNextActivatedLoad = ref(true);
onActivated(() => {
  syncPageTitle();
  if (resumePendingPcenterOpen()) return;
  syncCategoryFromFilterState();
  if (skipNextActivatedLoad.value) {
    skipNextActivatedLoad.value = false;
    return;
  }
  resetAndLoad();
  void refreshTabCounts();
});

const searching = ref(false);
const keyword = ref("");
const searchInput = ref(null);
const enterSearch = async () => {
  searching.value = true;
  await nextTick();
  searchInput.value?.focus();
};
const cancelSearch = () => {
  searching.value = false;
  keyword.value = "";
};
let searchTimer = null;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    resetAndLoad();
    void refreshTabCounts();
  }, 350);
}
const onSearch = () => {
  clearTimeout(searchTimer);
  resetAndLoad();
  void refreshTabCounts();
};
watch(keyword, debounceSearch);

const hasFilter = computed(() => advancedHasConditions(filterState.advanced));
const goFilter = () => {
  filterState.listTab = activeTab.value;
  router.push("/uniflow/front/pages/AdvancedFilter");
};

/**
 * 点击任务项：根据 mobiletype 分发。
 * - mobiletype === 0：流程暂不支持移动端 → 跳不支持页
 * - mobiletype === 1：有移动端表单 → 走业务跳转（在 openTask 中按需补逻辑）
 */
function onItemClick(item) {
  if (item.mobiletype === 0) {
    router.push("/uniflow/front/pages/Nosupported");
    return;
  }
  openTask(item);
}

async function openTask(item) {
  const formUrl = item.formUrl || item.raw?.formUrl || "";
  const objectId = item.objectId ?? item.raw?.objectId ?? "";
  const tab = activeTab.value;
  if (
    (tab === "unread" || tab === "read") &&
    objectId &&
    UPDATE_READED_PROCESS_TYPE[tab] != null
  ) {
    try {
      await updateReadedProcess(objectId, UPDATE_READED_PROCESS_TYPE[tab]);
    } catch {
      showToast("更新阅读状态失败");
    }
  }
  await toDeal(formUrl, objectId);
}

const filteredList = computed(() => list.value);

const refreshing = ref(false);
const onRefresh = async () => {
  await resetAndLoad();
  await refreshTabCounts();
  refreshing.value = false;
};
</script>

<style lang="scss" scoped>
.climb {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--page-bg);
}

.sticky-header {
  position: relative;
  flex: 0 0 auto;
  z-index: 100;
  background: #fff;
  padding-top: var(--safe-top);
}

/* 只允许列表内容区滚动，避免 iOS WebView 回弹时把顶部 Tab 一起带走。 */
.list-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.list-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.list-scroll :deep(.van-pull-refresh),
.list-scroll :deep(.van-pull-refresh__track) {
  min-height: 100%;
}

:deep(.van-tabs__nav) {
  background: #fff;
}
:deep(.van-tabs__wrap) {
  border-bottom: 1px solid var(--border);
}
:deep(.van-tab) {
  flex: 0 0 25%;
  min-width: 0;
  padding: 0 2px;
}
:deep(.van-tab__text) {
  width: 100%;
  max-width: none;
  overflow: visible;
}
:deep(.van-tab__text--ellipsis) {
  display: block;
  overflow: visible;
  white-space: normal;
  -webkit-line-clamp: unset;
  -webkit-box-orient: initial;
}
.tab-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0;
  overflow: visible;
  transform: translateZ(0);
}
.tab-badge {
  background: #f2f3f5;
  color: #646464;
  font-weight: 500;
  font-size: 11px;
  line-height: 14px;
  min-width: 18px;
  height: 18px;
  padding: 2px 5px;
  border-radius: 8px;
  letter-spacing: 0;
  text-align: center;
  box-sizing: border-box;
  flex-shrink: 0;
}
:deep(.van-tab--active) .tab-badge {
  background: var(--primary-light);
  color: var(--primary);
}

@supports (-webkit-touch-callout: none) {
  .tab-title {
    gap: 2px;
    font-size: 13px;
  }
  .tab-badge {
    min-width: 16px;
    height: 16px;
    padding: 1px 4px;
    font-size: 10px;
    line-height: 14px;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}
.cat-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f2f3f5;
  color: var(--text-2);
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 13px;
  flex-shrink: 0;
  max-width: 110px;
  &.active {
    background: var(--primary-light);
    color: var(--primary);
  }
  .cat-label {
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cat-arrow {
    width: 12px;
    height: 12px;
  }
}
.search-box {
  flex: 1;
  min-width: 0;
  height: 36px;
  background: #f2f3f5;
  border-radius: 18px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  .s-icon {
    width: 14px;
    height: 14px;
    margin-right: 6px;
    opacity: 0.55;
  }
  .placeholder {
    color: var(--text-4);
    font-size: 13px;
  }
  .s-input {
    flex: 1;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: var(--text-1);
  }
  .s-clear {
    width: 16px;
    height: 16px;
  }
  &.active {
    background: #fff;
    border: 1px solid #e1e3e6;
  }
}
.filter-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f2f3f5;
  border: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  img {
    width: 24px;
    height: 24px;
    opacity: 0.7;
  }
  &.active img {
    opacity: 1;
  }
}
.cancel-btn {
  color: var(--primary);
  font-size: 14px;
  padding: 0 4px;
  flex-shrink: 0;
}

.search-summary {
  text-align: center;
  padding: 10px;
  font-size: 12px;
  color: var(--text-3);
  background: var(--page-bg);
}

.list {
  background: #fff;
}
:deep(.van-list__finished-text),
:deep(.van-list__loading),
:deep(.van-list__error-text) {
  background: var(--page-bg);
  padding: 16px;
  font-size: 12px;
  color: var(--text-4);
}

/* 下拉刷新已有顶部加载提示，此时隐藏列表自身的加载提示。 */
.list-scroll.is-refreshing :deep(.van-list__loading) {
  display: none;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 143px;
  img {
    width: 160px;
    height: 160px;
  }
  p {
    margin-top: 12px;
    font-size: 14px;
    color: var(--text-3);
  }
}

.cat-panel {
  display: flex;
  height: 60vh;
  background: #fff;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  .cat-left {
    width: 120px;
    background: #f7f8fa;
    overflow-y: auto;
    .l1 {
      padding: 14px 12px;
      font-size: 14px;
      color: var(--text-2);
      border-left: 3px solid transparent;
      padding-left: 9px;
      &.viewing {
        background: #fff;
        color: var(--text-1);
        font-weight: 500;
      }
      &.active {
        background: #fff;
        color: var(--primary);
        font-weight: 600;
        border-left-color: var(--primary);
      }
    }
  }
  .cat-right {
    flex: 1;
    overflow-y: auto;
    .l2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      font-size: 14px;
      color: var(--text-1);
      border-bottom: 1px solid var(--border);
      &.active {
        color: var(--primary);
        font-weight: 600;
        .count {
          color: var(--primary);
        }
      }
      .count {
        font-size: 13px;
        color: var(--text-3);
      }
    }
  }
}

:global(.app-frame .van-popup.category-popup) {
  position: fixed !important;
  left: 50% !important;
  right: auto !important;
  width: min(100vw, 430px) !important;
  max-width: 430px !important;
  transform: translateX(-50%) !important;
}

:global(.app-frame .van-overlay.category-overlay) {
  position: fixed !important;
  left: 50% !important;
  right: auto !important;
  width: min(100vw, 430px) !important;
  max-width: 430px !important;
  transform: translateX(-50%) !important;
}
</style>
