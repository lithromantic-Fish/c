<template>
  <div class="home">
    <main class="home-body">
      <section class="todo-summary">
        <img class="summary-icon" :src="listIcon" alt="" aria-hidden="true" />
        <div class="summary-copy">
          <h1>今日待办清单</h1>
          <p>
            剩余 <span>{{ summaryTodoCount }}</span> 项，请及时处理
          </p>
        </div>
      </section>

      <div class="card-list">
        <div
          v-for="m in modules"
          :key="m.key"
          class="module-card"
          :style="{ backgroundImage: `url(${m.cardBg})` }"
          @click="onModuleClick(m)"
        >
          <div class="card-content">
            <div class="card-head">
              <span class="title">{{ m.title }}</span>
              <span v-if="m.badge > 0" class="badge">{{ m.badge }} 待办</span>
              <img
                class="arrow"
                :src="arrowRightIcon"
                alt=""
                aria-hidden="true"
              />
            </div>
            <p class="desc">{{ m.desc }}</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { fetchHomeWorkCount, unwrapApiData } from "@/api/process";
import { ROUTES } from "@/constants/routes";
import cardClimb from "@/assets/home/card-climb@2x.png";
import cardWorkflow from "@/assets/home/card-workflow@2x.png";
import cardDoc from "@/assets/home/card-doc@2x.png";
import arrowRightIcon from "@/assets/icons/ic_ArrowRight.svg";
import listIcon from "@/assets/icons/ic_list.png";

const router = useRouter();

const climbTodoCount = ref(0);
const homeCountsLoaded = ref(false);
const homeCountsLoading = ref(false);

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
  const reqId = `home-count-${Date.now()}`;
  console.log(`[${reqId}] 1. enter refreshHomeCounts`);
  try {
    const res = await fetchHomeWorkCount(HOME_COUNT_PARAMS);
    console.log(`[${reqId}] 2. after http`, res);
    const d = unwrapApiData(res);
    console.log(`[${reqId}] 3. parsed`, d);
    climbTodoCount.value = Number(d?.unfinishedWorkItemCount ?? 0);
    console.log(
      `[${reqId}] 4. assigned climbTodoCount =`,
      climbTodoCount.value,
    );
  } catch (e) {
    console.error(`[${reqId}] commission count failed:`, e);
  }
}

async function refreshHomeCountsOnce() {
  if (homeCountsLoaded.value || homeCountsLoading.value) {
    console.log("[home-count] skip duplicate request");
    return;
  }
  homeCountsLoading.value = true;
  try {
    await refreshHomeCounts();
    homeCountsLoaded.value = true;
  } finally {
    homeCountsLoading.value = false;
  }
}

const modules = computed(() => {
  const climbBadge = climbTodoCount.value;
  return [
    {
      key: "climb",
      title: "CLIMB流程",
      desc: "集成集团、投资、风险等全领域业务流程",
      badge: climbBadge,
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
  ];
});

const summaryTodoCount = computed(() => climbTodoCount.value);

const onModuleClick = (m) => {
  if (m.route) {
    document.title = m.title;
    router.push({ path: m.route, force: true });
  } else {
    showToast(`${m.title}模块开发中`);
  }
};

const onHomeBack = () => showToast("已是首页");

function scrollHomeToTop() {
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

onMounted(() => {
  document.title = "流程一站通";
  scrollHomeToTop();
  void refreshHomeCountsOnce();
});

onActivated(() => {
  document.title = "流程一站通";
  scrollHomeToTop();
  homeCountsLoaded.value = false;
  void refreshHomeCountsOnce();
});
</script>

<style lang="scss" scoped>
$home-content-max: 430px;

.home {
  min-height: 100vh;
  padding-top: 0;
  background: #fff;
  font-family:
    "Source Han Sans",
    -apple-system,
    BlinkMacSystemFont,
    "PingFang SC",
    sans-serif;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.home-nav {
  background: #3775c6;
}

.home::-webkit-scrollbar {
  display: none;
}

:global(html),
:global(body) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:global(html::-webkit-scrollbar),
:global(body::-webkit-scrollbar) {
  display: none;
}

.home-body {
  width: 100%;
  max-width: $home-content-max;
  margin: 0 auto;
  padding: 37px 23px calc(40px + var(--safe-bottom));
  background: #fff;
}

.todo-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 34px;
}

.summary-icon {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
}

.summary-copy {
  min-width: 0;

  h1 {
    margin: 0 0 8px;
    color: #323233;
    font-size: 20px;
    font-weight: 700;
    line-height: 28px;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: #969799;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    letter-spacing: 0;

    span {
      color: #2175e6;
      font-weight: 700;
    }
  }
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-card {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 148px;
  margin: 0;
  padding: 22px 26px;
  border-radius: 8px;
  background-color: #fff;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
  box-shadow: 0 8px 22px rgba(33, 117, 230, 0.12);
  overflow: hidden;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:active {
    transform: scale(0.99);
    box-shadow: 0 4px 14px rgba(33, 117, 230, 0.1);
  }
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.title {
  flex: 1;
  min-width: 0;
  color: #03313e;
  font-weight: 700;
  font-size: 18px;
  line-height: 26px;
  letter-spacing: 0;
  text-align: left;
}

.badge {
  flex-shrink: 0;
  height: 24px;
  line-height: 22px;
  padding: 0 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #e81515;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #fff;
  box-sizing: border-box;
  white-space: nowrap;
}

.arrow {
  flex: 0 0 16px;
  width: 16px;
  height: 22px;
}

.desc {
  margin: 0;
  max-width: 100%;
  color: #77929b;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 360px) {
  .home-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .todo-summary {
    gap: 14px;
  }

  .summary-copy {
    h1 {
      font-size: 20px;
      line-height: 28px;
    }

    p {
      font-size: 14px;
      line-height: 20px;
    }
  }

  .module-card {
    padding-left: 18px;
    padding-right: 18px;
  }

  .title {
    font-size: 18px;
    line-height: 26px;
  }

  .desc {
    font-size: 14px;
    line-height: 20px;
  }

  .badge {
    height: 24px;
    line-height: 22px;
    padding: 0 8px;
    font-size: 12px;
  }
}

@media (max-height: 700px) {
  .home-body {
    padding-top: 28px;
  }

  .todo-summary {
    margin-bottom: 24px;
  }

  .card-list {
    gap: 12px;
  }

  .module-card {
    height: 136px;
    padding-top: 18px;
  }
}
</style>
