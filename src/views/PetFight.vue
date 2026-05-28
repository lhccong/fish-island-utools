<template>
  <div class="fight-container" v-loading="loading && !result">
    <div class="back-button-container">
      <el-button class="back-button" round @click="goBack">返回{{ backLabel }}</el-button>
    </div>

    <div class="battle-arena">
      <div class="arena-background">
        <div class="arena-decoration"></div>
        <div class="arena-ground"></div>
      </div>

      <div class="arena-vs-indicator">
        <div class="vs-text-small">VS</div>
        <div v-if="battleStatus === 'fighting'" class="collision-effect">
          <div class="collision-ring"></div>
          <div class="collision-spark"></div>
        </div>
      </div>

      <div class="pet-area">
        <div class="combatant" :class="{ activeTurn: currentSide === 'left' }">
          <div class="combat-health-card pet">
            <div class="combat-health-head">
              <strong>{{ leftFighter.name }}</strong>
              <el-tag size="small" type="success">Lv.{{ leftFighter.level ?? 1 }}</el-tag>
            </div>
            <div class="combat-stats">
              <span>攻 {{ leftFighter.attack ?? "--" }}</span>
              <span>{{ leftHp }} / {{ leftMaxHp }}</span>
            </div>
            <div class="hp-track">
              <div class="hp-fill pet" :style="{ width: `${leftHpPercent}%` }"></div>
            </div>
            <div class="equipment-row compact">
              <div
                v-for="item in leftEquipment"
                :key="item.key"
                class="equipment-item"
                :class="`rarity-${item.rarity}`"
                :title="item.name"
              >
                <img v-if="item.icon" :src="item.icon" alt="" />
                <span v-else>{{ item.fallback }}</span>
              </div>
            </div>
          </div>
          <FightAvatar
            :fighter="leftFighter"
            size="large"
            side="pet"
            :attacking="leftAttacking"
            :hurt="leftHurt"
          />
          <div
            v-if="currentSide === 'left' && battleStatus === 'fighting'"
            class="turn-indicator"
            title="当前回合"
          >
            <el-icon :size="15"><Lightning /></el-icon>
          </div>
          <div class="combatant-label">{{ leftFighter.name }}</div>
        </div>
      </div>

      <div class="boss-area">
        <div class="combatant" :class="{ activeTurn: currentSide === 'right' }">
          <div class="combat-health-card boss">
            <div class="combat-health-head right">
              <el-tag size="small" :type="isTower ? 'warning' : isBoss ? 'danger' : 'primary'">Lv.{{ rightFighter.level ?? 1 }}</el-tag>
              <strong>{{ rightFighter.name }}</strong>
            </div>
            <div class="combat-stats right">
              <span>攻 {{ rightFighter.attack ?? "--" }}</span>
              <span>{{ rightHp }} / {{ rightMaxHp }}</span>
            </div>
            <div class="hp-track">
              <div class="hp-fill boss" :style="{ width: `${rightHpPercent}%` }"></div>
            </div>
            <div class="equipment-row compact right">
              <div
                v-for="item in rightEquipment"
                :key="item.key"
                class="equipment-item"
                :class="`rarity-${item.rarity}`"
                :title="item.name"
              >
                <img v-if="item.icon" :src="item.icon" alt="" />
                <span v-else>{{ item.fallback }}</span>
              </div>
            </div>
          </div>
          <FightAvatar
            :fighter="rightFighter"
            size="large"
            :side="isTowerOrBoss ? 'boss' : 'pet'"
            :attacking="rightAttacking"
            :hurt="rightHurt"
          />
          <div
            v-if="currentSide === 'right' && battleStatus === 'fighting'"
            class="turn-indicator"
            title="当前回合"
          >
            <el-icon :size="15"><Lightning /></el-icon>
          </div>
          <div class="combatant-label">{{ rightFighter.name }}</div>
        </div>
      </div>

      <div v-if="effect.show" class="battle-effect" :class="[effect.side, effect.kind]">
        <span class="effect-value">{{ effect.text }}</span>
        <span v-if="effect.badge" class="effect-text">{{ effect.badge }}</span>
      </div>
    </div>

    <div class="control-panel">
      <div class="battle-controls">
        <div v-if="battleStatus === 'fighting'" class="fighting-controls">
          <el-icon class="spin-icon"><Loading /></el-icon>
          <span>战斗中 {{ shownRounds.length }}/{{ fullRounds.length }}</span>
          <el-button class="skip-button" size="small" @click="skipAnimation">跳过战斗</el-button>
        </div>

        <div v-else-if="battleStatus === 'completed'" class="finished-controls">
          <el-button class="restart-button" type="success" round :loading="loading" @click="runChallenge">
            {{ isTower && battleWon ? "挑战下一层" : "再次挑战" }}
          </el-button>
          <el-button round @click="goBack">返回{{ backLabel }}</el-button>
        </div>

        <div v-else class="finished-controls">
          <el-button class="restart-button" type="success" round :loading="loading" @click="runChallenge">
            开始战斗
          </el-button>
        </div>
      </div>

      <div class="battle-status">
        <div class="status-indicator" :class="battleStatusClass">
          {{ statusText }}
        </div>
      </div>
    </div>

    <el-alert
      v-if="error"
      class="error-box"
      type="error"
      :title="error"
      show-icon
      :closable="false"
    />

  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Loading, Lightning } from "@element-plus/icons-vue";
import PetSprite from "../components/PetSprite.vue";
import { DEFAULT_SPRITE_ACTIONS, isWebpSprite } from "../utils/petRender";
import { petTournamentApi } from "../api/petTournament";
import { towerClimbApi } from "../api/towerClimb";
import { petApi } from "../api/pet";
import { userApi } from "../api/user";
import { bossApi } from "../api/boss";

const FightAvatar = defineComponent({
  props: {
    fighter: { type: Object, required: true },
    size: { type: String, default: "large" },
    side: { type: String, default: "pet" },
    attacking: { type: Boolean, default: false },
    hurt: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      const avatar = props.fighter?.avatar || "";
      const large = props.size === "large";
      const className = [
        "fight-avatar",
        `fight-avatar--${props.size}`,
        `fight-avatar--${props.side}`,
        props.attacking ? "attacking" : "",
        props.hurt ? "hurt" : "",
        avatar && isWebpSprite(avatar) ? "sprite-wrapper" : "",
      ];

      if (avatar && isWebpSprite(avatar)) {
        return h(
          "div",
          { class: className },
          h(PetSprite, {
            spriteUrl: avatar,
            frameWidth: 192,
            frameHeight: 208,
            totalCols: 8,
            totalRows: 9,
            actions: DEFAULT_SPRITE_ACTIONS,
            scale: (large ? 138 : 46) / 192,
            autoPlay: true,
            autoPlayMinInterval: 3000,
            autoPlayMaxInterval: 8000,
          }),
        );
      }

      if (avatar) {
        return h("img", {
          class: className,
          src: avatar,
          alt: props.fighter?.name || "宠物形象",
        });
      }

      return h("div", { class: [...className, "avatar-fallback"] }, (props.fighter?.name || "?").charAt(0));
    };
  },
});

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const result = ref(null);
const error = ref("");
const battleStatus = ref("idle");
const fullRounds = ref([]);
const shownRounds = ref([]);
const skipRequested = ref(false);
const currentSide = ref("");
const leftAttacking = ref(false);
const rightAttacking = ref(false);
const leftHurt = ref(false);
const rightHurt = ref(false);
const leftHp = ref(100);
const rightHp = ref(100);
const leftMaxHp = ref(100);
const rightMaxHp = ref(100);
const effect = ref({ show: false, side: "right", kind: "damage", text: "", badge: "" });

const leftFighter = ref({ name: "我的宠物", level: 1, avatar: "", attack: "--", equippedItems: {} });
const rightFighter = ref({ name: "对手", level: 1, avatar: "", attack: "--", equippedItems: {} });

const mode = computed(() => route.query.from || "tournament");
const isTower = computed(() => mode.value === "tower");
const isBoss = computed(() => mode.value === "boss");
const isTowerOrBoss = computed(() => isTower.value || isBoss.value);
const backLabel = computed(() => {
  if (isTower.value) return "爬塔";
  if (isBoss.value) return "摸鱼BOSS";
  return "武道大会";
});
const backPath = computed(() => {
  if (isTower.value) return "/points-play/tower";
  if (isBoss.value) return { path: "/pet-center", query: { tab: "boss" } };
  return "/points-play/tournament";
});
const leftHpPercent = computed(() => hpPercent(leftHp.value, leftMaxHp.value));
const rightHpPercent = computed(() => hpPercent(rightHp.value, rightMaxHp.value));
const battleStatusClass = computed(() => {
  if (battleStatus.value === "completed") return battleWon.value ? "victory" : "defeat";
  return battleStatus.value;
});
const battleWon = computed(() => {
  const data = result.value || {};
  if (typeof data.win === "boolean") return data.win;
  if (typeof data.isWin === "boolean") return data.isWin;
  if (typeof data.success === "boolean") return data.success;
  const last = fullRounds.value[fullRounds.value.length - 1] || {};
  const normalized = normalizeRound(last);
  return normalized.leftHp > 0 && normalized.rightHp <= 0;
});
const statusText = computed(() => {
  if (error.value) return "挑战异常";
  if (battleStatus.value === "loading") return "正在加载对战信息";
  if (battleStatus.value === "fighting") return "战斗中...";
  if (battleStatus.value === "completed") return battleWon.value ? "胜利！" : "失败...";
  return "准备战斗";
});
const summaryText = computed(() => {
  if (result.value?.message) return result.value.message;
  if (isTower.value) return battleWon.value ? "通关成功，返回爬塔页面继续挑战更高层。" : "本层挑战未通过，可调整宠物后再战。";
  if (isBoss.value) {
    return battleWon.value ? "讨伐成功，返回摸鱼 BOSS 查看排行与奖励。" : "本次讨伐未胜出，可调整宠物与装备后再次挑战。";
  }
  return battleWon.value ? "排名挑战成功，返回武道大会查看最新排名。" : "挑战未成功，可继续尝试。";
});
const infoItems = computed(() => {
  const data = result.value || {};
  if (isTower.value) {
    return [
      { label: "挑战层数", value: data.floor ?? route.query.floor ?? "--" },
      { label: "最高层", value: data.maxFloor ?? "--" },
      { label: "奖励积分", value: data.rewardPoints ?? "--" },
    ];
  }
  if (isBoss.value) {
    return [
      { label: "目标 BOSS", value: rightFighter.value.name || "--" },
      { label: "BOSS ID", value: route.query.bossId ?? "--" },
      { label: "讨伐奖励(摸鱼币)", value: data.rewardPoints ?? "--" },
    ];
  }
  return [
    { label: "目标排名", value: data.targetRank ?? route.query.targetRank ?? "--" },
    { label: "当前排名", value: data.myRank ?? "--" },
    { label: "对手用户", value: data.opponentUserId ?? route.query.opponentUserId ?? "--" },
  ];
});
const leftEquipment = computed(() => equipmentItems(leftFighter.value.equippedItems));
const rightEquipment = computed(() => equipmentItems(rightFighter.value.equippedItems));

function equipmentItems(equippedItems = {}) {
  const values = Object.values(equippedItems || {}).filter(Boolean);
  const normalized = values.slice(0, 4).map((item, index) => {
    const template = item.template || {};
    const name = template.name || item.name || item.itemName || "装备";
    return {
      key: item.id || item.instanceId || item.itemId || `${template.id || template.templateId || "equip"}-${index}`,
      name,
      icon: template.icon || item.iconUrl || item.itemIcon || item.imageUrl || "",
      rarity: template.rarity || item.rarity || 1,
      fallback: name.slice(0, 1),
    };
  });
  while (normalized.length < 4) {
    normalized.push({ key: `empty-${normalized.length}`, name: "空装备位", icon: "", fallback: "锁", rarity: 0 });
  }
  return normalized;
}

function hpPercent(current, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (Number(current || 0) / Number(max)) * 100));
}

function rateText(value) {
  return `${((Number(value) || 0) * 100).toFixed(0)}%`;
}

async function loadFightInfo() {
  battleStatus.value = "loading";
  try {
    if (isTower.value) {
      const [progressRes, petRes] = await Promise.all([towerClimbApi.getProgress(), userApi.getPetDetail()]);
      const monster = progressRes.data?.nextMonster;
      const pet = petRes.data || {};
      leftFighter.value = fighterFromPet(pet, "我的宠物");
      rightFighter.value = {
        name: monster?.name || `第 ${route.query.floor || 1} 层守卫`,
        level: monster?.floor || route.query.floor || 1,
        avatar: monster?.avatarUrl || "",
        attack: monster?.attack ?? "--",
        critRate: monster?.critRate,
        dodgeRate: monster?.dodgeRate,
        equippedItems: {},
      };
      leftMaxHp.value = pet.health || leftMaxHp.value || 100;
      leftHp.value = leftMaxHp.value;
      rightMaxHp.value = monster?.health || 100;
      rightHp.value = rightMaxHp.value;
    } else if (isBoss.value && route.query.bossId) {
      const infoRes = await bossApi.getBossBattleInfo({ bossId: route.query.bossId });
      const d = infoRes.data || {};
      const pet = d.petInfo || {};
      const boss = d.bossInfo || {};
      leftFighter.value = {
        name: pet.name || "我的宠物",
        level: pet.level || 1,
        avatar: pet.avatar || "",
        attack: pet.attack ?? "--",
        equippedItems: pet.equippedItems || {},
      };
      rightFighter.value = {
        name: boss.name || "BOSS",
        level: boss.level ?? boss.id ?? 1,
        avatar: boss.avatar || "",
        attack: boss.attack ?? "--",
        equippedItems: {},
      };
      leftMaxHp.value = pet.health || 100;
      leftHp.value = leftMaxHp.value;
      rightMaxHp.value = boss.currentHealth ?? boss.maxHealth ?? 100;
      rightHp.value = rightMaxHp.value;
    } else if (route.query.opponentUserId) {
      const infoRes = await petApi.getPetBattleInfo({ opponentUserId: route.query.opponentUserId });
      const myPet = infoRes.data?.myPet || {};
      const opponentPet = infoRes.data?.opponentPet || {};
      leftFighter.value = fighterFromPet(myPet, "我的宠物");
      rightFighter.value = fighterFromPet(opponentPet, "对手宠物");
      leftMaxHp.value = myPet.health || 100;
      rightMaxHp.value = opponentPet.health || 100;
      leftHp.value = leftMaxHp.value;
      rightHp.value = rightMaxHp.value;
    }
  } catch (err) {
    console.warn("加载对战信息失败，使用默认战斗面板", err);
  }
}

function fighterFromPet(pet, fallback) {
  return {
    name: pet.name || fallback,
    level: pet.level || 1,
    avatar: pet.avatar || pet.petUrl || "",
    attack: pet.attack ?? "--",
    equippedItems: pet.equippedItems || {},
  };
}

async function runChallenge() {
  loading.value = true;
  error.value = "";
  result.value = null;
  fullRounds.value = [];
  shownRounds.value = [];
  skipRequested.value = false;
  resetEffects();
  try {
    await loadFightInfo();
    let res;
    if (isTower.value) {
      res = await towerClimbApi.challenge();
    } else if (isBoss.value) {
      res = await bossApi.battle({ bossId: route.query.bossId });
    } else {
      res = await petTournamentApi.challenge({ targetRank: route.query.targetRank });
    }
    if (res.code !== 0) throw new Error(res.message || res.msg || "挑战失败");
    const rawData = res.data;
    const payload = Array.isArray(rawData) ? { battleRounds: rawData } : rawData || {};
    result.value = payload;
    fullRounds.value =
      payload.battleRounds || payload.rounds || payload.battleResultList || payload.results || [];
    prepareInitialHp();
    await playRounds();
  } catch (err) {
    error.value = err.message || "挑战失败";
    battleStatus.value = "idle";
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
}

function prepareInitialHp() {
  const first = normalizeRound(fullRounds.value[0] || {});
  if (isTower.value && (!leftMaxHp.value || leftMaxHp.value === 100)) {
    leftMaxHp.value = first.attackerSide === "right" ? first.leftHp + first.damage : first.leftHp || 100;
  }
  if (!leftMaxHp.value || leftMaxHp.value === 100) leftMaxHp.value = first.leftHp || leftMaxHp.value || 100;
  if (!rightMaxHp.value || rightMaxHp.value === 100) rightMaxHp.value = first.rightHp || rightMaxHp.value || 100;
  leftHp.value = leftMaxHp.value;
  rightHp.value = rightMaxHp.value;
}

async function playRounds() {
  battleStatus.value = "fighting";
  if (fullRounds.value.length === 0) {
    battleStatus.value = "completed";
    return;
  }

  for (let i = 0; i < fullRounds.value.length; i += 1) {
    const round = fullRounds.value[i];
    if (skipRequested.value) {
      shownRounds.value = [...fullRounds.value];
      const last = normalizeRound(fullRounds.value[fullRounds.value.length - 1]);
      leftHp.value = last.leftHp;
      rightHp.value = last.rightHp;
      break;
    }
    shownRounds.value.push(round);
    await playRound(round);
  }
  resetEffects();
  battleStatus.value = "completed";
}

async function playRound(round) {
  const data = normalizeRound(round);
  const attackerIsLeft = data.attackerSide === "left";
  currentSide.value = data.attackerSide;
  if (attackerIsLeft) leftAttacking.value = true;
  else rightAttacking.value = true;
  await sleep(260);
  leftAttacking.value = false;
  rightAttacking.value = false;

  if (attackerIsLeft) rightHurt.value = !data.isDodge;
  else leftHurt.value = !data.isDodge;
  showEffect(attackerIsLeft ? "right" : "left", data);
  await sleep(680);

  leftHp.value = data.leftHp;
  rightHp.value = data.rightHp;
  leftHurt.value = false;
  rightHurt.value = false;
  effect.value.show = false;
  await sleep(260);
}

function normalizeRound(round = {}) {
  const attackerType = round.attackerType || "";
  const leftAttack = ["PET", "MY_PET"].includes(attackerType);
  return {
    attackerSide: leftAttack ? "left" : "right",
    damage: Number(round.damage || 0),
    leftHp: Number(round.petRemainingHealth ?? round.myPetRemainingHealth ?? round.selfRemainingHealth ?? leftHp.value ?? 0),
    rightHp: Number(round.bossRemainingHealth ?? round.opponentPetRemainingHealth ?? round.enemyRemainingHealth ?? rightHp.value ?? 0),
    isCritical: !!round.isCritical,
    isCombo: !!round.isCombo,
    isDodge: !!round.isDodge,
    isBlock: !!round.isBlock,
  };
}

function showEffect(side, round) {
  let text = `-${round.damage}`;
  let kind = "damage";
  if (round.isCritical) kind = "critical";
  else if (round.isCombo) kind = "combo";
  else if (round.isDodge) {
    text = "MISS";
    kind = "miss";
  } else if (round.isBlock) {
    kind = "block";
  }
  effect.value = {
    show: true,
    side,
    kind,
    text,
    badge: round.isCritical ? "暴击" : round.isCombo ? "连击" : round.isBlock ? "格挡" : "",
  };
}

function roundText(round) {
  const data = normalizeRound(round);
  const attacker = data.attackerSide === "left" ? leftFighter.value.name : rightFighter.value.name;
  const target = data.attackerSide === "left" ? rightFighter.value.name : leftFighter.value.name;
  if (data.isDodge) return `${attacker} 发起攻击，${target} 闪避了。`;
  const tags = [data.isCritical ? "暴击" : "", data.isCombo ? "连击" : "", data.isBlock ? "格挡" : ""].filter(Boolean).join("、");
  return `${attacker} 攻击 ${target}，造成 ${data.damage} 点伤害${tags ? `（${tags}）` : ""}。`;
}

function resetEffects() {
  currentSide.value = "";
  leftAttacking.value = false;
  rightAttacking.value = false;
  leftHurt.value = false;
  rightHurt.value = false;
  effect.value.show = false;
}

function skipAnimation() {
  skipRequested.value = true;
}

function goBack() {
  router.push(backPath.value);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

onMounted(async () => {
  if (isBoss.value && !route.query.bossId) {
    error.value = "缺少 BOSS 参数";
    ElMessage.error(error.value);
    router.replace({ path: "/pet-center", query: { tab: "boss" } });
    return;
  }
  await runChallenge();
});
</script>

<style scoped>
.fight-container {
  position: relative;
  box-sizing: border-box;
  margin: 0;
  padding: 12px 16px 24px;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 16px;
  background: linear-gradient(180deg, #fff9f5 0%, #fff0e6 30%, #ffe8d6 70%, #ffd4a8 100%);
  -webkit-overflow-scrolling: touch;
}

.fight-container::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 80%, rgba(255, 167, 104, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(255, 200, 150, 0.12) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 50%, rgba(255, 220, 180, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.fight-container > * {
  position: relative;
  z-index: 1;
}

.back-button-container {
  margin-bottom: 14px;
}

.back-button {
  background: rgba(255, 167, 104, 0.15);
  border: 1px solid rgba(255, 167, 104, 0.3);
  color: #d46b08;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(255, 167, 104, 0.15);
}

.combat-health-card {
  width: min(260px, 34vw);
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px 11px;
  border-radius: 12px;
  box-shadow:
    0 4px 18px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.combat-health-card.pet {
  border: 2px solid rgba(82, 196, 26, 0.36);
  background: linear-gradient(135deg, rgba(240, 255, 240, 0.93) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.combat-health-card.boss {
  border: 2px solid rgba(245, 34, 45, 0.28);
  background: linear-gradient(135deg, rgba(255, 245, 245, 0.93) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.combat-health-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: #262626;
}

.combat-health-head.right {
  justify-content: flex-end;
}

.combat-health-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.combat-stats {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  color: #595959;
  font-size: 11px;
  font-weight: 700;
}

.combat-stats.right {
  justify-content: flex-end;
}

.hp-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
}

.hp-fill {
  height: 100%;
  transition: width 0.35s ease;
}

.hp-fill.pet {
  background: linear-gradient(90deg, #52c41a 0%, #95de64 100%);
}

.hp-fill.boss {
  background: linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%);
}

.equipment-row {
  display: flex;
  gap: 6px;
}

.equipment-row.compact {
  gap: 4px;
}

.equipment-row.right {
  justify-content: flex-end;
}

.equipment-item {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 167, 104, 0.25);
  color: #c0a16b;
  font-size: 11px;
  font-weight: 800;
  overflow: hidden;
}

.equipment-item img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.equipment-item.rarity-1 {
  border-color: rgba(145, 145, 145, 0.45);
}

.equipment-item.rarity-2 {
  border-color: rgba(82, 196, 26, 0.55);
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.14);
}

.equipment-item.rarity-3 {
  border-color: rgba(24, 144, 255, 0.6);
  box-shadow: 0 0 6px rgba(24, 144, 255, 0.16);
}

.equipment-item.rarity-4,
.equipment-item.rarity-5 {
  border-color: rgba(250, 173, 20, 0.7);
  box-shadow: 0 0 8px rgba(250, 173, 20, 0.22);
}

.arena-vs-indicator {
  position: absolute;
  top: 45%;
  left: 50%;
  z-index: 3;
  transform: translate(-50%, -50%);
}

.vs-indicator-small {
  position: relative;
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-top: 34px;
}

.vs-text-small {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%);
  box-shadow: 0 4px 16px rgba(255, 122, 69, 0.35);
}

.collision-ring,
.collision-spark {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 212, 59, 0.65);
  animation: collision-pulse 1s ease-out infinite;
}

.collision-spark {
  inset: 12px;
  border-color: rgba(255, 77, 79, 0.65);
  animation-delay: 0.18s;
}

.battle-arena {
  position: relative;
  min-height: 430px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 34px 56px 72px;
  margin-bottom: 16px;
  overflow: visible;
}

.battle-arena::after {
  content: "";
  position: absolute;
  top: 40%;
  left: 20%;
  right: 20%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 212, 59, 0.3) 20%, rgba(255, 212, 59, 0.5) 50%, rgba(255, 212, 59, 0.3) 80%, transparent 100%);
  animation: connection-glow 3s ease-in-out infinite;
}

.arena-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.arena-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255, 167, 104, 0.1) 0%, transparent 70%);
  animation: arena-pulse 4s ease-in-out infinite;
}

.arena-ground {
  position: absolute;
  bottom: 20%;
  left: 10%;
  right: 10%;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(180deg, transparent 0%, rgba(255, 167, 104, 0.05) 30%, rgba(255, 167, 104, 0.1) 100%);
  filter: blur(20px);
}

.pet-area,
.boss-area {
  position: relative;
  z-index: 1;
}

.pet-area {
  transform: translateY(0);
}

.boss-area {
  transform: scale(0.86) translateY(-18px);
  opacity: 0.95;
}

.combatant {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px;
  transition: all 0.3s ease;
}

.combatant.activeTurn {
  animation: active-glow 2s ease-in-out infinite;
}

.combatant-label {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  max-width: 160px;
  padding: 6px 16px;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 167, 104, 0.3);
  color: #262626;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.turn-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #ffa940 0%, #ff7a45 100%);
  box-shadow: 0 0 12px rgba(255, 122, 69, 0.45);
  z-index: 4;
}

:deep(.fight-avatar) {
  flex-shrink: 0;
  transition: all 0.3s ease;
}

:deep(.fight-avatar--small) {
  width: 42px;
  height: 42px;
  object-fit: contain;
  border-radius: 50%;
  background: #fff;
}

:deep(.fight-avatar--large) {
  width: 138px;
  height: 138px;
  object-fit: contain;
  border-radius: 50%;
  background: #fff;
  animation: pet-float 3s ease-in-out infinite;
}

:deep(.fight-avatar--pet) {
  border: 4px solid #52c41a;
  box-shadow:
    0 0 0 4px rgba(82, 196, 26, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.3),
    0 4px 8px rgba(82, 196, 26, 0.2);
}

:deep(.fight-avatar--boss) {
  border: 3px solid #ff7875;
  background: linear-gradient(135deg, #f5222d 0%, #ff4d4f 100%);
  box-shadow:
    0 0 0 3px rgba(245, 34, 45, 0.3),
    0 0 20px rgba(245, 34, 45, 0.2),
    0 6px 20px rgba(0, 0, 0, 0.3);
}

:deep(.sprite-wrapper) {
  width: auto;
  height: auto;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

:deep(.fight-avatar--large.sprite-wrapper) {
  animation: pet-float 3s ease-in-out infinite;
}

:deep(.fight-avatar.attacking.fight-avatar--pet) {
  animation: pet-attack 0.5s ease-in-out;
}

:deep(.fight-avatar.attacking.fight-avatar--boss) {
  animation: boss-attack 0.5s ease-in-out;
}

:deep(.fight-avatar.hurt) {
  animation: avatar-hurt 0.3s ease-in-out;
}

.control-panel {
  margin-bottom: 16px;
}

.battle-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.fighting-controls,
.finished-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

.skip-button {
  border: 2px solid rgba(255, 167, 104, 0.6);
  color: #ff7a45;
  font-weight: 700;
}

.restart-button {
  min-width: 120px;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
  font-weight: 800;
}

.battle-status {
  display: flex;
  justify-content: center;
}

.status-indicator {
  padding: 10px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 167, 104, 0.3);
  color: #595959;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.status-indicator.fighting {
  color: #d46b08;
}

.status-indicator.victory {
  color: #389e0d;
  background: rgba(246, 255, 237, 0.95);
  border-color: rgba(82, 196, 26, 0.35);
}

.status-indicator.defeat {
  color: #cf1322;
  background: rgba(255, 241, 240, 0.95);
  border-color: rgba(245, 34, 45, 0.35);
}

.battle-effect {
  position: absolute;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  animation: effect-float 1s ease-out forwards;
}

.battle-effect.left {
  left: 25%;
  top: 35%;
}

.battle-effect.right {
  right: 25%;
  top: 30%;
}

.effect-value {
  padding: 8px 16px;
  border-radius: 12px;
  color: #fff;
  font-size: 42px;
  font-weight: 900;
  background: linear-gradient(135deg, #ff4d4f 0%, #f5222d 100%);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(245, 34, 45, 0.4), 0 0 20px rgba(245, 34, 45, 0.3);
}

.battle-effect.critical .effect-value {
  font-size: 48px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff0000 50%, #ff6b6b 100%);
}

.battle-effect.combo .effect-value {
  background: linear-gradient(135deg, #ffa940 0%, #ff7a45 100%);
}

.battle-effect.miss .effect-value,
.battle-effect.block .effect-value {
  background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
}

.battle-effect.block .effect-value {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
}

.effect-text {
  padding: 4px 12px;
  border-radius: 8px;
  color: #ff4d4f;
  background: #fff;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.24);
}

.error-box {
  margin-top: 14px;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  color: #909399;
  font-weight: 900;
}

@keyframes pet-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pet-attack {
  0%, 100% { transform: translateX(0) scale(1); }
  45% { transform: translateX(58px) scale(1.08); }
}

@keyframes boss-attack {
  0%, 100% { transform: translateX(0) scale(1); }
  45% { transform: translateX(-58px) scale(1.08); }
}

@keyframes avatar-hurt {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}

@keyframes active-glow {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(24, 144, 255, 0.6)); }
  50% { filter: drop-shadow(0 0 30px rgba(24, 144, 255, 0.8)); }
}

@keyframes arena-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.15; }
}

@keyframes connection-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

@keyframes collision-pulse {
  from { opacity: 0.85; transform: scale(0.8); }
  to { opacity: 0; transform: scale(1.45); }
}

@keyframes effect-float {
  0% { opacity: 0; transform: translateY(18px) scale(0.8); }
  25% { opacity: 1; transform: translateY(0) scale(1.05); }
  100% { opacity: 0; transform: translateY(-36px) scale(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 860px) {
  .fight-container {
    padding: 12px;
  }

  .health-bars-container {
    grid-template-columns: 1fr;
  }

  .vs-indicator-small {
    margin: 0 auto;
  }

  .battle-arena {
    min-height: 360px;
    padding: 18px 10px 64px;
  }

  .pet-area {
    transform: translate(-14px, 0);
  }

  .boss-area {
    transform: scale(0.82) translate(14px, -12px);
  }

  .combat-health-card {
    width: min(210px, 42vw);
    min-width: 140px;
    padding: 7px 8px;
  }

  :deep(.fight-avatar--large) {
    width: 104px;
    height: 104px;
  }

  .combatant {
    padding: 10px;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }

  .battle-effect.left {
    left: 16%;
  }

  .battle-effect.right {
    right: 16%;
  }

  .effect-value {
    font-size: 32px;
  }
}
</style>
