<template>
  <div class="tower-page" v-loading="loading">
    <section class="page-head">
      <div class="head-copy">
        <h2><span class="title-icon">🗼</span> 无尽爬塔</h2>
        <p>带领你的宠物挑战无尽高塔，登顶排行榜！</p>
      </div>
      <el-button class="refresh-btn" text :icon="Refresh" :loading="loading || rankingLoading" @click="refreshData" />
    </section>

    <section class="stat-grid">
      <div class="stat-card blue">
        <span>当前最高层</span>
        <strong><el-icon><Trophy /></el-icon>{{ currentFloor }} 层</strong>
      </div>
      <div class="stat-card purple">
        <span>下一挑战层</span>
        <strong><el-icon><ArrowUp /></el-icon>{{ nextFloor }} 层</strong>
      </div>
      <div class="stat-card orange">
        <span>我的排名</span>
        <strong><el-icon><Medal /></el-icon>{{ myRank ? `#${myRank.rank}` : "未上榜" }}</strong>
      </div>
      <div class="stat-card green">
        <span>可用积分</span>
        <strong><el-icon><Star /></el-icon>{{ availablePoints.toLocaleString() }} 分</strong>
      </div>
    </section>

    <section class="main-grid">
      <div class="challenge-card">
        <div class="floor-banner" :style="{ background: floorTheme.bg }">
          <div class="floor-number-display">
            <span>第</span>
            <strong :style="{ color: floorTheme.color }">{{ nextFloor }}</strong>
            <span>层</span>
          </div>
          <el-tag class="floor-zone-tag" :color="floorTheme.color" effect="dark">{{ floorTheme.label }}</el-tag>
        </div>

        <template v-if="nextMonster">
          <div class="monster-head monster-preview-section">
            <img v-if="nextMonster.avatarUrl" :src="nextMonster.avatarUrl" alt="" :style="{ borderColor: floorTheme.color }" />
            <div v-else class="monster-placeholder" :style="{ color: floorTheme.color }"><el-icon><Warning /></el-icon></div>
            <div class="monster-info">
              <h3 :style="{ color: floorTheme.color }">{{ nextMonster.name || `第 ${nextFloor} 层守卫` }}</h3>
              <div class="monster-tags">
                <el-tag type="danger" size="small">♥ {{ nextMonster.health ?? "--" }}</el-tag>
                <el-tag type="warning" size="small">⚡ {{ nextMonster.attack ?? "--" }}</el-tag>
                <el-tag v-if="Number(nextMonster.critRate) > 0" color="#f3e8ff" size="small">暴击 {{ rate(nextMonster.critRate) }}</el-tag>
                <el-tag v-if="Number(nextMonster.dodgeRate) > 0" color="#e6fffb" size="small">闪避 {{ rate(nextMonster.dodgeRate) }}</el-tag>
              </div>
            </div>
            <div class="monster-reward">
              <el-icon><Present /></el-icon>
              <span>+{{ nextMonster.rewardPoints ?? 0 }} 积分</span>
            </div>
          </div>
          <MonsterStats :monster="nextMonster" />
        </template>
        <el-empty v-else description="暂无怪物信息" />

        <div class="actions challenge-actions">
          <el-button class="challenge-btn" type="primary" size="large" :icon="Lightning" :style="{ background: floorTheme.color, borderColor: floorTheme.color }" @click="challengeTower">
            挑战第 {{ nextFloor }} 层
          </el-button>
          <el-tooltip content="预览其他层怪物" placement="top">
            <el-button class="preview-btn" size="large" :icon="View" @click="previewMonster(nextFloor)">预览怪物</el-button>
          </el-tooltip>
        </div>
      </div>
    </section>

    <section class="secondary-grid">
      <div class="ranking-card">
        <div class="ranking-header">
          <div class="ranking-title-left">
            <div class="trophy-icon-wrapper"><el-icon><Trophy /></el-icon></div>
            <div>
              <div class="ranking-title">爬塔排行榜</div>
              <p>按最高通关层数排名</p>
            </div>
          </div>
          <el-button text :icon="Refresh" :loading="rankingLoading" @click="fetchRanking" />
        </div>
        <div class="ranking-list">
          <div v-for="item in ranking.slice(0, 20)" :key="item.userId || item.rank" class="rank-row" :class="{ mine: String(item.userId) === String(currentUserId) }">
            <span v-if="(item.rank ?? 0) <= 3" class="medal-emoji">{{ medalFor(item.rank) }}</span>
            <span v-else class="rank-index">{{ item.rank }}</span>
            <img v-if="item.userAvatar" class="rank-avatar" :src="item.userAvatar" alt="" />
            <span v-else class="rank-avatar"><el-icon><User /></el-icon></span>
            <div class="rank-main">
              <strong>{{ item.userName || "未知用户" }}</strong>
              <el-tag size="small" :color="floorThemeFor(item.maxFloor ?? 0).color" effect="dark">
                {{ floorThemeFor(item.maxFloor ?? 0).label }}
              </el-tag>
            </div>
            <div class="rank-floor" :style="{ color: rankFloorColor(item) }">
              <el-icon><Trophy /></el-icon>{{ item.maxFloor ?? 0 }} 层
            </div>
          </div>
          <el-empty v-if="!rankingLoading && ranking.length === 0" description="暂无排行数据" />
        </div>
      </div>

      <div class="progress-card">
        <div class="section-title"><el-icon><Aim /></el-icon>爬塔进度</div>
        <div class="tower-visual">
          <div
            v-for="floor in visibleFloors"
            :key="floor"
            class="tower-floor"
            :class="{ passed: floor <= currentFloor, current: floor === nextFloor }"
            @click="previewMonster(floor)"
          >
            <span class="tower-floor-num">{{ floor }}F</span>
            <div class="floor-bar" :style="{ background: floor <= currentFloor || floor === nextFloor ? floorThemeFor(floor).color : '#f0f0f0' }" />
            <small v-if="floor === nextFloor" class="current-marker">→ 当前</small>
            <small v-else-if="floor <= currentFloor" class="passed-marker">✓</small>
          </div>
        </div>
      </div>
    </section>

    <el-dialog v-model="previewOpen" :title="`第 ${previewFloor} 层怪物`" width="460px">
      <div v-loading="previewLoading" class="preview-content">
        <template v-if="previewData">
          <div class="monster-head compact">
            <img v-if="previewData.avatarUrl" :src="previewData.avatarUrl" alt="" />
            <div v-else class="monster-placeholder"><el-icon><Warning /></el-icon></div>
            <div class="monster-info">
              <h3>{{ previewData.name || `第 ${previewFloor} 层守卫` }}</h3>
              <p>{{ floorThemeFor(previewFloor).label }}</p>
            </div>
          </div>
          <MonsterStats :monster="previewData" />
          <div class="actions">
            <el-button type="primary" :disabled="previewFloor !== nextFloor" @click="challengeTower">
              {{ previewFloor === nextFloor ? "立即挑战" : `当前挑战第 ${nextFloor} 层` }}
            </el-button>
            <el-button @click="previewOpen = false">关闭</el-button>
          </div>
        </template>
        <el-empty v-else-if="!previewLoading" description="暂无怪物数据" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Aim, ArrowUp, Lightning, Medal, Present, Refresh, Star, Trophy, User, View, Warning } from "@element-plus/icons-vue";
import { useUserStore } from "../stores/user";
import { towerClimbApi } from "../api/towerClimb";

const MonsterStats = defineComponent({
  props: { monster: { type: Object, required: true } },
  setup(props) {
    return () => h("div", { class: "monster-stats" }, [
      stat("生命", props.monster.health, "hp"),
      stat("攻击", props.monster.attack, "atk"),
      stat("暴击", rate(props.monster.critRate), "crit"),
      stat("闪避", rate(props.monster.dodgeRate), "dodge"),
      stat("格挡", rate(props.monster.blockRate), "block"),
      stat("连击", rate(props.monster.comboRate), "combo"),
      stat("吸血", rate(props.monster.lifesteal), "life"),
      stat("奖励", `${props.monster.rewardPoints ?? 0} 分`, "reward"),
    ]);
  },
});

function stat(label, value, type) {
  return h("div", { class: ["monster-stat", type] }, [
    h("span", label),
    h("strong", value ?? "--"),
  ]);
}

function rate(value) {
  return `${((Number(value) || 0) * 100).toFixed(0)}%`;
}

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const rankingLoading = ref(false);
const progress = ref(null);
const ranking = ref([]);
const previewOpen = ref(false);
const previewFloor = ref(1);
const previewData = ref(null);
const previewLoading = ref(false);

const currentUserId = computed(() => userStore.userInfo?.id);
const availablePoints = computed(() => {
  const points = Number(userStore.userInfo?.points) || 0;
  const usedPoints = Number(userStore.userInfo?.usedPoints) || 0;
  return Math.max(0, points - usedPoints);
});
const currentFloor = computed(() => progress.value?.maxFloor ?? 0);
const nextFloor = computed(() => progress.value?.nextFloor ?? 1);
const nextMonster = computed(() => progress.value?.nextMonster);
const myRank = computed(() => ranking.value.find((item) => String(item.userId) === String(currentUserId.value)));
const visibleFloors = computed(() => {
  const start = Math.max(1, nextFloor.value - 2);
  return Array.from({ length: 10 }, (_, index) => start + index).reverse();
});
const floorTheme = computed(() => floorThemeFor(nextFloor.value));

function floorThemeFor(floor) {
  if (floor <= 10) return { color: "#67c23a", label: "新手区", bg: "linear-gradient(135deg, #f0f9eb, #e1f3d8)" };
  if (floor <= 30) return { color: "#409eff", label: "进阶区", bg: "linear-gradient(135deg, #ecf5ff, #d9ecff)" };
  if (floor <= 60) return { color: "#8e44ad", label: "精英区", bg: "linear-gradient(135deg, #f5eef8, #eadcf8)" };
  if (floor <= 99) return { color: "#e6a23c", label: "传说区", bg: "linear-gradient(135deg, #fdf6ec, #faecd8)" };
  return { color: "#f56c6c", label: "神话区", bg: "linear-gradient(135deg, #fef0f0, #fde2e2)" };
}

function medalFor(rank) {
  return { 1: "🥇", 2: "🥈", 3: "🥉" }[Number(rank)] || rank;
}

function rankFloorColor(item) {
  const medalColors = { 1: "#f7c948", 2: "#b8bec8", 3: "#d88945" };
  return medalColors[Number(item.rank)] || floorThemeFor(item.maxFloor ?? 0).color;
}

async function fetchProgress() {
  loading.value = true;
  try {
    const res = await towerClimbApi.getProgress();
    if (res.code === 0) progress.value = res.data || null;
  } catch (error) {
    ElMessage.error(error.message || "加载爬塔进度失败");
  } finally {
    loading.value = false;
  }
}

async function fetchRanking() {
  rankingLoading.value = true;
  try {
    const res = await towerClimbApi.getRanking({ limit: 20 });
    if (res.code === 0) ranking.value = res.data || [];
  } catch (error) {
    ElMessage.error(error.message || "加载爬塔排行榜失败");
  } finally {
    rankingLoading.value = false;
  }
}

function refreshData() {
  fetchProgress();
  fetchRanking();
}

function challengeTower() {
  router.push({ path: "/points-play/pet-fight", query: { from: "tower", floor: nextFloor.value } });
}

async function previewMonster(floor) {
  previewFloor.value = floor;
  previewOpen.value = true;
  previewLoading.value = true;
  previewData.value = null;
  try {
    const res = await towerClimbApi.getFloorMonster({ floor });
    if (res.code === 0) previewData.value = res.data || null;
  } catch (error) {
    ElMessage.error(error.message || "加载怪物信息失败");
  } finally {
    previewLoading.value = false;
  }
}

onMounted(() => {
  userStore.fetchUserInfo?.();
  refreshData();
});
</script>

<style scoped>
.tower-page {
  height: 100%;
  min-height: 100%;
  padding: 28px 36px 36px;
  background: #f0f2f5;
  box-sizing: border-box;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tower-page::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.page-head {
  position: relative;
  padding: 16px 0;
  margin-bottom: 20px;
  text-align: center;
}

.page-head h2 {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.2;
  background: linear-gradient(135deg, #722ed1, #1890ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-icon {
  -webkit-text-fill-color: initial;
  animation: float 3s ease-in-out infinite;
  display: inline-block;
}

.page-head p {
  margin: 6px 0 0;
  color: #8c8c8c;
  font-size: 14px;
}

.refresh-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: #8c8c8c;
  font-size: 18px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card,
.challenge-card,
.ranking-card,
.progress-card {
  background: #fff;
  border: 0;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.stat-card {
  padding: 16px 20px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
}

.stat-card strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 20px;
  line-height: 1.2;
}

.stat-card.blue {
  background: linear-gradient(135deg, #e6f7ff, #f0f9ff);
  color: #1890ff;
}

.stat-card.purple {
  background: linear-gradient(135deg, #f9f0ff, #f0e6ff);
  color: #722ed1;
}

.stat-card.orange {
  background: linear-gradient(135deg, #fff7e6, #fff3d6);
  color: #fa8c16;
}

.stat-card.green {
  background: linear-gradient(135deg, #f6ffed, #edfce0);
  color: #52c41a;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr;
  margin-bottom: 16px;
}

.secondary-grid {
  --tower-side-card-height: 520px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.challenge-card,
.ranking-card,
.progress-card {
  padding: 0;
}

.floor-banner {
  padding: 24px;
  text-align: center;
  border-radius: 20px 20px 0 0;
}

.floor-number-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.floor-number-display span {
  color: #595959;
  font-size: 18px;
  font-weight: 600;
}

.floor-banner strong {
  font-size: 64px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.floor-zone-tag {
  border: 0;
  border-radius: 20px;
  font-weight: 700;
  padding: 4px 16px;
}

.monster-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0;
  padding: 20px 24px 16px;
}

.monster-preview-section {
  border-bottom: 1px solid #f0f0f0;
}

.monster-head.compact {
  justify-content: center;
  padding: 0 0 16px;
}

.monster-head img,
.monster-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  border: 2px solid currentColor;
  background: rgba(0, 0, 0, 0.04);
  object-fit: cover;
  display: grid;
  place-items: center;
  color: #909399;
  font-size: 40px;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.08);
  animation: pulse 2.4s ease-in-out infinite;
}

.monster-info {
  min-width: 0;
  flex: 1;
}

.monster-info h3 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 800;
}

.monster-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.monster-reward {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 96px;
  padding: 10px 12px;
  border: 1px solid rgba(250, 173, 20, 0.32);
  border-radius: 12px;
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
  font-weight: 700;
}

:deep(.monster-stats) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 20px 24px 0;
}

:deep(.monster-stat) {
  padding: 12px 8px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: #fafafa;
  text-align: center;
  transition: all 0.2s ease;
}

:deep(.monster-stat:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.monster-stat span) {
  display: block;
  color: #8c8c8c;
  font-size: 11px;
}

:deep(.monster-stat strong) {
  display: block;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 800;
}

:deep(.monster-stat.hp strong) { color: #ff4d4f; }
:deep(.monster-stat.atk strong) { color: #fa8c16; }
:deep(.monster-stat.crit strong) { color: #722ed1; }
:deep(.monster-stat.dodge strong) { color: #13c2c2; }
:deep(.monster-stat.block strong) { color: #1890ff; }
:deep(.monster-stat.combo strong) { color: #eb2f96; }
:deep(.monster-stat.life strong) { color: #52c41a; }
:deep(.monster-stat.reward strong) { color: #faad14; }

.challenge-card :deep(.el-empty) {
  padding: 40px 0;
}

.actions {
  display: flex;
  gap: 12px;
}

.challenge-actions {
  padding: 24px;
}

.challenge-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.preview-btn {
  height: 48px;
  border-radius: 12px;
  font-weight: 600;
}

.ranking-card {
  height: var(--tower-side-card-height);
  display: flex;
  flex-direction: column;
}

.progress-card {
  height: var(--tower-side-card-height);
  display: flex;
  flex-direction: column;
}

.ranking-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.ranking-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.ranking-list::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.ranking-title-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trophy-icon-wrapper {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #722ed1, #1890ff);
  color: #fff;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(114, 46, 209, 0.3);
}

.ranking-title {
  color: #262626;
  font-size: 16px;
  font-weight: 800;
}

.ranking-header p {
  margin: 2px 0 0;
  color: #8c8c8c;
  font-size: 12px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 16px;
  border-bottom: 1px solid #f5f5f5;
  transition: all 0.2s ease;
}

.rank-row:hover {
  background: #fafafa;
}

.rank-row.mine {
  background: linear-gradient(135deg, #f9f0ff, #f0e6ff);
  border-left: 3px solid #722ed1;
}

.rank-index {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f5f5f5;
  font-weight: 700;
  color: #8c8c8c;
  font-size: 12px;
  flex-shrink: 0;
}

.medal-emoji {
  width: 28px;
  text-align: center;
  font-size: 22px;
  flex-shrink: 0;
}

.rank-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #eef3f8;
  display: grid;
  place-items: center;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.rank-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #262626;
  font-size: 13px;
}

.rank-main :deep(.el-tag) {
  align-self: flex-start;
  border: 0;
  font-size: 10px;
  height: 20px;
  line-height: 18px;
}

.rank-floor {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.section-title {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  color: #262626;
  font-weight: 800;
}

.tower-visual {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tower-visual::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.tower-floor {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tower-floor:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tower-floor.current {
  background: rgba(114, 46, 209, 0.06);
}

.tower-floor-num {
  width: 32px;
  color: #595959;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  flex-shrink: 0;
}

.floor-bar {
  flex: 1;
  height: 20px;
  border-radius: 6px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.tower-floor.passed .floor-bar,
.tower-floor.current .floor-bar {
  opacity: 1;
}

.tower-floor small {
  width: 54px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.current-marker {
  color: #722ed1;
}

.passed-marker {
  color: #52c41a;
}

.preview-content {
  min-height: 180px;
}

.preview-content :deep(.monster-stats) {
  padding: 0;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@media (max-width: 900px) {
  .stat-grid,
  .secondary-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .tower-page {
    padding: 18px 16px 24px;
  }

  .secondary-grid {
    --tower-side-card-height: 430px;
  }

  .page-head h2 {
    font-size: 24px;
  }

  .refresh-btn {
    top: 4px;
    transform: none;
  }

  .actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .stat-grid,
  .main-grid,
  .secondary-grid,
  :deep(.monster-stats) {
    grid-template-columns: 1fr;
  }

  .monster-head {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .monster-reward {
    width: 100%;
    flex-direction: row;
    justify-content: center;
  }

  .challenge-btn,
  .preview-btn {
    width: 100%;
  }
}
</style>
