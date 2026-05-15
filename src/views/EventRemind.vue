<template>
  <div class="event-remind-container">
    <div class="page-header">
      <h2>事件提醒</h2>
      <div class="header-actions">
        <button
          v-if="selectedIds.length > 0"
          class="action-btn danger-btn"
          :disabled="operating"
          @click="handleBatchDelete"
        >
          <i class="fas fa-trash-alt"></i>
          删除选中 ({{ selectedIds.length }})
        </button>
        <button
          v-if="hasUnread"
          class="action-btn"
          :disabled="operating"
          @click="handleMarkAllRead"
        >
          <i class="fas fa-check-double"></i>
          全部已读
        </button>
        <button class="action-btn refresh-btn" :disabled="loading" @click="refresh">
          <i class="fas fa-sync-alt" :class="{ spinning: loading }"></i>
          刷新
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading && list.length === 0" class="status-tip">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && list.length === 0" class="status-tip">
      <i class="fas fa-bell-slash"></i>
      <span>暂无事件提醒</span>
    </div>

    <!-- 列表 -->
    <div v-else class="remind-list">
      <div
        v-for="item in list"
        :key="item.id"
        class="remind-item"
        :class="{ unread: item.state === 0 }"
        @click="handleItemClick(item)"
      >
        <!-- 选择框 -->
        <div class="item-checkbox" @click.stop>
          <input
            type="checkbox"
            :checked="selectedIds.includes(item.id)"
            @change="toggleSelect(item.id)"
          />
        </div>

        <!-- 发送者头像 -->
        <div class="item-avatar">
          <img
            v-if="item.senderUser?.userAvatar"
            :src="item.senderUser.userAvatar"
            :alt="item.senderUser.userName"
            @error="handleAvatarError"
          />
          <div v-else class="avatar-placeholder">
            <i class="fas fa-user"></i>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="item-body">
          <div class="item-meta">
            <span class="sender-name">{{ item.senderUser?.userName || '系统' }}</span>
            <span class="action-text">{{ item.action }}</span>
            <span v-if="item.state === 0" class="unread-dot"></span>
          </div>
          <div v-if="item.sourceContent" class="item-content">
            {{ item.sourceContent }}
          </div>
          <div class="item-time">
            <i class="fas fa-clock"></i>
            {{ formatTime(item.remindTime || item.createTime) }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="item-actions" @click.stop>
          <button
            v-if="item.state === 0"
            class="icon-btn"
            title="标为已读"
            @click="handleSetRead(item)"
          >
            <i class="fas fa-check"></i>
          </button>
          <button
            class="icon-btn danger"
            title="删除"
            @click="handleDelete(item)"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="loading && list.length > 0" class="loading-more">
        <div class="loading-spinner small"></div>
      </div>
      <div v-else-if="!hasMore && list.length > 0" class="end-tip">
        没有更多了
      </div>
      <div v-else-if="hasMore && !loading" class="load-more-btn" @click="loadMore">
        加载更多
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { eventRemindApi } from "../api";
import { useEventRemindStore } from "../stores/eventRemind";

const router = useRouter();
const eventRemindStore = useEventRemindStore();

const list = ref([]);
const loading = ref(false);
const operating = ref(false);
const currentPage = ref(1);
const pageSize = 20;
const total = ref(0);
const hasMore = ref(true);
const selectedIds = ref([]);

const hasUnread = computed(() => list.value.some((item) => item.state === 0));

// 进入页面时刷新未读数并清零红点
onMounted(async () => {
  await loadList(true);
  // 列表加载完后，直接从列表数据统计未读数，比再发一次请求更准确
  eventRemindStore.unreadCount = list.value.filter((item) => item.state === 0).length;
  eventRemindStore.lastFetchTime = Date.now();
});

onUnmounted(() => {
  // 离开页面时重新拉取一次，确保红点数量准确
  eventRemindStore.fetchUnreadCount(true);
});

const loadList = async (reset = false) => {
  if (loading.value) return;
  if (reset) {
    currentPage.value = 1;
    list.value = [];
    hasMore.value = true;
    selectedIds.value = [];
  }
  loading.value = true;
  try {
    const res = await eventRemindApi.listMyByPage({
      current: currentPage.value,
      pageSize,
    });
    if (res.code === 0 && res.data) {
      const records = res.data.records || [];
      total.value = res.data.total || 0;
      if (reset) {
        list.value = records;
      } else {
        list.value = [...list.value, ...records];
      }
      hasMore.value = list.value.length < total.value;
    }
  } catch (error) {
    console.error("获取事件提醒列表失败:", error);
    ElMessage.error("获取列表失败，请重试");
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  currentPage.value++;
  loadList(false);
};

const refresh = () => loadList(true);

const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) {
    selectedIds.value.push(id);
  } else {
    selectedIds.value.splice(idx, 1);
  }
};

const handleItemClick = (item) => {
  if (item.url) {
    // 如果有跳转链接，打开外部链接
    utools.shellOpenExternal(item.url);
  }
  // 点击后标为已读
  if (item.state === 0) {
    handleSetRead(item);
  }
};

const handleSetRead = async (item) => {
  if (item.state !== 0) return;
  try {
    const res = await eventRemindApi.batchSetRead([item.id]);
    if (res.code === 0) {
      item.state = 1;
      // 更新 store 未读数
      await eventRemindStore.fetchUnreadCount(true);
    }
  } catch (error) {
    console.error("标为已读失败:", error);
  }
};

const handleMarkAllRead = async () => {
  const unreadIds = list.value
    .filter((item) => item.state === 0)
    .map((item) => item.id);
  if (unreadIds.length === 0) return;
  operating.value = true;
  try {
    const res = await eventRemindApi.batchSetRead(unreadIds);
    if (res.code === 0) {
      list.value.forEach((item) => {
        item.state = 1;
      });
      eventRemindStore.clearUnread();
      ElMessage.success("已全部标为已读");
    }
  } catch (error) {
    console.error("全部已读失败:", error);
    ElMessage.error("操作失败，请重试");
  } finally {
    operating.value = false;
  }
};

const handleDelete = async (item) => {
  try {
    await ElMessageBox.confirm("确定删除这条提醒吗？", "提示", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
    const res = await eventRemindApi.batchDelete([item.id]);
    if (res.code === 0) {
      list.value = list.value.filter((i) => i.id !== item.id);
      total.value = Math.max(0, total.value - 1);
      selectedIds.value = selectedIds.value.filter((id) => id !== item.id);
      await eventRemindStore.fetchUnreadCount(true);
      ElMessage.success("删除成功");
    }
  } catch (e) {
    if (e !== "cancel") {
      console.error("删除失败:", e);
      ElMessage.error("删除失败，请重试");
    }
  }
};

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedIds.value.length} 条提醒吗？`,
      "批量删除",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    operating.value = true;
    const res = await eventRemindApi.batchDelete([...selectedIds.value]);
    if (res.code === 0) {
      list.value = list.value.filter(
        (item) => !selectedIds.value.includes(item.id)
      );
      total.value = Math.max(0, total.value - selectedIds.value.length);
      selectedIds.value = [];
      await eventRemindStore.fetchUnreadCount(true);
      ElMessage.success("批量删除成功");
    }
  } catch (e) {
    if (e !== "cancel") {
      console.error("批量删除失败:", e);
      ElMessage.error("删除失败，请重试");
    }
  } finally {
    operating.value = false;
  }
};

const formatTime = (time) => {
  if (!time) return "";
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;
  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 30 * 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / 86400000)}天前`;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
};

const handleAvatarError = (event) => {
  event.target.style.display = "none";
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.event-remind-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: var(--background-color);
  overflow: hidden;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background-color: var(--hover-bg);
  color: var(--primary-color);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--border-color);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.danger-btn {
  color: #ff4d4f;
}

.refresh-btn {
  color: var(--sub-text-color);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 状态提示 */
.status-tip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--sub-text-color);
}

.status-tip i {
  font-size: 36px;
  color: var(--border-color);
}

/* 列表 */
.remind-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.remind-list::-webkit-scrollbar {
  width: 4px;
}

.remind-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.remind-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  /* 关键：不用 overflow:hidden，用 width 约束 */
  width: 100%;
}

.remind-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 未读用 box-shadow 模拟左边框，不占额外宽度 */
.remind-item.unread {
  background-color: var(--hover-bg);
  box-shadow: inset 3px 0 0 var(--primary-color);
}

.item-checkbox {
  display: flex;
  align-items: center;
  padding-top: 2px;
  flex-shrink: 0;
}

.item-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.item-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--hover-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sub-text-color);
  font-size: 16px;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.sender-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
}

.action-text {
  font-size: 13px;
  color: var(--sub-text-color);
  white-space: nowrap;
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--primary-color, #409eff);
  flex-shrink: 0;
}

.item-content {
  font-size: 13px;
  color: var(--sub-text-color);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 12px;
  color: var(--sub-text-color);
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.7;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.remind-item:hover .item-actions {
  opacity: 1;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background-color: var(--hover-bg);
  color: var(--sub-text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background-color: var(--primary-color);
  color: #fff;
}

.icon-btn.danger:hover {
  background-color: #ff4d4f;
  color: #fff;
}

/* 加载更多 */
.loading-more {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--hover-bg);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.end-tip {
  text-align: center;
  padding: 16px;
  color: var(--sub-text-color);
  font-size: 13px;
}

.load-more-btn {
  text-align: center;
  padding: 12px;
  color: var(--primary-color);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.load-more-btn:hover {
  background-color: var(--hover-bg);
}
</style>

