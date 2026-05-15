<template>
  <div class="pet-tournament-page" v-loading="loading">
    <section class="pet-tournament-header">
      <div class="pet-tournament-title-wrapper">
        <el-icon class="pet-tournament-title-icon"><GoldMedal /></el-icon>
        <h2>武道大会</h2>
      </div>
      <p>挑战强者，登顶巅峰</p>
      <el-button class="refresh-btn" text :icon="Refresh" :loading="loading" @click="refreshData" />
    </section>

    <section class="pet-tournament-hero">
      <div class="pet-tournament-stats-row">
        <div class="pet-tournament-stat-card blue">
          <span>我的排名</span>
          <strong>
            <el-icon><User /></el-icon>
            {{ myRank || "未上榜" }}
          </strong>
        </div>
        <div class="pet-tournament-stat-card green">
          <span>今日参赛人数</span>
          <strong>
            <el-icon><Trophy /></el-icon>
            {{ leaderboard.length }}
          </strong>
        </div>
        <div class="pet-tournament-stat-card orange">
          <span>可挑战次数</span>
          <strong>
            <el-icon><Lightning /></el-icon>
            无限
          </strong>
        </div>
      </div>

      <section class="pet-tournament-top-wrapper">
        <div class="pet-tournament-top-container">
          <div
            v-for="rank in [2, 1, 3]"
            :key="rank"
            class="pet-tournament-top-item"
            :class="[`rank-${rank}`, { empty: !rankMap[rank] }]"
          >
            <div class="rank-badge">
              <el-icon v-if="rank === 1"><GoldMedal /></el-icon>
              <strong v-else>#{{ rank }}</strong>
            </div>

            <template v-if="rankMap[rank]">
              <div class="avatar-group" @click="openPet(rankMap[rank])">
                <img :src="rankMap[rank].userAvatar || rankMap[rank].petAvatar" alt="" class="player-avatar" />
                <img v-if="rankMap[rank].petAvatar" :src="rankMap[rank].petAvatar" alt="" class="pet-avatar" />
              </div>
              <strong class="player-name">{{ rankMap[rank].userName || "未知用户" }}</strong>
              <div class="player-score">
                <el-icon><Star /></el-icon>
                <span>{{ rankScore(rankMap[rank]) }}</span>
              </div>
              <div class="pet-name">{{ rankMap[rank].petName || "未知宠物" }}</div>
              <button
                class="challenge-btn"
                :disabled="rankMap[rank].rank === myRank"
                @click="challengeRank(rank, rankMap[rank])"
              >
                <el-icon><Lightning /></el-icon>
                挑战
              </button>
            </template>

            <template v-else>
              <div class="empty-avatar">
                <el-icon><User /></el-icon>
              </div>
              <strong class="empty-text">虚位以待</strong>
              <span class="empty-subtext">等你来战</span>
              <button class="challenge-btn empty-challenge-btn" @click="challengeRank(rank, null)">
                <el-icon><Lightning /></el-icon>
                挑战
              </button>
            </template>
          </div>
        </div>
      </section>
    </section>

    <section class="rest-ranking-card">
      <div class="rest-ranking-header">
        <div class="header-left">
          <div class="trophy-icon-wrapper">
            <el-icon><Trophy /></el-icon>
          </div>
          <div>
            <strong>排名榜</strong>
            <span>第4名及以后</span>
          </div>
        </div>
        <div class="header-badge">{{ restRealCount }} 人</div>
      </div>

      <div class="divider"></div>

      <div class="ranking-list-scroll">
        <div v-for="item in restData" :key="item.key" class="ranking-list-item" :class="{ empty: item.isEmpty, mine: item.rank === myRank }">
          <div class="rank-badge-normal">{{ item.rank }}</div>

          <template v-if="item.isEmpty">
            <div class="empty-avatar-small">
              <el-icon><User /></el-icon>
            </div>
            <div class="player-details muted">
              <strong>虚位以待</strong>
              <span>等你来战</span>
            </div>
          </template>

          <template v-else>
            <img :src="item.userAvatar || item.petAvatar" alt="" class="player-avatar-list" @click="openPet(item)" />
            <div class="player-details">
              <strong>{{ item.userName || "未知用户" }}</strong>
              <div class="player-meta">
                <span class="pet-tag">{{ item.petName || "未知宠物" }}</span>
                <span class="score-badge">
                  <el-icon><Star /></el-icon>
                  {{ rankScore(item) }}
                </span>
              </div>
            </div>
          </template>

          <button
            class="challenge-btn-small"
            :disabled="item.rank === myRank"
            @click="challengeRank(item.rank, item.isEmpty ? null : item)"
          >
            <el-icon><Lightning /></el-icon>
            挑战
          </button>
        </div>
      </div>

      <el-empty v-if="!loading && leaderboard.length === 0" description="暂无排行数据，快来参加武道大会吧" />
    </section>

    <el-dialog v-model="petDialogOpen" title="宠物详情" width="420px">
      <div class="pet-dialog" v-loading="petLoading">
        <template v-if="selectedPet">
          <img v-if="selectedPet.petUrl || selectedPet.petAvatar || selectedPet.avatar" :src="selectedPet.petUrl || selectedPet.petAvatar || selectedPet.avatar" alt="" />
          <h3>{{ selectedPet.name || selectedPet.petName || "未命名宠物" }}</h3>
          <p>等级：{{ selectedPet.level ?? "--" }}</p>
          <p>心情：{{ selectedPet.mood ?? "--" }}</p>
          <p>饱腹：{{ selectedPet.hunger ?? "--" }}</p>
        </template>
        <el-empty v-else description="暂无宠物信息" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { GoldMedal, Lightning, Refresh, Star, Trophy, User } from "@element-plus/icons-vue";
import { petTournamentApi } from "../api/petTournament";
import { petApi } from "../api/pet";

const router = useRouter();
const loading = ref(false);
const leaderboard = ref([]);
const myRank = ref(null);
const petDialogOpen = ref(false);
const petLoading = ref(false);
const selectedPet = ref(null);

const rankMap = computed(() => {
  const map = {};
  leaderboard.value.forEach((item) => {
    map[item.rank] = item;
  });
  return map;
});

const restData = computed(() => {
  const maxRank = Math.max(10, ...leaderboard.value.map((item) => Number(item.rank) || 0));
  return Array.from({ length: Math.max(0, maxRank - 3) }, (_, index) => {
    const rank = index + 4;
    const item = rankMap.value[rank];
    return item ? { ...item, key: `rank-${rank}` } : { isEmpty: true, rank, key: `empty-${rank}` };
  });
});

const restRealCount = computed(() => leaderboard.value.filter((item) => Number(item.rank) > 3).length);

async function refreshData() {
  loading.value = true;
  try {
    const [rankRes, myRankRes] = await Promise.all([
      petTournamentApi.getLeaderboard(),
      petTournamentApi.getMyRank(),
    ]);
    if (rankRes.code === 0) leaderboard.value = rankRes.data || [];
    if (myRankRes.code === 0) myRank.value = myRankRes.data ?? null;
  } catch (error) {
    ElMessage.error(error.message || "加载武道大会失败");
  } finally {
    loading.value = false;
  }
}

function challengeRank(rank, item) {
  router.push({
    path: "/points-play/pet-fight",
    query: {
      from: "tournament",
      targetRank: rank,
      ...(item?.userId ? { opponentUserId: item.userId } : {}),
    },
  });
}

async function openPet(item) {
  if (!item?.userId) return;
  petDialogOpen.value = true;
  petLoading.value = true;
  selectedPet.value = null;
  try {
    const res = await petApi.getOtherUserPet({ otherUserId: item.userId });
    selectedPet.value = res.data || item;
  } catch (error) {
    ElMessage.error(error.message || "获取宠物详情失败");
    selectedPet.value = item;
  } finally {
    petLoading.value = false;
  }
}

function rankScore(item) {
  if (!item) return "--";
  const score = item.score ?? item.points ?? item.power ?? item.petScore ?? item.combatPower;
  if (score !== undefined && score !== null && score !== "") return score;
  if (item.petLevel !== undefined && item.petLevel !== null) return `Lv.${item.petLevel}`;
  return "--";
}

onMounted(refreshData);
</script>

<style scoped>
.pet-tournament-page {
  min-height: 100%;
  padding: 24px;
  background: #fff7e6;
}

.pet-tournament-header {
  position: relative;
  padding: 20px 0;
  margin-bottom: 32px;
  text-align: center;
}

.pet-tournament-title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.pet-tournament-title-icon {
  color: #fa8c16;
  font-size: 36px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  animation: float 3s ease-in-out infinite;
}

.pet-tournament-header h2 {
  margin: 0;
  color: #fa8c16;
  font-size: 32px;
  font-weight: 800;
}

.pet-tournament-header p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.refresh-btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  color: #8c8c8c;
  font-size: 18px;
}

.pet-tournament-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 16px;
  max-width: 1080px;
  margin: 0 auto 24px;
}

.pet-tournament-stats-row {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  min-width: 200px;
}

.pet-tournament-stat-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.pet-tournament-stat-card span {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-align: center;
}

.pet-tournament-stat-card strong {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 900;
}

.pet-tournament-stat-card.blue { color: #1890ff; }
.pet-tournament-stat-card.green { color: #52c41a; }
.pet-tournament-stat-card.orange { color: #fa8c16; }

.pet-tournament-top-wrapper {
  flex: 1 1 360px;
  min-width: 280px;
  margin: 0;
  padding: 20px 16px;
  border: 1px solid #ffd8bf;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 20px rgba(250, 140, 22, 0.08);
}

.pet-tournament-top-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 18px;
  flex-wrap: nowrap;
}

.pet-tournament-top-item {
  position: relative;
  flex: 1 1 0;
  max-width: 200px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.pet-tournament-top-item.rank-1 {
  order: 2;
  max-width: 216px;
  min-height: 200px;
  padding-top: 24px;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
}

.pet-tournament-top-item.rank-2 {
  order: 1;
  margin-top: 22px;
  background: linear-gradient(135deg, #c0c0c0 0%, #a0a0a0 100%);
}

.pet-tournament-top-item.rank-3 {
  order: 3;
  margin-top: 22px;
  background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
}

.pet-tournament-top-item.empty {
  color: #999;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
  border: 2px dashed #d9d9d9;
}

.rank-badge {
  position: absolute;
  top: -16px;
  left: 50%;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  transform: translateX(-50%);
  border-radius: 50%;
  background: #fff;
  color: #faad14;
  font-size: 26px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-group {
  position: relative;
  margin-bottom: 8px;
  cursor: pointer;
}

.player-avatar,
.empty-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: #fff;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.pet-avatar {
  position: absolute;
  right: -16px;
  bottom: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #fff;
  object-fit: cover;
}

.empty-avatar,
.empty-avatar-small {
  display: grid;
  place-items: center;
  color: #ccc;
}

.player-name {
  max-width: 160px;
  overflow: hidden;
  color: #fff;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.player-score {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.pet-name {
  max-width: 160px;
  padding: 4px 12px;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  color: #1890ff;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.challenge-btn,
.challenge-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  cursor: pointer;
  font-weight: 700;
}

.challenge-btn {
  height: 32px;
  padding: 0 20px;
  border-radius: 20px;
  background: #fff;
  color: #262626;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.challenge-btn:disabled,
.challenge-btn-small:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.empty-text {
  font-size: 14px;
}

.empty-subtext {
  color: #bfbfbf;
  font-size: 12px;
}

.rest-ranking-card {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.rest-ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.trophy-icon-wrapper {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  font-size: 24px;
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
}

.header-left strong,
.header-left span {
  display: block;
}

.header-left strong {
  color: #262626;
  font-size: 18px;
}

.header-left span {
  color: #8c8c8c;
  font-size: 13px;
}

.header-badge {
  padding: 6px 14px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.divider {
  height: 1px;
  margin: 16px 0;
  background: #f0f0f0;
}

.ranking-list-scroll {
  max-height: min(42vh, 380px);
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.ranking-list-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.ranking-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  padding: 12px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.ranking-list-item:nth-child(even) {
  background: #fafbfc;
}

.ranking-list-item:hover {
  background: #f0f4ff;
  transform: translateX(4px);
}

.ranking-list-item.empty {
  opacity: 0.72;
}

.ranking-list-item.mine {
  border: 1px solid #91d5ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
}

.rank-badge-normal {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f5f5f5;
  color: #8c8c8c;
  font-size: 14px;
  font-weight: 800;
}

.player-avatar-list,
.empty-avatar-small {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f0f0f0;
}

.player-avatar-list {
  border: 2px solid #fff;
  object-fit: cover;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-details {
  flex: 1;
  min-width: 0;
}

.player-details strong {
  display: block;
  overflow: hidden;
  color: #262626;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-details.muted strong {
  color: #999;
}

.player-details.muted span {
  color: #bfbfbf;
  font-size: 12px;
}

.player-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.pet-tag {
  max-width: 150px;
  padding: 2px 10px;
  overflow: hidden;
  border-radius: 12px;
  background: #e6f4ff;
  color: #1890ff;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fa8c16;
  font-size: 12px;
  font-weight: 800;
}

.challenge-btn-small {
  height: 28px;
  padding: 0 16px;
  border-radius: 16px;
  background: #1890ff;
  color: #fff;
}

.pet-dialog {
  min-height: 140px;
  text-align: center;
}

.pet-dialog img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: 10px;
  background: #f5f7fa;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@media (max-width: 992px) {
  .pet-tournament-page {
    padding: 16px;
  }

  .pet-tournament-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .pet-tournament-stats-row {
    flex: none;
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .pet-tournament-stats-row .pet-tournament-stat-card strong {
    font-size: 18px;
  }

  .pet-tournament-top-wrapper {
    flex: none;
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .pet-tournament-top-wrapper::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .pet-tournament-top-container {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
  }

  .pet-tournament-top-item,
  .pet-tournament-top-item.rank-1,
  .pet-tournament-top-item.rank-2,
  .pet-tournament-top-item.rank-3 {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    max-width: none;
    min-height: 148px;
    padding: 10px 6px;
  }

  .pet-tournament-top-item.rank-1 {
    min-height: 164px;
    padding-top: 18px;
  }

  .pet-tournament-top-item.rank-2,
  .pet-tournament-top-item.rank-3 {
    margin-top: 16px;
  }

  .pet-tournament-header h2 {
    font-size: 26px;
  }
}

@media (max-width: 520px) {
  .pet-tournament-stats-row {
    grid-template-columns: 1fr;
  }

  .pet-tournament-stats-row .pet-tournament-stat-card strong {
    font-size: 22px;
  }

  .pet-tournament-top-container {
    gap: 4px;
    justify-content: center;
  }

  .pet-tournament-top-item,
  .pet-tournament-top-item.rank-1 {
    gap: 4px;
  }

  .pet-tournament-top-item .challenge-btn {
    padding: 0 10px;
    height: 28px;
    font-size: 12px;
  }

  .rank-badge {
    width: 36px;
    height: 36px;
    top: -12px;
    font-size: 20px;
  }

  .player-avatar,
  .empty-avatar {
    width: 36px;
    height: 36px;
    border-width: 2px;
  }

  .pet-avatar {
    width: 22px;
    height: 22px;
    right: -12px;
  }

  .player-name {
    font-size: 12px;
    max-width: 96px;
  }

  .pet-name {
    max-width: 96px;
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
