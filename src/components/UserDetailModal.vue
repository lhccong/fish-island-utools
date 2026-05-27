<template>
  <el-dialog
    v-model="visible"
    :width="dialogWidth"
    :show-close="false"
    class="user-detail-dialog"
    align-center
    destroy-on-close
    @closed="handleClosed"
  >
    <div v-loading="loading" class="user-detail-modal">
      <button type="button" class="dialog-close" aria-label="关闭" @click="visible = false">×</button>

      <template v-if="displayUser">
        <div class="user-detail-body">
          <div
            class="user-detail-left"
            :style="!displayUser.momentsBgUrl ? { alignItems: 'center' } : undefined"
          >
            <div class="user-detail-top-row">
              <div class="avatar-wrapper">
                <div class="avatar-with-frame">
                  <img
                    :src="avatarUrl"
                    class="detail-avatar"
                    alt="avatar"
                    @error="onAvatarError"
                  />
                  <img
                    v-if="displayUser.avatarFramerUrl"
                    :src="displayUser.avatarFramerUrl"
                    class="avatar-frame"
                    alt=""
                  />
                </div>
              </div>

              <div class="user-name-block">
                <div class="user-detail-name">
                  <span>{{ displayName }}</span>
                  <span v-if="displayUser.vip || displayUser.isVip" class="vip-badge">V</span>
                </div>

                <div v-if="!isSelf" class="follow-row">
                  <el-button
                    size="small"
                    :loading="followLoading"
                    :class="isFollowing ? 'follow-btn-active' : 'follow-btn-default'"
                    @mouseenter="isFollowing && (followHover = true)"
                    @mouseleave="followHover = false"
                    @click="handleToggleFollow"
                  >
                    {{
                      isFollowing
                        ? followHover
                          ? "取消关注"
                          : "✓ 已关注"
                        : "+ 关注"
                    }}
                  </el-button>
                </div>
              </div>
            </div>

            <div class="user-follow-stats">
              <div
                class="follow-stat-item"
                :class="{ 'follow-stat-clickable': isSelf }"
                @click="openFollowList('following')"
              >
                <span class="follow-stat-num">{{ displayUser.followingCount ?? "-" }}</span>
                <span class="follow-stat-label">关注</span>
              </div>
              <div class="follow-stat-divider" />
              <div
                class="follow-stat-item"
                :class="{ 'follow-stat-clickable': isSelf }"
                @click="openFollowList('followers')"
              >
                <span class="follow-stat-num">{{ displayUser.followerCount ?? "-" }}</span>
                <span class="follow-stat-label">粉丝</span>
              </div>
            </div>

            <div
              class="user-detail-content"
              :style="!displayUser.momentsBgUrl ? { width: '100%' } : undefined"
            >
              <div class="user-detail-item">
                <span class="item-label">等级</span>
                <span class="item-value">Lv.{{ displayUser.level ?? 0 }}</span>
              </div>
              <div class="user-detail-item">
                <span class="item-label">积分</span>
                <span class="item-value">{{ displayUser.points ?? displayUser.userPoint ?? 0 }}</span>
              </div>
              <div v-if="regionText" class="user-detail-item">
                <span class="item-label">地区</span>
                <span class="item-value">{{ regionText }}</span>
              </div>
              <div v-if="isAdminViewer" class="user-detail-item">
                <span class="item-label">管理员</span>
                <span class="item-value">{{ displayUser.isAdmin ? "是" : "否" }}</span>
              </div>
              <div class="user-detail-item">
                <span class="item-label">上次活跃</span>
                <span class="item-value">刚刚</span>
              </div>
              <div class="user-detail-item">
                <span class="item-label">状态</span>
                <span class="item-value status-online">{{ statusText }}</span>
              </div>
              <div class="user-detail-item">
                <span class="item-label">更多</span>
                <div class="more-actions">
                  <el-tooltip content="查看主页" placement="top">
                    <button type="button" class="more-btn more-btn--pet" @click="goProfile">
                      <el-icon><User /></el-icon>
                    </button>
                  </el-tooltip>
                  <el-tooltip content="查看鱼小圈" placement="top">
                    <button type="button" class="more-btn more-btn--circle" @click="goFishCircle">
                      <el-icon><Picture /></el-icon>
                    </button>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>

          <div v-if="displayUser.momentsBgUrl" class="user-detail-right">
            <img :src="displayUser.momentsBgUrl" class="moments-bg" alt="moments-bg" />
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="user-detail-footer">
        <el-button round @click="visible = false">关闭</el-button>
        <el-button type="primary" round class="profile-btn" @click="goProfile">查看详情</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog
    v-model="followListVisible"
    :title="followListType === 'following' ? '我的关注' : '我的粉丝'"
    width="360px"
    align-center
    append-to-body
    destroy-on-close
    class="follow-list-dialog"
  >
    <div v-loading="followListLoading" class="follow-list-body">
      <el-empty
        v-if="!followListLoading && followListData.length === 0"
        :description="followListType === 'following' ? '还没有关注任何人' : '还没有粉丝'"
      />
      <div v-else class="follow-list-container">
        <div v-for="item in followListData" :key="item.userId" class="follow-list-item">
          <div class="follow-list-avatar">
            <img
              :src="item.userAvatar || '/default-avatar.png'"
              class="follow-list-avatar-img"
              alt=""
              @error="onFollowAvatarError"
            />
            <img
              v-if="item.avatarFramerUrl"
              :src="item.avatarFramerUrl"
              class="follow-list-avatar-frame"
              alt=""
            />
          </div>
          <div class="follow-list-info">
            <div class="follow-list-name">
              {{ item.userName }}
              <span v-if="item.isMutual" class="mutual-badge">互相关注</span>
            </div>
            <div v-if="item.userProfile" class="follow-list-profile">{{ item.userProfile }}</div>
          </div>
          <div v-if="followListType === 'following'" class="follow-list-action">
            <el-button
              size="small"
              round
              class="unfollow-btn"
              :loading="followListActionLoadingId === item.userId"
              @click="handleUnfollow(item)"
            >
              取消关注
            </el-button>
          </div>
          <div
            v-else-if="followListType === 'followers' && !item.isMutual"
            class="follow-list-action"
          >
            <el-button
              size="small"
              round
              class="follow-back-btn"
              :loading="followListActionLoadingId === item.userId"
              @click="handleFollowBack(item)"
            >
              回关
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Picture, User } from "@element-plus/icons-vue";
import { userApi } from "../api/user";
import { followApi } from "../api/follow";
import { useUserStore } from "../stores/user";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "closed"]);

const router = useRouter();
const userStore = useUserStore();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const displayUser = ref(null);
const loading = ref(false);
const followLoading = ref(false);
const isFollowing = ref(false);
const followHover = ref(false);
const followListVisible = ref(false);
const followListType = ref("following");
const followListLoading = ref(false);
const followListData = ref([]);
const followListActionLoadingId = ref(null);

const dialogWidth = computed(() => (displayUser.value?.momentsBgUrl ? "680px" : "420px"));

const isSelf = computed(() => {
  const cur = userStore.userInfo;
  const target = displayUser.value;
  if (!cur || !target) return false;
  const curId = cur.id ?? cur.userId;
  const targetId = target.id ?? target.userId;
  if (curId != null && targetId != null && String(curId) === String(targetId)) {
    return true;
  }
  return !!(cur.userName && target.userName && cur.userName === target.userName);
});

const isAdminViewer = computed(() => userStore.userRole === "admin");

const displayName = computed(
  () =>
    displayUser.value?.userNickname ||
    displayUser.value?.userName ||
    displayUser.value?.name ||
    "未知用户",
);

const avatarUrl = computed(
  () =>
    displayUser.value?.userAvatarURL48 ||
    displayUser.value?.userAvatarURL ||
    displayUser.value?.userAvatar ||
    displayUser.value?.avatar ||
    "/default-avatar.png",
);

const regionText = computed(() => {
  const u = displayUser.value;
  if (!u) return "";
  const region = u.region || u.userCity;
  if (!region) return "";
  return u.country ? `${u.country} · ${region}` : region;
});

const statusText = computed(() => {
  const u = displayUser.value;
  if (!u) return "在线";
  if (u.userOnlineFlag === false) return "离线";
  return u.status || "在线";
});

function onAvatarError(e) {
  e.target.src = "/default-avatar.png";
}

function onFollowAvatarError(e) {
  e.target.src = "/default-avatar.png";
}

async function handleFollowBack(item) {
  if (!item?.userId || item.isMutual) return;
  followListActionLoadingId.value = item.userId;
  try {
    const res = await followApi.toggleFollow(String(item.userId));
    const nowFollowing = !!(res?.data ?? res);
    if (!nowFollowing) return;

    const idx = followListData.value.findIndex((i) => i.userId === item.userId);
    if (idx >= 0) {
      followListData.value[idx] = { ...followListData.value[idx], isMutual: true };
    }
    if (displayUser.value) {
      displayUser.value = {
        ...displayUser.value,
        followingCount: Math.max(
          0,
          (Number(displayUser.value.followingCount) || 0) + 1,
        ),
      };
    }
    ElMessage.success("关注成功");
  } catch (err) {
    ElMessage.error(err?.message || "回关失败");
  } finally {
    followListActionLoadingId.value = null;
  }
}

async function handleUnfollow(item) {
  if (!item?.userId) return;
  followListActionLoadingId.value = item.userId;
  try {
    const res = await followApi.toggleFollow(String(item.userId));
    const stillFollowing = !!(res?.data ?? res);
    if (stillFollowing) return;

    followListData.value = followListData.value.filter((i) => i.userId !== item.userId);
    if (displayUser.value) {
      displayUser.value = {
        ...displayUser.value,
        followingCount: Math.max(
          0,
          (Number(displayUser.value.followingCount) || 0) - 1,
        ),
      };
    }
    ElMessage.success("已取消关注");
  } catch (err) {
    ElMessage.error(err?.message || "取消关注失败");
  } finally {
    followListActionLoadingId.value = null;
  }
}

async function openFollowList(type) {
  if (!isSelf.value) {
    ElMessage.info("暂时只支持查看自己的关注/粉丝列表");
    return;
  }
  followListType.value = type;
  followListVisible.value = true;
  followListLoading.value = true;
  followListData.value = [];
  followListActionLoadingId.value = null;
  try {
    const fn =
      type === "following" ? followApi.listMyFollowing : followApi.listMyFollowers;
    const res = await fn({ current: 1, pageSize: 50 });
    if (res?.code === 0 && res.data?.records) {
      followListData.value = res.data.records;
    }
  } catch (err) {
    console.error("获取关注/粉丝列表失败:", err);
    ElMessage.error("获取列表失败");
  } finally {
    followListLoading.value = false;
  }
}

function normalizeSeedUser(user) {
  if (!user) return null;
  return {
    ...user,
    id: user.id ?? user.userId,
    userName: user.userName || user.name,
    userNickname: user.userNickname || user.nickname || user.userName || user.name,
    points: user.points ?? user.userPoint,
    userPoint: user.userPoint ?? user.points,
  };
}

async function loadUserDetail() {
  const seed = normalizeSeedUser(props.user);
  if (!seed) {
    displayUser.value = null;
    return;
  }
  displayUser.value = seed;
  loading.value = true;
  isFollowing.value = false;

  try {
    let merged = { ...seed };
    const initialId = seed.id ?? seed.userId;

    if (initialId != null && initialId !== "") {
      const full = await userApi.getUserVoById(initialId);
      if (full) merged = { ...merged, ...full };
    } else if (seed.userName) {
      const full = await userApi.getUserProfile(seed.userName);
      if (full) merged = { ...merged, ...full };
    }

    displayUser.value = merged;

    const targetId = merged.id ?? merged.userId;
    if (!isSelf.value && targetId != null && targetId !== "") {
      try {
        const res = await followApi.isFollowing(String(targetId));
        const data = res?.data ?? res;
        isFollowing.value = !!(data === true || data?.data === true || res === true);
      } catch {
        isFollowing.value = false;
      }
    }
  } catch (err) {
    console.error("加载用户详情失败:", err);
    ElMessage.error("加载用户信息失败");
  } finally {
    loading.value = false;
  }
}

async function handleToggleFollow() {
  const id = displayUser.value?.id ?? displayUser.value?.userId;
  if (!id || isSelf.value) return;
  followLoading.value = true;
  try {
    const res = await followApi.toggleFollow(String(id));
    const nowFollowing = !!(res?.data ?? res);
    isFollowing.value = nowFollowing;
    const delta = nowFollowing ? 1 : -1;
    displayUser.value = {
      ...displayUser.value,
      followerCount: Math.max(0, (Number(displayUser.value.followerCount) || 0) + delta),
    };
  } catch (err) {
    ElMessage.error(err?.message || "操作失败");
  } finally {
    followLoading.value = false;
    followHover.value = false;
  }
}

function goProfile() {
  const id = displayUser.value?.id ?? displayUser.value?.userId;
  const name = displayUser.value?.userName;
  visible.value = false;
  router.push(`/user/${id ?? name ?? ""}`);
}

function goFishCircle() {
  const id = displayUser.value?.id ?? displayUser.value?.userId;
  visible.value = false;
  if (id != null) {
    router.push({ path: "/fish-circle", query: { userId: String(id) } });
  } else {
    router.push("/fish-circle");
  }
}

function handleClosed() {
  displayUser.value = null;
  emit("closed");
}

watch(
  () => [props.modelValue, props.user],
  ([open]) => {
    if (open && props.user) loadUserDetail();
  },
  { immediate: true },
);
</script>

<style scoped>
.user-detail-dialog :deep(.el-dialog__header) {
  display: none;
}

.user-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.user-detail-dialog :deep(.el-dialog__footer) {
  padding: 12px 20px 18px;
  border-top: 1px solid #f0f0f0;
}

.user-detail-modal {
  position: relative;
  min-height: 200px;
}

.dialog-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #999;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.dialog-close:hover {
  color: #333;
  background: #fff;
}

.user-detail-body {
  display: flex;
  min-height: 260px;
}

.user-detail-left {
  display: flex;
  flex-direction: column;
  flex: 3;
  padding: 20px 16px 16px;
  min-width: 0;
}

.user-detail-top-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding-right: 28px;
}

.avatar-wrapper {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
}

.avatar-with-frame {
  position: relative;
  width: 60px;
  height: 60px;
}

.detail-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
}

.avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 170%;
  height: 170%;
  pointer-events: none;
  z-index: 1;
}

.user-name-block {
  min-width: 0;
  flex: 1;
}

.user-detail-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1c1e;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.vip-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  background: linear-gradient(135deg, #ffd666, #faad14);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.follow-row {
  margin-top: 8px;
}

.follow-btn-default {
  border-radius: 16px !important;
  font-weight: 500 !important;
  background: linear-gradient(135deg, #ff8c00, #ff6b00) !important;
  border: none !important;
  color: #fff !important;
}

.follow-btn-active {
  border-radius: 16px !important;
  font-weight: 500 !important;
  background: #f5f5f5 !important;
  border: 1px solid #e0e0e0 !important;
  color: #888 !important;
}

.follow-btn-active:hover {
  background: #fff0f0 !important;
  border-color: #ffb3b3 !important;
  color: #ff4d4f !important;
}

.user-follow-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0 10px;
}

.follow-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 14px;
  border-radius: 8px;
}

.follow-stat-clickable {
  cursor: pointer;
  transition: background 0.15s;
}

.follow-stat-clickable:hover {
  background: #f0f0f0;
}

.follow-stat-clickable:hover .follow-stat-num {
  color: #667eea;
}

.follow-stat-num {
  font-size: 16px;
  font-weight: 700;
  color: #1a1c1e;
  line-height: 1.2;
}

.follow-stat-label {
  font-size: 11px;
  color: #aaa;
  margin-top: 1px;
}

.follow-stat-divider {
  width: 1px;
  height: 24px;
  background: #eee;
}

.user-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.user-detail-content {
  flex: 1;
  background: #f7f8fc;
  border-radius: 10px;
  border: 1px solid #eef0f6;
  overflow: hidden;
}

.user-detail-item {
  display: flex;
  align-items: center;
  padding: 7px 12px;
  border-bottom: 1px solid #eef0f6;
}

.user-detail-item:last-child {
  border-bottom: none;
}

.item-label {
  width: 60px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}

.item-value {
  font-size: 13px;
  color: #222;
  font-weight: 600;
}

.status-online {
  color: #52c41a;
}

.more-actions {
  display: flex;
  gap: 8px;
}

.more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.more-btn .el-icon {
  font-size: 17px;
}

.more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.more-btn--pet {
  background: linear-gradient(135deg, #f7971e, #ffd200);
}

.more-btn--circle {
  background: linear-gradient(135deg, #36d1dc, #5b86e5);
}

.user-detail-right {
  flex: 7;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  min-width: 200px;
}

.moments-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-detail-right::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.45) 0%, transparent 35%);
  z-index: 1;
  pointer-events: none;
}

.user-detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.profile-btn {
  background: linear-gradient(135deg, #ff8c00, #ff6b00) !important;
  border: none !important;
}

.follow-list-body {
  min-height: 120px;
}

.follow-list-container {
  max-height: 420px;
  overflow-y: auto;
  padding: 4px 0;
}

.follow-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid #f5f5f5;
  border-radius: 8px;
  transition: background 0.15s;
}

.follow-list-item:last-child {
  border-bottom: none;
}

.follow-list-item:hover {
  background: #fafafa;
}

.follow-list-avatar {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
}

.follow-list-avatar-img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.follow-list-avatar-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 170%;
  height: 170%;
  pointer-events: none;
  z-index: 1;
}

.follow-list-info {
  flex: 1;
  min-width: 0;
}

.follow-list-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1c1e;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mutual-badge {
  font-size: 11px;
  font-weight: 400;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  padding: 1px 6px;
}

.follow-list-profile {
  font-size: 12px;
  color: #aaa;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-list-action {
  flex-shrink: 0;
}

.follow-back-btn {
  background: linear-gradient(135deg, #ff8c00, #ff6b00) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600;
  padding: 0 14px !important;
}

.unfollow-btn {
  background: #f5f5f5 !important;
  border: 1px solid #e0e0e0 !important;
  color: #888 !important;
  font-weight: 500;
  padding: 0 10px !important;
}

.unfollow-btn:hover {
  background: #fff0f0 !important;
  border-color: #ffb3b3 !important;
  color: #ff4d4f !important;
}
</style>
