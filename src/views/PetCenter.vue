<template>
  <div class="pet-center">
    <div class="pet-shell">
      <!-- <div class="pet-header">
        <h2>宠物乐园</h2>
        <p>我的宠物、排行榜、摸鱼BOSS、图鉴、抽奖一站式体验</p>
      </div> -->
      <div class="game-tabs-nav">
        <div v-for="tab in tabs" :key="tab.key" class="game-tab" :class="{ 'game-tab-active': activeTab === tab.key }" @click="activeTab = tab.key">
          <span class="game-tab-icon">{{ tab.icon }}</span>
          <span class="game-tab-text">{{ tab.label }}</span>
          <span class="game-tab-decor"></span>
        </div>
      </div>
      <div class="game-tab-content">
        <div v-if="activeTab === 'pet'" class="my-pet-card tab-pane-scroll" v-loading="petLoading">
          <div v-if="petInfo" class="my-pet-content">
            <img v-if="petInfo.petUrl" :src="petInfo.petUrl" alt="宠物形象" class="pet-avatar" />
            <div class="pet-meta">
              <div class="pet-name">{{ petInfo.name || "未命名宠物" }}</div>
              <div class="pet-stats">
                <span class="stat-pill">Lv. {{ petInfo.level ?? "--" }}</span>
                <span class="stat-pill">经验 {{ petInfo.exp ?? "--" }}</span>
                <span class="stat-pill">心情 {{ petInfo.mood ?? "--" }}%</span>
                <span class="stat-pill">饱腹 {{ petInfo.hunger ?? "--" }}%</span>
              </div>
              <div class="pet-actions">
                <el-button type="primary" :loading="petActionLoading.feed" @click="handleFeedPet">喂食</el-button>
                <el-button type="warning" :loading="petActionLoading.pat" @click="handlePatPet">抚摸</el-button>
              </div>
            </div>
          </div>
          <div v-if="petInfo" class="pet-main-layout">
            <div class="pet-left-panel">
              <div class="equip-slot-grid">
                <div class="equip-column">
                  <div
                    v-for="slot in leftSlots"
                    :key="slot.key"
                    class="equip-slot-card"
                    :class="{
                      equipped: !!getEquippedItem(slot.key),
                      loading: unequipLoadingSlot === slot.key,
                    }"
                    :title="getEquippedItem(slot.key)?.template?.name || slot.label"
                    @click="onSlotClick(slot.key)"
                  >
                    <img
                      v-if="getEquippedItem(slot.key)?.template?.icon"
                      :src="getEquippedItem(slot.key).template.icon"
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
                    :class="{
                      equipped: !!getEquippedItem(slot.key),
                      loading: unequipLoadingSlot === slot.key,
                    }"
                    :title="getEquippedItem(slot.key)?.template?.name || slot.label"
                    @click="onSlotClick(slot.key)"
                  >
                    <img
                      v-if="getEquippedItem(slot.key)?.template?.icon"
                      :src="getEquippedItem(slot.key).template.icon"
                      alt="equip"
                      class="slot-item-icon"
                    />
                    <span v-else>{{ slot.icon }}</span>
                    <span class="slot-label">{{ slot.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pet-right-panel">
              <el-tabs v-model="petInnerTab" class="pet-inner-tabs">
                <el-tab-pane label="物品" name="items">
                  <div class="equipped-list">
                    <div class="block-title">已装备</div>
                    <div v-if="equippedEntries().length === 0" class="empty-text">暂无装备</div>
                    <div
                      v-for="[slot, item] in equippedEntries()"
                      :key="slot"
                      class="equipped-card"
                      :class="rarityBorderClass(item?.template?.rarity)"
                    >
                      <img v-if="item?.template?.icon" :src="item.template.icon" alt="equip" />
                      <div class="equipped-meta">
                        <div class="equip-name">{{ item?.template?.name || "未知装备" }}</div>
                        <div class="equip-slot">{{ slotLabel(slot) }}</div>
                      </div>
                      <el-button size="small" :loading="unequipLoadingSlot === slot" @click="handleUnequipItem(slot)">卸下</el-button>
                    </div>
                  </div>
                  <div class="block-title">背包</div>
                  <div class="bag-grid" v-loading="bagLoading">
                    <div v-if="bagItems.length === 0" class="empty-text">背包暂无物品</div>
                    <div
                      v-for="item in bagItems"
                      :key="item.id"
                      class="bag-item-card"
                      :class="rarityBorderClass(item?.template?.rarity)"
                    >
                      <img v-if="item?.template?.icon" :src="item.template.icon" alt="item" />
                      <div class="bag-item-name">{{ item?.template?.name || "未知物品" }}</div>
                      <div class="bag-item-count">x{{ item?.quantity || 0 }}</div>
                      <div class="bag-item-actions">
                        <el-button
                          v-if="item?.template?.equipSlot"
                          size="small"
                          type="primary"
                          :disabled="isEquipped(item.id)"
                          :loading="equipLoadingId === item.id"
                          @click="handleEquipItem(item)"
                        >
                          {{ isEquipped(item.id) ? "已穿戴" : "穿戴" }}
                        </el-button>
                        <el-button size="small" :loading="decomposeLoadingId === item.id" @click="handleDecomposeItem(item)">分解</el-button>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="技能" name="skills">
                  <div class="empty-module">技能系统即将开放，敬请期待</div>
                </el-tab-pane>
                <el-tab-pane label="商店" name="shop">
                  <div class="pet-shop-container">
                    <div class="pet-shop-type-selector">
                      <el-radio-group v-model="shopSubType" size="default">
                        <el-radio-button label="skin">宠物商店</el-radio-button>
                        <el-radio-button label="props">道具商店</el-radio-button>
                      </el-radio-group>
                    </div>
                    <div v-if="shopSubType === 'skin'" class="skin-shop-panel" v-loading="skinLoading">
                      <div v-if="!skinLoading && skins.length === 0" class="shop-empty-state">
                        <div class="shop-empty-icon">🛒</div>
                        <div class="shop-empty-text">暂无可购买的宠物</div>
                      </div>
                      <div v-else class="skin-shop-grid">
                        <div
                          v-for="skin in skins"
                          :key="skin.skinId ?? skin.id"
                          class="skin-shop-card"
                          :class="{ 'skin-shop-card--owned': skin.owned }"
                        >
                          <div class="skin-shop-cover">
                            <img v-if="skin.url" :src="skin.url" :alt="skin.name || 'pet'" />
                            <span v-if="isSkinCurrent(skin)" class="skin-current-badge">当前使用</span>
                          </div>
                          <div class="skin-shop-body">
                            <div class="skin-shop-title">{{ skin.name || "未知宠物" }}</div>
                            <div class="skin-shop-desc">{{ skin.description || "暂无描述" }}</div>
                            <div class="skin-shop-price">{{ skin.points ?? 0 }} 积分</div>
                            <div class="skin-shop-actions">
                              <template v-if="skin.owned">
                                <el-button
                                  size="small"
                                  type="primary"
                                  :disabled="isSkinCurrent(skin)"
                                  :loading="setSkinLoadingId === skin.skinId"
                                  @click="handleSetSkin(skin)"
                                >
                                  {{ isSkinCurrent(skin) ? "当前使用中" : "使用" }}
                                </el-button>
                              </template>
                              <el-button
                                v-else
                                size="small"
                                type="primary"
                                :loading="exchangeLoadingId === skin.skinId"
                                @click="handleExchangeSkin(skin)"
                              >
                                购买
                              </el-button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="shop-props-placeholder">
                      <div class="shop-props-icon">🛒</div>
                      <div class="shop-props-text">更多道具即将上架，敬请期待！</div>
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="宠物馆" name="skin">
                  <div class="skin-shop-panel" v-loading="skinLoading">
                    <div v-if="!skinLoading && ownedSkins.length === 0" class="shop-empty-state">
                      <div class="shop-empty-icon">👕</div>
                      <div class="shop-empty-text">暂无已拥有的宠物</div>
                    </div>
                    <div v-else class="skin-shop-grid skin-shop-grid--compact">
                      <div
                        v-for="skin in ownedSkins"
                        :key="`owned-${skin.skinId ?? skin.id}`"
                        class="skin-shop-card skin-shop-card--owned"
                      >
                        <div class="skin-shop-cover">
                          <img v-if="skin.url" :src="skin.url" :alt="skin.name || 'pet'" />
                          <span v-if="isSkinCurrent(skin)" class="skin-current-badge">当前使用</span>
                        </div>
                        <div class="skin-shop-body">
                          <div class="skin-shop-title">{{ skin.name || "未知宠物" }}</div>
                          <div class="skin-shop-desc">{{ skin.description || "暂无描述" }}</div>
                          <div class="skin-shop-actions">
                            <el-button
                              size="small"
                              type="warning"
                              :disabled="isSkinCurrent(skin)"
                              :loading="setSkinLoadingId === skin.skinId"
                              @click="handleSetSkin(skin)"
                            >
                              {{ isSkinCurrent(skin) ? "当前使用中" : "使用" }}
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="成就" name="achievements">
                  <div class="empty-module">成就系统即将开放，敬请期待</div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
          <el-empty v-else description="暂未拥有宠物" />
        </div>
        <div v-else-if="activeTab === 'ranking'" class="ranking-container tab-pane-scroll">
          <div class="ranking-tip">点击可查看 TA 的宠物详情</div>
          <el-table :data="rankData" v-loading="rankLoading" stripe>
            <el-table-column prop="rank" label="排名" width="80" />
            <el-table-column label="宠物">
              <template #default="{ row }">
                <div class="rank-pet-cell">
                  <img :src="row.petUrl" alt="pet" />
                  <span>{{ row.name || "未知宠物" }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="userName" label="主人" />
            <el-table-column prop="level" label="等级" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button text type="primary" @click="openOtherPet(row)">查看宠物</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-else-if="activeTab === 'boss'" class="slot-page tab-pane-scroll">
          <BossBattle />
        </div>
        <div v-else-if="activeTab === 'gallery'" class="gallery-container tab-pane-scroll">
          <div class="gallery-header">
            <div class="gallery-title">
              <span class="gallery-title-icon">📚</span>
              <span>装备道具图鉴</span>
            </div>
            <div class="gallery-subtitle">收录各种装备道具的详细信息</div>
          </div>

          <div class="gallery-filters">
            <div class="filter-group">
              <span class="filter-label">物品类型:</span>
              <div class="filter-buttons">
                <button class="filter-btn" :class="{ active: !galleryQuery.category }" @click="setGalleryCategory(undefined)">全部</button>
                <button class="filter-btn" :class="{ active: galleryQuery.category === 'equipment' }" @click="setGalleryCategory('equipment')">装备类</button>
                <button class="filter-btn" :class="{ active: galleryQuery.category === 'consumable' }" @click="setGalleryCategory('consumable')">消耗品</button>
                <button class="filter-btn" :class="{ active: galleryQuery.category === 'material' }" @click="setGalleryCategory('material')">材料</button>
              </div>
            </div>

            <div class="filter-group">
              <span class="filter-label">稀有度:</span>
              <div class="filter-buttons">
                <button class="filter-btn" :class="{ active: galleryQuery.rarity == null }" @click="setGalleryRarity(undefined)">全部</button>
                <button
                  v-for="r in rarityOptions"
                  :key="r.value"
                  class="filter-btn"
                  :class="{ active: Number(galleryQuery.rarity) === r.value }"
                  :style="{ color: rarityColors[r.value] }"
                  @click="setGalleryRarity(r.value)"
                >
                  {{ r.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="gallery-grid gallery-grid--rich" v-loading="galleryLoading">
            <div v-for="item in galleryData" :key="item.id" class="gallery-item-card gallery-item-card--rich">
              <div class="gallery-item-header">
                <div class="gallery-item-icon-wrap">
                  <img v-if="item.icon" :src="item.icon" alt="icon" class="gallery-item-icon" />
                  <div v-else class="gallery-item-icon placeholder">
                    {{ item.category === 'equipment' ? '⚔️' : item.category === 'consumable' ? '🧪' : '💎' }}
                  </div>
                </div>
                <span class="gallery-rarity-badge" :style="{ backgroundColor: rarityColors[item.rarity || 1] }">
                  {{ rarityText(item.rarity) }}
                </span>
              </div>

              <div class="gallery-item-body">
                <div class="gallery-item-name">{{ item.name || "未知物品" }}</div>
                <div class="gallery-item-meta">类型：{{ categoryText(item.category) }}</div>

                <div v-if="isValidNumber(item.levelReq)" class="gallery-item-meta">等级需求：Lv.{{ item.levelReq }}</div>

                <div v-if="hasAnyStats(item)" class="gallery-item-stats">
                  <div v-if="isValidNumber(item.baseAttack)" class="gallery-item-stat"><span class="stat-icon">⚔️</span>攻击：{{ item.baseAttack }}</div>
                  <div v-if="isValidNumber(item.baseDefense)" class="gallery-item-stat"><span class="stat-icon">🛡️</span>防御：{{ item.baseDefense }}</div>
                  <div v-if="isValidNumber(item.baseHp)" class="gallery-item-stat"><span class="stat-icon">❤️</span>生命：{{ item.baseHp }}</div>
                </div>

                <div v-if="item.description" class="gallery-item-desc">{{ item.description }}</div>

                <div class="gallery-item-footer">
                  <span v-if="item.stackable === 1" class="item-tag">可叠加</span>
                  <span v-if="isValidNumber(item.removePoint)" class="item-points">分解：{{ item.removePoint }}积分</span>
                </div>
              </div>
            </div>
          </div>

          <el-empty v-if="!galleryLoading && galleryData.length === 0" description="暂无图鉴数据" />

          <div class="gallery-pagination">
            <el-pagination
              v-model:current-page="galleryQuery.current"
              v-model:page-size="galleryQuery.pageSize"
              :page-sizes="[10, 20, 40, 80]"
              :total="galleryTotal"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="fetchGalleryData"
              @size-change="handleGallerySizeChange"
            />
          </div>
        </div>
        <div v-else class="slot-page tab-pane-scroll">
          <Lottery />
        </div>
      </div>
    </div>
    <el-dialog v-model="otherPetVisible" title="TA 的宠物" width="500px">
      <div v-loading="otherPetLoading" class="other-pet-content">
        <template v-if="otherPetInfo">
          <img v-if="otherPetInfo.petUrl" :src="otherPetInfo.petUrl" alt="other pet" class="other-pet-avatar" />
          <div>{{ otherPetInfo.name || "未命名宠物" }}</div>
          <div>等级：{{ otherPetInfo.level ?? "--" }}</div>
          <div>心情：{{ otherPetInfo.mood ?? "--" }}</div>
          <div>饱腹：{{ otherPetInfo.hunger ?? "--" }}</div>
        </template>
        <el-empty v-else description="暂未查询到宠物信息" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { petApi } from "../api/pet";
import { userApi } from "../api/user";
import { itemInstancesApi } from "../api/itemInstances";
import { petSkinApi } from "../api/petSkin";
import BossBattle from "./BossBattle.vue";
import Lottery from "./Lottery.vue";

const activeTab = ref("pet");
const tabs = [
  { key: "pet", label: "我的宠物", icon: "🏠" },
  { key: "ranking", label: "排行榜", icon: "🏆" },
  { key: "boss", label: "摸鱼BOSS", icon: "⚡" },
  { key: "gallery", label: "图鉴", icon: "📚" },
  { key: "lottery", label: "抽奖", icon: "🎁" },
];

const petInfo = ref(null);
const petLoading = ref(false);
const petActionLoading = reactive({
  feed: false,
  pat: false,
});

const rankData = ref([]);
const rankLoading = ref(false);
const bagItems = ref([]);
const bagLoading = ref(false);
const equipLoadingId = ref(null);
const unequipLoadingSlot = ref("");
const decomposeLoadingId = ref(null);
const petInnerTab = ref("items");
const skinLoading = ref(false);
const skins = ref([]);
const exchangeLoadingId = ref(null);
const setSkinLoadingId = ref(null);
/** 与前端 MoyuPet 一致：商店内「宠物商店 | 道具商店」 */
const shopSubType = ref("skin");

const ownedSkins = computed(() => (skins.value || []).filter((s) => s.owned));

/**
 * 当前使用判定：优先 pet.skinId（若后端返回）；否则按 URL。
 * 若「原皮」与某款皮肤同图（同 petUrl），只应标一个「当前使用」——优先非 -1 的模板行。
 */
const isSkinCurrent = (skin) => {
  const pet = petInfo.value;
  if (!skin) return false;

  const curId = pet?.skinId ?? pet?.currentSkinId;
  if (curId != null && skin.skinId != null) {
    return Number(skin.skinId) === Number(curId);
  }

  const petUrl = pet?.petUrl;
  const list = skins.value || [];

  const urlMatches = (s) => {
    if (s.skinId === -1) return !petUrl || petUrl === s.url;
    return !!petUrl && petUrl === s.url;
  };

  if (!urlMatches(skin)) return false;

  const hasNonDefaultSameUrl = list.some(
    (s) => s.skinId != null && s.skinId !== -1 && petUrl && s.url === petUrl
  );

  if (skin.skinId === -1) {
    return !hasNonDefaultSameUrl && (!petUrl || petUrl === skin.url);
  }
  return !!petUrl && petUrl === skin.url;
};
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

const galleryLoading = ref(false);
const galleryData = ref([]);
const galleryTotal = ref(0);
const galleryQuery = reactive({
  current: 1,
  pageSize: 20,
  category: undefined,
  rarity: undefined,
});

const otherPetVisible = ref(false);
const otherPetLoading = ref(false);
const otherPetInfo = ref(null);

const rarityOptions = [
  { label: "普通", value: 1 },
  { label: "优良", value: 2 },
  { label: "精良", value: 3 },
  { label: "史诗", value: 4 },
  { label: "传说", value: 5 },
  { label: "神话", value: 6 },
  { label: "至尊", value: 7 },
  { label: "神器", value: 8 },
];

const rarityColors = {
  1: "#8c8c8c",
  2: "#52c41a",
  3: "#1890ff",
  4: "#722ed1",
  5: "#fa8c16",
  6: "#f5222d",
  7: "#eb2f96",
  8: "#fadb14",
};

const rarityText = (rarity) => {
  return rarityOptions.find((item) => item.value === rarity)?.label || "未知";
};

const categoryNames = {
  equipment: "装备类",
  consumable: "消耗品",
  material: "材料",
};

const categoryText = (category) => {
  if (!category) return "-";
  return categoryNames[category] || category;
};

const isValidNumber = (value) => {
  const n = Number(value);
  return value != null && value !== "" && !Number.isNaN(n) && n > 0;
};

const hasAnyStats = (item) => {
  return isValidNumber(item?.baseAttack) || isValidNumber(item?.baseDefense) || isValidNumber(item?.baseHp);
};

const slotLabels = {
  weapon: "武器",
  hand: "手套",
  foot: "鞋子",
  head: "头盔",
  necklace: "项链",
  accessory2: "饰品",
};

const slotLabel = (slot) => slotLabels[slot] || slot;

const rarityBorderClass = (rarity) => {
  const r = Number(rarity) || 1;
  if (r <= 1) return "rarity-r1";
  if (r === 2) return "rarity-r2";
  if (r === 3) return "rarity-r3";
  if (r === 4) return "rarity-r4";
  if (r === 5) return "rarity-r5";
  if (r === 6) return "rarity-r6";
  if (r === 7) return "rarity-r7";
  return "rarity-r8";
};

const loadPetDetail = async () => {
  petLoading.value = true;
  try {
    const res = await userApi.getPetDetail();
    petInfo.value = res?.code === 0 ? res.data || null : null;
  } catch (error) {
    console.error("获取宠物信息失败:", error);
    petInfo.value = null;
  } finally {
    petLoading.value = false;
  }
};

const loadBagItems = async () => {
  bagLoading.value = true;
  try {
    const res = await itemInstancesApi.listMyItemInstances({
      current: 1,
      pageSize: 30,
    });
    bagItems.value = res?.code === 0 ? res?.data?.records || [] : [];
  } catch (error) {
    console.error("获取背包失败:", error);
    bagItems.value = [];
  } finally {
    bagLoading.value = false;
  }
};

const equippedEntries = () => {
  const equipped = petInfo.value?.equippedItems || {};
  return Object.entries(equipped).filter(([, item]) => !!item);
};

const getEquippedItem = (slot) => {
  const equipped = petInfo.value?.equippedItems || {};
  return equipped?.[slot] || null;
};

const onSlotClick = (slot) => {
  if (!getEquippedItem(slot)) return;
  handleUnequipItem(slot);
};

const isEquipped = (itemId) => {
  return equippedEntries().some(([, item]) => item?.id === itemId);
};

const handleEquipItem = async (item) => {
  if (!item?.id || equipLoadingId.value) return;
  equipLoadingId.value = item.id;
  try {
    const res = await itemInstancesApi.equipItem(item.id);
    if (res?.code === 0) {
      ElMessage.success("穿戴成功");
      await Promise.all([loadPetDetail(), loadBagItems()]);
    } else {
      ElMessage.error(res?.message || "穿戴失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "穿戴失败");
  } finally {
    equipLoadingId.value = null;
  }
};

const handleUnequipItem = async (slot) => {
  if (!slot || unequipLoadingSlot.value) return;
  unequipLoadingSlot.value = slot;
  try {
    const res = await itemInstancesApi.unequipItem(slot);
    if (res?.code === 0) {
      ElMessage.success("卸下成功");
      await Promise.all([loadPetDetail(), loadBagItems()]);
    } else {
      ElMessage.error(res?.message || "卸下失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "卸下失败");
  } finally {
    unequipLoadingSlot.value = "";
  }
};

const handleDecomposeItem = async (item) => {
  if (!item?.id || decomposeLoadingId.value) return;
  decomposeLoadingId.value = item.id;
  try {
    const res = await itemInstancesApi.decomposeItem(item.id);
    if (res?.code === 0) {
      ElMessage.success("分解成功");
      await loadBagItems();
    } else {
      ElMessage.error(res?.message || "分解失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "分解失败");
  } finally {
    decomposeLoadingId.value = null;
  }
};

/** 兼容 Page.records 与直接数组（与 openapi 一致） */
const normalizeSkinList = (res) => {
  if (res == null) return [];
  if (res.code !== undefined && res.code !== 0) return [];
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d?.records && Array.isArray(d.records)) return d.records;
  return [];
};

const loadSkins = async () => {
  skinLoading.value = true;
  try {
    const res = await petSkinApi.listPetSkins();
    let list = normalizeSkinList(res);
    const petUrl = petInfo.value?.petUrl;
    const hasMinusOne = list.some((s) => s.skinId === -1);
    const apiAlreadyShowsCurrentLook = !!(petUrl && list.some((s) => s.url === petUrl));
    if (!hasMinusOne && petUrl && !apiAlreadyShowsCurrentLook) {
      list = [
        {
          skinId: -1,
          name: "原皮",
          description: "最初的样子，朴素而自然",
          url: petUrl,
          points: 0,
          owned: true,
        },
        ...list,
      ];
    }
    skins.value = list;
  } catch (error) {
    console.error("获取宠物列表失败:", error);
    skins.value = [];
    ElMessage.error(error?.message || "获取宠物列表失败");
  } finally {
    skinLoading.value = false;
  }
};

const handleExchangeSkin = async (skin) => {
  const skinId = skin?.skinId ?? skin?.id;
  if (skinId === undefined || skinId === null || exchangeLoadingId.value) return;
  try {
    await ElMessageBox.confirm(`确定要花费 ${skin?.points ?? 0} 积分购买该宠物吗？`, "确认购买宠物", {
      confirmButtonText: "确认购买",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }
  exchangeLoadingId.value = skinId;
  try {
    const res = await petSkinApi.exchangePetSkin(skinId);
    if (res?.code === 0) {
      ElMessage.success("购买成功");
      await Promise.all([loadSkins(), loadPetDetail()]);
    } else {
      ElMessage.error(res?.message || "购买失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "购买失败，可能是积分不足");
  } finally {
    exchangeLoadingId.value = null;
  }
};

const handleSetSkin = async (skin) => {
  const skinId = skin?.skinId ?? skin?.id;
  if (skinId === undefined || skinId === null || setSkinLoadingId.value) return;
  setSkinLoadingId.value = skinId;
  try {
    const res = await petSkinApi.setPetSkin(skinId);
    if (res?.code === 0) {
      ElMessage.success("切换成功");
      await Promise.all([loadSkins(), loadPetDetail()]);
    } else {
      ElMessage.error(res?.message || "切换失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "切换失败");
  } finally {
    setSkinLoadingId.value = null;
  }
};

const getPetId = () => {
  return petInfo.value?.petId || petInfo.value?.id || null;
};

const handleFeedPet = async () => {
  const petId = getPetId();
  if (!petId) return;
  petActionLoading.feed = true;
  try {
    const res = await userApi.feedPet(petId);
    if (res?.code === 0) {
      ElMessage.success("喂食成功");
      await loadPetDetail();
    } else {
      ElMessage.error(res?.message || "喂食失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "喂食失败");
  } finally {
    petActionLoading.feed = false;
  }
};

const handlePatPet = async () => {
  const petId = getPetId();
  if (!petId) return;
  petActionLoading.pat = true;
  try {
    const res = await userApi.patPet(petId);
    if (res?.code === 0) {
      ElMessage.success("抚摸成功");
      await loadPetDetail();
    } else {
      ElMessage.error(res?.message || "抚摸失败");
    }
  } catch (error) {
    ElMessage.error(error?.message || "抚摸失败");
  } finally {
    petActionLoading.pat = false;
  }
};

const fetchRankData = async () => {
  rankLoading.value = true;
  try {
    const res = await petApi.getPetRankList({ limit: 20 });
    if (res?.code === 0) {
      rankData.value = res.data || [];
      if (rankData.value.length === 0) {
        ElMessage.info("排行榜暂无数据");
      }
    } else {
      rankData.value = [];
      ElMessage.error(res?.message || "获取宠物排行榜失败");
    }
  } catch (error) {
    console.error("获取宠物排行榜失败:", error);
    rankData.value = [];
    ElMessage.error(error?.message || "获取宠物排行榜失败");
  } finally {
    rankLoading.value = false;
  }
};

const fetchGalleryData = async () => {
  galleryLoading.value = true;
  try {
    const res = await petApi.listItemTemplates({ ...galleryQuery });
    if (res?.code === 0 && res.data) {
      galleryData.value = res.data.records || [];
      galleryTotal.value = res.data.total || 0;
    } else {
      galleryData.value = [];
      galleryTotal.value = 0;
    }
  } catch (error) {
    console.error("获取图鉴失败:", error);
    galleryData.value = [];
    galleryTotal.value = 0;
  } finally {
    galleryLoading.value = false;
  }
};

const setGalleryCategory = (category) => {
  galleryQuery.category = category;
};

const setGalleryRarity = (rarity) => {
  galleryQuery.rarity = rarity;
};

const handleGallerySizeChange = (size) => {
  galleryQuery.current = 1;
  galleryQuery.pageSize = size;
  fetchGalleryData();
};

const openOtherPet = async (row) => {
  otherPetVisible.value = true;
  otherPetLoading.value = true;
  otherPetInfo.value = null;
  try {
    const userId = row.userId;
    const res = await petApi.getOtherUserPet({ otherUserId: userId });
    otherPetInfo.value = res?.code === 0 ? res.data || null : null;
  } catch (error) {
    console.error("获取其他用户宠物失败:", error);
    otherPetInfo.value = null;
  } finally {
    otherPetLoading.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === "pet" && bagItems.value.length === 0) {
    loadBagItems();
  }
  if (tab === "ranking" && rankData.value.length === 0) {
    fetchRankData();
  }
  if (tab === "gallery" && galleryData.value.length === 0) {
    fetchGalleryData();
  }
});

// 筛选变化时自动回到第一页并刷新（与 frontend 体验一致）
watch(
  () => [galleryQuery.category, galleryQuery.rarity],
  () => {
    if (activeTab.value !== "gallery") return;
    galleryQuery.current = 1;
    fetchGalleryData();
  }
);

watch(petInnerTab, (name) => {
  if (name === "shop" || name === "skin") {
    loadSkins();
  }
});

onMounted(async () => {
  await loadPetDetail();
  await Promise.all([loadBagItems(), loadSkins()]);
});
</script>

<style scoped>
.pet-center {
  min-height: 100%;
  padding: 20px;
  background: var(--background-color);
}

.pet-shell {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.pet-header {
  padding: 16px 20px 10px;
}

.pet-header h2 {
  margin: 0;
  color: #1890ff;
}

.pet-header p {
  margin: 8px 0 0;
  color: #666;
}

.game-tabs-nav {
  display: flex;
  padding: 12px 16px 0;
  gap: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.game-tab {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 167, 104, 0.3);
  border-radius: 8px 8px 0 0;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.25s ease;
}

.game-tab:hover {
  background: rgba(255, 167, 104, 0.1);
  transform: translateY(-2px);
}

.game-tab-active {
  background: rgba(255, 167, 104, 0.15);
  border-color: #ffa768;
  border-bottom-color: transparent;
}

.game-tab-icon {
  font-size: 14px;
}

.game-tab-text {
  font-size: 14px;
  color: #666;
}

.game-tab-active .game-tab-text {
  color: #c2410c;
  font-weight: 700;
}

.game-tab-decor {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: #ffa768;
  opacity: 0;
}

.game-tab-active .game-tab-decor {
  opacity: 1;
}

.game-tab-content {
  background: #fff;
  /* min-height: 620px; */
  padding: 20px;
}

/* 让滚动条在各 Tab 内容容器内部 */
.tab-pane-scroll {
  max-height: calc(100vh - 150px);
  overflow: auto;
  overscroll-behavior: contain;
}

.my-pet-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 20px;
}

.equipment-block {
  margin-top: 18px;
  border-top: 1px solid #f0f0f0;
  padding-top: 14px;
}

.pet-main-layout {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 18px;
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.equip-slot-card:hover {
  transform: translateY(-1px);
}

.equip-slot-card.equipped {
  border: 2px solid #a855f7;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
  background: #fff;
}

.equip-slot-card.loading {
  opacity: 0.7;
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

.pet-right-panel {
  min-width: 0;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 4px 4px 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.pet-inner-tabs {
  background: transparent;
  border-radius: 12px;
}

.pet-inner-tabs :deep(.el-tabs__header) {
  margin: 0 0 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  border-radius: 10px 10px 0 0;
  padding: 0 8px;
}

.pet-inner-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.pet-inner-tabs :deep(.el-tabs__nav) {
  gap: 4px;
}

.pet-inner-tabs :deep(.el-tabs__item) {
  height: 44px;
  line-height: 44px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: color 0.2s ease, transform 0.2s ease;
}

.pet-inner-tabs :deep(.el-tabs__item:hover) {
  color: #ffa768;
}

.pet-inner-tabs :deep(.el-tabs__item.is-active) {
  color: #c2410c;
  font-weight: 700;
}

.pet-inner-tabs :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #ffa768 0%, #f97316 100%);
}

.pet-inner-tabs :deep(.el-tabs__content) {
  padding: 0 8px 4px;
  min-height: 420px;
}

.block-title {
  margin: 10px 0;
  font-size: 14px;
  font-weight: 700;
  color: #555;
}

.equipped-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.equipped-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  transition: box-shadow 0.25s ease, transform 0.2s ease, border-color 0.2s ease;
}

.equipped-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.equipped-card img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
}

.equipped-meta {
  flex: 1;
}

.equip-name {
  font-size: 13px;
  font-weight: 600;
}

.equip-slot {
  font-size: 12px;
  color: #888;
}

.bag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 12px;
}

.bag-item-card {
  position: relative;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  padding: 10px 8px 8px;
  text-align: center;
  background: #fff;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease;
}

.bag-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.bag-item-card--skin {
  padding-top: 12px;
}

.rarity-r1 {
  border-color: #52c41a;
}
.rarity-r2 {
  border-color: #1890ff;
}
.rarity-r3 {
  border-color: #722ed1;
}
.rarity-r4 {
  border-color: #fa8c16;
}
.rarity-r5 {
  border-color: #f5222d;
}
.rarity-r6 {
  border-color: #eb2f96;
}
.rarity-r7 {
  border-color: #fadb14;
}
.rarity-r8 {
  border-color: #faad14;
}

.bag-item-card img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.bag-item-name {
  margin-top: 6px;
  font-size: 12px;
  min-height: 32px;
}

.bag-item-count {
  color: #888;
  font-size: 12px;
  margin-bottom: 6px;
}

.bag-item-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.pet-shop-container {
  min-height: 320px;
}

.pet-shop-type-selector {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.skin-shop-panel {
  min-height: 240px;
}

.skin-shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 14px;
}

.skin-shop-grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
  gap: 12px;
}

.skin-shop-card {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.skin-shop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.skin-shop-card--owned {
  border-color: #bae0ff;
}

.skin-shop-cover {
  position: relative;
  height: 120px;
  background: linear-gradient(180deg, #f5f5f5 0%, #fafafa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skin-shop-cover img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.skin-current-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  font-size: 11px;
  color: #fff;
  background: linear-gradient(90deg, #52c41a, #73d13d);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(82, 196, 26, 0.35);
}

.skin-shop-body {
  padding: 10px 12px 12px;
}

.skin-shop-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.skin-shop-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.45;
  min-height: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skin-shop-price {
  font-size: 13px;
  color: #fa8c16;
  font-weight: 600;
  margin: 8px 0;
}

.skin-shop-actions {
  display: flex;
  justify-content: center;
}

.shop-empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #999;
}

.shop-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.shop-empty-text {
  font-size: 15px;
}

.shop-props-placeholder {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  font-size: 15px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  border-radius: 12px;
  border: 1px dashed #e8e8e8;
}

.shop-props-icon {
  font-size: 48px;
}

.shop-props-text {
  font-size: 15px;
}

.empty-text {
  color: #999;
  font-size: 13px;
}

.empty-module {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  font-size: 15px;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
  border-radius: 12px;
  border: 1px dashed #e8e8e8;
}

.empty-module::before {
  content: "⚡";
  font-size: 48px;
  animation: empty-bounce 2s ease-in-out infinite;
}

@keyframes empty-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.my-pet-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pet-avatar {
  width: 90px;
  height: 90px;
  object-fit: contain;
}

.pet-meta {
  flex: 1;
}

.pet-name {
  font-size: 20px;
  font-weight: 600;
}

.pet-stats {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-pill {
  padding: 4px 10px;
  border-radius: 12px;
  background: #f7f7f7;
}

.pet-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}


.ranking-tip {
  margin-bottom: 12px;
  color: #666;
}

.rank-pet-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-pet-cell img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.gallery-filter {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}

.gallery-header {
  margin-bottom: 18px;
  text-align: center;
}

.gallery-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 800;
  color: #1890ff;
  margin-bottom: 6px;
}

.gallery-title-icon {
  font-size: 22px;
}

.gallery-subtitle {
  color: #666;
  font-size: 13px;
}

.gallery-filters {
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e9ecef;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label {
  min-width: 70px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-btn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: #ffa768;
  color: #ffa768;
}

.filter-btn.active {
  background: #ffa768;
  border-color: #ffa768;
  color: #fff !important;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.gallery-grid--rich {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.gallery-item-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  transition: all 0.25s ease;
}

.gallery-item-card:hover {
  transform: translateY(-2px);
  border-color: #ffa768;
  box-shadow: 0 4px 12px rgba(255, 167, 104, 0.2);
}

.gallery-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gallery-item-card--rich {
  padding: 0;
  overflow: hidden;
}

.gallery-item-header {
  position: relative;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.gallery-item-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e8e8e8;
}

.gallery-item-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  background: #f5f5f5;
}

.gallery-item-icon.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.gallery-rarity-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: #ffa768;
  color: #fff;
}

.gallery-item-body {
  padding: 12px;
}

.gallery-item-name {
  margin-top: 10px;
  font-weight: 700;
}

.gallery-item-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.gallery-item-stats {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gallery-item-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.stat-icon {
  font-size: 14px;
}

.gallery-item-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #777;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gallery-item-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.item-tag {
  padding: 2px 6px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.item-points {
  font-size: 11px;
  color: #fa8c16;
  font-weight: 600;
}

.gallery-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}


.other-pet-content {
  text-align: center;
}

.other-pet-avatar {
  width: 88px;
  height: 88px;
  object-fit: contain;
}

@media (max-width: 1100px) {
  .pet-main-layout {
    grid-template-columns: 1fr;
  }
}
</style>

