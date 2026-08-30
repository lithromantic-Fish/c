<template>
  <div class="app-shell">
    <div class="app-frame">
      <router-view v-slot="{ Component, route }">
        <keep-alive>
          <component :is="Component" v-if="Component && route.meta.keepAlive" :key="route.name" />
        </keep-alive>
        <component :is="Component" v-if="Component && !route.meta.keepAlive" :key="route.name" />
      </router-view>
    </div>
  </div>
</template>

<script setup></script>

<style lang="scss">
.app-shell {
  min-height: 100vh;
  background: var(--page-bg);
  display: flex;
  justify-content: center;
}
.app-frame {
  width: 100%;
  min-width: 320px;
  max-width: 430px;
  min-height: 100vh;
  margin: 0 auto;
  background: var(--page-bg);
  position: relative;
}
</style>
