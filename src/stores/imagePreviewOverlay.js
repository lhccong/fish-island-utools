import { defineStore } from "pinia";

/**
 * uTools 下 createBrowserWindow 会触发主窗口被底座收起，
 * 图片预览改为在插件内全屏遮罩展示，通过本 store 驱动。
 */
export const useImagePreviewOverlayStore = defineStore("imagePreviewOverlay", {
  state: () => ({
    visible: false,
    /** @type {{ src: string }[]} */
    images: [],
    index: 0,
  }),

  getters: {
    currentSrc(state) {
      return state.images[state.index]?.src || "";
    },
    total(state) {
      return state.images.length;
    },
  },

  actions: {
    /**
     * @param {{ src: string }[] | string[]} images
     * @param {number} startIndex
     */
    open(images, startIndex = 0) {
      const list = (images || []).map((item) =>
        typeof item === "string" ? { src: item } : { src: item?.src || "" }
      );
      this.images = list.filter((x) => x.src);
      const max = Math.max(0, this.images.length - 1);
      this.index = Math.min(Math.max(0, startIndex | 0), max);
      this.visible = this.images.length > 0;
    },

    close() {
      this.visible = false;
    },

    prev() {
      if (this.index > 0) this.index -= 1;
    },

    next() {
      if (this.index < this.images.length - 1) this.index += 1;
    },
  },
});
