<template>
  <div class="points-play">
    <!-- 顶部横向子菜单 -->
    <div class="points-play-tabs">
      <div
        :class="['tab-item', { active: activeMenu === 'stock' }]"
        @click="navigateTo('stock')"
      >
        <el-icon><TrendCharts /></el-icon>
        <span>摸鱼股市</span>
      </div>
      <!-- 预留更多积分玩法入口 -->
    </div>
    <!-- 内容区 -->
    <div class="points-play-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { TrendCharts } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

// 根据当前路由确定激活的菜单
const activeMenu = ref('stock');

// 监听路由变化更新激活状态
watch(() => route.path, (newPath) => {
  if (newPath.includes('/points-play/stock-market')) {
    activeMenu.value = 'stock';
  }
}, { immediate: true });

// 导航到子页面
const navigateTo = (menu) => {
  if (menu === 'stock') {
    router.push('/points-play/stock-market');
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
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
