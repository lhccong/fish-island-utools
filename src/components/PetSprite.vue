<template>
  <div
    :class="['pet-sprite-container', className]"
    :style="containerStyle"
    :title="currentAction.name"
    @click="handleClick"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, watchEffect } from 'vue';

const props = defineProps({
  /** 精灵图 URL（webp / png 均可） */
  spriteUrl: {
    type: String,
    required: true,
  },
  /** 单帧宽度（px），默认 192 */
  frameWidth: {
    type: Number,
    default: 192,
  },
  /** 单帧高度（px），默认 208 */
  frameHeight: {
    type: Number,
    default: 208,
  },
  /** 整张精灵图的总列数（最大帧数），用于计算 background-size */
  totalCols: {
    type: Number,
    default: 8,
  },
  /** 整张精灵图的总行数，用于计算 background-size；不传则自动推断 */
  totalRows: {
    type: Number,
    default: undefined,
  },
  /** 动作列表，点击宠物时循环切换 */
  actions: {
    type: Array,
    required: true,
  },
  /** 初始动作索引，默认 0 */
  defaultActionIndex: {
    type: Number,
    default: 0,
  },
  /** 缩放比例，默认 1 */
  scale: {
    type: Number,
    default: 1,
  },
  /** 额外 className */
  className: {
    type: String,
    default: '',
  },
  /** 是否启用自动播放随机动作，默认 false */
  autoPlay: {
    type: Boolean,
    default: false,
  },
  /** 自动播放的最小间隔时间（ms），默认 3000 */
  autoPlayMinInterval: {
    type: Number,
    default: 3000,
  },
  /** 自动播放的最大间隔时间（ms），默认 8000 */
  autoPlayMaxInterval: {
    type: Number,
    default: 8000,
  },
  /** 初始是否处于 Idle 动作（index 0），默认 true */
  startWithIdle: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['click']);

// ─── 状态 ────────────────────────────────────────────────────────────────────

const actionIndex = ref(
  props.startWithIdle && props.actions.length > 0
    ? 0
    : Math.min(props.defaultActionIndex, props.actions.length - 1)
);

const lastClickTime = ref(0);
const autoPlayTimer = ref(null);

// ─── 计算属性 ─────────────────────────────────────────────────────────────────

const currentAction = computed(() => {
  return props.actions[actionIndex.value] ?? props.actions[0];
});

// 计算精灵图总行数：优先使用传入值，否则取 actions 中最大行号 + 1
const computedTotalRows = computed(() => {
  if (props.totalRows !== undefined) return props.totalRows;
  return Math.max(...props.actions.map((a) => a.row)) + 1;
});

// 缩放后的单帧尺寸
const scaledW = computed(() => props.frameWidth * props.scale);
const scaledH = computed(() => props.frameHeight * props.scale);

// background-size 覆盖整张精灵图
const bgWidth = computed(() => props.frameWidth * props.totalCols * props.scale);
const bgHeight = computed(() => props.frameHeight * computedTotalRows.value * props.scale);

// 为每个动作生成唯一的 keyframe 名称
// 名称变化时浏览器会自动重启动画，确保切换动作从第 0 帧开始
const animName = computed(() => {
  return `petSprite_r${currentAction.value.row}_f${currentAction.value.frames}_s${Math.round(props.scale * 100)}`;
});

const containerStyle = computed(() => ({
  width: `${scaledW.value}px`,
  height: `${scaledH.value}px`,
  overflow: 'hidden',
  display: 'inline-block',
  lineHeight: '0',
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  imageRendering: 'pixelated',
  backgroundImage: `url(${props.spriteUrl})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: `${bgWidth.value}px ${bgHeight.value}px`,
  backgroundPositionY: `${currentAction.value.row * -scaledH.value}px`,
  animation: `${animName.value} ${currentAction.value.duration}ms steps(${currentAction.value.frames}) infinite`,
}));

// ─── 动态注入 keyframes ───────────────────────────────────────────────────────

// 用一个 Map 追踪已注入的 keyframe 名称，避免重复注入
const injectedKeyframes = new Set();

watchEffect(() => {
  const name = animName.value;
  if (injectedKeyframes.has(name)) return;

  const css = `
    @keyframes ${name} {
      from { background-position-x: 0px; }
      to   { background-position-x: ${currentAction.value.frames * -scaledW.value}px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-pet-sprite', name);
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
  injectedKeyframes.add(name);
});

// ─── 自动播放 ─────────────────────────────────────────────────────────────────

// 根据权重随机选择下一个动作
const getRandomActionIndex = () => {
  const totalWeight = props.actions.reduce((sum, a) => sum + (a.weight ?? 1), 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < props.actions.length; i++) {
    random -= props.actions[i].weight ?? 1;
    if (random <= 0) return i;
  }
  return Math.floor(Math.random() * props.actions.length);
};

const clearAutoPlayTimer = () => {
  if (autoPlayTimer.value) {
    clearTimeout(autoPlayTimer.value);
    autoPlayTimer.value = null;
  }
};

const scheduleNextAction = () => {
  if (!props.autoPlay || props.actions.length <= 1) return;

  const interval =
    props.autoPlayMinInterval +
    Math.random() * (props.autoPlayMaxInterval - props.autoPlayMinInterval);

  autoPlayTimer.value = setTimeout(() => {
    let newIndex = getRandomActionIndex();

    // 避免连续两次选择相同动作
    if (props.actions.length > 1 && newIndex === actionIndex.value) {
      newIndex =
        (newIndex + 1 + Math.floor(Math.random() * (props.actions.length - 1))) %
        props.actions.length;
    }

    actionIndex.value = newIndex;
    scheduleNextAction();
  }, interval);
};

// 监听 autoPlay 和 actions 变化
watch(
  () => props.autoPlay,
  (val) => {
    clearAutoPlayTimer();
    if (val && props.actions.length > 1) {
      scheduleNextAction();
    }
  }
);

// ─── 点击处理 ─────────────────────────────────────────────────────────────────

const handleClick = () => {
  const now = Date.now();
  if (now - lastClickTime.value < 100) return;
  lastClickTime.value = now;

  // 点击时重置自动播放定时器
  if (props.autoPlay) {
    clearAutoPlayTimer();
  }

  const nextIndex = (actionIndex.value + 1) % props.actions.length;
  actionIndex.value = nextIndex;
  emit('click', nextIndex, props.actions[nextIndex]);

  // 手动切换后重新启动自动播放
  if (props.autoPlay) {
    scheduleNextAction();
  }
};

// ─── 生命周期 ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (props.autoPlay && props.actions.length > 1) {
    scheduleNextAction();
  }
});

onUnmounted(() => {
  clearAutoPlayTimer();
});
</script>
