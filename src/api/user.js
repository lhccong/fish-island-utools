import { request } from "./request";

export const userApi = {
  // 登录（旧接口，保留兼容）
  login(nameOrEmail, userPassword, mfaCode) {
    return request.post("/api/getKey", {
      nameOrEmail,
      userPassword,
      mfaCode,
    });
  },

  // 用户账号登录
  userLogin(userAccount, userPassword) {
    return request.post("/api/user/login", {
      userAccount,
      userPassword,
    });
  },

  // 用户邮箱登录
  userEmailLogin(email, userPassword) {
    return request.post("/api/user/email/login", {
      email,
      userPassword,
    });
  },

  // 注册
  register(data) {
    return request.post("/register", data);
  },

  // 验证短信验证码
  verifyCode(code) {
    return request.get("/verify", { code });
  },

  // 完成注册
  completeRegister(data, inviteUser) {
    return request.post("/register2", { data, inviteUser });
  },

  /**
   * 获取当前登录用户信息
   * @param {Object} [options] - 请求配置选项
   * @returns {Promise<{
   *   code?: number;
   *   data?: {
   *     avatarFramerUrl?: string;
   *     bindPlatforms?: Array<any>;
   *     createTime?: string;
   *     email?: string;
   *     id?: number;
   *     lastSignInDate?: string;
   *     level?: number;
   *     points?: number;
   *     titleId?: number;
   *     titleIdList?: string;
   *     updateTime?: string;
   *     usedPoints?: number;
   *     userAvatar?: string;
   *     userName?: string;
   *     userProfile?: string;
   *     userRole?: string;
   *     vip?: boolean;
   *   };
   *   message?: string;
   * }>}
   */
  async getCurrentUser(options) {
    return request.get("/api/user/get/login", options || {});
  },
  // 获取用户资料
  getUserProfile(username) {
    return request.get(`/user/${username}`);
  },

  // 更新用户资料
  updateUserProfile(data) {
    return request.put("/api/user", data);
  },

  // 获取活跃度
  getLiveness() {
    return request.get(`/user/liveness?_t=${new Date().getTime()}`);
  },

  // 获取签到状态
  getCheckInStatus() {
    return request.get("/user/checkedIn");
  },

  // 领取昨日活跃奖励
  claimYesterdayLivenessReward() {
    return request.get("/activity/yesterday-liveness-reward-api");
  },

  // 查询奖励状态
  checkLivenessRewardStatus() {
    return request.get("/api/activity/is-collected-liveness");
  },

  // 获取最近注册用户
  getRecentRegUsers() {
    return request.get("/api/user/recentReg");
  },

  // 转账
  transfer(userName, amount, memo) {
    return request.post("/point/transfer", {
      userName,
      amount,
      memo,
    });
  },

  // 关注用户
  followUser(followingId) {
    return request.post("/follow/user", { followingId });
  },

  // 取消关注用户
  unfollowUser(followingId) {
    return request.post("/unfollow/user", { followingId });
  },

  // 上传文件
  uploadFiles(files) {
    return request.upload("/upload", files);
  },

  // 获取默认表情
  getDefaultEmotions() {
    return request.get("/users/emotions");
  },

  // 获取表情包
  getEmotionPack(gameId) {
    return request.post("/api/cloud/get", { gameId });
  },
  // 同步表情包
  syncEmotionPack(gameId, data) {
    return request.post("/api/cloud/sync", {
      gameId,
      data,
    });
  },
  // 用户名联想
  getUsernameSuggestions(name) {
    return request.post("/users/names", { name });
  },

  // 上传图片
  uploadImage(file) {
    // 检查文件类型
    const validTypes = [".jpg", ".jpeg", ".png", ".gif", ".mp4"];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(fileExt)) {
      return Promise.reject(
        new Error("不支持的文件格式，仅支持 jpg, jpeg, png, gif, mp4")
      );
    }

    // 检查文件大小（20MB）
    if (file.size > 20 * 1024 * 1024) {
      return Promise.reject(new Error("文件大小不能超过20MB"));
    }

    return request.upload("/upload", [file]);
  },
};
