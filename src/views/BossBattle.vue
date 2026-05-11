<template>
  <div class="boss-battle">
    <div class="boss-battle-container">
      <!-- 顶部横幅 -->
      <div class="boss-banner">
        <div class="banner-content">
          <i class="fas fa-bolt banner-icon"></i>
          <div class="banner-text">
            <h1 class="banner-title">世界BOSS - 黑心老板</h1>
            <p class="banner-desc">全服玩家联合攻打黑心老板,共同获得奖励!</p>
          </div>
        </div>
      </div>

      <!-- BOSS 列表 -->
      <div class="boss-list" v-loading="loading">
        <div
          v-for="boss in bossList"
          :key="boss.id"
          class="boss-card"
        >
          <div class="boss-avatar-container">
            <img
              :src="boss.avatar || '/default-avatar.png'"
              :alt="boss.name"
              class="boss-avatar"
              @error="handleImageError"
            />
          </div>
          <div class="boss-name">{{ boss.name || "未知BOSS" }}</div>
          <div class="boss-stats">
            <div class="stat-item">
              <span class="stat-label">血量:</span>
              <span class="stat-value">{{ boss.health || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">攻击:</span>
              <span class="stat-value">{{ boss.attack || 0 }}</span>
            </div>
          </div>
          <div class="boss-reward">
            <span class="reward-label">讨伐奖励:</span>
            <span class="reward-icon">💰</span>
            <span class="reward-value">{{ boss.rewardPoints || 0 }}摸鱼币</span>
          </div>
          <div class="boss-actions">
            <el-button
              type="primary"
              class="action-btn attack-btn"
              @click="handleAttack(boss)"
              :loading="battleLoading"
            >
              联合讨伐
            </el-button>
            <el-button
              type="primary"
              class="action-btn leaderboard-btn"
              @click="handleLeaderboard(boss)"
            >
              <i class="fas fa-trophy"></i>
              排行榜
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && bossList.length === 0" class="empty-state">
        <i class="fas fa-dragon empty-icon"></i>
        <p class="empty-text">暂无BOSS信息</p>
      </div>
    </div>

    <!-- 对战界面弹窗 -->
    <el-dialog
      v-model="showBattleScene"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      :show-close="false"
      fullscreen
      class="battle-scene-dialog"
    >
      <BossBattleScene
        v-if="battleInfo"
        :battle-info="battleInfo"
        @close="showBattleScene = false"
        @start-battle="handleStartBattle"
      />
    </el-dialog>

    <!-- 排行榜弹窗 -->
    <el-dialog
      v-model="showRankingDialog"
      title="Boss挑战排行榜"
      width="500px"
      :close-on-click-modal="true"
      class="ranking-dialog"
    >
      <div v-loading="rankingLoading" class="ranking-content">
        <div v-if="currentBoss" class="boss-info-header">
          <img
            :src="currentBoss.avatar || '/default-avatar.png'"
            :alt="currentBoss.name"
            class="boss-avatar-small"
            @error="handleImageError"
          />
          <span class="boss-name-small">{{ currentBoss.name }}</span>
        </div>
        <div v-if="rankingList.length === 0 && !rankingLoading" class="empty-ranking">
          <i class="fas fa-trophy empty-icon"></i>
          <p>暂无排行榜数据</p>
        </div>
        <div v-else class="ranking-list">
          <div
            v-for="(item, index) in rankingList"
            :key="item.userId || index"
            class="ranking-item"
            :class="{ 'top-three': item.rank <= 3 }"
          >
            <div class="rank-number">
              <span v-if="item.rank === 1" class="rank-icon gold">🥇</span>
              <span v-else-if="item.rank === 2" class="rank-icon silver">🥈</span>
              <span v-else-if="item.rank === 3" class="rank-icon bronze">🥉</span>
              <span v-else class="rank-text">{{ item.rank || index + 1 }}</span>
            </div>
            <div class="user-avatar">
              <img
                :src="item.userAvatar || '/default-avatar.png'"
                :alt="item.userName"
                @error="handleImageError"
              />
            </div>
            <div class="user-info">
              <div class="user-name">{{ item.userName || "未知用户" }}</div>
              <div class="pet-info" v-if="item.petName">
                <!-- webp 精灵图用 PetSprite，其他格式用 img -->
                <PetSprite
                  v-if="item.petAvatar && isWebpSprite(item.petAvatar)"
                  :sprite-url="item.petAvatar"
                  :frame-width="192"
                  :frame-height="208"
                  :total-cols="8"
                  :total-rows="9"
                  :actions="DEFAULT_SPRITE_ACTIONS"
                  :scale="24 / 192"
                  :auto-play="false"
                  class="pet-avatar-sprite"
                />
                <img
                  v-else
                  :src="item.petAvatar || '/default-avatar.png'"
                  :alt="item.petName"
                  class="pet-avatar"
                  @error="handleImageError"
                />
                <span class="pet-name">{{ item.petName }}</span>
              </div>
            </div>
            <div class="damage-info">
              <span class="damage-label">伤害:</span>
              <span class="damage-value">{{ item.damage || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { bossApi } from "../api/boss";
import { ElMessage } from "element-plus";
import BossBattleScene from "../components/BossBattleScene.vue";
import PetSprite from "../components/PetSprite.vue";
import { isWebpSprite, DEFAULT_SPRITE_ACTIONS } from "../utils/petRender";

const loading = ref(false);
const bossList = ref([]);
const showBattleScene = ref(false);
const battleInfo = ref(null);
const battleLoading = ref(false);
const showRankingDialog = ref(false);
const rankingList = ref([]);
const rankingLoading = ref(false);
const currentBoss = ref(null);

// 获取 BOSS 列表
const fetchBossList = async () => {
  loading.value = true;
  try {
    const response = await bossApi.getBossListWithCache();
    if (response.code === 0 && response.data) {
      bossList.value = response.data;
    } else {
      ElMessage.error(response.message || "获取BOSS列表失败");
      bossList.value = [];
    }
  } catch (error) {
    console.error("获取BOSS列表失败:", error);
    ElMessage.error("获取BOSS列表失败，请稍后重试");
    bossList.value = [];
  } finally {
    loading.value = false;
  }
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = "/default-avatar.png";
};

// 处理联合讨伐
const handleAttack = async (boss) => {
  if (!boss.id) {
    ElMessage.error("BOSS信息不完整");
    return;
  }

  battleLoading.value = true;
  try {
    const response = await bossApi.getBossBattleInfo({ bossId: boss.id });
    if (response.code === 0 && response.data) {
      battleInfo.value = response.data;
      showBattleScene.value = true;
    } else {
      ElMessage.error(response.message || "获取对战信息失败");
    }
  } catch (error) {
    console.error("获取对战信息失败:", error);
    ElMessage.error("获取对战信息失败，请稍后重试");
  } finally {
    battleLoading.value = false;
  }
};

// 处理开始战斗
const handleStartBattle = () => {
  // 战斗逻辑已在 BossBattleScene 组件中实现
  // 这里可以添加额外的逻辑，比如记录战斗日志等
};


// 处理排行榜
const handleLeaderboard = async (boss) => {
  if (!boss.id) {
    ElMessage.error("BOSS信息不完整");
    return;
  }

  currentBoss.value = boss;
  showRankingDialog.value = true;
  rankingLoading.value = true;
  rankingList.value = [];

  try {
    const response = await bossApi.getBossChallengeRanking({ bossId: boss.id });
    if (response.code === 0 && response.data) {
      rankingList.value = response.data;
    } else {
      ElMessage.error(response.message || "获取排行榜失败");
      rankingList.value = [];
    }
  } catch (error) {
    console.error("获取排行榜失败:", error);
    ElMessage.error("获取排行榜失败，请稍后重试");
    rankingList.value = [];
  } finally {
    rankingLoading.value = false;
  }
};

onMounted(() => {
  fetchBossList();
});
</script>

<style scoped>
.boss-battle {
  height: 100%;
  background-color: var(--card-bg, #fff);
  overflow-y: auto;
}

.boss-battle-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 顶部横幅 */
.boss-banner {
  background: linear-gradient(135deg, #ffb347 0%, #ffcc33 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(255, 179, 71, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-icon {
  font-size: 32px;
  color: #fff;
}

.banner-text {
  flex: 1;
}

.banner-title {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
}

.banner-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

/* BOSS 列表 */
.boss-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* BOSS 卡片 */
.boss-card {
  background: #fff;
  border: 2px solid #ffb347;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.boss-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(255, 179, 71, 0.3);
}

.boss-avatar-container {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.boss-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #ffb347;
}

.boss-name {
  font-size: 18px;
  font-weight: bold;
  color: #ff4444;
  margin-bottom: 16px;
  text-align: center;
}

.boss-stats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.boss-reward {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}

.reward-label {
  font-size: 14px;
  color: #666;
}

.reward-icon {
  font-size: 18px;
}

.reward-value {
  font-size: 16px;
  font-weight: bold;
  color: #ff6600;
}

.boss-actions {
  width: 100%;
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.attack-btn {
  background-color: #ffb347;
  color: #fff;
}

.attack-btn:hover {
  background-color: #ff9900;
}

.leaderboard-btn {
  background-color: #ffb347;
  color: #fff;
}

.leaderboard-btn:hover {
  background-color: #ff9900;
}

.leaderboard-btn i {
  margin-right: 4px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .boss-list {
    grid-template-columns: 1fr;
  }

  .banner-title {
    font-size: 20px;
  }

  .banner-desc {
    font-size: 12px;
  }
}

/* 对战界面弹窗样式 */
:deep(.battle-scene-dialog) {
  .el-dialog {
    margin: 0;
    background: transparent;
  }

  .el-dialog__body {
    padding: 0;
    height: 100vh;
    overflow: hidden;
  }
}

/* 排行榜弹窗样式 */
.ranking-dialog {
  :deep(.el-dialog) {
    max-height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
    margin: 50px auto !important;
  }

  :deep(.el-dialog__header) {
    flex-shrink: 0;
    padding: 20px 20px 0 20px;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
}

.ranking-content {
  min-height: 200px;
}

.boss-info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);
  border-radius: 8px;
  margin-bottom: 20px;
}

.boss-avatar-small {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ffb347;
}

.boss-name-small {
  font-size: 18px;
  font-weight: bold;
  color: #ff4444;
}

.empty-ranking {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-ranking .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-ranking p {
  margin: 0;
  font-size: 16px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.ranking-item:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.ranking-item.top-three {
  background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);
  border-color: #ffb347;
}

.rank-number {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #666;
}

.rank-icon {
  font-size: 32px;
}

.rank-text {
  font-size: 18px;
  color: #666;
}

.user-avatar {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ddd;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.pet-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.pet-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #ddd;
}

.pet-name {
  color: #888;
}

.damage-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.damage-label {
  font-size: 12px;
  color: #999;
}

.damage-value {
  font-size: 20px;
  font-weight: bold;
  color: #ff6600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ranking-item {
    padding: 12px;
    gap: 12px;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
  }

  .boss-avatar-small {
    width: 40px;
    height: 40px;
  }
}
</style>

