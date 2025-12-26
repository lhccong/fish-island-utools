<template>
  <div class="battle-scene" :style="{ backgroundImage: `url(${backgroundImage})` }">
    <!-- 顶部UI栏 -->
    <div class="top-ui-bar">
      <!-- 返回按钮 -->
      <button class="back-btn" @click="$emit('close')">
        <i class="fas fa-arrow-left"></i>
        <span>返回BOSS</span>
      </button>

      <!-- 玩家信息面板 -->
      <div class="character-panel player-panel">
        <div class="character-avatar">
          <img
            :src="battleInfo?.petInfo?.avatar || '/default-avatar.png'"
            :alt="battleInfo?.petInfo?.name"
            @error="handleImageError"
          />
        </div>
        <div class="character-info">
          <div class="character-name-row">
            <span class="character-name">{{ battleInfo?.petInfo?.name || "未知宠物" }}</span>
            <span class="character-level">{{ battleInfo?.petInfo?.level || 0 }}</span>
          </div>
          <div class="character-stats">
            <span class="stat-value">{{ battleInfo?.petInfo?.attack || 0 }}</span>
            <span class="stat-value">{{ battleInfo?.petInfo?.health || 0 }}</span>
          </div>
          <div class="health-bar">
            <div
              class="health-fill"
              :style="{
                width: `${getHealthPercentage(currentPetHealth, initialPetHealth)}%`,
              }"
            ></div>
            <span class="health-text">
              {{ currentPetHealth || 0 }}/{{ initialPetHealth || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- VS 标识 -->
      <div class="vs-label">VS</div>

      <!-- Boss信息面板 -->
      <div class="character-panel boss-panel">
        <div class="character-info">
          <div class="character-name-row">
            <span class="character-name">{{ battleInfo?.bossInfo?.name || "未知BOSS" }}</span>
            <span class="character-level boss-level">{{ battleInfo?.bossInfo?.id || 0 }}</span>
          </div>
          <div class="character-stats">
            <span class="stat-value">{{ battleInfo?.bossInfo?.attack || 0 }}</span>
            <span class="stat-value">{{ battleInfo?.bossInfo?.maxHealth || 0 }}</span>
          </div>
          <div class="health-bar">
            <div
              class="health-fill boss-health"
              :style="{
                width: `${getHealthPercentage(currentBossHealth, initialBossHealth)}%`,
              }"
            ></div>
            <span class="health-text">
              {{ currentBossHealth || 0 }}/{{ initialBossHealth || 0 }}
            </span>
          </div>
        </div>
        <div class="character-avatar">
          <img
            :src="battleInfo?.bossInfo?.avatar || '/default-avatar.png'"
            :alt="battleInfo?.bossInfo?.name"
            @error="handleImageError"
          />
        </div>
      </div>
    </div>

    <!-- 游戏场景区域 -->
    <div class="game-scene">
      <!-- 左侧宠物头像 -->
      <div class="scene-character player-character" :class="{ 'attacking': isPetAttacking, 'hit': isPetHit }">
        <div class="scene-avatar">
          <img
            :src="battleInfo?.petInfo?.avatar || '/default-avatar.png'"
            :alt="battleInfo?.petInfo?.name"
            @error="handleImageError"
          />
        </div>
      </div>

      <!-- 右侧Boss头像 -->
      <div class="scene-character boss-character" :class="{ 'attacking': isBossAttacking, 'hit': isBossHit }">
        <div class="scene-avatar">
          <img
            :src="battleInfo?.bossInfo?.avatar || '/default-avatar.png'"
            :alt="battleInfo?.bossInfo?.name"
            @error="handleImageError"
          />
        </div>
      </div>

      <!-- 伤害数字显示 -->
      <div v-if="damageDisplay.show" class="damage-display" :class="damageDisplay.type" :style="damageDisplay.style">
        <span class="damage-value">{{ damageDisplay.value }}</span>
        <span v-if="damageDisplay.isCritical" class="critical-label">暴击!</span>
        <span v-if="damageDisplay.isCombo" class="combo-label">连击!</span>
        <span v-if="damageDisplay.isDodge" class="dodge-label">闪避!</span>
      </div>

      <!-- 回合信息显示 -->
      <div v-if="battleState === 'battling'" class="round-info">
        第 {{ currentRound }} / {{ battleResults.length || 0 }} 回合
      </div>
    </div>

    <!-- 底部UI -->
    <div class="bottom-ui">
      <div class="character-names" style="display: none;">
        <span class="player-name">{{ battleInfo?.petInfo?.name || "未知宠物" }}</span>
        <span class="boss-name">{{ battleInfo?.bossInfo?.name || "未知BOSS" }}</span>
      </div>
      <div class="battle-buttons">
        <button 
          v-if="battleState === 'idle'" 
          class="start-battle-btn" 
          @click="handleStartBattle"
          :disabled="battleLoading"
        >
          <i class="fas fa-play"></i>
          <span>{{ battleLoading ? '战斗中...' : '开始战斗' }}</span>
        </button>
        <button 
          v-if="battleState === 'battling'" 
          class="skip-battle-btn" 
          @click="handleSkipBattle"
        >
          <i class="fas fa-forward"></i>
          <span>跳过战斗</span>
        </button>
        <button 
          v-if="battleState === 'completed'" 
          class="complete-battle-btn" 
          @click="$emit('close')"
        >
          <i class="fas fa-check"></i>
          <span>战斗结束</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { bossApi } from "../api/boss";
import { ElMessage } from "element-plus";

const props = defineProps({
  battleInfo: {
    type: Object,
    default: () => ({}),
  },
  backgroundImage: {
    type: String,
    default:
      "https://img2.huashi6.com/images/resource/thumbnail/2021/12/27/105425_66510272259.jpg?imageMogr2/quality/100/interlace/1/thumbnail/2000x%3E",
  },
});

const emit = defineEmits(["close", "startBattle"]);

// 战斗状态：idle-待开始, battling-战斗中, completed-已完成
const battleState = ref("idle");
const battleLoading = ref(false);
const battleResults = ref([]);
const currentRound = ref(0);
const isSkipping = ref(false);

// 血量状态
const initialPetHealth = computed(() => props.battleInfo?.petInfo?.health || 0);
const initialBossHealth = computed(() => props.battleInfo?.bossInfo?.maxHealth || 0);
const currentPetHealth = ref(0);
const currentBossHealth = ref(0);

// 动画状态
const isPetAttacking = ref(false);
const isBossAttacking = ref(false);
const isPetHit = ref(false);
const isBossHit = ref(false);

// 伤害显示
const damageDisplay = ref({
  show: false,
  value: 0,
  type: "", // 'pet' or 'boss'
  style: {},
  isCritical: false,
  isCombo: false,
  isDodge: false,
});

// 初始化血量和重置战斗状态
watch(
  () => props.battleInfo,
  (newVal) => {
    if (newVal) {
      // 重置血量
      currentPetHealth.value = newVal.petInfo?.health || 0;
      currentBossHealth.value = newVal.bossInfo?.currentHealth || newVal.bossInfo?.maxHealth || 0;
      
      // 重置战斗状态
      battleState.value = "idle";
      battleLoading.value = false;
      battleResults.value = [];
      currentRound.value = 0;
      isSkipping.value = false;
      
      // 重置动画状态
      isPetAttacking.value = false;
      isBossAttacking.value = false;
      isPetHit.value = false;
      isBossHit.value = false;
      
      // 重置伤害显示
      damageDisplay.value = {
        show: false,
        value: 0,
        type: "",
        style: {},
        isCritical: false,
        isCombo: false,
        isDodge: false,
      };
    }
  },
  { immediate: true }
);

// 计算血量百分比
const getHealthPercentage = (current, max) => {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
};

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.src = "/default-avatar.png";
};

// 处理开始战斗
const handleStartBattle = async () => {
  if (!props.battleInfo?.bossInfo?.id) {
    ElMessage.error("BOSS信息不完整");
    return;
  }

  battleLoading.value = true;
  battleState.value = "battling";
  isSkipping.value = false;

  try {
    const response = await bossApi.battle({ bossId: props.battleInfo.bossInfo.id });
    if (response.code === 0 && response.data) {
      battleResults.value = response.data;
      // 开始播放战斗动画
      await playBattleAnimation();
    } else {
      ElMessage.error(response.message || "战斗失败");
      battleState.value = "idle";
    }
  } catch (error) {
    console.error("战斗失败:", error);
    ElMessage.error("战斗失败，请稍后重试");
    battleState.value = "idle";
  } finally {
    battleLoading.value = false;
  }
};

// 播放战斗动画
const playBattleAnimation = async () => {
  if (!battleResults.value || battleResults.value.length === 0) {
    battleState.value = "completed";
    return;
  }

  for (let i = 0; i < battleResults.value.length; i++) {
    if (isSkipping.value) {
      // 跳过战斗，直接显示最终结果
      const lastResult = battleResults.value[battleResults.value.length - 1];
      currentPetHealth.value = lastResult.petRemainingHealth || 0;
      currentBossHealth.value = lastResult.bossRemainingHealth || 0;
      break;
    }

    currentRound.value = i + 1;
    const result = battleResults.value[i];
    
    // 播放当前回合动画
    await playRoundAnimation(result);
    
    // 更新血量
    if (result.petRemainingHealth !== undefined) {
      currentPetHealth.value = result.petRemainingHealth;
    }
    if (result.bossRemainingHealth !== undefined) {
      currentBossHealth.value = result.bossRemainingHealth;
    }

    // 每回合之间的延迟（跳过时不需要延迟）
    if (!isSkipping.value && i < battleResults.value.length - 1) {
      await sleep(500);
    }
  }

  battleState.value = "completed";
};

// 播放单回合动画
const playRoundAnimation = async (result) => {
  const attackerType = result.attackerType || "";
  const isPetAttack = attackerType === "PET";
  const isBossAttack = attackerType === "BOSS";

  // 攻击动画
  if (isPetAttack) {
    isPetAttacking.value = true;
    await sleep(300);
    isPetAttacking.value = false;
    
    // 显示伤害
    if (!result.isDodge && result.damage) {
      isBossHit.value = true;
      showDamage(result.damage, "boss", result.isCritical, result.isCombo, false);
      await sleep(800);
      isBossHit.value = false;
    } else if (result.isDodge) {
      showDamage(0, "boss", false, false, true);
      await sleep(800);
    }
  } else if (isBossAttack) {
    isBossAttacking.value = true;
    await sleep(300);
    isBossAttacking.value = false;
    
    // 显示伤害
    if (!result.isDodge && result.damage) {
      isPetHit.value = true;
      showDamage(result.damage, "pet", result.isCritical, result.isCombo, false);
      await sleep(800);
      isPetHit.value = false;
    } else if (result.isDodge) {
      showDamage(0, "pet", false, false, true);
      await sleep(800);
    }
  }

  // 隐藏伤害显示
  damageDisplay.value.show = false;
};

// 显示伤害数字
const showDamage = (damage, type, isCritical, isCombo, isDodge) => {
  const isLeft = type === "pet";
  damageDisplay.value = {
    show: true,
    value: isDodge ? "MISS" : damage,
    type: type,
    style: {
      left: isLeft ? "20%" : "80%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    },
    isCritical: isCritical,
    isCombo: isCombo,
    isDodge: isDodge,
  };
};

// 跳过战斗
const handleSkipBattle = () => {
  isSkipping.value = true;
  // 如果战斗还在进行，直接跳到最后一回合
  if (battleResults.value.length > 0) {
    const lastResult = battleResults.value[battleResults.value.length - 1];
    currentPetHealth.value = lastResult.petRemainingHealth || 0;
    currentBossHealth.value = lastResult.bossRemainingHealth || 0;
    currentRound.value = battleResults.value.length;
    battleState.value = "completed";
  }
};

// 工具函数：延迟
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
</script>

<style scoped>
.battle-scene {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 顶部UI栏 */
.top-ui-bar {
  position: relative;
  width: 100%;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    transparent 100%
  );
  z-index: 10;
  flex-shrink: 0;
}

.back-btn {
  position: absolute;
  left: 24px;
  top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(128, 128, 128, 0.7);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 11;
}

.back-btn:hover {
  background: rgba(128, 128, 128, 0.9);
}

.back-btn i {
  font-size: 14px;
}

/* 角色信息面板 */
.character-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  padding: 12px 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  min-width: 280px;
}

.player-panel {
  flex-direction: row;
}

.boss-panel {
  flex-direction: row-reverse;
}

.character-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.character-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.character-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.boss-level {
  background: #f56c6c;
}

.character-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.stat-value {
  font-weight: 500;
}

.health-bar {
  position: relative;
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  overflow: hidden;
}

.health-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.boss-health {
  background: linear-gradient(90deg, #ff6b6b 0%, #ff8e8e 100%);
}

.health-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: bold;
  color: #333;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

/* VS 标识 */
.vs-label {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

/* 游戏场景区域 */
.game-scene {
  flex: 1;
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 60px;
  min-height: 0;
  overflow: hidden;
}

/* 场景中的角色头像 */
.scene-character {
  position: relative;
  z-index: 5;
}

.scene-avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  transform: translateZ(0);
  will-change: transform;
}

.scene-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-character {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

.boss-character {
  animation: float 3s ease-in-out infinite;
  animation-delay: 1.5s;
  will-change: transform;
}

.player-character.attacking {
  animation: petAttack 0.3s ease forwards;
}

.boss-character.attacking {
  animation: bossAttack 0.3s ease forwards;
}

.player-character.hit {
  animation: shake 0.5s ease;
}

.boss-character.hit {
  animation: shake 0.5s ease;
}

@keyframes float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -20px, 0);
  }
}

@keyframes petAttack {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(50px, -10px, 0) scale(1.1);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes bossAttack {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(-50px, -10px, 0) scale(1.1);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

/* 伤害数字显示 */
.damage-display {
  position: absolute;
  z-index: 100;
  pointer-events: none;
  font-size: 48px;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  animation: damageFloat 1s ease-out forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.damage-display.pet {
  color: #ff6b6b;
}

.damage-display.boss {
  color: #4ecdc4;
}

.damage-value {
  font-size: 56px;
}

.critical-label {
  font-size: 24px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
}

.combo-label {
  font-size: 20px;
  color: #ff6b6b;
}

.dodge-label {
  font-size: 32px;
  color: #95a5a6;
}

@keyframes damageFloat {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(-30px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-60px) scale(1);
  }
}

/* 回合信息显示 */
.round-info {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  z-index: 50;
  backdrop-filter: blur(10px);
}

/* 底部UI */
.bottom-ui {
  position: relative;
  width: 100%;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    transparent 100%
  );
  z-index: 10;
}

.character-names {
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 600px;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.player-name {
  text-align: left;
}

.boss-name {
  text-align: right;
}

.battle-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 200px;
}

.start-battle-btn,
.skip-battle-btn,
.complete-battle-btn {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.start-battle-btn {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.4);
}

.start-battle-btn:hover {
  background: linear-gradient(135deg, #5daf34 0%, #73c050 100%);
  box-shadow: 0 6px 16px rgba(103, 194, 58, 0.6);
  transform: translateY(-2px);
}

.start-battle-btn i,
.skip-battle-btn i,
.complete-battle-btn i {
  font-size: 14px;
}

.start-battle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.skip-battle-btn {
  background: linear-gradient(135deg, #ff9800 0%, #ff6b00 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.skip-battle-btn:hover {
  background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
  box-shadow: 0 6px 16px rgba(255, 152, 0, 0.6);
  transform: translateY(-2px);
}

.complete-battle-btn {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.complete-battle-btn:hover {
  background: linear-gradient(135deg, #388e3c 0%, #4caf50 100%);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6);
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-ui-bar {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .character-panel {
    min-width: 200px;
    padding: 8px 12px;
  }

  .character-avatar {
    width: 50px;
    height: 50px;
  }

  .character-name {
    font-size: 14px;
  }

  .vs-label {
    font-size: 24px;
  }

  .bottom-ui {
    padding: 16px;
  }

  .character-names {
    font-size: 16px;
  }
}
</style>


