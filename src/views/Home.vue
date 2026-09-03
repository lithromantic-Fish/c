<template>
  <div class="home">
    <header
      class="home-hero"
      :style="{ backgroundImage: `url(${heroBackground})` }"
    >
      <div class="summary-heading">
        <img class="summary-icon" :src="alertIcon" alt="" aria-hidden="true" />
        <h1>今日待办清单</h1>
      </div>
      <p class="summary-count">
        剩余 <strong>{{ summaryTodoCount }}</strong> 项，请及时处理
      </p>
      <button
        class="settings-button"
        type="button"
        aria-label="催办提醒设置"
        @click="openReminderSettings"
      >
        <img :src="settingsIcon" alt="" aria-hidden="true" />
      </button>
    </header>

    <main class="home-body">
      <div class="card-list">
        <button
          v-for="m in modules"
          :key="m.key"
          class="module-card"
          type="button"
          :style="{ backgroundImage: `url(${m.cardBg})` }"
          @click="onModuleClick(m)"
        >
          <span class="card-content">
            <span class="card-head">
              <span class="title">{{ m.title }}</span>
              <span v-if="m.badge > 0" class="badge">{{ m.badge }} 待办</span>
              <img class="arrow" :src="arrowRightIcon" alt="" aria-hidden="true" />
            </span>
            <span class="desc">{{ m.desc }}</span>
          </span>
        </button>
      </div>
    </main>

    <van-popup
      v-model:show="reminderPopupVisible"
      class="reminder-popup"
      position="bottom"
      round
      teleport="body"
    >
      <div class="reminder-setting">
        <img class="reminder-icon" :src="reminderIcon" alt="" aria-hidden="true" />
        <div class="reminder-copy">
          <h2>催办提醒</h2>
          <p>{{ reminderDescription }}</p>
        </div>
        <span class="reminder-state">{{ reminderEnabled ? "开" : "关" }}</span>
        <van-switch
          :model-value="reminderEnabled"
          :loading="reminderLoading || reminderUpdating"
          :disabled="reminderLoading || reminderUpdating"
          size="24px"
          active-color="#2175e6"
          inactive-color="#f2f3f5"
          @update:model-value="updateReminder"
        />
      </div>
      <div class="reminder-actions">
        <button type="button" @click="reminderPopupVisible = false">取消</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import {
  fetchHomeWorkCount,
  fetchReminderSetting,
  unwrapApiData,
  updateReminderSetting,
} from "@/api/process";
import { ROUTES } from "@/constants/routes";
import alertIcon from "@/assets/home/ic-alert@3x.png";
import arrowRightIcon from "@/assets/home/ic-arrow-right@3x.png";
import cardClimb from "@/assets/home/card-climb-new@3x.png";
import cardDoc from "@/assets/home/card-doc-new@3x.png";
import cardWorkflow from "@/assets/home/card-workflow-new@3x.png";
import heroBackground from "@/assets/home/bg-header@3x.png";
import reminderIcon from "@/assets/home/ic-reminder@3x.png";
import settingsIcon from "@/assets/home/ic-setting@3x.png";

const router = useRouter();

const climbTodoCount = ref(0);
const homeCountsLoaded = ref(false);
const homeCountsLoading = ref(false);
const reminderPopupVisible = ref(false);
const reminderEnabled = ref(false);
const reminderLoading = ref(false);
const reminderUpdating = ref(false);

const HOME_COUNT_PARAMS = {
  pageNum: 1,
  pageSize: 10,
  parentworkflowcode: "",
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

async function refreshHomeCounts() {
  try {
    const res = await fetchHomeWorkCount(HOME_COUNT_PARAMS);
    const data = unwrapApiData(res);
    climbTodoCount.value = Number(data?.unfinishedWorkItemCount ?? 0);
  } catch (error) {
    console.error("[home-count] load failed:", error);
  }
}

async function refreshHomeCountsOnce() {
  if (homeCountsLoaded.value || homeCountsLoading.value) return;
  homeCountsLoading.value = true;
  try {
    await refreshHomeCounts();
    homeCountsLoaded.value = true;
  } finally {
    homeCountsLoading.value = false;
  }
}

function getReminderFlag(response) {
  const value = response?.data?.data ?? response?.data ?? response;
  const flag = String(value);
  if (flag !== "0" && flag !== "1") {
    throw new Error(response?.message || "获取催办提醒设置失败");
  }
  return flag === "1";
}

function assertReminderUpdated(response) {
  const status = String(response?.status ?? response?.code ?? "");
  if ((status !== "200" && status !== "0") || response?.rel === false) {
    throw new Error(response?.message || "催办提醒设置失败");
  }
}

async function loadReminderSetting() {
  if (reminderLoading.value || reminderUpdating.value) return;
  reminderLoading.value = true;
  try {
    reminderEnabled.value = getReminderFlag(await fetchReminderSetting());
  } catch (error) {
    console.error("[reminder] load failed:", error);
    showToast(error?.message || "获取催办提醒设置失败");
  } finally {
    reminderLoading.value = false;
  }
}

function openReminderSettings() {
  reminderPopupVisible.value = true;
  void loadReminderSetting();
}

async function updateReminder(nextValue) {
  if (reminderLoading.value || reminderUpdating.value) return;
  reminderUpdating.value = true;
  try {
    const response = await updateReminderSetting(nextValue);
    assertReminderUpdated(response);
    reminderEnabled.value = nextValue;
    showToast(nextValue ? "已开启催办提醒" : "已关闭催办提醒");
  } catch (error) {
    console.error("[reminder] update failed:", error);
    showToast(error?.message || "催办提醒设置失败");
  } finally {
    reminderUpdating.value = false;
  }
}

const modules = computed(() => [
  {
    key: "climb",
    title: "CLIMB流程",
    desc: "集成集团、投资、风险等全领域业务流程",
    badge: climbTodoCount.value,
    cardBg: cardClimb,
    route: ROUTES.climbProcess,
  },
  {
    key: "wf",
    title: "行政运营",
    desc: "支撑日常行政运营事务",
    badge: 0,
    cardBg: cardWorkflow,
  },
  {
    key: "doc",
    title: "公文管理",
    desc: "规范公文收发、流转与归档",
    badge: 0,
    cardBg: cardDoc,
  },
]);

const summaryTodoCount = computed(() => climbTodoCount.value);
const reminderDescription = computed(() =>
  reminderEnabled.value
    ? "开启后系统将自动催办"
    : "已关闭催办，不再接收提醒",
);

function onModuleClick(module) {
  if (module.route) {
    document.title = module.title;
    router.push({ path: module.route, force: true });
    return;
  }
  showToast(`${module.title}模块开发中`);
}

function scrollHomeToTop() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

function activateHome() {
  document.title = "流程一站通";
  scrollHomeToTop();
  void refreshHomeCountsOnce();
}

onMounted(activateHome);

onActivated(() => {
  homeCountsLoaded.value = false;
  activateHome();
});
</script>

<style lang="scss" scoped>
$home-content-max: 430px;

.home {
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
  color: #323233;
  font-family:
    "Source Han Sans",
    -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    sans-serif;
  overflow-x: hidden;
}

.home-hero {
  position: relative;
  height: 135px;
  padding: 17px 52px 0 16px;
  background-color: #dff7ff;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.summary-heading {
  display: flex;
  align-items: center;
  gap: 4px;

  h1 {
    margin: 0;
    color: #323233;
    font-size: 24px;
    font-weight: 700;
    line-height: 36px;
    letter-spacing: 0;
  }
}

.summary-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.summary-count {
  width: fit-content;
  margin: 4px 0 0 16px;
  padding: 1px 8px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  color: #646566;
  background: rgba(255, 255, 255, 0.46);
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0;

  strong {
    color: #2175e6;
    font-size: 16px;
    font-weight: 700;
  }
}

.settings-button {
  position: absolute;
  top: 9px;
  right: 16px;
  display: grid;
  width: 40px;
  height: 40px;
  padding: 10px;
  border: 0;
  background: transparent;
  place-items: center;

  img {
    width: 20px;
    height: 20px;
  }
}

.home-body {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: $home-content-max;
  min-height: calc(100vh - 117px);
  min-height: calc(100dvh - 117px);
  margin: -18px auto 0;
  padding: 20px 16px calc(48px + var(--safe-bottom));
  border-radius: 16px 16px 0 0;
  background: #fff;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-card {
  position: relative;
  display: block;
  width: 100%;
  height: 166px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: inherit;
  background-color: #fff;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  overflow: hidden;
  text-align: left;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.99);
  }
}

.card-content {
  position: absolute;
  top: 16px;
  right: 16px;
  left: 16px;
  z-index: 1;
  display: block;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.title {
  flex: 1;
  min-width: 0;
  color: #323233;
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
  letter-spacing: 0;
}

.badge {
  flex: 0 0 auto;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #fff;
  border-radius: 12px;
  color: #e81515;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 500;
  line-height: 22px;
  white-space: nowrap;
}

.arrow {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
}

.desc {
  display: block;
  color: #646566;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.van-popup.reminder-popup) {
  left: 0;
  width: 100%;
  border-radius: 24px 24px 0 0;
  transform: none;
  overflow: hidden;
}

.reminder-setting {
  display: flex;
  align-items: center;
  min-height: 84px;
  padding: 18px 16px;
}

.reminder-icon {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  margin-right: 8px;
}

.reminder-copy {
  flex: 1;
  min-width: 0;

  h2 {
    margin: 0;
    color: #323233;
    font-size: 18px;
    font-weight: 700;
    line-height: 24px;
    letter-spacing: 0;
  }

  p {
    margin: 2px 0 0;
    color: #969799;
    font-size: 14px;
    line-height: 20px;
    letter-spacing: 0;
    white-space: nowrap;
  }
}

.reminder-state {
  flex: 0 0 auto;
  margin: 0 8px;
  color: #969799;
  font-size: 14px;
  line-height: 20px;
}

.reminder-actions {
  padding: 12px 16px calc(46px + var(--safe-bottom));
  border-top: 1px solid #ebedf0;

  button {
    width: 100%;
    height: 48px;
    border: 1px solid #2175e6;
    border-radius: 4px;
    color: #2175e6;
    background: #fff;
    font-size: 16px;
    line-height: 46px;
    letter-spacing: 0;
  }
}

@media (max-width: 350px) {
  .summary-heading h1 {
    font-size: 22px;
  }

  .module-card {
    height: 158px;
  }

  .reminder-copy p {
    font-size: 13px;
  }
}
</style>
