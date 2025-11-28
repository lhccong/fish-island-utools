<template>
  <div class="dashboard">
    <div class="dashboard-container">
      <!-- 第一行 欢迎卡片 -->
      <el-row :gutter="16" class="row-block">
        <el-col :span="24">
          <div class="data-card welcome-data-card">
            <div class="welcome-title">
              Hi，{{ userStore.userNickname || userStore.userName }}，{{
                greeting
              }}！
            </div>
            <div class="welcome-date">今天是{{ todayStr }}</div>
            <div class="welcome-row">
              <span class="highlight">{{ offWorkHour }}</span>
            </div>
          </div>
        </el-col>
      </el-row>
      <!-- 第二行 节假日倒计时、每日一言 -->
      <el-row :gutter="16" class="row-block">
        <el-col :span="12">
          <div class="data-card holiday-data-card">
            <div class="holiday-title">节假日倒计时</div>
            <div class="holiday-content">
              <span class="festival-icon">{{
                isHolidayToday ? "🎉" : "📅"
              }}</span>
              <span>{{ holidayMessage }}</span>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="data-card quote-data-card">
            <div class="quote-title">每日一言</div>
            <div class="quote-content">{{ dailyQuote }}</div>
            <div class="quote-author">—— {{ quoteAuthor }}</div>
          </div>
        </el-col>
      </el-row>
      <!-- 第三行 活跃度、在线时长、每日奖励 -->
      <el-row :gutter="16" class="row-block">
        <el-col :span="8">
          <div class="data-card sign-card">
            <div class="card-header">
              <h2>每日签到</h2>
            </div>
            <button
                class="reward-button"
                :class="{ claimed: hasCheckedIn }"
                @click="handleCheckin"
            >
              <span class="button-icon">🎁</span>
              <span class="button-text">{{
                  hasCheckedIn ? "今日已签到" : isCheckinAnimating ? "签到中..." : "立即签到"
                }}</span>
            </button>
          </div>
        </el-col>

        <el-col :span="16">
          <div class="data-card pet-card">
            <div class="card-header">
              <h2>我的宠物</h2>
              <button
                class="pet-refresh-btn"
                :class="{ loading: petLoading }"
                :disabled="petLoading"
                @click="fetchPetDetail"
                aria-label="刷新宠物状态"
              >
                <el-icon class="pet-refresh-icon" :size="18">
                  <Refresh />
                </el-icon>
              </button>
            </div>
            <div class="pet-body">
              <div v-if="petLoading" class="pet-state">宠物正在赶来...</div>
              <div v-else-if="petError" class="pet-state error">
                {{ petError }}
                <button class="pet-retry-link" @click="fetchPetDetail">
                  重新获取
                </button>
              </div>
              <div v-else-if="petInfo" class="pet-content">
                <div class="pet-main">
                  <img
                    v-if="petInfo.petUrl"
                    class="pet-avatar"
                    :src="petInfo.petUrl"
                    alt="宠物形象"
                  />
                  <div class="pet-info-block">
                    <div class="pet-name">
                      {{ petInfo.name || "未命名宠物" }}
                    </div>
                    <div class="pet-stat-grid">
                      <div class="pet-stat">
                        <span class="label">等级</span>
                        <span class="value">
                          Lv. {{ formatPetValue(petInfo.level) }}
                        </span>
                      </div>
                      <div class="pet-stat">
                        <span class="label">经验</span>
                        <span class="value">
                          {{ formatPetValue(petInfo.exp) }}
                        </span>
                      </div>
                      <div class="pet-stat">
                        <span class="label">心情</span>
                        <span class="value">
                          {{ formatPetValue(petInfo.mood, "%") }}
                        </span>
                      </div>
                      <div class="pet-stat">
                        <span class="label">饱腹</span>
                        <span class="value">
                          {{ formatPetValue(petInfo.hunger, "%") }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="pet-action-icons">
                    <button
                      class="pet-action-icon-btn"
                      :disabled="isPetActionButtonDisabled('pat')"
                      :class="{ loading: petActionState.pat.loading }"
                      @click="handlePatPet"
                      :title="`抚摸宠物，消耗 ${petActionMeta.pat.cost} 积分`"
                    >
                      🤚
                    </button>
                    <button
                      class="pet-action-icon-btn"
                      :disabled="isPetActionButtonDisabled('feed')"
                      :class="{ loading: petActionState.feed.loading }"
                      @click="handleFeedPet"
                      :title="`喂食宠物，消耗 ${petActionMeta.feed.cost} 积分`"
                    >
                      🍗
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="pet-state">
                暂未拥有宠物，敬请期待新活动~
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, reactive } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { userApi } from "../api";
import { useUserStore } from "../stores/user";
import { useLivenessStore } from "../stores/liveness";
import { useDashboardStore } from "../stores/dashboard";
import { ElMessage } from "element-plus";

const userStore = useUserStore();
const livenessStore = useLivenessStore();
const dashboardStore = useDashboardStore();
const hasCheckedIn = ref(false);
const isCheckinAnimating = ref(false);
const petInfo = ref(null);
const petLoading = ref(false);
const petError = ref("");

const petActionMeta = {
  pat: {
    label: "抚摸宠物",
    cost: 3,
    successText: "抚摸成功，宠物更开心啦~",
  },
  feed: {
    label: "喂食宠物",
    cost: 5,
    successText: "喂食成功，宠物吃饱啦~",
  },
};

const petActionState = reactive({
  pat: {
    loading: false,
  },
  feed: {
    loading: false,
  },
});

const petIdCandidates = ["petId", "id", "petID", "pet_id"];

const resolvePetIdFromInfo = (info) => {
  if (!info || typeof info !== "object") {
    return null;
  }
  for (const key of petIdCandidates) {
    const value = info[key];
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
};

const petIdRef = computed(() => resolvePetIdFromInfo(petInfo.value));

const PET_STAT_FIELDS = ["level", "exp", "hunger", "mood"];

const applyPetStatUpdates = (payload) => {
  if (!petInfo.value || !payload || typeof payload !== "object") {
    return false;
  }
  const nextInfo = { ...petInfo.value };
  let changed = false;
  PET_STAT_FIELDS.forEach((field) => {
    const incomingValue = payload[field];
    if (incomingValue !== undefined && incomingValue !== null) {
      if (nextInfo[field] !== incomingValue) {
        nextInfo[field] = incomingValue;
        changed = true;
      }
    }
  });
  if (changed) {
    petInfo.value = nextInfo;
  }
  return changed;
};

const updatePetStatsFromResponse = (res) => {
  const candidates = [];
  const pushCandidate = (candidate) => {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      candidates.push(candidate);
    }
  };
  pushCandidate(res?.data);
  if (res?.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    Object.values(res.data).forEach((value) => pushCandidate(value));
  }
  pushCandidate(res?.result);
  return candidates.some((candidate) => applyPetStatUpdates(candidate));
};

const isPetActionButtonDisabled = (action) => {
  const petId = petIdRef.value;
  if (!petId) return true;
  const state = petActionState[action];
  if (!state) return true;
  return state.loading;
};

// 新增：欢迎卡片相关数据
const todayStr = ref("");
const currentTime = ref(new Date());

// 计算距离下班时间
const offWorkHour = computed(() => {
  const now = currentTime.value;
  const savedSettings = utools.dbStorage.getItem("fishpi_settings") || {};
  const currentUsername = userStore.userInfo?.userName;
  const userSettings = currentUsername
    ? savedSettings[currentUsername] || {}
    : savedSettings;
  const endTimeStr = userSettings.workTime?.endTime || "17:00";
  const restDays = userSettings.restDays || ["0", "6"]; // 默认双休

  // 检查今天是否是休息日
  const today = now.getDay().toString();
  if (restDays.includes(today)) {
    return "今天休息，好好放松一下吧~";
  }

  // 检查是否是节假日
  if (isHolidayToday.value) {
    return `今天是${holidayName.value}，好好享受假期吧！`;
  }

  const [endHours, endMinutes] = endTimeStr.split(":");
  const endTime = new Date(now);
  endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

  // 如果已经过了下班时间
  if (now > endTime) {
    return "今天辛苦了，好好休息吧！";
  }

  const diff = endTime - now;
  const hours = diff / (1000 * 60 * 60);
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 1) {
    return `再坚持${hours.toFixed(1)}小时就可以下班啦，加油！`;
  } else {
    return `再坚持${minutes}分钟就可以下班啦，坚持就是胜利！`;
  }
});

// 计算问候语
const greeting = computed(() => {
  const hour = currentTime.value.getHours();
  if (hour < 6) return "凌晨好";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 17) return "下午好";
  if (hour < 19) return "傍晚好";
  return "晚上好";
});

// 删除原有的节假日和每日一言相关的代码，使用 store 中的数据
const holidayName = computed(() => dashboardStore.holidayName);
const holidayDays = computed(() => dashboardStore.holidayDays);
const isHolidayToday = computed(() => dashboardStore.isHolidayToday);
const holidayMessage = computed(() => dashboardStore.holidayMessage);
const dailyQuote = computed(() => dashboardStore.dailyQuote);
const quoteAuthor = computed(() => dashboardStore.quoteAuthor);
const isSameDay = (dateA, dateB) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const deriveCheckinStatusFromUser = () => {
  const lastSignIn = userStore.userInfo?.lastSignInDate;
  if (!lastSignIn) {
    hasCheckedIn.value = false;
    return;
  }
  const lastSignInDate = new Date(lastSignIn);
  if (Number.isNaN(lastSignInDate.getTime())) {
    hasCheckedIn.value = false;
    return;
  }
  const today = new Date();
  hasCheckedIn.value = isSameDay(lastSignInDate, today);
};

const fetchCheckinStatus = async (force = false) => {
  try {
    await userStore.fetchUserInfo(force);
    deriveCheckinStatusFromUser();
  } catch (error) {
    console.error("获取签到状态失败:", error);
  }
};

const handleAccountSwitch = async () => {
  await livenessStore.init();
  await fetchCheckinStatus(true);
  await fetchPetDetail();
};

const formatPetValue = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return suffix ? `${value}${suffix}` : value;
};

const fetchPetDetail = async () => {
  petLoading.value = true;
  petError.value = "";
  try {
    const res = await userApi.getPetDetail();
    if (res?.code === 0) {
      petInfo.value = res?.data || null;
      return;
    }
    petInfo.value = null;
    petError.value = res?.message || res?.msg || "宠物数据获取失败";
  } catch (error) {
    console.error("获取宠物详情失败:", error);
    petInfo.value = null;
    petError.value = "宠物数据获取失败，请稍后再试";
  } finally {
    petLoading.value = false;
  }
};

const handlePetAction = async (action) => {
  const petId = petIdRef.value;
  if (!petId) {
    ElMessage.warning("暂未检测到宠物，无法执行该操作");
    return;
  }
  const state = petActionState[action];
  if (!state || state.loading) {
    return;
  }

  state.loading = true;
  try {
    const apiMethod = action === "pat" ? userApi.patPet : userApi.feedPet;
    const res = await apiMethod(petId);
    if (res?.code === 0) {
      ElMessage.success(petActionMeta[action].successText);
      const updated = updatePetStatsFromResponse(res);
      if (!updated) {
        console.warn("宠物操作成功，但响应未包含可用的宠物状态字段");
      }
    } else {
      throw new Error(res?.message || res?.msg || "操作失败，请稍后再试");
    }
  } catch (error) {
    console.error(`执行宠物操作失败(${action}):`, error);
    ElMessage.error(error?.message || "操作失败，请稍后再试");
  } finally {
    state.loading = false;
  }
};

const handlePatPet = () => handlePetAction("pat");
const handleFeedPet = () => handlePetAction("feed");

onMounted(async () => {
  deriveCheckinStatusFromUser();
  if (!userStore.userInfo) {
    await fetchCheckinStatus(true);
  } else if (userStore.shouldRefetch) {
    await fetchCheckinStatus();
  }
  // 设置今日日期
  const now = new Date();
  const weekArr = ["日", "一", "二", "三", "四", "五", "六"];
  todayStr.value = `${now.getFullYear()}年${
    now.getMonth() + 1
  }月${now.getDate()}日 星期${weekArr[now.getDay()]}`;

  // 使用 store 中的方法获取数据
  await dashboardStore.fetchNextHoliday();
  await dashboardStore.fetchDailyQuote();
  await fetchPetDetail();

  // 启动定时器，每分钟更新一次时间
  setInterval(() => {
    currentTime.value = new Date();
  }, 60000);

  // 监听账号切换事件
  window.addEventListener("fishpi:account-switched", handleAccountSwitch);
});

onUnmounted(() => {
  window.removeEventListener("fishpi:account-switched", handleAccountSwitch);
});

const handleCheckin = async () => {
  if (hasCheckedIn.value || isCheckinAnimating.value) {
    return;
  }

  try {
    isCheckinAnimating.value = true;
    const res = await userApi.signIn();
    if (res?.code === 0) {
      const succeed = typeof res.data === "undefined" ? true : !!res.data;
      if (succeed) {
        hasCheckedIn.value = true;
        const isVip = userStore.isVip;
        if (isVip) {
          ElMessage.success("摸鱼打卡成功！获得 20（10 点可用积分）积分");
        } else {
          ElMessage.success("摸鱼打卡成功！获得 10 积分");
        }
        await fetchCheckinStatus(true);
      } else {
        hasCheckedIn.value = true;
        ElMessage.warning("您今天已经签到过啦，明天再来~");
      }
    } else {
      ElMessage.error(res?.msg || "签到失败，请稍后重试");
    }
  } catch (error) {
    console.error("签到失败:", error);
    ElMessage.error("签到失败，请稍后重试");
  } finally {
    isCheckinAnimating.value = false;
  }
};

</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 1.5rem;
}

.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.row-block {
  margin-bottom: 1rem;
}

/* 欢迎卡片样式 */
.welcome-data-card {
  background: var(--card-bg, #f6f8fc);
  color: var(--text-color, #2c3e50);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  padding: 2rem;
}

.welcome-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color, #1e293b);
  margin-bottom: 0.75rem;
}

.welcome-date {
  font-size: 0.95rem;
  color: var(--sub-text-color, #64748b);
  margin-bottom: 1rem;
}

.welcome-row {
  display: flex;
  align-items: center;
  font-size: 1rem;
  color: var(--sub-text-color, #334155);
}

.welcome-row .highlight {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--primary-color, #3b82f6);
  background: var(--hover-bg, #eff6ff);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  line-height: 1.4;
}

/* 节假日卡片样式 */
.holiday-data-card {
  color: var(--text-color, #1a1f36);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
.holiday-title {
  font-size: 1.1rem;
  font-weight: 700;
}
.holiday-content {
  display: flex;
  align-items: center;
  font-size: 1rem;
}
.festival-icon {
  margin-right: 0.5rem;
}

/* 每日一言卡片样式 */
.quote-data-card {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.quote-title {
  color: var(--text-color, #1a1f36);
  font-size: 1.1rem;
  font-weight: 700;
}
.quote-content {
  color: var(--text-color, #1a1f36);
  font-size: 1rem;
  margin-top: 0.2rem;
}
.quote-author {
  color: var(--text-color, #1a1f36);
  text-align: right;
  font-size: 0.9rem;
  margin-top: 0.2rem;
  opacity: 0.7;
}

.data-card {
  min-height: 110px;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #1a1f36);
  margin: 0;
}

.liveness-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  background: #fee2e2;
  color: #ef4444;
}
.liveness-tag.active {
  background: #dcfce7;
  color: #22c55e;
}
.liveness-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.progress-bar {
  flex: 1;
  height: 6px;
  background: #eef0f5;
  border-radius: 3px;
  overflow: hidden;
}
.progress {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.progress-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color, #1a1f36);
}
.time-display {
  text-align: center;
}

.sign-card {
  display: flex;
  flex-direction: column;
  min-height: 155px;
  height: 100%;
  justify-content: center;
  gap: 0.75rem;
}

.pet-card {
  display: flex;
  flex-direction: column;
  min-height: 155px;
  height: 100%;
  justify-content: center;
}

.pet-refresh-btn {
  border: none;
  background: transparent;
  color: var(--primary-color, #3b82f6);
  cursor: pointer;
  width: 32px;
  height: 30px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s ease, color 0.2s ease;
}

.pet-refresh-icon {
  transition: transform 0.2s ease;
}

.pet-refresh-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.12);
}

.pet-refresh-btn:disabled {
  cursor: not-allowed;
  color: var(--sub-text-color, #94a3b8);
}

.pet-refresh-btn.loading .pet-refresh-icon {
  animation: pet-refresh-spin 0.9s linear infinite;
}

@keyframes pet-refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pet-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pet-state {
  text-align: center;
  font-size: 0.95rem;
  color: var(--sub-text-color, #6b7280);
}

.pet-state.error {
  color: #f97316;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.pet-retry-link {
  border: none;
  background: transparent;
  color: var(--primary-color, #3b82f6);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}

.pet-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pet-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.pet-avatar {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.pet-info-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pet-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color, #1a1f36);
}

.pet-stat-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.pet-stat {
  background: #f8fafc;
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
  text-align: center;
}

.pet-stat .label {
  font-size: 0.75rem;
  color: var(--sub-text-color, #94a3b8);
}

.pet-stat .value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-color, #1a1f36);
}

.pet-action-icons {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-left: auto;
}

.pet-action-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pet-action-icon-btn:hover:not(:disabled) {
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.12);
  transform: translateY(-1px);
}

.pet-action-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pet-action-icon-btn.loading {
  opacity: 0.75;
}

.time-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-color, #1a1f36);
}
.time-unit {
  font-size: 0.875rem;
  color: var(--sub-text-color, #697386);
  margin-left: 0.25rem;
}
.reward-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: var(--primary-color, #3b82f6);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.reward-button:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
.reward-button:disabled {
  cursor: not-allowed;
}
.reward-button.claimed {
  background: var(--primary-color, #3b82f6);
  cursor: not-allowed;
}
.reward-button.claimed .button-text {
  color: #fde68a;
  font-weight: 700;
}
.reward-button.claimed:hover {
  transform: none;
  background: var(--primary-color, #3b82f6);
  cursor: not-allowed;
}
.button-icon {
  font-size: 1rem;
}
@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .row-cards {
    flex-direction: column;
    gap: 1rem;
  }
}
@media (max-width: 600px) {
  .dashboard {
    padding: 1rem;
  }
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
.single-row {
  grid-column: 1/-1;
  margin-bottom: 1rem;
}
.row-cards {
  display: flex;
  gap: 1rem;
  width: 100%;
}
.row-cards > .data-card {
  flex: 1 1 0;
  min-width: 0;
}

@media (max-width: 768px) {
  .welcome-data-card {
    padding: 1.5rem;
  }

  .welcome-title {
    font-size: 1.1rem;
  }

  .welcome-row {
    font-size: 0.95rem;
  }

  .welcome-row .highlight {
    font-size: 1.1rem;
  }
}

.reward-dialog {
  :deep(.el-dialog__header) {
    text-align: center;
    padding: 20px;
    margin: 0;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.el-dialog__title) {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-color, #1a1f36);
  }

  :deep(.el-dialog__body) {
    padding: 30px 20px;
  }

  :deep(.el-dialog__footer) {
    padding: 20px;
    border-top: 1px solid #f0f0f0;
  }
}

.reward-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.reward-icon {
  font-size: 3rem;
  animation: bounce 0.5s ease;
}

.reward-message {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-color, #1a1f36);
  text-align: center;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #e5e7eb;
  color: #6b7280;
  font-size: 12px;
  margin-left: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.help-icon:hover {
  background-color: #d1d5db;
  color: #4b5563;
}
</style>
