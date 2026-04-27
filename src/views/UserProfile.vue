<template>
  <div class="profile-page">
    <!-- 顶部导航 -->
    <header class="header">
      <button class="back-btn" @click="router.back()">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1>{{ isCurrentUser ? "我的主页" : "TA的主页" }}</h1>
      <!-- 添加一个占位符元素，用于在没有编辑按钮时帮助居中标题 -->
      <div class="nav-placeholder"></div>
    </header>

    <!-- 可滚动内容区域 -->
    <div class="scrollable-content">
      <!-- 主要内容区 -->
      <main class="main-content">
        <!-- 用户信息 -->
        <section class="section user-basic" v-loading="userLoading">
          <div class="user-basic-row">
            <img class="user-basic-avatar" :src="userInfo?.userAvatarURL" alt="avatar" />
            <div class="user-basic-meta">
              <div class="user-basic-name">{{ userInfo?.userNickname || userInfo?.userName || "-" }}</div>
              <div class="user-basic-sub">@{{ userInfo?.userName || "-" }}</div>
            </div>
          </div>

          <div class="user-basic-kv">
            <div class="kv-item">
              <div class="kv-label">积分</div>
              <div class="kv-value">{{ userPoints }}</div>
            </div>
            <div class="kv-item">
              <div class="kv-label">个性签名</div>
              <div class="kv-value kv-value--multiline">{{ userSignature }}</div>
            </div>
            <div class="kv-item">
              <div class="kv-label">IP属地</div>
              <div class="kv-value">
                <span class="ip-location">
                  <span class="ip-emoji">📍</span>
                  <span class="ip-text">{{ ipLocation }}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- 宠物信息 -->
        <section class="section user-pet" v-loading="petLoading">
          <h3>宠物</h3>
          <div v-if="petInfo" class="pet-left-panel">
            <div class="equip-slot-grid">
              <div class="equip-column">
                <div
                  v-for="slot in leftSlots"
                  :key="slot.key"
                  class="equip-slot-card"
                  :class="{ equipped: !!getOtherEquippedItem(slot.key) }"
                  :title="getOtherEquippedItem(slot.key)?.template?.name || slot.label"
                >
                  <img
                    v-if="getOtherEquippedItem(slot.key)?.template?.icon"
                    :src="getOtherEquippedItem(slot.key).template.icon"
                    alt="equip"
                    class="slot-item-icon"
                  />
                  <span v-else>{{ slot.icon }}</span>
                  <span class="slot-label">{{ slot.label }}</span>
                </div>
              </div>
              <div class="pet-preview">
                <img v-if="petInfo.petUrl" :src="petInfo.petUrl" alt="pet" class="pet-preview-avatar" />
                <div class="pet-level-chip">Lv.{{ petInfo.level || 1 }}</div>
              </div>
              <div class="equip-column">
                <div
                  v-for="slot in rightSlots"
                  :key="slot.key"
                  class="equip-slot-card"
                  :class="{ equipped: !!getOtherEquippedItem(slot.key) }"
                  :title="getOtherEquippedItem(slot.key)?.template?.name || slot.label"
                >
                  <img
                    v-if="getOtherEquippedItem(slot.key)?.template?.icon"
                    :src="getOtherEquippedItem(slot.key).template.icon"
                    alt="equip"
                    class="slot-item-icon"
                  />
                  <span v-else>{{ slot.icon }}</span>
                  <span class="slot-label">{{ slot.label }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂未查询到宠物信息" />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { userApi } from "../api";
import { petApi } from "../api/pet";
import { useUserStore } from "../stores/user";

const route = useRoute();
const router = useRouter();
const userInfo = ref(null);
const userLoading = ref(false);
const petInfo = ref(null);
const petLoading = ref(false);

const userStore = useUserStore();

const isCurrentUser = computed(() => {
  return userStore.userInfo?.userName === userInfo.value?.userName;
});

const WS_MESSAGE_STORAGE_KEY = "user-profile-ws-message";
const leftSlots = [
  { key: "weapon", label: "武器", icon: "⚔️" },
  { key: "hand", label: "手套", icon: "🧤" },
  { key: "foot", label: "鞋子", icon: "👟" },
];
const rightSlots = [
  { key: "head", label: "头盔", icon: "👑" },
  { key: "necklace", label: "项链", icon: "📿" },
  { key: "accessory2", label: "饰品", icon: "💎" },
];

const userPoints = computed(() => {
  const u = userInfo.value || {};
  return u.userPoint ?? u.points ?? 0;
});

const userSignature = computed(() => {
  const u = userInfo.value || {};
  return String(u.userProfile || "").trim() || "未设置";
});

const normalizeIpPart = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "未知地区" || s === "未知国家") return "";
  return s;
};

const ipLocation = computed(() => {
  const u = userInfo.value || {};
  const region = normalizeIpPart(u.region ?? u.userRegion ?? u.ipRegion);
  const country = normalizeIpPart(u.country ?? u.userCountry ?? u.ipCountry);
  if (country && region) return `${country} · ${region}`;
  return country || region || "未知";
});

const getOtherEquippedItem = (slot) => {
  const equipped = petInfo.value?.equippedItems || {};
  return equipped?.[slot] || null;
};

const fetchOtherUserPet = async () => {
  const targetUserId = userInfo.value?.userId ?? userInfo.value?.id ?? route.params.id;
  if (!targetUserId) {
    petInfo.value = null;
    return;
  }

  try {
    petLoading.value = true;
    const response = await petApi.getOtherUserPet({ otherUserId: targetUserId });
    petInfo.value = response?.code === 0 ? response?.data || null : null;
  } catch (error) {
    console.error("获取其他用户宠物失败:", error);
    petInfo.value = null;
  } finally {
    petLoading.value = false;
  }
};

const fetchUserInfo = async () => {
  try {
    userLoading.value = true;
    // 优先使用 WS 消息里带过来的用户 id（从聊天室/私信跳转时更可靠）
    const identifier =
      userInfo.value?.userId ??
      userInfo.value?.id ??
      route.params.id ??
      route.params.username;
    const response = await userApi.getUserVoById(identifier);
    const base = userInfo.value || {};
    const next = response || { userName: String(identifier || "").trim() };
    // 详情接口不一定包含 region/country，避免把 WS 带过来的值覆盖掉
    userInfo.value = {
      ...base,
      ...next,
      userProfile: base.userProfile ?? next.userProfile,
      region: base.region ?? next.region,
      country: base.country ?? next.country,
    };
    await fetchOtherUserPet();
  } catch (error) {
    console.error("获取用户信息失败:", error);
    const identifier = route.params.username;
    userInfo.value = { userName: String(identifier || "").trim() };
    await fetchOtherUserPet();
  } finally {
    userLoading.value = false;
  }
};

onMounted(async () => {
  // 优先使用“从聊天室详情跳转时写入的 WS 消息”来渲染用户信息
  try {
    if (typeof utools !== "undefined") {
      const cached = utools.dbStorage.getItem(WS_MESSAGE_STORAGE_KEY);
      if (cached) {
        const wsMessage = typeof cached === "string" ? JSON.parse(cached) : cached;
        utools.dbStorage.removeItem(WS_MESSAGE_STORAGE_KEY);

        const sender = wsMessage?.data?.message?.sender;
        if (sender) {
          userInfo.value = {
            userId: sender.id ?? sender.userId ?? userInfo.value?.userId,
            userName: sender.name || userInfo.value?.userName,
            userNickname: sender.name || userInfo.value?.userNickname,
            userAvatarURL: sender.avatar || userInfo.value?.userAvatarURL,
            userPoint: sender.points ?? userInfo.value?.userPoint,
            region: sender.region ?? userInfo.value?.region,
            country: sender.country ?? userInfo.value?.country,
          };
          await fetchUserInfo();
        }
        return;
      }
    }
  } catch (e) {
    console.error("读取 WS 消息缓存失败:", e);
  }
  await fetchUserInfo();
});
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color);
  overflow: hidden;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: var(--card-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.back-btn,
.edit-btn {
  position: absolute;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: var(--text-color);
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
  flex-shrink: 0;
  z-index: 1;
}

.back-btn {
  left: 16px;
}

.edit-btn {
  right: 16px;
}

.header h1 {
  width: 100%;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: var(--text-color);
}

.nav-placeholder {
  position: absolute;
  right: 16px;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 32px;
}

.section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.empty-text {
  color: var(--sub-text-color);
  font-size: 13px;
}

.user-basic-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-basic-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

.user-basic-meta {
  flex: 1;
  min-width: 0;
}

.user-basic-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-color);
}

.user-basic-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--sub-text-color);
}

.user-basic-kv {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.kv-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.kv-label {
  width: 72px;
  font-size: 14px;
  color: var(--sub-text-color);
  flex-shrink: 0;
}

.kv-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kv-value--multiline {
  white-space: pre-wrap;
  overflow: visible;
}

.ip-location {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--sub-text-color);
  font-size: 12px;
}

.ip-emoji {
  font-size: 14px;
}

.ip-text {
  color: var(--sub-text-color);
}

.user-pet {
  min-height: 220px;
}

.pet-left-panel {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 2px solid #fdba74;
  border-radius: 16px;
  padding: 14px;
}

.equip-slot-grid {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.equip-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.equip-slot-card {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 1px solid #fdba74;
  background: #fff;
  font-size: 12px;
  color: #666;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  transition: all 0.2s ease;
}

.equip-slot-card.equipped {
  border: 2px solid #a855f7;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
  background: #fff;
}

.slot-item-icon {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.slot-label {
  font-size: 10px;
  color: #777;
}

.pet-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pet-preview-avatar {
  width: 116px;
  height: 116px;
  border-radius: 50%;
  border: 4px solid #fdba74;
}

.pet-level-chip {
  background: #f97316;
  color: #fff;
  border-radius: 999px;
  padding: 2px 12px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .user-basic-row {
    flex-wrap: wrap;
  }

  .pet-preview-avatar {
    width: 96px;
    height: 96px;
  }
}
</style>
