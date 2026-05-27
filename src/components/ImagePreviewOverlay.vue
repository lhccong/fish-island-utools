<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useImagePreviewOverlayStore } from "../stores/imagePreviewOverlay";

const store = useImagePreviewOverlayStore();
const { visible, index, total } = storeToRefs(store);

const scale = ref(1);
const rotation = ref(0);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const viewportRef = ref(null);

const transformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`,
}));

function resetTransform() {
  scale.value = 1;
  rotation.value = 0;
  translateX.value = 0;
  translateY.value = 0;
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 5);
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.1);
}

function rotateLeft() {
  rotation.value -= 90;
}

function rotateRight() {
  rotation.value += 90;
}

function downloadCurrent() {
  const src = store.currentSrc;
  if (!src) return;
  const link = document.createElement("a");
  link.href = src;
  link.download = `image_${index.value + 1}.jpg`;
  link.rel = "noopener";
  link.click();
}

function onWheel(e) {
  if (!visible.value) return;
  e.preventDefault();
  if (e.deltaY < 0) zoomIn();
  else zoomOut();
}

function onDragStart(e) {
  if (e.button !== 0) return;
  if (e.target.closest(".image-preview-overlay__toolbar")) return;
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  e.preventDefault();
}

function onDragMove(e) {
  if (!isDragging.value) return;
  const dx = e.clientX - dragStartX.value;
  const dy = e.clientY - dragStartY.value;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  const max = 2000;
  translateX.value = Math.max(-max, Math.min(max, translateX.value + dx));
  translateY.value = Math.max(-max, Math.min(max, translateY.value + dy));
}

function onDragEnd() {
  isDragging.value = false;
}

function onDblClick() {
  resetTransform();
}

const onKeydown = (e) => {
  if (!visible.value) return;
  switch (e.key) {
    case "Escape":
      store.close();
      break;
    case "ArrowLeft":
      e.preventDefault();
      store.prev();
      break;
    case "ArrowRight":
      e.preventDefault();
      store.next();
      break;
    case "+":
    case "=":
      e.preventDefault();
      zoomIn();
      break;
    case "-":
      e.preventDefault();
      zoomOut();
      break;
    case "0":
      resetTransform();
      break;
    default:
      break;
  }
};

watch(
  visible,
  (v) => {
    if (v) {
      resetTransform();
      window.addEventListener("keydown", onKeydown, true);
      window.addEventListener("mousemove", onDragMove);
      window.addEventListener("mouseup", onDragEnd);
    } else {
      window.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      isDragging.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => [store.index, store.currentSrc],
  () => {
    if (visible.value) resetTransform();
  },
);

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown, true);
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="image-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      @click.self="store.close()"
    >
      <button
        type="button"
        class="image-preview-overlay__close"
        aria-label="关闭"
        @click="store.close()"
      >
        ×
      </button>

      <div v-if="total > 1" class="image-preview-overlay__counter">
        {{ index + 1 }} / {{ total }}
      </div>

      <button
        v-if="total > 1 && index > 0"
        type="button"
        class="image-preview-overlay__nav image-preview-overlay__nav--prev"
        aria-label="上一张"
        @click.stop="store.prev()"
      >
        ‹
      </button>
      <button
        v-if="total > 1 && index < total - 1"
        type="button"
        class="image-preview-overlay__nav image-preview-overlay__nav--next"
        aria-label="下一张"
        @click.stop="store.next()"
      >
        ›
      </button>

      <div
        ref="viewportRef"
        class="image-preview-overlay__viewport"
        :class="{ 'is-dragging': isDragging }"
        @wheel.prevent="onWheel"
        @mousedown="onDragStart"
        @dblclick.stop="onDblClick"
      >
        <div class="image-preview-overlay__transform" :style="transformStyle">
          <img
            v-if="store.currentSrc"
            :key="store.currentSrc"
            :src="store.currentSrc"
            class="image-preview-overlay__img"
            alt="预览"
            draggable="false"
          />
        </div>
      </div>

      <div class="image-preview-overlay__toolbar" @click.stop>
        <button type="button" class="toolbar-btn" title="缩小 (- / 滚轮向下)" @click="zoomOut">
          −
        </button>
        <button type="button" class="toolbar-btn" title="放大 (+ / 滚轮向上)" @click="zoomIn">
          +
        </button>
        <button type="button" class="toolbar-btn" title="向左旋转" @click="rotateLeft">↶</button>
        <button type="button" class="toolbar-btn" title="向右旋转" @click="rotateRight">↷</button>
        <button type="button" class="toolbar-btn" title="重置 (0 / 双击)" @click="resetTransform">
          ↻
        </button>
        <button type="button" class="toolbar-btn" title="保存图片" @click="downloadCurrent">
          ↓
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-overlay__viewport {
  position: relative;
  width: 96vw;
  height: calc(92vh - 72px);
  max-width: 96vw;
  max-height: calc(92vh - 72px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.image-preview-overlay__viewport.is-dragging {
  cursor: grabbing;
}

.image-preview-overlay__transform {
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform;
  transition: transform 0.05s linear;
}

.image-preview-overlay__viewport.is-dragging .image-preview-overlay__transform {
  transition: none;
}

.image-preview-overlay__img {
  max-width: 96vw;
  max-height: calc(92vh - 72px);
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.image-preview-overlay__close {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.image-preview-overlay__close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.image-preview-overlay__counter {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  z-index: 2;
}

.image-preview-overlay__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 72px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 36px;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.image-preview-overlay__nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-preview-overlay__nav--prev {
  left: 12px;
}

.image-preview-overlay__nav--next {
  right: 12px;
}

.image-preview-overlay__toolbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  z-index: 2;
}

.toolbar-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.05);
}

.toolbar-btn:active {
  transform: scale(0.95);
}
</style>
