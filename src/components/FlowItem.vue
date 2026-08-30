<template>
  <div class="flow-item" role="button" @click="$emit('click')">
    <div class="title-row">
      <span v-if="item.unread" class="dot" />
      <h3 class="title">{{ item.title }}</h3>
    </div>

    <div class="tags">
      <span :class="['tag', tagClass(item.category)]">{{ item.category }}</span>
      <span class="tag tag-line">{{ item.subType }}</span>
    </div>

    <div class="meta-row">
      <img :src="userIcon" class="m-icon" />
      <span class="m-text creator ellipsis">{{ item.creator }}</span>
      <span class="divider" />
      <img :src="timeIcon" class="m-icon" />
      <span class="m-text time-text">{{ item.time }}</span>
    </div>

    <div class="node ellipsis">
      <template v-if="status === 'done'">状态：已结束</template>
      <template v-else>当前节点：{{ item.node }}</template>
    </div>
  </div>
</template>

<script setup>
import userIcon from '@/assets/icons/ic_User.svg'
import timeIcon from '@/assets/icons/ic_Time.svg'

defineProps({
  item: { type: Object, required: true },
  status: { type: String, default: 'todo' },
})

defineEmits(['click'])

const categoryColorMap = {
  '组合管理类': 'purple',
  '组合管理类最多十个字...': 'purple',
  '固收投资类': 'green',
  '集团管理类': 'orange',
  '合规类': 'purple',
  '权益投资类': 'purple',
  '风险类': 'grey'
}
const tagClass = c => `tag-${categoryColorMap[c] || 'purple'}`
</script>

<style lang="scss" scoped>
.flow-item {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
  font-family: "Source Han Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  &:active { background: #fafbfc; }
}
.title-row { display: flex; align-items: center; gap: 6px; }
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dot-red); flex-shrink: 0;
}
.title {
  margin: 0;
  color: var(--title-color);
  font-weight: bold;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0;
  text-align: left;
  word-break: break-all;
}
.tags { display: flex; gap: 8px; margin-top: 8px; flex-wrap: nowrap; overflow: hidden; }
.tag {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
  max-width: 60%;
  white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
  box-sizing: border-box;
}
.tag-purple {
  background: var(--tag-purple-bg);
  border: 0.5px solid var(--tag-purple-border);
  color: var(--tag-purple-text);
}
.tag-green {
  background: var(--tag-green-bg);
  border: 0.5px solid var(--tag-green-border);
  color: var(--tag-green-text);
}
.tag-orange {
  background: var(--tag-orange-bg);
  border: 0.5px solid var(--tag-orange-border);
  color: var(--tag-orange-text);
}
.tag-grey {
  background: var(--tag-grey-bg);
  border: 0.5px solid var(--tag-grey-border);
  color: var(--tag-grey-text);
}
.tag-line {
  background: var(--tag-grey-bg);
  border: 0.5px solid var(--tag-grey-border);
  color: var(--tag-grey-text);
}

.meta-row {
  display: flex; align-items: center;
  min-width: 0;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 0.5px solid #EBEDF0;
  font-size: 14px;
  line-height: 22px;
  color: var(--tag-grey-text);
  font-weight: 400;
  .m-icon {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    opacity: .7;
    flex: 0 0 14px;
  }
  .m-text {
    min-width: 0;
    margin-right: 6px;
  }
  .creator {
    flex: 0 1 auto;
    max-width: none;
  }
  .time-text {
    flex: 0 0 auto;
    margin-right: 0;
    white-space: nowrap;
  }
  .divider {
    width: 1px; height: 12px; background: #d8dadd; margin: 0 8px 0 2px;
    flex: 0 0 1px;
  }
}
.node {
  margin-top: 6px;
  font-size: 14px;
  line-height: 22px;
  color: var(--tag-grey-text);
  font-weight: 400;
}
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
