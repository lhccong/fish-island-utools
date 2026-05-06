<script setup>
import { watch, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useImagePreviewOverlayStore } from "../stores/imagePreviewOverlay";

const store = useImagePreviewOverlayStore();
const { visible, index, total } = storeToRefs(store);

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
    default:
      break;
  }
};

watch(
  visible,
  (v) => {
    if (v) {
      window.addEventListener("keydown", onKeydown, true);
    } else {
      window.removeEventListener("keydown", onKeydown, true);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown, true);
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

      <div class="image-preview-overlay__frame" @click.stop>
        <img
          v-if="store.currentSrc"
          :key="store.currentSrc"
          :src="store.currentSrc"
          class="image-preview-overlay__img"
          alt="预览"
        />
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

.image-preview-overlay__frame {
  max-width: 96vw;
  max-height: 92vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-overlay__img {
  max-width: 96vw;
  max-height: 92vh;
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
</style>
