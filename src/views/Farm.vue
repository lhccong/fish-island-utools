<template>
  <div class="farm-page farm-page--embedded">
    <div class="farm-header-bar">
      <div class="farm-header-left">
        <el-icon class="farm-header-icon"><Place /></el-icon>
        <div>
          <h4 class="farm-header-title">摸鱼农场</h4>
          <p class="farm-header-sub">种下希望，收获积分</p>
        </div>
      </div>
      <div class="farm-header-right">
        <div class="farm-header-stats">
          <div class="farm-stat-chip">
            <el-icon><Star /></el-icon>
            <span>Lv.{{ farmUser?.level ?? 1 }}</span>
          </div>
          <div class="farm-stat-chip">
            <span>田地 {{ unlockedCount }}/{{ TOTAL_LANDS }}</span>
          </div>
          <div class="farm-stat-chip points">
            <el-icon><Present /></el-icon>
            <span>可用积分 {{ availablePoints }}</span>
          </div>
          <div class="farm-stat-chip">
            <span>收获 {{ farmUser?.totalHarvest ?? 0 }} 次</span>
          </div>
        </div>
        <div class="farm-header-actions">
          <el-button
            v-if="!viewingFriend && emptyLands.length > 0"
            type="primary"
            class="plant-all-btn"
            :loading="actionLoading"
            @click="handlePlantAll"
          >
            <el-icon><Plus /></el-icon>
            一键播种 ({{ emptyLands.length }})
          </el-button>
          <button
            type="button"
            class="farm-header-refresh-btn"
            aria-label="刷新"
            :disabled="loading"
            @click="loadFarmData"
          >
            <el-icon :class="{ 'is-loading': loading }"><Refresh /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <div v-if="viewingFriend" class="farm-friend-visit-bar">
      <span>正在拜访 {{ viewingFriend.friendName || "好友" }} 的农场</span>
      <el-button size="small" type="warning" plain @click="exitFriendFarm">返回我的农场</el-button>
    </div>

    <div v-loading="loading" class="farm-content farm-spin-wrap">
      <div class="farm-scene">
        <div class="farm-scene-main">
        <div class="farm-world">
          <aside class="farm-world-side farm-world-side--left">
            <div class="farm-deco farm-deco-sign">劳动光荣</div>
            <el-tooltip content="谁偷了我的菜">
              <button
                type="button"
                class="farm-deco farm-deco-mail"
                :aria-label="`谁偷了我的菜，${stolenRecords.length} 条记录`"
                @click="openStolenModal"
              >
                <el-badge :value="stolenRecords.length" :hidden="stolenRecords.length === 0" :max="99">
                  <span class="farm-deco-mail-icon">
                    <el-icon><Message /></el-icon>
                  </span>
                </el-badge>
              </button>
            </el-tooltip>
            <el-tooltip content="好友">
              <button
                type="button"
                class="farm-deco farm-deco-friends"
                aria-label="好友"
                @click="openFriendsModal('play')"
              >
                <span class="farm-deco-friends-icon">
                  <el-icon><User /></el-icon>
                </span>
              </button>
            </el-tooltip>
          </aside>

          <div class="farm-land-field">
            <div class="farm-field-stack">
              <div class="farm-field-banners">
                <div class="farm-field-banner farm-field-banner--income">今日收益 敬请期待</div>
                <div class="farm-field-banner farm-field-banner--mature">
                  作物成熟 {{ cropMatureLabel }}
                </div>
              </div>
              <div class="farm-grid-stage">
                <div class="farm-stage-cluster">
                  <div class="farm-field-board">
                    <div class="farm-field-inner">
                      <div class="farm-plots-grid">
                        <div
                          v-for="(_, arrayIndex) in SLOT_ORDER"
                          :key="landGrid[arrayIndex]?.id ?? `slot-${toLandIndex(arrayIndex)}`"
                          class="farm-plot-slot"
                        >
                          <el-tooltip :content="getPlotTooltip(landGrid[arrayIndex], arrayIndex)">
                            <button
                              type="button"
                              :class="getPlotClassName(landGrid[arrayIndex], arrayIndex)"
                              :disabled="!isLandUnlocked(landGrid[arrayIndex]) || actionLoading"
                              @click="handlePlotClick(landGrid[arrayIndex], arrayIndex)"
                            >
                              <span class="plot-soil" aria-hidden>
                                <span class="plot-tile-surface" />
                                <span class="plot-mound" />
                              </span>
                              <div
                                v-if="!isLandUnlocked(landGrid[arrayIndex])"
                                class="plot-overlay plot-overlay-locked"
                              >
                                <el-icon class="plot-lock-icon"><Lock /></el-icon>
                                <span class="plot-lock-text">未解锁</span>
                              </div>
                              <div
                                v-else-if="isLandMature(landGrid[arrayIndex], now)"
                                class="plot-overlay"
                              >
                                <CropIcon
                                  :crop="getCrop(landGrid[arrayIndex])"
                                  crop-class="plot-crop-icon mature"
                                />
                                <span class="plot-harvest-hint">{{
                                  isFriendFarm && landGrid[arrayIndex]?.canSteal ? "偷菜" : "收获"
                                }}</span>
                                <span v-if="!isFriendFarm" class="plot-sparkle" aria-hidden />
                              </div>
                              <div
                                v-else-if="landGrid[arrayIndex]?.status === LAND_STATUS.GROWING"
                                class="plot-overlay"
                              >
                                <CropIcon
                                  :crop="getCrop(landGrid[arrayIndex])"
                                  crop-class="plot-crop-icon growing"
                                />
                                <span class="plot-timer">{{
                                  formatCountdown(getLandRemainingMs(landGrid[arrayIndex]))
                                }}</span>
                              </div>
                            </button>
                          </el-tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!viewingFriend && matureLands.length > 0" class="farm-harvest-dock">
                <el-tooltip :content="`摘取 ${matureLands.length} 块成熟作物`">
                  <button
                    type="button"
                    class="farm-quick-harvest is-ready"
                    :class="{ 'is-loading': actionLoading }"
                    :disabled="actionLoading"
                    aria-label="一键摘取"
                    @click="handleHarvestAll"
                  >
                    <span class="farm-quick-harvest-icon">
                      <img :src="FARM_HARVEST_ICON" alt="" draggable="false" />
                    </span>
                    <span class="farm-quick-harvest-label">一键摘取</span>
                  </button>
                </el-tooltip>
              </div>
            </div>
          </div>

          <aside class="farm-world-side farm-world-side--right">
            <FarmCottageDeco :show-pet="false" />
          </aside>
        </div>
        </div>

        <FarmSideDock
          :mature-count="matureLands.length"
          :mature-label="cropMatureLabel"
          @mature="handleDockMature"
          @action="handleDockAction"
        />
      </div>
    </div>

    <FarmFriendsModal
      :open="friendsModalOpen"
      :initial-tab="friendsInitialTab"
      :stolen-records="stolenRecords"
      :stolen-loading="stolenLoading"
      :my-level="farmUser?.level ?? 1"
      :my-nickname="farmUser?.userName ?? userStore.userName ?? '我'"
      :my-avatar="farmUser?.userAvatar ?? userStore.userAvatarURL"
      @close="closeFriendsModal"
      @refresh-stolen="loadStolenRecords"
      @visit-friend="handleVisitFriend"
    />

    <el-dialog
      v-model="plantModalOpen"
      :title="plantModalTitle"
      width="520px"
      class="farm-plant-modal"
      destroy-on-close
      @closed="closePlantModal"
    >
      <label v-if="emptyLands.length > 1" class="plant-batch-toggle">
        <input
          type="checkbox"
          :checked="plantAllSelected"
          @change="handlePlantBatchToggle($event.target.checked)"
        />
        <span>
          播种全部空地（{{ emptyLands.length }} 块）
          <span
            v-if="!plantAllSelected && selectedLandIds.length === 1"
            class="plant-batch-hint"
          >
            · 当前仅地块 {{ selectedLandIndex }}
          </span>
        </span>
      </label>

      <div class="crop-category-tabs">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="crop-cat-btn"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >
          {{ cat === "all" ? "全部" : CATEGORY_LABEL[cat] ?? cat }}
        </button>
      </div>

      <div class="crop-select-list">
        <el-empty v-if="filteredCrops.length === 0" description="暂无可用作物" />
        <button
          v-for="crop in filteredCrops"
          :key="crop.id"
          type="button"
          class="crop-card"
          :class="{
            selected: selectedCropId === crop.id,
            locked: crop.locked === true,
          }"
          :disabled="crop.locked === true"
          @click="!crop.locked && crop.id != null && (selectedCropId = crop.id)"
        >
          <CropIcon :crop="crop" crop-class="crop-card-icon" />
          <div class="crop-card-info">
            <span class="crop-card-name">{{ crop.name }}</span>
            <span class="crop-card-meta">
              {{ crop.growthTime ?? 0 }} 分钟 · +{{ crop.coin ?? 0 }} 积分
            </span>
            <el-tag v-if="crop.locked" size="small" type="info" class="crop-lock-tag">
              Lv.{{ crop.unlockLevel }} 解锁
            </el-tag>
          </div>
          <span v-if="selectedCropId === crop.id" class="crop-selected-mark">✓</span>
        </button>
      </div>

      <template #footer>
        <el-button @click="plantModalOpen = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="handlePlant">
          {{
            selectedLandIds.length > 1
              ? `播种 ${selectedLandIds.length} 块地`
              : "开始种植"
          }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineComponent, h } from "vue";
import { ElMessage } from "element-plus";
import {
  Place,
  Star,
  Present,
  Plus,
  User,
  Refresh,
  Message,
  Lock,
} from "@element-plus/icons-vue";
import { farmApi } from "../api/farm";
import { useUserStore } from "../stores/user";
import FarmFriendsModal from "../components/farm/FarmFriendsModal.vue";
import FarmCottageDeco from "../components/farm/FarmCottageDeco.vue";
import FarmSideDock from "../components/farm/FarmSideDock.vue";
import {
  SLOT_ORDER,
  TOTAL_LANDS,
  FARM_HARVEST_ICON,
  LAND_STATUS,
  CATEGORY_LABEL,
  formatCountdown,
  buildLandGrid,
  toLandIndex,
  mergeLandUpdates,
  isLandUnlocked,
  isLandEmpty,
  isLandMature,
  isCropIconUrl,
  resolveFriendUserId,
  parseFriendLandsPayload,
} from "../utils/farmUtils";
import "../styles/farm/index.less";
import "../styles/farm/utools-overrides.less";

const CropIcon = defineComponent({
  name: "CropIcon",
  props: {
    crop: { type: Object, default: null },
    cropClass: { type: String, default: "" },
  },
  setup(props) {
    return () => {
      const icon = props.crop?.icon?.trim();
      const cls = props.cropClass;
      const alt = props.crop?.name ?? "作物";
      if (!icon) return h("span", { class: cls }, "🌱");
      if (isCropIconUrl(icon)) {
        return h("img", { class: cls, src: icon, alt, draggable: false });
      }
      return h("span", { class: cls }, icon);
    };
  },
});

const userStore = useUserStore();

const loading = ref(true);
const actionLoading = ref(false);
const lands = ref([]);
const crops = ref([]);
const farmUser = ref(null);
const now = ref(Date.now());
const plantModalOpen = ref(false);
const friendsModalOpen = ref(false);
const friendsInitialTab = ref("play");
const stolenRecords = ref([]);
const stolenLoading = ref(false);
const selectedLandIds = ref([]);
const plantAnchorLandId = ref(null);
const selectedCropId = ref(null);
const activeCategory = ref("all");
const viewingFriend = ref(null);

let nowTimer = null;

const isFriendFarm = computed(() => viewingFriend.value != null);

const availablePoints = computed(() => {
  const u = userStore.userInfo;
  return (u?.points ?? 0) - (u?.usedPoints ?? 0);
});

const landGrid = computed(() => buildLandGrid(lands.value));
const unlockedCount = computed(() => landGrid.value.filter(isLandUnlocked).length);

const cropMap = computed(() => {
  const map = new Map();
  crops.value.forEach((c) => {
    if (c.id != null) map.set(c.id, c);
  });
  return map;
});

const matureLands = computed(() =>
  lands.value.filter((l) => isLandMature(l, now.value) && l.id != null && isLandUnlocked(l)),
);

const nearestGrowingMs = computed(() => {
  let min = Infinity;
  for (const land of lands.value) {
    if (!land?.harvestTime || !isLandUnlocked(land)) continue;
    if (isLandMature(land, now.value)) return 0;
    if (land.status === LAND_STATUS.GROWING) {
      const remain = new Date(land.harvestTime).getTime() - now.value;
      if (remain > 0) min = Math.min(min, remain);
    }
  }
  return min === Infinity ? null : min;
});

const cropMatureLabel = computed(() => {
  if (matureLands.value.length > 0) return "可收获";
  if (nearestGrowingMs.value != null) return formatCountdown(nearestGrowingMs.value);
  return "—";
});

const emptyLands = computed(() =>
  lands.value.filter((l) => l.id != null && isLandEmpty(l)),
);

const plantAllSelected = computed(
  () =>
    emptyLands.value.length > 0 &&
    selectedLandIds.value.length === emptyLands.value.length &&
    emptyLands.value.every((l) => selectedLandIds.value.includes(l.id)),
);

const categories = computed(() => {
  const set = new Set();
  crops.value.forEach((c) => {
    if (c.category) set.add(c.category);
  });
  return ["all", ...Array.from(set)];
});

const filteredCrops = computed(() => {
  if (activeCategory.value === "all") return crops.value;
  return crops.value.filter((c) => c.category === activeCategory.value);
});

const plantModalTitle = computed(() => {
  const count = selectedLandIds.value.length;
  if (count === 0) return "选择种子";
  if (count === 1) {
    const land = lands.value.find((l) => l.id === selectedLandIds.value[0]);
    return `选择种子 · 地块 ${land?.landIndex ?? 1}`;
  }
  return `选择种子 · ${count} 块空地`;
});

const selectedLandIndex = computed(() => {
  const land = lands.value.find((l) => l.id === selectedLandIds.value[0]);
  return land?.landIndex ?? 1;
});

function getCrop(land) {
  if (!land?.plantedCropId) return undefined;
  return cropMap.value.get(land.plantedCropId);
}

function getLandRemainingMs(land) {
  if (!land?.harvestTime) return 0;
  return new Date(land.harvestTime).getTime() - now.value;
}

function getPlotTooltip(land, arrayIndex) {
  const landIndex = toLandIndex(arrayIndex);
  if (isFriendFarm.value) {
    if (!isLandUnlocked(land)) return "未解锁地块";
    if (isLandMature(land, now.value)) {
      return land.canSteal ? `点击偷取 ${land.cropName || ""}` : "暂不可偷";
    }
    if (land.status === LAND_STATUS.GROWING) {
      return `${land.cropName || "作物"} · ${formatCountdown(getLandRemainingMs(land))}`;
    }
    return "空地";
  }
  if (!isLandUnlocked(land)) {
    if (landIndex === 1) return "第 1 块地尚未解锁";
    const prevUnlocked = isLandUnlocked(landGrid.value[arrayIndex - 1]);
    if (!prevUnlocked) return `请先解锁第 ${landIndex - 1} 块地`;
    return `第 ${landIndex} 块地尚未解锁`;
  }
  if (isLandMature(land, now.value)) {
    return `点击收获 ${land.cropName || ""}`;
  }
  if (land.status === LAND_STATUS.GROWING) {
    return `${land.cropName || "作物"} · ${formatCountdown(getLandRemainingMs(land))}`;
  }
  if (emptyLands.value.length > 1) return "点击种植，或使用一键播种";
  return "点击种植";
}

function getPlotClassName(land, arrayIndex) {
  const classes = ["farm-plot"];
  const unlocked = isLandUnlocked(land);
  if (!unlocked) {
    classes.push("is-locked");
    if (arrayIndex === unlockedCount.value) classes.push("is-next-unlock");
    return classes.join(" ");
  }
  if (isLandMature(land, now.value)) classes.push("is-mature");
  else if (land.status === LAND_STATUS.GROWING) classes.push("is-growing");
  else classes.push("is-empty");
  return classes.join(" ");
}

async function refreshCurrentUser() {
  try {
    await userStore.fetchUserInfo(true);
  } catch {
    /* ignore */
  }
}

async function loadStolenRecords() {
  stolenLoading.value = true;
  try {
    const res = await farmApi.getMyStolenRecords();
    if (res?.code === 0 && res.data) stolenRecords.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    stolenLoading.value = false;
  }
}

async function refreshLandsAndFarmUser() {
  try {
    const [landsRes, farmRes] = await Promise.all([
      farmApi.getMyLands(),
      farmApi.getMyFarmUser(),
    ]);
    if (landsRes?.code === 0 && landsRes.data) {
      lands.value = landsRes.data;
    } else {
      return false;
    }
    if (farmRes?.code === 0 && farmRes.data) farmUser.value = farmRes.data;
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function loadFarmData() {
  loading.value = true;
  try {
    const [landsRes, cropsRes, farmRes] = await Promise.all([
      farmApi.getMyLands(),
      farmApi.getAllCrops(),
      farmApi.getMyFarmUser(),
    ]);
    if (landsRes?.code === 0 && landsRes.data) {
      lands.value = landsRes.data;
    } else {
      ElMessage.error(landsRes?.message || "加载地块失败");
    }
    if (cropsRes?.code === 0 && cropsRes.data) crops.value = cropsRes.data;
    if (farmRes?.code === 0 && farmRes.data) farmUser.value = farmRes.data;
    await loadStolenRecords();
  } catch (e) {
    ElMessage.error("加载农场数据失败");
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openFriendsModal(tab = "play") {
  friendsInitialTab.value = tab;
  friendsModalOpen.value = true;
}

function closeFriendsModal() {
  friendsModalOpen.value = false;
  friendsInitialTab.value = "play";
}

async function handleVisitFriend(friend) {
  const friendUserId = resolveFriendUserId(friend);
  if (friendUserId == null) {
    ElMessage.error("好友信息无效");
    return;
  }
  closeFriendsModal();
  actionLoading.value = true;
  try {
    const res = await farmApi.getFriendLands(friendUserId);
    if (res?.code === 0 && res.data != null) {
      viewingFriend.value = {
        friendUserId,
        friendName: friend.nickname ?? "好友",
        friendAvatar: friend.avatar,
      };
      lands.value = parseFriendLandsPayload(res.data);
      return;
    }
    ElMessage.error(res?.msg || res?.message || "拜访失败");
  } catch (e) {
    ElMessage.error("拜访失败");
    console.error(e);
  } finally {
    actionLoading.value = false;
  }
}

async function exitFriendFarm() {
  viewingFriend.value = null;
  actionLoading.value = true;
  try {
    await refreshLandsAndFarmUser();
  } finally {
    actionLoading.value = false;
  }
}

async function handleSteal(land) {
  if (!land?.plantRecordId) {
    ElMessage.warning("无法偷取这块地");
    return;
  }
  actionLoading.value = true;
  try {
    const res = await farmApi.steal(land.plantRecordId);
    if (res?.code === 0) {
      ElMessage.success("偷菜成功");
      const friendUserId = resolveFriendUserId(viewingFriend.value ?? {});
      if (friendUserId != null) {
        const landsRes = await farmApi.getFriendLands(friendUserId);
        if (landsRes?.code === 0 && landsRes.data != null) {
          lands.value = parseFriendLandsPayload(landsRes.data);
        }
      }
      await refreshCurrentUser();
      return;
    }
    ElMessage.error(res?.msg || res?.message || "偷菜失败");
  } catch (e) {
    ElMessage.error("偷菜失败");
    console.error(e);
  } finally {
    actionLoading.value = false;
  }
}

function openStolenModal() {
  loadStolenRecords();
  openFriendsModal("visitor");
}

function handleDockMature() {
  if (matureLands.value.length > 0) {
    handleHarvestAll();
    return;
  }
  if (nearestGrowingMs.value != null) {
    ElMessage.info(`最近成熟：${formatCountdown(nearestGrowingMs.value)}`);
  }
}

function handleDockAction(key) {
  if (key === "friends") {
    openFriendsModal("play");
    return;
  }
  const tips = {
    shop: "商店功能开发中，敬请期待",
    task: "任务功能开发中，敬请期待",
    bag: "背包功能开发中，敬请期待",
    reward: "领取奖励功能开发中，敬请期待",
    cottage: "农舍功能开发中，敬请期待",
  };
  ElMessage.info(tips[key] || "功能开发中，敬请期待");
}

function closePlantModal() {
  plantModalOpen.value = false;
  selectedLandIds.value = [];
  plantAnchorLandId.value = null;
  selectedCropId.value = null;
}

function openPlantModal(landIds, anchorLandId) {
  selectedLandIds.value = landIds;
  plantAnchorLandId.value =
    anchorLandId ?? (landIds.length === 1 ? landIds[0] : null);
  selectedCropId.value = null;
  plantModalOpen.value = true;
}

function handlePlotClick(land, arrayIndex) {
  if (isFriendFarm.value) {
    if (!isLandUnlocked(land)) return;
    if (isLandMature(land, now.value)) {
      if (land.canSteal) {
        handleSteal(land);
      } else {
        ElMessage.info("这块菜暂时不能偷");
      }
      return;
    }
    if (land.status === LAND_STATUS.GROWING) {
      ElMessage.info(
        `${land.cropName || "作物"}生长中，剩余 ${formatCountdown(getLandRemainingMs(land))}`,
      );
    }
    return;
  }

  const landIndex = toLandIndex(arrayIndex);
  if (!isLandUnlocked(land)) {
    if (landIndex > 1 && !isLandUnlocked(landGrid.value[arrayIndex - 1])) {
      ElMessage.info("土地按顺序解锁，请先解锁前一块地");
    } else {
      ElMessage.info(`第 ${landIndex} 块地尚未解锁，升级农场后可开垦`);
    }
    return;
  }
  if (isLandMature(land, now.value)) {
    handleHarvest([land.id]);
    return;
  }
  if (land.status === LAND_STATUS.GROWING) {
    const crop = land.plantedCropId ? cropMap.value.get(land.plantedCropId) : undefined;
    ElMessage.info(
      `${land.cropName || crop?.name || "作物"}生长中，剩余 ${formatCountdown(getLandRemainingMs(land))}`,
    );
    return;
  }
  openPlantModal([land.id], land.id);
}

function handlePlantAll() {
  const ids = emptyLands.value.map((l) => l.id).filter(Boolean);
  if (ids.length === 0) return;
  openPlantModal(ids);
}

function handlePlantBatchToggle(plantAll) {
  if (plantAll) {
    selectedLandIds.value = emptyLands.value.map((l) => l.id).filter(Boolean);
    return;
  }
  const fallbackId =
    plantAnchorLandId.value ?? emptyLands.value[0]?.id ?? selectedLandIds.value[0];
  if (fallbackId != null) selectedLandIds.value = [fallbackId];
}

async function handleHarvest(landIds) {
  if (landIds.length === 0) return;
  actionLoading.value = true;
  try {
    const res = await farmApi.harvest(landIds);
    if (res?.code === 0) {
      ElMessage.success(
        landIds.length > 1
          ? `成功收获 ${landIds.length} 块地！`
          : "收获成功，积分已入账～",
      );
      const refreshed = await refreshLandsAndFarmUser();
      if (!refreshed && res.data?.length) {
        lands.value = mergeLandUpdates(lands.value, res.data);
      }
      await refreshCurrentUser();
    } else {
      ElMessage.error(res?.message || "收获失败");
    }
  } catch (e) {
    ElMessage.error("收获失败");
    console.error(e);
  } finally {
    actionLoading.value = false;
  }
}

function handleHarvestAll() {
  const ids = matureLands.value.map((l) => l.id).filter(Boolean);
  handleHarvest(ids);
}

async function handlePlant() {
  if (selectedLandIds.value.length === 0 || selectedCropId.value == null) {
    ElMessage.warning("请选择要种植的作物");
    return;
  }
  actionLoading.value = true;
  try {
    const res = await farmApi.plant(
      selectedLandIds.value.map((landId) => ({
        landId,
        cropId: selectedCropId.value,
      })),
    );
    if (res?.code === 0) {
      ElMessage.success(
        selectedLandIds.value.length > 1
          ? `已在 ${selectedLandIds.value.length} 块地播种，耐心等待成熟吧～`
          : "播种成功，耐心等待成熟吧～",
      );
      closePlantModal();
      const refreshed = await refreshLandsAndFarmUser();
      if (!refreshed && res.data?.length) {
        lands.value = mergeLandUpdates(lands.value, res.data);
      } else if (!refreshed) {
        await loadFarmData();
      }
    } else {
      ElMessage.error(res?.message || "种植失败");
    }
  } catch (e) {
    ElMessage.error("种植失败");
    console.error(e);
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  document.documentElement.classList.add("farm-route-lock");
  loadFarmData();
  nowTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  document.documentElement.classList.remove("farm-route-lock");
  if (nowTimer) window.clearInterval(nowTimer);
});
</script>
