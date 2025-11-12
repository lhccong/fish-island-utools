import { defineStore } from "pinia";
import { userApi } from "../api";
import { request } from "../api";

export const useUserStore = defineStore("user", {
  state: () => ({
    userInfo: null,
    lastFetchTime: 0,
    isFetching: false,
    checkInterval: null,
  }),

  getters: {
    shouldRefetch: (state) => {
      const now = Date.now();
      return now - state.lastFetchTime > 120000; // 2分钟缓存
    },
    isLoggedIn: (state) => {
      // 检查新的 token 或旧的 apiKey
      const hasToken = !!request.getTokenName() && !!request.getTokenValue();
      const hasApiKey = !!request.getApiKey();
      return !!state.userInfo && (hasToken || hasApiKey);
    },
    // 新 API 字段
    userAvatarURL: (state) => state.userInfo?.userAvatar || "",
    userName: (state) => state.userInfo?.userName || "",
    userRole: (state) => state.userInfo?.userRole || "",
    userPoint: (state) => state.userInfo?.points || 0, // 新API: points
    userIntro: (state) => state.userInfo?.userProfile || "", // 新API: userProfile
    userId: (state) => state.userInfo?.id || 0,
    userEmail: (state) => state.userInfo?.email || "",
    userLevel: (state) => state.userInfo?.level || 0,
    usedPoints: (state) => state.userInfo?.usedPoints || 0,
    isVip: (state) => state.userInfo?.vip || false,
    avatarFramerUrl: (state) => state.userInfo?.avatarFramerUrl || "",
    // 兼容旧字段（如果其他地方还在使用）
    userNickname: (state) => state.userInfo?.userNickname || state.userInfo?.userName || "",
    userOnlineFlag: (state) => state.userInfo?.userOnlineFlag || false,
    userOnlineMinute: (state) => {
      console.log("当前用户信息:", state.userInfo);
      return state.userInfo?.onlineMinute || 0;
    },
    userNo: (state) => state.userInfo?.userNo || "",
    followingUserCount: (state) => state.userInfo?.followingUserCount || 0,
    followerCount: (state) => state.userInfo?.followerCount || 0,
  },

  actions: {
    async fetchUserInfo(force = false) {
      if (this.isFetching) {
        return this.userInfo;
      }

      if (!this.shouldRefetch && !force) {
        return this.userInfo;
      }

      try {
        this.isFetching = true;
        const res = await userApi.getCurrentUser();
        if (res.code === 0) {
          this.userInfo = res.data;
          this.lastFetchTime = Date.now();
          // 同步到本地存储
          utools.dbStorage.setItem("fishpi_user_info", res.data);

          // 同步更新账号列表中的用户信息
          const accounts = utools.dbStorage.getItem("fishpi_accounts") || [];
          const currentUserName = res.data.userName;
          const accountIndex = accounts.findIndex(
            (account) => account.userName === currentUserName
          );

          if (accountIndex !== -1) {
            // 更新账号列表中的用户信息，保留 apiKey
            const apiKey = accounts[accountIndex].apiKey;
            accounts[accountIndex] = {
              ...res.data,
              apiKey: apiKey,
            };
            utools.dbStorage.setItem("fishpi_accounts", accounts);
            console.log("已同步更新账号列表中的用户信息");
          }
        }
        return this.userInfo;
      } catch (error) {
        console.error("获取用户信息失败:", error);
        return this.userInfo;
      } finally {
        this.isFetching = false;
      }
    },

    startChecking() {
      if (this.checkInterval) return;

      this.checkInterval = setInterval(() => {
        if (this.shouldRefetch) {
          this.fetchUserInfo();
        }
      }, 120000); // 每2分钟检查一次
    },

    stopChecking() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    },

    async init() {
      // 先从本地存储获取
      const storedUserInfo = utools.dbStorage.getItem("fishpi_user_info");
      // 检查新的 token 或旧的 apiKey
      const hasToken = !!request.getTokenName() && !!request.getTokenValue();
      const hasApiKey = !!request.getApiKey();

      if (storedUserInfo && (hasToken || hasApiKey)) {
        this.userInfo = storedUserInfo;
        this.lastFetchTime = Date.now();
        this.startChecking();
      } else {
        // 如果没有用户信息或认证信息，清除状态
        this.logout();
      }
    },

    logout() {
      this.userInfo = null;
      this.lastFetchTime = 0;
      this.stopChecking();
      // 清除 token 和 apiKey
      request.clearToken();
      request.clearApiKey();
      utools.dbStorage.removeItem("fishpi_user_info");
    },

    // 更新用户信息
    updateUserInfo(newInfo) {
      this.userInfo = { ...this.userInfo, ...newInfo };
      utools.dbStorage.setItem("fishpi_user_info", this.userInfo);

      // 同步更新账号列表中的用户信息
      const accounts = utools.dbStorage.getItem("fishpi_accounts") || [];
      const currentUserName = this.userInfo.userName;
      const accountIndex = accounts.findIndex(
        (account) => account.userName === currentUserName
      );

      if (accountIndex !== -1) {
        // 更新账号列表中的用户信息，保留 apiKey
        const apiKey = accounts[accountIndex].apiKey;
        accounts[accountIndex] = {
          ...this.userInfo,
          apiKey: apiKey,
        };
        utools.dbStorage.setItem("fishpi_accounts", accounts);
        console.log("已同步更新账号列表中的用户信息");
      }
    },

    // 设置用户信息（用于切换账号）
    setUserInfo(userInfo) {
      // 检查是否有 token 或 apiKey
      const hasToken = userInfo.saTokenInfo?.tokenName && userInfo.saTokenInfo?.tokenValue;
      const hasTokenValue = userInfo.tokenValue;
      const hasApiKey = userInfo.apiKey;
      
      if (!userInfo || (!hasToken && !hasTokenValue && !hasApiKey)) {
        console.error("设置用户信息失败：缺少认证信息");
        return;
      }

      // 先清除当前状态
      this.stopChecking();

      // 设置认证信息（优先使用 token）
      if (hasToken) {
        request.setToken(userInfo.saTokenInfo.tokenName, userInfo.saTokenInfo.tokenValue);
      } else if (hasTokenValue) {
        // 如果有 tokenValue（从账号列表获取）
        const tokenName = userInfo.tokenName || "fish-dog-token";
        request.setToken(tokenName, userInfo.tokenValue);
      } else if (hasApiKey) {
        request.setApiKey(userInfo.apiKey);
      }

      // 更新用户信息，只保留需要的数据
      const cleanUserInfo = {
        // 新 API 字段
        id: userInfo.id,
        userName: userInfo.userName,
        userAvatar: userInfo.userAvatar,
        userRole: userInfo.userRole,
        userProfile: userInfo.userProfile,
        email: userInfo.email,
        points: userInfo.points,
        usedPoints: userInfo.usedPoints,
        level: userInfo.level,
        vip: userInfo.vip,
        avatarFramerUrl: userInfo.avatarFramerUrl,
        bindPlatforms: userInfo.bindPlatforms,
        createTime: userInfo.createTime,
        updateTime: userInfo.updateTime,
        lastSignInDate: userInfo.lastSignInDate,
        titleId: userInfo.titleId,
        titleIdList: userInfo.titleIdList,
        // 兼容旧字段（如果账号列表中还有旧数据）
        userNickname: userInfo.userNickname,
        userOnlineFlag: userInfo.userOnlineFlag,
        onlineMinute: userInfo.onlineMinute || 0,
        userNo: userInfo.userNo,
        userPoint: userInfo.userPoint || userInfo.points, // 兼容旧字段
        userIntro: userInfo.userIntro || userInfo.userProfile, // 兼容旧字段
        followingUserCount: userInfo.followingUserCount,
        followerCount: userInfo.followerCount,
        // 认证信息
        tokenName: userInfo.tokenName || userInfo.saTokenInfo?.tokenName,
        tokenValue: userInfo.tokenValue || userInfo.saTokenInfo?.tokenValue,
        apiKey: userInfo.apiKey,
      };

      console.log("保存的用户信息:", cleanUserInfo);

      this.userInfo = cleanUserInfo;
      this.lastFetchTime = Date.now();

      // 保存到本地存储
      utools.dbStorage.setItem("fishpi_user_info", cleanUserInfo);

      // 重新开始检查
      this.startChecking();
    },
  },
});
