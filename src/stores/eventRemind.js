import { defineStore } from "pinia";
import { eventRemindApi } from "../api";

export const useEventRemindStore = defineStore("eventRemind", {
  state: () => ({
    unreadCount: 0,
    lastFetchTime: 0,
    isFetching: false,
    checkInterval: null,
  }),

  getters: {
    hasUnread: (state) => state.unreadCount > 0,
    shouldRefetch: (state) => {
      const now = Date.now();
      return now - state.lastFetchTime > 60000; // 1分钟缓存
    },
  },

  actions: {
    /**
     * 获取未读事件提醒数量
     * 拉取第一页数据，在前端统计 state === 0 的条数
     * （后端接口不支持按 state 过滤，total 是全部数据量）
     */
    async fetchUnreadCount(force = false) {
      if (this.isFetching) return this.unreadCount;
      if (!this.shouldRefetch && !force) return this.unreadCount;

      try {
        this.isFetching = true;
        const res = await eventRemindApi.listMyByPage({
          current: 1,
          pageSize: 50,
        });
        if (res.code === 0 && res.data) {
          const records = res.data.records || [];
          this.unreadCount = records.filter((item) => item.state === 0).length;
          // 如果第一页全是未读且还有更多，说明未读数 > 50，直接用 total
          if (
            this.unreadCount === records.length &&
            res.data.total > records.length
          ) {
            this.unreadCount = res.data.total;
          }
          this.lastFetchTime = Date.now();
        }
        return this.unreadCount;
      } catch (error) {
        console.error("获取事件提醒未读数失败:", error);
        return this.unreadCount;
      } finally {
        this.isFetching = false;
      }
    },

    /** 标记全部已读后重置红点 */
    clearUnread() {
      this.unreadCount = 0;
    },

    startChecking() {
      if (this.checkInterval) return;
      this.checkInterval = setInterval(() => {
        this.fetchUnreadCount();
      }, 60000); // 每60秒轮询一次
    },

    stopChecking() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    },

    async init() {
      await this.fetchUnreadCount(true);
      this.startChecking();
    },

    reset() {
      this.unreadCount = 0;
      this.lastFetchTime = 0;
      this.stopChecking();
    },
  },
});
