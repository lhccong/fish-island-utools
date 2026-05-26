<template>
  <div class="farm-side-dock-wrap" :class="{ 'is-expanded': expanded }">
    <button
      v-if="!expanded"
      type="button"
      class="farm-dock-fab"
      aria-label="展开操作栏"
      title="操作"
      @click="openPanel"
    >
      <el-icon><Grid /></el-icon>
    </button>

    <Transition name="farm-dock-panel">
      <aside
        v-if="expanded"
        class="farm-side-dock"
        aria-label="农场快捷操作"
      >
        <button
          type="button"
          class="farm-dock-close"
          aria-label="收起操作栏"
          title="收起"
          @click="closePanel"
        >
          <el-icon><Close /></el-icon>
        </button>

        <div class="farm-dock-scroll" role="list">
          <button
            type="button"
            class="farm-dock-item"
            role="listitem"
            :class="{ 'is-active': matureCount > 0 }"
            @click="emit('mature')"
          >
            <span class="farm-dock-icon"><el-icon><Clock /></el-icon></span>
            <span class="farm-dock-label">成熟</span>
            <span class="farm-dock-sub">{{ matureLabel }}</span>
          </button>

          <button
            v-for="item in dockItems"
            :key="item.key"
            type="button"
            class="farm-dock-item"
            role="listitem"
            @click="emit('action', item.key)"
          >
            <span class="farm-dock-icon"><el-icon><component :is="item.icon" /></el-icon></span>
            <span class="farm-dock-label">{{ item.label }}</span>
          </button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { markRaw } from "vue";
import {
  Clock,
  ShoppingBag,
  DocumentChecked,
  Briefcase,
  Present,
  House,
  Grid,
  Close,
} from "@element-plus/icons-vue";
import "../../styles/farm/farm-side-dock.less";

const STORAGE_KEY = "fish-island-farm-dock-expanded";

defineProps({
  matureCount: { type: Number, default: 0 },
  matureLabel: { type: String, default: "—" },
});

const emit = defineEmits(["mature", "action"]);

const expanded = ref(false);

const dockItems = [
  { key: "shop", label: "商店", icon: markRaw(ShoppingBag) },
  { key: "task", label: "任务", icon: markRaw(DocumentChecked) },
  { key: "bag", label: "背包", icon: markRaw(Briefcase) },
  { key: "reward", label: "领取奖励", icon: markRaw(Present) },
  { key: "cottage", label: "农舍", icon: markRaw(House) },
];

function openPanel() {
  expanded.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function closePanel() {
  expanded.value = false;
  try {
    localStorage.setItem(STORAGE_KEY, "0");
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  try {
    expanded.value = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    expanded.value = false;
  }
});
</script>
