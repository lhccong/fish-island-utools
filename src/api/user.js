import { request } from "./request";

// 检查文件大小是否不超过 1MB
const checkFileSize = (file) => {
  const ONE_MB = 1 * 1024 * 1024;
  return file && file.size <= ONE_MB;
};

// 压缩图片到合适体积（尽量 <1MB）
const compressImage = async (file) => {
  // 仅对图片类型进行压缩
  if (!file || !file.type || !file.type.startsWith("image/")) {
    return file;
  }
  // GIF 和动图不压缩以防丢帧
  if (file.type === "image/gif") {
    return file;
  }
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // 基于最大边限制长边，避免超大分辨率
  const maxDimension = 1920;
  let targetWidth = imageBitmap.width;
  let targetHeight = imageBitmap.height;
  if (Math.max(targetWidth, targetHeight) > maxDimension) {
    const scale = maxDimension / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  // 导出为 JPEG 以获得更好的压缩比（对透明图会转白底）
  const qualityCandidates = [0.8, 0.7, 0.6, 0.5];
  for (const q of qualityCandidates) {
    // eslint-disable-next-line no-await-in-loop
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", q)
    );
    if (!blob) continue;
    if (blob.size <= 1024 * 1024 || q === qualityCandidates[qualityCandidates.length - 1]) {
      const compressedFile = new File([blob], file.name.replace(/\.(png|jpeg|jpg|webp)$/i, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      return compressedFile;
    }
  }
  return file;
};

const normalizeUserInfo = (user) => {
  if (!user || typeof user !== "object") {
    return null;
  }

  const avatarFromResponse =
    user.userAvatarURL ||
    user.userAvatarURL48 ||
    user.userAvatar ||
    user.avatar ||
    null;

  const avatar48FromResponse =
    user.userAvatarURL48 || user.userAvatarURL || user.userAvatar || user.avatar || null;

  const rawId = user.id ?? user.userId ?? null;
  const normalizedId =
    typeof rawId === "string"
      ? rawId
      : rawId !== null && rawId !== undefined
      ? String(rawId)
      : null;

  return {
    ...user,
    id: normalizedId ?? user.id,
    userId: normalizedId ?? user.userId ?? user.id ?? null,
    userAvatarURL: avatarFromResponse,
    userAvatarURL48: avatar48FromResponse,
    userNickname: user.userNickname || user.nickname || user.userName || user.name || "",
  };
};

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
  async getUserProfile(identifier) {
    const shouldUseIdLookup =
      typeof identifier === "number" ||
      (typeof identifier === "string" && /^\d+$/.test(identifier.trim()));

    if (shouldUseIdLookup) {
      return this.getUserVoById(identifier);
    }
    const res = await request.get(`/user/${identifier}`);
    return normalizeUserInfo(res);
  },
  async getUserVoById(id) {
    if (typeof id === "undefined" || id === null || id === "") {
      return null;
    }
    const normalizedId =
      typeof id === "string" ? id.trim() : String(id);
    if (!normalizedId) {
      return null;
    }
    const res = await request.get("/api/user/get/vo", { id: normalizedId });
    const user = res?.data ?? res;
    return normalizeUserInfo(user);
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

  // 签到
  signIn() {
    return request.post("/api/user/signIn", {});
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
    // 允许的扩展名（与原逻辑保持一致）
    const validTypes = [".jpg", ".jpeg", ".png", ".gif", ".mp4"];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(fileExt)) {
      return Promise.reject(
        new Error("不支持的文件格式，仅支持 jpg, jpeg, png, gif, mp4")
      );
    }

    // 最大 20MB（与原逻辑一致）
    if (file.size > 20 * 1024 * 1024) {
      return Promise.reject(new Error("文件大小不能超过20MB"));
    }

    const doUpload = async () => {
      // 超过 1MB 且是图片时尝试压缩
      const isImage = file.type && file.type.startsWith("image/");
      const needCompress = isImage && !checkFileSize(file);
      const fileToUpload = needCompress ? await compressImage(file) : file;

      const formData = new FormData();
      formData.append("file", fileToUpload);

      // 与参考逻辑一致：使用 biz 参数（默认 user_avatar，可按需调整）
      const params = { biz: "user_avatar" };

      // 直接使用底层 axios 实例，设置 multipart 和 params
      const res = await request.instance.post("/api/file/minio/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params,
      });

      // 期望返回 { code, data: 'https://...' }
      if (!res || (typeof res !== "object")) {
        throw new Error("上传失败");
      }
      // 与全局响应拦截一致：res 已是 response.data
      if (res.code !== undefined && res.code !== 0) {
        throw new Error(res.message || "上传失败");
      }
      const url = res.data;
      if (!url) {
        throw new Error("图片上传失败");
      }
      // 兼容旧调用处的数据结构：返回 succMap
      return {
        code: 0,
        data: {
          succMap: {
            [file.name]: url,
          },
        },
      };
    };

    return doUpload();
  },

  /**
   * 新增收藏表情包
   * @param {string} emoticonSrc - 表情包图片URL
   * @returns {Promise<{code?: number, data?: boolean, message?: string}>}
   */
  addEmoticonFavour(emoticonSrc) {
    // 使用 text/plain Content-Type 发送纯字符串
    // 根据API要求，请求体应该是纯文本字符串，Content-Type 为 text/plain;charset=UTF-8
    return request.postText("/api/emoticon_favour/add", emoticonSrc);
  },

  /**
   * 删除收藏表情包
   * @param {string} id - 表情包收藏ID
   * @returns {Promise<{code?: number, data?: boolean, message?: string}>}
   */
  deleteEmoticonFavour(id) {
    return request.post("/api/emoticon_favour/delete", { id: String(id) });
  },

  /**
   * 分页查询收藏表情包列表
   * @param {Object} params - 分页参数
   * @param {number} [params.current=1] - 当前页码
   * @param {number} [params.pageSize=20] - 每页数量
   * @param {string} [params.sortField] - 排序字段
   * @param {string} [params.sortOrder] - 排序方式 (asc/desc)
   * @returns {Promise<{
   *   code?: number,
   *   data?: {
   *     records?: Array<{
   *       id?: number,
   *       userId?: number,
   *       emoticonSrc?: string,
   *       createTime?: string,
   *       updateTime?: string
   *     }>,
   *     total?: number,
   *     current?: number,
   *     size?: number,
   *     pages?: number
   *   },
   *   message?: string
   * }>}
   */
  listEmoticonFavourByPage(params = {}) {
    return request.post("/api/emoticon_favour/list/page", {
      current: Number(params.current) || 1,
      pageSize: Number(params.pageSize) || 20,
      sortField: params.sortField,
      sortOrder: params.sortOrder,
    });
  },
};
