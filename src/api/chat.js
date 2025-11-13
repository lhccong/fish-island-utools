import { request } from "./request";

export const chatApi = {
  // 获取聊天节点
  getChatNode() {
    return request.get("/chat-room/node/get");
  },

  // 获取聊天消息
  getChatMessages(params = {}) {
    const {
      current = 1,
      pageSize = 20,
      roomId = -1,
      sortField = "id",
      sortOrder = "desc",
    } = params;

    return request.post("/api/chat/message/page/vo", {
      current,
      pageSize,
      roomId,
      sortField,
      sortOrder,
    });
  },

  // 获取默认表情
  getDefaultEmotions() {
    return request.get("/users/emotions");
  },

  // 获取表情包
  getEmotionPack(gameId) {
    return request.post("/api/cloud/get", { gameId });
  },

  // 发送消息
  sendMessage(content) {
    return request.post("/chat-room/send", {
      content,
      client: import.meta.env.VITE_CLIENT,
    });
  },

  // 撤回消息
  revokeMessage(oId) {
    return request.delete(`/chat-room/revoke/${oId}`);
  },

  // 打开红包
  openRedPacket(oId, gesture) {
    return request.post("/chat-room/red-packet/open", { oId, gesture });
  },

  // 抢红包
  grabRedPacket(redPacketId) {
    // 根据API文档，这个接口使用params作为查询参数，而不是请求体
    return request.instance.post("/api/redpacket/grab", null, {
      params: {
        redPacketId,
      },
    });
  },

  // 创建红包
  createRedPacket(body) {
    return request.post("/api/redpacket/create", body);
  },

  // 获取红包详情
  getRedPacketDetail(redPacketId) {
    return request.get("/api/redpacket/detail", {
      redPacketId,
    });
  },

  // 获取红包抢购记录
  getRedPacketRecords(redPacketId) {
    return request.get("/api/redpacket/records", {
      redPacketId,
    });
  },

  // 获取私信列表
  getPrivateMessages() {
    return request.get("/chat/get-list");
  },

  // 发送私信
  sendPrivateMessage(userName, content) {
    return request.post("/chat/send", {
      userName,
      content,
    });
  },

  // 获取私信详情
  getPrivateMessageDetail(toUser, page = 1, pageSize = 20) {
    return request.get("/chat/get-message", { toUser, page, pageSize });
  },

  // 获取未读私信消息
  getUnreadMessages() {
    return request.get("/chat/has-unread");
  },

  // 标记私信为已读
  markAsRead(fromUser) {
    return request.get("/chat/mark-as-read", { fromUser });
  },

  // 获取在线用户列表
  getOnlineUserListUsingGet(options = {}) {
    return request.get("/api/chat/online/user", options);
  },
};
