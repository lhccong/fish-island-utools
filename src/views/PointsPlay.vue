<template>
  <div class="points-play">
    <!-- 顶部横向子菜单 -->
    <div class="points-play-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', { active: activeMenu === tab.key }]"
        @click="navigateTo(tab.key)"
      >
        <el-icon><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
      </div>
    </div>
    <!-- 内容区 -->
    <div class="points-play-content" :class="{ 'points-play-content--farm': activeMenu === 'farm' }">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, markRaw, watch } from 'vue';
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

<style scoped>
.points-play {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px 20px;
  border-radius: 8px;
  background: var(--background-color, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 横向标签栏 */
.points-play-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color-secondary, #666);
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
  background: transparent;
}

.tab-item:hover {
  color: var(--primary-color, #409eff);
  background: var(--hover-bg, #f5f5f5);
}

.tab-item.active {
  color: var(--primary-color, #409eff);
  background: var(--primary-color-light, #e6f7ff);
  font-weight: 600;
}

.tab-item .el-icon {
  font-size: 16px;
}

.points-play-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.points-play-content::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

/* 农场页占满剩余高度，内部自行布局，不出现外层滚动 */
.points-play-content--farm {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.points-play-content--farm > :deep(.farm-page) {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 100%;
}
</style>
