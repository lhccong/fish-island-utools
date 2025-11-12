<template>
  <div class="sidebar-container">
    <div class="sidebar-section topic-section">
      <h4>
        当前话题
        <i class="fas fa-edit edit-icon" @click="showEditDialog"></i>
      </h4>
      <p class="topic-text" @click="handleTopicClick">
        {{ currentTopic || "暂无话题" }}
      </p>
    </div>
    <div class="sidebar-section online-users-section">
      <h4>在线用户 ({{ onlineUsers.length }})</h4>
      <div v-if="onlineUsers.length === 0" class="loading-placeholder">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <ul v-else class="online-users-list">
        <li v-for="user in onlineUsers" :key="user.userName" class="user-item" @click="showUserProfile(user.userName)">
          <img 
            :src="getAvatarUrl(user)" 
            :alt="user.userName" 
            class="user-avatar" 
            @error="handleAvatarError"
          />
          <span class="user-name" :title="user.userName">{{ truncateName(user.userName) }}</span>
        </li>
      </ul>
    </div>

    <!-- Topic Edit Dialog -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog-content" @click.stop>
        <h3>修改话题</h3>
        <div class="dialog-info">
          <p>修改话题需要16积分，将自动从账户中扣除</p>
          <p>最大长度16字符，不合法字符将被自动过滤</p>
        </div>
        <input v-model="newTopic" type="text" maxlength="16" placeholder="请输入新话题" class="topic-input" />
        <div class="dialog-buttons">
          <button class="cancel-btn" @click="closeDialog">取消</button>
          <button class="confirm-btn" @click="confirmEdit" :disabled="!isValidTopic">
            确认修改
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { defineProps, ref, computed, defineEmits } from "vue";
  import { useRouter } from "vue-router";
  import { chatApi } from "../api/chat";

  const router = useRouter();
  const emit = defineEmits(["topic-click"]);

  const props = defineProps({
    onlineUsers: {
      type: Array,
      default: () => [],
    },
    currentTopic: {
      type: String,
      default: "",
    },
  });

  const showDialog = ref(false);
  const newTopic = ref("");

  const isValidTopic = computed(() => {
    return newTopic.value.trim().length > 0 && newTopic.value.length <= 16;
  });

  const showEditDialog = () => {
    newTopic.value = props.currentTopic;
    showDialog.value = true;
  };

  const closeDialog = () => {
    showDialog.value = false;
    newTopic.value = "";
  };

  const confirmEdit = async () => {
    if (!isValidTopic.value) return;

    try {
      const content = `[setdiscuss]${newTopic.value}[/setdiscuss]`;
      await chatApi.sendMessage(content);
      closeDialog();
    } catch (error) {
      console.error("修改话题失败:", error);
    }
  };

  // 查看用户信息
  const showUserProfile = (userName) => {
    router.push(`/user/${userName}`);
  };

  // 处理话题点击
  const handleTopicClick = () => {
    if (props.currentTopic) {
      const formattedTopic = `*\`# ${props.currentTopic} #\`*`;
      emit("topic-click", formattedTopic);
    }
  };

  // 获取头像 URL，优先使用 userAvatarURL48，如果没有则使用 avatar
  const getAvatarUrl = (user) => {
    const avatarUrl = user.userAvatarURL48 || user.avatar || user.userAvatarURL || '';
    // 确保返回有效的 URL
    if (!avatarUrl) return '';
    // 如果已经是完整 URL，直接返回
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    // 如果是相对路径，尝试添加基础 URL
    if (avatarUrl.startsWith('/')) {
      // 这里可以根据实际情况调整，如果 API 返回的是相对路径
      return avatarUrl;
    }
    return avatarUrl;
  };

  // 处理头像加载错误
  const handleAvatarError = (event) => {
    // 设置默认头像（灰色圆形占位符）
    const defaultAvatar = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#E0E0E0"/>
        <circle cx="14" cy="11" r="4" fill="#999999"/>
        <path d="M6 22C6 18 9 15 14 15C19 15 22 18 22 22" fill="#999999"/>
      </svg>
    `);
    event.target.src = defaultAvatar;
    event.target.onerror = null; // 防止无限循环
  };

  // 截断用户名，限制显示长度
  const truncateName = (name) => {
    if (!name) return '';
    // 限制最大显示长度为 8 个字符（中文字符算 1 个）
    const maxLength = 8;
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength) + '...';
  };
</script>

<style scoped>
  .sidebar-container {
    padding: 0;
    width: 150px;
    background-color: var(----card-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  .sidebar-section {
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .sidebar-section:last-of-type {
    border-bottom: none;
  }

  .sidebar-section h4 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--text-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edit-icon {
    font-size: 14px;
    color: var(--sub-text-color);
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .edit-icon:hover {
    color: var(--primary-color);
  }

  .topic-text {
    margin: 0;
    font-size: 14px;
    color: var(--sub-text-color);
    word-break: break-word;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .topic-text:hover {
    color: var(--primary-color);
  }

  .online-users-section {
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    height: calc(100% - 80px);
  }

  .online-users-section h4 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--text-color);
  }

  .online-users-list {
    list-style: none;
    padding: 0;
    margin: 0;
    height: calc(100% - 40px);
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .online-users-list::-webkit-scrollbar {
    display: none;
  }

  .user-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 2px 0;
    min-width: 0; /* 允许 flex 子元素收缩 */
  }

  .user-item:last-child {
    margin-bottom: 0;
  }

  .user-item:hover {
    color: var(--primary-color);
    background-color: var(--hover-bg);
    border-radius: 4px;
    padding-left: 4px;
    padding-right: 4px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px; /* 防止头像被压缩 */
    border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    object-fit: cover; /* 确保图片正确填充 */
    background-color: var(--hover-bg); /* 默认背景色 */
  }

  .user-name {
    flex: 1;
    min-width: 0; /* 允许文本截断 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .placeholder-section h4 {
    color: var(--sub-text-color);
  }

  .placeholder-text {
    color: var(--sub-text-color);
    font-style: italic;
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .dialog-content {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }

  .dialog-content h3 {
    margin: 0 0 16px 0;
    color: var(--text-color);
    font-size: 18px;
  }

  .dialog-info {
    margin-bottom: 16px;
    color: var(--sub-text-color);
    font-size: 14px;
  }

  .dialog-info p {
    margin: 4px 0;
  }

  .topic-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
    margin-bottom: 16px;
    background: var(--card-bg);
    color: var(--text-color);
  }

  .topic-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .dialog-buttons button {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    border: none;
  }

  .cancel-btn {
    background-color: var(--hover-bg);
    color: var(--sub-text-color);
  }

  .cancel-btn:hover {
    background-color: var(--background-color);
  }

  .confirm-btn {
    background-color: var(--primary-color);
    color: var(--button-text);
  }

  .confirm-btn:hover:not(:disabled) {
    background-color: var(--button-bg);
  }

  .confirm-btn:disabled {
    background-color: #bfbfbf;
    cursor: not-allowed;
  }

  .loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 0;
    color: var(--sub-text-color);
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>