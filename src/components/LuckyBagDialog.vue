<template>
  <div v-if="visible" class="lucky-bag-dialog-overlay" @click.self="emit('close')">
    <div class="lucky-bag-dialog">
      <div class="lucky-bag-dialog-header">
        <div class="header-content">
          <img :src="LUCKY_BAG_IMAGE" alt="福袋" class="lucky-bag-dialog-icon" />
          <span class="header-title">发送福袋</span>
        </div>
        <button type="button" class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="lucky-bag-dialog-body">
        <div class="type-selector">
          <div
            v-for="item in luckyBagTypes"
            :key="item.value"
            class="type-card"
            :class="{ active: form.type === item.value }"
            @click="form.type = item.value"
          >
            <span class="type-name">{{ item.name }}</span>
            <span class="type-desc">{{ item.desc }}</span>
          </div>
        </div>

        <div class="form-content">
          <div class="form-item">
            <span class="item-label">福袋名称</span>
            <div class="form-item-control">
              <el-input
                v-model="form.name"
                maxlength="50"
                show-word-limit
                placeholder="快来参与福袋吧"
              />
            </div>
          </div>

          <div class="form-item">
            <span class="item-label">总积分</span>
            <div class="form-item-control">
              <el-input v-model="form.totalAmount" inputmode="numeric" />
            </div>
          </div>

          <div class="form-item">
            <span class="item-label">中奖人数</span>
            <div class="form-item-control">
              <el-input v-model="form.winnerCount" inputmode="numeric" />
            </div>
          </div>

          <div class="form-item">
            <span class="item-label">持续时间</span>
            <div class="form-item-control">
              <el-input v-model="form.durationSeconds" inputmode="numeric" />
            </div>
          </div>
        </div>
      </div>

      <div class="lucky-bag-dialog-footer">
        <el-button class="cancel-btn" @click="emit('close')">取消</el-button>
        <el-button class="send-btn" :loading="sending" @click="handleSend">
          {{ sending ? "发送中..." : "发送福袋" }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { luckyBagApi } from "../api/luckyBag";
import { LUCKY_BAG_IMAGE } from "../utils/luckyBag";
import "../styles/lucky-bag.less";

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "sent"]);

const luckyBagTypes = [
  {
    name: "随机分配",
    value: 1,
    desc: "摸鱼者，事竟成！",
    defaultName: "快来参与福袋吧",
  },
  {
    name: "平均分配",
    value: 2,
    desc: "平分福袋，人人有份！",
    defaultName: "平分福袋，人人有份！",
  },
];

const sending = ref(false);
const form = reactive({
  type: 1,
  totalAmount: 50,
  winnerCount: 5,
  durationSeconds: 180,
  name: luckyBagTypes[0].defaultName,
});

watch(
  () => props.visible,
  (open) => {
    if (open) {
      form.type = 1;
      form.totalAmount = 50;
      form.winnerCount = 5;
      form.durationSeconds = 180;
      form.name = luckyBagTypes[0].defaultName;
    }
  },
);

watch(
  () => form.type,
  (newType) => {
    const selected = luckyBagTypes.find((item) => item.value === newType);
    if (selected) {
      form.name = selected.defaultName;
    }
  },
);

async function handleSend() {
  if (sending.value) {
    ElMessage.warning("正在处理福袋发送，请稍候...");
    return;
  }
  const totalAmount = Number(form.totalAmount);
  const winnerCount = Number(form.winnerCount);
  const durationSeconds = Number(form.durationSeconds);
  if (totalAmount < 1 || totalAmount > 100) {
    ElMessage.error("福袋总积分需在 1-100 之间！");
    return;
  }
  if (winnerCount <= 0) {
    ElMessage.error("请输入有效的中奖人数！");
    return;
  }
  const maxPerWinner = Math.ceil(totalAmount / winnerCount);
  if (maxPerWinner > 50) {
    ElMessage.error("单人最多可获得 50 积分，请调整总积分或中奖人数！");
    return;
  }
  if (durationSeconds < 60 || durationSeconds > 1800) {
    ElMessage.error("持续时间需在 60-1800 秒之间！");
    return;
  }

  sending.value = true;
  try {
    const res = await luckyBagApi.create({
      totalAmount,
      winnerCount,
      type: form.type,
      name: form.name,
      durationSeconds,
    });
    if (res?.code === 0 && res.data) {
      ElMessage.success("福袋发送成功！");
      emit("sent", res.data);
      emit("close");
    } else {
      ElMessage.error(res?.message || res?.msg || "福袋发送失败！");
    }
  } catch {
    ElMessage.error("福袋发送失败！");
  } finally {
    sending.value = false;
  }
}
</script>
