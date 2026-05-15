<template>
  <div class="user-info-card" :style="{ top: `${y}px`, left: `${x}px` }" @click.stop>
    <button type="button" class="close-btn" aria-label="关闭" @click="$emit('close')">×</button>

    <div v-if="loading" class="card-loading">
      <el-icon class="spin"><Loading /></el-icon>
    </div>

    <template v-else-if="userInfo">
      <div class="avatar-section">
        <div class="avatar-wrap">
          <img :src="avatarUrl" class="avatar" alt="avatar" @error="onAvatarError" />
          <img
            v-if="userInfo.avatarFramerUrl"
            :src="userInfo.avatarFramerUrl"
            class="avatar-frame"
            alt=""
          />
        </div>
        <div class="user-basic">
          <div class="nickname">{{ displayName }}</div>
          <div class="username">@{{ userInfo.userName }}</div>
          <div class="status-row">
            <span class="status-indicator" :class="{ online: isOnline }"></span>
            <span>{{ isOnline ? "在线" : "离线" }}</span>
          </div>
        </div>
      </div>

      <div v-if="showMeta" class="meta-row">
        <span class="level-chip">
          Lv.{{ userInfo.level ?? 0 }}
        </span>
        <span v-if="userInfo.points != null || userInfo.userPoint != null" class="points-chip">
          ✨ {{ userInfo.points ?? userInfo.userPoint ?? 0 }}
        </span>
      </div>

      <div v-if="regionText" class="location-row">
        <span>📍</span>
        <span>{{ regionText }}</span>
      </div>

      <div v-if="!isCurrentUser" class="card-actions">
        <button type="button" class="action-btn detail" @click="handleDetail">查看详情</button>
        <button type="button" class="action-btn mention" @click="$emit('mention', userInfo.userName || '')">
          @TA
        </button>
      </div>
    </template>

    <div v-else class="card-empty">加载失败</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { Loading } from "@element-plus/icons-vue";
import { userApi } from "../api/user";

const props = defineProps({
  userId: { type: [Number, String], default: null },
  userName: { type: String, default: "" },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  currentUser: { type: String, default: "" },
});

const emit = defineEmits(["close", "detail", "mention"]);

const userInfo = ref(null);
const loading = ref(false);

const displayName = computed(
  () => userInfo.value?.userNickname || userInfo.value?.userName || "未知用户",
);

const avatarUrl = computed(
  () =>
    userInfo.value?.userAvatarURL48 ||
    userInfo.value?.userAvatarURL ||
    userInfo.value?.userAvatar ||
    "/default-avatar.png",
);

const isOnline = computed(() => userInfo.value?.userOnlineFlag !== false);

const regionText = computed(() => {
  const u = userInfo.value;
  if (!u) return "";
  const region = u.region || u.userCity;
  if (!region) return "";
  return u.country ? `${u.country} · ${region}` : region;
});

const showMeta = computed(
  () =>
    userInfo.value?.level != null ||
    userInfo.value?.points != null ||
    userInfo.value?.userPoint != null,
);

const isCurrentUser = computed(() => props.currentUser === props.userName);

function onAvatarError(e) {
  e.target.src = "/default-avatar.png";
}

function handleDetail() {
  emit("detail", userInfo.value);
}

async function fetchUserInfo() {
  loading.value = true;
  try {
    if (props.userId !== null && props.userId !== undefined && props.userId !== "") {
      const rawId = typeof props.userId === "string" ? props.userId.trim() : String(props.userId);
      if (rawId && /^\d+$/.test(rawId)) {
        userInfo.value = await userApi.getUserVoById(rawId);
        return;
      }
    }
    if (!props.userName) return;
    userInfo.value = await userApi.getUserProfile(props.userName);
  } catch (error) {
    console.error("获取用户信息失败:", error);
    userInfo.value = null;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.userId, props.userName], fetchUserInfo, { immediate: true });
onMounted(fetchUserInfo);
</script>

<style scoped>
.user-info-card {
  position: fixed;
  z-index: 3000;
  width: 280px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 20px 18px 16px;
  color: #262626;
  animation: fadeIn 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  font-size: 18px;
  color: #bfbfbf;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background 0.2s;
}

.close-btn:hover {
  color: #595959;
  background: #f5f5f5;
}

.card-loading {
  display: flex;
  justify-content: center;
  padding: 32px 0;
  color: #ffa940;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  padding-right: 20px;
}

.avatar-wrap {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #f0f0f0;
}

.avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 170%;
  height: 170%;
  pointer-events: none;
}

.user-basic {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nickname {
  font-size: 17px;
  font-weight: 700;
  color: #1a1c1e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.username {
  font-size: 13px;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.status-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d9d9d9;
}

.status-indicator.online {
  background: #52c41a;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.level-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
  font-size: 12px;
  font-weight: 600;
}

.points-chip {
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 12px;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.action-btn {
  flex: 1;
  padding: 9px 0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.action-btn.detail {
  background: #f5f5f5;
  color: #595959;
}

.action-btn.detail:hover {
  background: #ebebeb;
}

.action-btn.mention {
  background: linear-gradient(135deg, #ffb84d, #ff9f1a);
  color: #1a1c1e;
}

.action-btn.mention:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.card-empty {
  text-align: center;
  padding: 24px;
  color: #bfbfbf;
  font-size: 14px;
}
</style>
