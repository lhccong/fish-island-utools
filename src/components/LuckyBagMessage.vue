<template>
  <div v-if="!hideInline" class="lucky-bag-inline">
    <div v-if="prefix" class="lucky-bag-prefix">{{ prefix }}</div>
    <div class="lucky-bag-trigger" @click="detailOpen = true">
      <img :src="LUCKY_BAG_IMAGE" alt="福袋" class="lucky-bag-trigger-image" />
      <span class="lucky-bag-trigger-text">点击参与福袋</span>
    </div>
  </div>

  <el-dialog
    v-model="detailOpen"
    title="福袋详情"
    width="360px"
    class="lucky-bag-detail-dialog"
    destroy-on-close
    append-to-body
    align-center
    @open="fetchDetail"
    @closed="emit('detail-close')"
  >
    <div v-loading="detailLoading" class="lucky-bag-modal-content">
      <div class="lucky-bag-header">
        <img :src="LUCKY_BAG_IMAGE" alt="福袋" class="lucky-bag-modal-image" />
        <div class="lucky-bag-header-info">
          <div class="lucky-bag-name">{{ detail?.name || "福袋" }}</div>
          <div v-if="detail?.creatorName" class="lucky-bag-creator">
            发起人：{{ detail.creatorName }}
          </div>
        </div>
      </div>
      <div class="lucky-bag-meta">
        <div class="lucky-bag-meta-item">
          <span class="meta-label">总积分</span>
          <span class="meta-value">{{ detail?.totalAmount ?? "-" }}</span>
        </div>
        <div class="lucky-bag-meta-item">
          <span class="meta-label">中奖人数</span>
          <span class="meta-value">{{ detail?.winnerCount ?? "-" }}</span>
        </div>
        <div class="lucky-bag-meta-item">
          <span class="meta-label">参与人数</span>
          <span class="meta-value">{{ detail?.participantCount ?? 0 }}</span>
        </div>
        <div class="lucky-bag-meta-item">
          <span class="meta-label">分配方式</span>
          <span class="meta-value">{{ typeLabel }}</span>
        </div>
      </div>
      <div class="lucky-bag-draw-time">开奖：{{ drawTime }}</div>
      <div class="lucky-bag-status">
        {{ statusText }}
        <span
          v-if="detail?.joined !== undefined"
          :class="detail.joined ? 'joined-tag' : 'not-joined-tag'"
        >
          {{ detail.joined ? "已参与" : "未参与" }}
        </span>
      </div>
      <div v-if="joinTip" :class="['join-tip', `join-tip_${joinTip.type}`]">{{ joinTip.text }}</div>
      <div class="lucky-bag-actions">
        <el-button type="primary" size="small" :disabled="joinDisabled" @click="handleJoin">
          {{ detail?.joined ? "已参与" : "参与福袋" }}
        </el-button>
        <el-button size="small" @click="openRecords">查看记录</el-button>
      </div>
    </div>
  </el-dialog>

  <el-dialog
    v-model="recordsOpen"
    title="福袋中奖记录"
    width="310px"
    class="lucky-bag-records-dialog"
    destroy-on-close
    append-to-body
    align-center
  >
    <div v-loading="recordsLoading" class="lucky-bag-records">
      <div v-if="records.length === 0 && !recordsLoading" class="empty-records">暂无中奖记录</div>
      <div
        v-for="(record, index) in records"
        :key="record.id ?? index"
        class="record-item"
        :class="{ 'is-top': index === 0 }"
      >
        <img :src="record.userAvatar" alt="" class="record-avatar" />
        <div class="user-info">
          <div class="user-name">
            {{ record.userName }}{{ index === 0 ? " 🏆" : "" }}
          </div>
          <div class="win-time">
            {{ record.winTime ? new Date(record.winTime).toLocaleString() : "" }}
          </div>
        </div>
        <div class="amount">{{ record.amount }} 积分</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { luckyBagApi } from "../api/luckyBag";
import {
  LUCKY_BAG_IMAGE,
  getLuckyBagDrawTime,
  getLuckyBagStatusText,
  getLuckyBagTypeLabel,
  isLuckyBagJoinDisabled,
} from "../utils/luckyBag";
import "../styles/lucky-bag.less";

const props = defineProps({
  luckyBagId: { type: String, required: true },
  prefix: { type: String, default: "" },
  initialOpen: { type: Boolean, default: false },
  /** 从福袋列表打开时仅展示详情弹窗，不渲染聊天区「点击参与福袋」卡片 */
  hideInline: { type: Boolean, default: false },
});

const emit = defineEmits(["joined", "detail-close"]);

const detailOpen = ref(props.initialOpen);
const recordsOpen = ref(false);
const detail = ref(null);
const detailLoading = ref(false);
const records = ref([]);
const recordsLoading = ref(false);
const joinTip = ref(null);
const joining = ref(false);

const statusText = computed(() => getLuckyBagStatusText(detail.value));
const drawTime = computed(() => getLuckyBagDrawTime(detail.value));
const typeLabel = computed(() => getLuckyBagTypeLabel(detail.value?.type));
const joinDisabled = computed(() => isLuckyBagJoinDisabled(detail.value) || joining.value);

async function fetchDetail() {
  detailLoading.value = true;
  joinTip.value = null;
  try {
    const res = await luckyBagApi.getDetail(props.luckyBagId);
    if (res?.code === 0 && res.data) {
      detail.value = res.data;
    }
  } catch (e) {
    console.error(e);
  } finally {
    detailLoading.value = false;
  }
}

if (props.initialOpen) {
  fetchDetail();
}

async function handleJoin() {
  if (joining.value) return;
  joining.value = true;
  try {
    const res = await luckyBagApi.join(props.luckyBagId);
    if (res?.code === 0 && res.data) {
      const text = "参与成功，等待开奖！";
      joinTip.value = { type: "success", text };
      ElMessage.success(text);
      await fetchDetail();
      emit("joined");
    } else {
      const errText = res?.message || res?.msg || "参与失败，福袋可能已结束！";
      joinTip.value = { type: "error", text: errText };
      ElMessage.error(errText);
    }
  } catch {
    const errText = "参与失败，福袋可能已结束！";
    joinTip.value = { type: "error", text: errText };
    ElMessage.error(errText);
  } finally {
    setTimeout(() => {
      joining.value = false;
    }, 500);
  }
}

async function openRecords() {
  recordsOpen.value = true;
  recordsLoading.value = true;
  try {
    const res = await luckyBagApi.getRecords(props.luckyBagId);
    if (res?.code === 0 && res.data) {
      records.value = [...res.data].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else {
      records.value = [];
    }
  } catch {
    ElMessage.error("获取福袋记录失败！");
    records.value = [];
  } finally {
    recordsLoading.value = false;
  }
}
</script>
