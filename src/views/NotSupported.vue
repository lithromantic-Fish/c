<template>
  <div class="not-supported">
    <van-nav-bar title="增设组合流程" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="ellipsis" />
      </template>
    </van-nav-bar>

    <div class="content">
      <img :src="pic" class="pic" />
      <h3 class="title">请使用电脑浏览器操作</h3>
      <p class="desc">当前流程暂不支持企业微信内操作</p>
      <van-button type="primary" block class="known-btn" @click="$router.back()">我知道了</van-button>
    </div>
  </div>
</template>

<script setup>
import pic from '@/assets/icons/Pic_NotSupported.svg'
</script>

<style lang="scss" scoped>
.not-supported { min-height: 100vh; background: var(--page-bg); }
.content {
  padding: 60px 24px 0;
  display: flex; flex-direction: column; align-items: center;
  .pic { width: 200px; height: 160px; }
  .title { margin: 16px 0 6px; font-size: 18px; font-weight: 600; color: var(--text-1); }
  .desc { margin: 0 0 24px; font-size: 13px; color: var(--text-3); }
  .known-btn { height: 44px; border-radius: 4px; font-size: 16px; }
}
</style>
