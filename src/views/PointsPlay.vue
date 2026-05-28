<template>
  <div class="points-play">
    <!-- 顶部横向子菜单 -->
    <nav class="points-play-tabs" aria-label="积分玩法">
      <div class="points-play-tabs__track">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', `tab-item--${tab.key}`, { active: activeMenu === tab.key }]"
          role="tab"
          :aria-selected="activeMenu === tab.key"
          @click="navigateTo(tab.key)"
        >
          <span class="tab-item__icon">
            <el-icon><component :is="tab.icon" /></el-icon>
          </span>
          <span class="tab-item__label">{{ tab.label }}</span>
        </div>
      </div>
    </nav>
    <!-- 内容区 -->
    <div
      class="points-play-content"
      :class="{
        'points-play-content--farm': activeMenu === 'farm',
        'points-play-content--stock': activeMenu === 'stock',
        'points-play-content--fight': isPetFight,
      }"
    >
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, markRaw, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Aim, TrendCharts, Trophy, Place } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

const tabs = [
  { key: 'stock', label: '摸鱼股市', icon: markRaw(TrendCharts), path: '/points-play/stock-market' },
  { key: 'farm', label: '摸鱼农场', icon: markRaw(Place), path: '/points-play/farm' },
  { key: 'tournament', label: '武道大会', icon: markRaw(Trophy), path: '/points-play/tournament' },
  { key: 'tower', label: '宠物爬塔', icon: markRaw(Aim), path: '/points-play/tower' },
];

// 根据当前路由确定激活的菜单
const activeMenu = ref('stock');
const isPetFight = computed(() => route.name === 'PetFight');

// 监听路由变化更新激活状态
watch(() => route.path, (newPath) => {
  const current = tabs.find((tab) => newPath.includes(tab.path));
  activeMenu.value = current?.key || 'stock';
}, { immediate: true });

// 导航到子页面
const navigateTo = (menu) => {
  const tab = tabs.find((item) => item.key === menu);
  if (tab && route.path !== tab.path) {
    router.push(tab.path);
  }
};
</script>

<style scoped lang="less">
@import '../styles/points-play.less';

.points-play-content--farm > :deep(.farm-page) {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
}

.points-play-content--stock > :deep(.stock-market-container) {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  max-height: 100%;
  max-width: 100%;
  width: 100%;
}
</style>
