<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    teleport=".app-frame"
    :style="{ height: '70%' }"
    @update:show="close"
  >
    <div class="user-picker">
      <div class="picker-head">
        <button type="button" @click="close">取消</button>
        <strong>{{ title }}</strong>
        <button type="button" @click="confirm">确定</button>
      </div>
      <div class="picker-search">
        <img :src="searchIcon" alt="" />
        <input v-model="keyword" placeholder="搜索" />
      </div>
      <div class="department-list">
        <template v-if="filteredDepartments.length">
          <section
            v-for="department in filteredDepartments"
            :key="department.name"
            class="department"
          >
            <button class="department-row" type="button" @click="toggleDepartment(department.name)">
              <img :src="departmentIcon" alt="" />
              <span>{{ department.name }}</span>
              <van-icon :name="isDepartmentOpen(department.name) ? 'arrow-up' : 'arrow-down'" />
            </button>
            <div v-show="isDepartmentOpen(department.name)" class="user-list">
              <button
                v-for="user in department.users"
                :key="user.id"
                class="user-row"
                type="button"
                @click="selectedId = user.id"
              >
                <img :src="userIcon" class="avatar" alt="" />
                <span>{{ user.name }}</span>
                <img v-if="selectedId === user.id" :src="selectedIcon" class="selected" alt="" />
              </button>
            </div>
          </section>
        </template>
        <div v-else class="empty">{{ keyword.trim() ? "未找到匹配的人员" : "暂无人员数据" }}</div>
      </div>
    </div>
  </van-popup>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import departmentIcon from "@/assets/icons/ic_Department.svg";
import searchIcon from "@/assets/icons/ic_Search.svg";
import selectedIcon from "@/assets/icons/ic_Selected.svg";
import userIcon from "@/assets/icons/ic_User2.svg";

const props = defineProps({
  show: Boolean,
  title: { type: String, default: "选择代理人" },
  modelValue: { type: String, default: "" },
  departments: { type: Array, default: () => [] },
});
const emit = defineEmits(["update:show", "confirm"]);
const keyword = ref("");
const selectedId = ref("");
const openDepartments = ref(new Set());

const filteredDepartments = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return props.departments;
  return props.departments
    .map((department) => ({
      ...department,
      users: department.users.filter((user) =>
        String(user.name || "").toLowerCase().includes(value),
      ),
    }))
    .filter((department) => department.users.length);
});

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    selectedId.value = props.modelValue;
    keyword.value = "";
    const selectedDepartment = props.departments.find((department) =>
      department.users.some((user) => user.id === selectedId.value),
    );
    openDepartments.value = new Set(
      selectedDepartment ? [selectedDepartment.name] : [],
    );
  },
);

watch(keyword, (value) => {
  if (value.trim()) {
    openDepartments.value = new Set(filteredDepartments.value.map((item) => item.name));
  }
});

function isDepartmentOpen(name) {
  return openDepartments.value.has(name);
}

function toggleDepartment(name) {
  const next = new Set(openDepartments.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  openDepartments.value = next;
}

function close() {
  emit("update:show", false);
}

function confirm() {
  const user = props.departments
    .flatMap((department) => department.users)
    .find((item) => item.id === selectedId.value);
  if (!user) return;
  emit("confirm", user);
  close();
}
</script>

<style lang="scss" scoped>
.user-picker {
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

.picker-search {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  margin: 10px 16px;
  padding: 0 12px;
  border-radius: 22px;
  background: #f5f6f7;

  img {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    color: #323233;
    background: transparent;
    font-size: 14px;
  }
}

.department-list {
  flex: 1;
  min-height: 0;
  padding: 0 16px calc(16px + var(--safe-bottom));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.department-row,
.user-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  padding: 0;
  border: 0;
  color: #323233;
  background: #fff;
  font-size: 14px;
  text-align: left;
}

.department-row {
  img {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  span {
    flex: 1;
  }

  .van-icon {
    color: #969799;
  }
}

.user-list {
  padding-left: 28px;
}

.user-row {
  border-top: 1px solid #f2f3f5;

  .avatar {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }

  span {
    flex: 1;
  }

  .selected {
    width: 20px;
    height: 20px;
  }
}

.empty {
  padding: 80px 0;
  color: #969799;
  font-size: 14px;
  text-align: center;
}
</style>
