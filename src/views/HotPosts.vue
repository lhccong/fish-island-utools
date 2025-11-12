<template>
  <div class="hot-posts-container">
    <div class="hot-posts-header">
      <h2>帖子热榜</h2>
      <div class="update-time" v-if="updateTime">
        <i class="fas fa-clock"></i>
        更新时间: {{ updateTime }}
      </div>
    </div>

    <div class="hot-posts-content">
      <el-scrollbar>
        <div v-if="loading" class="loading-container">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-container">
          <el-icon>
            <CircleClose />
          </el-icon>
          <p>{{ error }}</p>
          <el-button @click="loadHotPosts" type="primary">重试</el-button>
        </div>

        <div v-else-if="hotPosts.length === 0" class="empty-container">
          <el-empty description="暂无热榜数据" />
        </div>

        <div v-else class="hot-posts-list">
          <div
            v-for="(category, index) in hotPosts"
            :key="category.id"
            class="hot-category"
          >
            <div class="category-header">
              <div class="category-info">
                <img
                  v-if="category.iconUrl"
                  :src="category.iconUrl"
                  :alt="category.name"
                  class="category-icon"
                />
                <div class="category-details">
                  <div class="category-title-row">
                    <h3 class="category-name">{{ category.name }}</h3>
                    <span v-if="category.updateTime" class="category-update">
                      {{ formatTime(category.updateTime) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="posts-list">
              <div
                v-for="(post, postIndex) in category.data"
                :key="postIndex"
                class="post-item"
                @click="openUrl(post.url)"
              >
                <div class="post-rank" :class="getRankClass(postIndex)">
                  {{ postIndex + 1 }}
                </div>
                <div class="post-content">
                  <div class="post-title" :title="post.title">{{ post.title }}</div>
                </div>
                <div class="post-meta" v-if="post.followerCount">
                  <i class="fas fa-fire"></i>
                  <span>{{ formatFollowerCount(post.followerCount) }}</span>
                </div>
                <i class="fas fa-external-link-alt post-link-icon"></i>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { hotApi } from "../api/hot";
import { ElMessage } from "element-plus";
import { Loading, CircleClose } from "@element-plus/icons-vue";

const hotPosts = ref([]);
const loading = ref(false);
const error = ref("");
const updateTime = ref("");

const loadHotPosts = async () => {
  loading.value = true;
  error.value = "";

  try {
    const response = await hotApi.getHotPostList();
    if (response.code === 0 && response.data) {
      hotPosts.value = response.data;
      updateTime.value = new Date().toLocaleString("zh-CN");
    } else {
      error.value = response.message || "获取热榜数据失败";
    }
  } catch (err) {
    console.error("获取热榜失败:", err);
    error.value = "网络错误，请稍后重试";
  } finally {
    loading.value = false;
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date; // 时间差（毫秒）
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) {
      return "刚刚更新";
    } else if (minutes < 60) {
      return `${minutes}分钟前更新`;
    } else if (hours < 24) {
      return `${hours}小时前更新`;
    } else if (days < 7) {
      return `${days}天前更新`;
    } else {
      // 超过7天显示具体日期
      return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    return timeStr;
  }
};

const formatFollowerCount = (count) => {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + "万";
  }
  return count.toString();
};

const getRankClass = (index) => {
  if (index === 0) return "rank-first";
  if (index === 1) return "rank-second";
  if (index === 2) return "rank-third";
  return "";
};

const openUrl = (url) => {
  if (url) {
    utools.shellOpenExternal(url);
  }
};

onMounted(() => {
  loadHotPosts();
});
</script>

<style scoped>
.hot-posts-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-layout-bg, #f5f7fa);
}

.hot-posts-header {
  padding: 20px 24px;
  background-color: var(--card-bg, #fff);
  border-bottom: 1px solid var(--border-color, #eee);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.hot-posts-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.update-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--sub-text-color, #999);
}

.update-time i {
  font-size: 12px;
}

.hot-posts-content {
  flex: 1;
  overflow: hidden;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: var(--sub-text-color, #999);
}

.loading-container .el-icon {
  font-size: 32px;
}

.error-container .el-icon {
  font-size: 48px;
  color: var(--danger-color, #f56c6c);
}

.hot-posts-list {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.hot-category {
  background-color: var(--card-bg, #fff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  max-height: 380px;
  display: flex;
  flex-direction: column;
}

.hot-category:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.category-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  background: linear-gradient(
    135deg,
    var(--card-bg, #fff) 0%,
    var(--hover-bg, #fafafa) 100%
  );
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
}

.category-details {
  flex: 1;
}

.category-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.category-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #333);
  flex: 1;
}

.category-update {
  font-size: 10px;
  color: var(--sub-text-color, #999);
  white-space: nowrap;
  flex-shrink: 0;
}

.category-type {
  padding: 2px 8px;
  background-color: var(--primary-color-light, #e6f7ff);
  color: var(--primary-color, #1890ff);
  border-radius: 4px;
  font-weight: 500;
}

.posts-list {
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.post-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 2px solid transparent;
  min-height: 32px;
}

.post-item:hover {
  background-color: var(--hover-bg, #f5f5f5);
  border-left-color: var(--primary-color, #1890ff);
}

.post-rank {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--sub-text-color, #999);
  flex-shrink: 0;
}

.rank-first {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
}

.rank-second {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(192, 192, 192, 0.3);
}

.rank-third {
  background: linear-gradient(135deg, #cd7f32 0%, #e9a961 100%);
  color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(205, 127, 50, 0.3);
}

.post-content {
  flex: 1;
  min-width: 0;
}

.post-title {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-color, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: inherit;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--danger-color, #ff6b6b);
  font-weight: 500;
  flex-shrink: 0;
  margin-left: auto;
}

.post-meta i {
  font-size: 12px;
}

.post-link-icon {
  color: var(--sub-text-color, #ccc);
  font-size: 12px;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s ease;
}

.post-item:hover .post-link-icon {
  opacity: 1;
  color: var(--primary-color, #1890ff);
}

/* 自定义滚动条样式 */
:deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

:deep(.el-scrollbar__view) {
  padding-bottom: 16px;
}

/* 卡片内滚动条样式 */
.posts-list::-webkit-scrollbar {
  width: 6px;
}

.posts-list::-webkit-scrollbar-track {
  background: transparent;
}

.posts-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color, #ddd);
  border-radius: 3px;
}

.posts-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--sub-text-color, #999);
}
</style>
