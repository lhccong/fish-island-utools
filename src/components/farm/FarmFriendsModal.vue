<template>
  <div v-if="open" class="farm-friends-overlay" role="presentation" @click="emit('close')">
    <div
      class="farm-friends-panel"
      role="dialog"
      aria-modal
      aria-labelledby="farm-friends-title"
      @click.stop
    >
      <button type="button" class="farm-friends-close" aria-label="关闭" @click="emit('close')">
        <el-icon><Close /></el-icon>
      </button>

      <h2 id="farm-friends-title" class="farm-friends-title">好友</h2>

      <div class="farm-friends-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="farm-friends-tab"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
          <span v-if="tab.key === 'visitor' && stolenCount > 0" class="farm-friends-tab-badge">
            {{ stolenCount }}
          </span>
        </button>
      </div>

      <div v-if="activeTab === 'visitor'" class="farm-friends-visitor">
        <div class="farm-visitor-stolen-head">
          <span class="farm-visitor-stolen-icon">
            <el-icon><Message /></el-icon>
          </span>
          <span class="farm-visitor-stolen-title">谁偷了我的菜</span>
          <span v-if="stolenCount > 0" class="farm-visitor-stolen-count">{{ stolenCount }}</span>
        </div>
        <div v-loading="stolenLoading" class="farm-visitor-stolen-list-wrap">
          <div
            v-if="!stolenLoading && stolenRecords.length === 0"
            class="farm-friends-empty-text"
          >
            暂无偷菜记录
          </div>
          <ul v-else class="farm-visitor-stolen-list">
            <li
              v-for="record in stolenRecords"
              :key="record.id ?? `${record.stealerId}-${record.stolenTime}`"
              class="farm-visitor-stolen-item"
            >
              <img
                class="farm-friend-avatar"
                :src="record.stealerAvatar || stealerAvatar"
                alt=""
              />
              <div class="farm-visitor-stolen-info">
                <span class="farm-friend-name">{{ record.stealerNickname || "神秘访客" }}</span>
                <span class="farm-visitor-stolen-detail">
                  偷走了{{ record.cropName ? `「${record.cropName}」` : "作物" }}
                  <template v-if="record.coinGained != null && record.coinGained > 0">
                    · {{ record.coinGained }} 积分
                  </template>
                </span>
                <span v-if="record.stolenTime" class="farm-visitor-stolen-time">
                  {{ formatStolenTime(record.stolenTime) }}
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div v-else-if="activeTab === 'play'" class="farm-friends-play">
        <div class="farm-friends-toolbar">
          <div class="farm-friends-sort-wrap" @click.stop>
            <button type="button" class="farm-friends-sort" @click="sortMenuOpen = !sortMenuOpen">
              {{ sortLabel }}
              <el-icon><ArrowDown /></el-icon>
            </button>
            <div v-if="sortMenuOpen" class="farm-friends-sort-menu">
              <button
                v-for="opt in sortOptions"
                :key="opt.key"
                type="button"
                @click="setSort(opt.key)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <label class="farm-friends-search">
            <el-icon><Search /></el-icon>
            <input v-model="searchKeyword" type="search" placeholder="搜索好友" />
          </label>
        </div>

        <div v-loading="friendsLoading" class="farm-friends-list-wrap">
          <div v-if="!friendsLoading && filteredFriends.length === 0" class="farm-friends-empty-text">
            {{ searchKeyword.trim() ? "没有匹配的好友" : "暂无互关好友，互相关注后可一起摸鱼～" }}
          </div>
          <ul v-else class="farm-friends-list">
            <li
              v-for="(friend, index) in filteredFriends"
              :key="getFriendUserId(friend) || index"
              class="farm-friend-item"
            >
              <span class="farm-friend-rank">{{ index + 1 }}</span>
              <img
                class="farm-friend-avatar"
                :src="friend.avatar || defaultAvatar"
                alt=""
              />
              <div class="farm-friend-info">
                <span class="farm-friend-name">{{ friend.nickname || "好友" }}</span>
                <div class="farm-friend-meta">
                  <span class="farm-friend-level-tag">Lv.{{ friend.level ?? 1 }}</span>
                  <span
                    v-if="friend.canSteal === true && !stealCooldownLabel(friend)"
                    class="farm-friend-status can-steal"
                    title="可偷菜"
                  >
                    🥬 可偷
                  </span>
                  <span
                    v-else-if="stealCooldownLabel(friend)"
                    class="farm-friend-status cooldown"
                  >
                    冷却 {{ stealCooldownLabel(friend) }}
                  </span>
                  <span
                    v-else-if="friend.canSteal !== true"
                    class="farm-friend-status cooldown"
                  >
                    不可偷
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="farm-friend-visit-btn"
                :disabled="visitLoadingId === getFriendUserId(friend)"
                @click="handleVisit(friend)"
              >
                {{ visitLoadingId === getFriendUserId(friend) ? "拜访中" : "拜访" }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="farm-friends-placeholder">
        <div class="farm-friends-empty-text">功能开发中，敬请期待</div>
      </div>

      <div class="farm-friends-footer">
        <div class="farm-friends-self">
          <span class="farm-friend-rank">{{ myLevel }}</span>
          <img class="farm-friend-avatar" :src="myAvatar || defaultAvatar" alt="" />
          <span class="farm-friends-self-name">{{ myNickname }}</span>
        </div>
        <button type="button" class="farm-friends-apply" @click="ElMessage.info('好友申请功能开发中')">
          <span class="farm-friends-apply-icon">
            <el-icon><Plus /></el-icon>
          </span>
          <span>申请</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { Close, Message, Plus, ArrowDown, Search } from "@element-plus/icons-vue";
import { farmApi } from "../../api/farm";
import {
  formatStolenTime,
  formatStealCooldown,
  normalizeFarmFriend,
  getFriendUserId,
  unwrapFarmFriendList,
} from "../../utils/farmUtils";
import "../../styles/farm/friends-modal.less";

const props = defineProps({
  open: { type: Boolean, default: false },
  myLevel: { type: Number, default: 1 },
  myNickname: { type: String, default: "我" },
  myAvatar: { type: String, default: "" },
  initialTab: { type: String, default: "play" },
  stolenRecords: { type: Array, default: () => [] },
  stolenLoading: { type: Boolean, default: false },
  visitLoadingId: { type: String, default: null },
});

const emit = defineEmits(["close", "refresh-stolen", "visit-friend"]);

const tabs = [
  { key: "play", label: "同玩好友" },
  { key: "wechat", label: "微信好友" },
  { key: "invite", label: "邀请" },
  { key: "visitor", label: "访客" },
];

const sortOptions = [
  { key: "default", label: "默认排序" },
  { key: "level", label: "等级优先" },
  { key: "steal", label: "可偷优先" },
];

const defaultAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=farm-friend";
const stealerAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=farm-stealer";

const activeTab = ref(props.initialTab);
const friends = ref([]);
const friendsLoading = ref(false);
const searchKeyword = ref("");
const sortKey = ref("default");
const sortMenuOpen = ref(false);

const stolenCount = computed(() => props.stolenRecords.length);

const sortLabel = computed(
  () => sortOptions.find((o) => o.key === sortKey.value)?.label ?? "默认排序",
);

function stealCooldownLabel(friend) {
  return formatStealCooldown(friend?.stealCooldown);
}

const filteredFriends = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  let list = [...friends.value];
  if (keyword) {
    list = list.filter((f) => (f.nickname || "").toLowerCase().includes(keyword));
  }
  if (sortKey.value === "level") {
    list.sort((a, b) => (b.level ?? 0) - (a.level ?? 0));
  } else if (sortKey.value === "steal") {
    list.sort((a, b) => Number(b.canSteal) - Number(a.canSteal));
  }
  return list;
});

async function loadFriends() {
  friendsLoading.value = true;
  try {
    const res = await farmApi.getFriendList();
    const list = unwrapFarmFriendList(res?.data);
    friends.value =
      res?.code === 0 ? list.map((item) => normalizeFarmFriend(item)) : [];
  } catch (e) {
    friends.value = [];
    console.error(e);
  } finally {
    friendsLoading.value = false;
  }
}

function switchTab(key) {
  activeTab.value = key;
  sortMenuOpen.value = false;
  if (key === "play") loadFriends();
  if (key === "visitor") emit("refresh-stolen");
}

function setSort(key) {
  sortKey.value = key;
  sortMenuOpen.value = false;
}

function handleVisit(friend) {
  if (getFriendUserId(friend) == null) {
    ElMessage.warning("好友信息异常");
    return;
  }
  emit("visit-friend", friend);
}

function handleDocumentClick() {
  sortMenuOpen.value = false;
}

watch(
  () => [props.open, props.initialTab],
  ([open, tab]) => {
    if (open) {
      activeTab.value = tab;
      searchKeyword.value = "";
      sortKey.value = "default";
      emit("refresh-stolen");
      if (tab === "play") loadFriends();
    } else {
      activeTab.value = "play";
      friends.value = [];
    }
  },
);

watch(
  () => [props.open, activeTab.value],
  ([open, tab]) => {
    if (open && tab === "visitor") emit("refresh-stolen");
    if (open && tab === "play") loadFriends();
  },
);

onMounted(() => document.addEventListener("click", handleDocumentClick));
onUnmounted(() => document.removeEventListener("click", handleDocumentClick));
</script>
