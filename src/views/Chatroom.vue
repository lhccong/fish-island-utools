<template>
  <div class="chatroom-container">
    <div class="chat-area" :class="{ 'full-width': !showSidebar }">
      <!-- 聊天头部组件 -->
      <ChatHeader />
      <!-- 消息列表组件 -->
      <MessageList :messages="messages" :is-loading-more="isLoadingMore" :has-more-messages="hasMoreMessages"
        :show-sidebar="showSidebar" @load-more="handleLoadMore" @at-user="handleAtUser"
        @send-same-message="handleSendSameMessage" @quote="handleQuote" @add-emoji="handleAddEmoji"
        @update-messages="handleUpdateMessages" />
      <!-- 消息输入组件 -->
      <RoomChatInput ref="chatInputRef" :online-users="onlineUsers" @send-message="handleSendMessage"
        @select-emoji="handleSelectEmoji" @select-image="handleSelectImage" @send-red-packet="handleSendRedPacket" />
    </div>
    <!-- 侧边栏切换按钮 -->
    <div class="sidebar-toggle" :class="{ 'sidebar-hidden': !showSidebar }" @click="toggleSidebar">
      <i :class="showSidebar ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
    </div>
    <div class="sidebar" v-show="showSidebar">
      <!-- 侧边栏组件 -->
      <Sidebar :online-users="onlineUsers" :current-topic="currentTopic" @topic-click="handleTopicClick" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import ChatHeader from "../components/ChatHeader.vue";
import MessageList from "../components/MessageList.vue";
import RoomChatInput from "../components/RoomChatInput.vue";
import Sidebar from "../components/Sidebar.vue";
import { chatApi } from "../api/chat";
import wsManager, { BACKEND_HOST_WS } from "../utils/websocket";
import { useUserStore } from "../stores/user";
import { useChatroomStore } from "../stores/chatroom";
import { userApi } from "../api/user";
import { ElMessage } from "element-plus";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { BASE_URL } from "../api/config";

const chatInputRef = ref(null);
const userStore = useUserStore();
const chatroomStore = useChatroomStore();

// 聊天室状态
const messages = ref([]);
const currentPage = ref(1);
const isLoadingMore = ref(false);
const hasMoreMessages = ref(true);
// 跟踪连续多少页被黑名单过滤后没有有效消息
const consecutiveEmptyPages = ref(0);
const MAX_CONSECUTIVE_EMPTY_PAGES = 5; // 连续5页都没有有效消息时停止加载

// 在线用户和话题 - 从store获取
const onlineUsers = ref([]);
const currentTopic = ref("");

// 侧边栏状态
const showSidebar = ref(true);

const bells = ref([])

const DEFAULT_MESSAGE_PAGE_SIZE = 20;

// 兼容旧格式的 [img]url[/img] 标记，转换为标准 img 标签
const convertLegacyImageTags = (input = "") => {
  if (typeof input !== "string" || !input) {
    return input;
  }
  return input.replace(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/gi, (_match, url) => {
    const normalized = String(url || "").trim();
    if (!normalized) {
      return "";
    }
    return `<img src="${normalized}" alt="图片" />`;
  });
};

// 兼容旧格式的 [redpacket]id[/redpacket] 标记，转换为 JSON 格式
const convertLegacyRedPacketTags = (input = "") => {
  if (typeof input !== "string" || !input) {
    return input;
  }
  // 匹配 [redpacket]...[/redpacket] 格式
  const redPacketMatch = input.match(/\[redpacket\]\s*([\s\S]*?)\s*\[\/redpacket\]/i);
  if (redPacketMatch) {
    const redPacketId = String(redPacketMatch[1] || "").trim();
    if (redPacketId) {
      // 如果内容是 JSON 字符串，直接返回
      try {
        const parsed = JSON.parse(redPacketId);
        if (parsed.msgType === "redPacket") {
          return redPacketId;
        }
      } catch {
        // 不是 JSON，是红包ID，转换为 JSON 格式
        return JSON.stringify({
          msgType: "redPacket",
          redPacketId: redPacketId,
          msg: "红包",
          money: 0,
          count: 0,
          got: 0,
          type: "random",
        });
      }
    }
  }
  return input;
};

const transformRoomMessageVoToLegacy = (record) => {
  if (!record) return null;
  const message = record.messageWrapper?.message;
  if (!message) return null;

  const senderInfo = message.sender
    ? transformUserChatResponse(message.sender)
    : null;

  const fallbackAvatar = message.sender?.avatar || "";
  const fallbackName = message.sender?.name || message.sender?.id || "";

  const parseTimestamp = (value) => {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const timestamp =
    parseTimestamp(message.timestamp) ??
    parseTimestamp(message.sentAt) ??
    parseTimestamp(message.sentTime);

  const legacyMessage = {
    oId: message.id || record.id || `${record.roomId || "room"}-${Date.now()}`,
    id: record.id,
    roomId:
      typeof record.roomId !== "undefined"
        ? record.roomId
        : message.roomId ?? null,
    userId: record.userId ?? null,
    content: message.content ?? "",
    md: message.content ?? "",
    messageWrapper: record.messageWrapper,
    rawMessage: record,
    client: message.client || message.source || "",
    timestamp: message.timestamp || message.sentAt || message.sentTime || "",
    time: timestamp,
    isHistory: true,
  };

  if (senderInfo) {
    legacyMessage.userName = senderInfo.userName || fallbackName;
    legacyMessage.userNickname = senderInfo.userNickname || fallbackName;
    legacyMessage.userAvatarURL = senderInfo.userAvatarURL || fallbackAvatar;
    legacyMessage.userAvatarURL20 =
      senderInfo.userAvatarURL20 || senderInfo.userAvatarURL || fallbackAvatar;
    legacyMessage.userAvatarURL48 =
      senderInfo.userAvatarURL48 ||
      senderInfo.userAvatarURL ||
      senderInfo.userAvatarURL20 ||
      fallbackAvatar;
    legacyMessage.userAvatarURL210 =
      senderInfo.userAvatarURL210 ||
      senderInfo.userAvatarURL ||
      fallbackAvatar;
    legacyMessage.userPoint = senderInfo.userPoint;
    legacyMessage.userIntro = senderInfo.userIntro;
  } else {
    legacyMessage.userName = fallbackName;
    legacyMessage.userNickname = fallbackName;
    legacyMessage.userAvatarURL = fallbackAvatar;
    legacyMessage.userAvatarURL20 = fallbackAvatar;
    legacyMessage.userAvatarURL48 = fallbackAvatar;
    legacyMessage.userAvatarURL210 = fallbackAvatar;
  }

  return legacyMessage;
};

const transformRealtimeChatMessage = (message) => {
  if (!message) return null;

  const record = {
    id: message.id,
    roomId: message.roomId,
    userId: message.sender?.id,
    messageWrapper: {
      message,
    },
  };

  const legacyMessage = transformRoomMessageVoToLegacy(record);

  if (!legacyMessage) return null;

  return {
    ...legacyMessage,
    type: "msg",
    isHistory: false,
    rawMessage: {
      type: "chat",
      data: message,
    },
  };
};

// 获取用户设置
const getUserSettings = () => {
  const savedSettings = utools.dbStorage.getItem("fishpi_settings") || {};
  const currentUsername = userStore.userInfo?.userName;
  return currentUsername ? savedSettings[currentUsername] || {} : savedSettings;
};

// 切换侧边栏显示状态
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
  // 保存到设置中
  const userSettings = getUserSettings();
  userSettings.defaultChatSidebarCollapsed = !showSidebar.value;
  saveUserSettings(userSettings);
};

// 保存用户设置
const saveUserSettings = (settings) => {
  const savedSettings = utools.dbStorage.getItem("fishpi_settings") || {};
  const currentUsername = userStore.userInfo?.userName;

  if (currentUsername) {
    savedSettings[currentUsername] = {
      ...savedSettings[currentUsername],
      ...settings,
    };
  } else {
    Object.assign(savedSettings, settings);
  }

  utools.dbStorage.setItem("fishpi_settings", savedSettings);
};

// 获取当前用户黑名单
const getCurrentBlacklist = () => {
  const allBlacklists = utools.dbStorage.getItem("fishpi_blacklist") || {};
  const currentUser = userStore.userInfo?.userName;
  return currentUser ? allBlacklists[currentUser] || [] : [];
};

// 将新的 UserChatResponse 格式转换为现有格式
const transformUserChatResponse = (user) => {
  if (!user) return null;
  
  // 如果已经是旧格式，直接返回
  if (user.userName && user.userAvatarURL48) {
    return user;
  }
  
  // 转换新格式到旧格式
  let baseAvatar = user.avatar || '';
  
  // 确保头像 URL 是完整的（如果是相对路径，需要转换为绝对路径）
  if (baseAvatar && !baseAvatar.startsWith('http://') && !baseAvatar.startsWith('https://') && !baseAvatar.startsWith('data:')) {
    // 如果是相对路径，尝试添加基础 URL
    if (baseAvatar.startsWith('/')) {
      // 如果以 / 开头，使用 API 基础 URL 或当前域名
      const baseUrl = BASE_URL || window.location.origin;
      baseAvatar = baseUrl.replace(/\/$/, '') + baseAvatar;
    } else {
      // 其他情况，可能需要添加基础路径
      const baseUrl = BASE_URL || window.location.origin;
      baseAvatar = baseUrl.replace(/\/$/, '') + '/' + baseAvatar;
    }
  }
  
  // 生成不同尺寸的头像 URL
  // 注意：如果 API 返回的头像 URL 不支持 size 参数，则所有尺寸都使用原始 URL
  const getAvatarUrl = (size) => {
    if (!baseAvatar) return '';
    
    // 如果是 data URI，直接返回
    if (baseAvatar.startsWith('data:')) {
      return baseAvatar;
    }
    
    // 检测 URL 是否已经包含图片处理参数或特殊格式
    // 如果包含以下情况，直接使用原始 URL，不添加 size 参数：
    // 1. 包含 imageMogr2（七牛云图片处理）
    // 2. 包含 imageView2（七牛云图片查看）
    // 3. 是 GIF 格式（GIF 添加参数可能破坏动画）
    // 4. 包含复杂的查询参数结构
    const hasImageProcessing = 
      baseAvatar.includes('imageMogr2') || 
      baseAvatar.includes('imageView2') ||
      baseAvatar.toLowerCase().includes('.gif') ||
      baseAvatar.includes('%7C'); // 包含编码的特殊字符
    
    if (hasImageProcessing) {
      // 对于已经包含图片处理参数的 URL，直接返回原始 URL
      return baseAvatar;
    }
    
    // 尝试在 URL 中添加或替换 size 参数
    try {
      const url = new URL(baseAvatar);
      // 检查是否已经有 size 参数
      if (url.searchParams.has('size')) {
        url.searchParams.set('size', size.toString());
      } else {
        // 只有在没有 size 参数时才添加
        url.searchParams.set('size', size.toString());
      }
      return url.toString();
    } catch (e) {
      // 如果 baseAvatar 不是完整 URL，尝试构造完整 URL
      if (baseAvatar.startsWith('/')) {
        const baseUrl = BASE_URL || window.location.origin;
        return baseUrl.replace(/\/$/, '') + baseAvatar;
      }
      // 如果仍然失败，直接返回原始值
      return baseAvatar;
    }
  };
  
  return {
    // 新字段映射到旧字段
    userName: user.name || user.id || '',
    userNickname: user.name || user.id || '',
    userAvatarURL: baseAvatar,
    userAvatarURL20: getAvatarUrl(20),
    userAvatarURL48: getAvatarUrl(48) || baseAvatar, // 默认使用原始头像
    userAvatarURL210: getAvatarUrl(210),
    // 保留新字段以便将来使用
    id: user.id,
    avatar: user.avatar,
    avatarFramerUrl: user.avatarFramerUrl,
    isAdmin: user.isAdmin,
    level: user.level,
    points: user.points,
    status: user.status,
    titleId: user.titleId,
    titleIdList: user.titleIdList,
    userProfile: user.userProfile,
    // 兼容字段
    userPoint: user.points,
    userIntro: user.userProfile,
  };
};

// 消息处理器映射
const messageHandlers = {
  online: (data) => {
    // console.log("处理在线用户消息:", data);
    // 转换用户数据格式（如果是从新 API 返回的格式）
    let transformedUsers = data.users || [];
    if (transformedUsers.length > 0 && transformedUsers[0] && !transformedUsers[0].userName) {
      // 如果用户数据是新格式，进行转换
      transformedUsers = transformedUsers
        .map(transformUserChatResponse)
        .filter(Boolean);
    }
    
    // 使用store更新数据，自动处理缓存
    chatroomStore.updateData({ ...data, users: transformedUsers });
    // 同步到本地ref
    onlineUsers.value = transformedUsers;
    currentTopic.value = data.discussing || "";
  },
  chat: (data) => {
    const messagePayload = data?.data?.message || data?.message;
    if (!messagePayload) {
      return;
    }

    const legacyMessage = transformRealtimeChatMessage(messagePayload);

    if (!legacyMessage) {
      return;
    }

    legacyMessage.rawMessage = {
      ...(legacyMessage.rawMessage || {}),
      event: data,
    };

    messageHandlers.msg(legacyMessage);
  },
  msg: (data) => {
    // 确保消息有必要字段，并添加到消息列表
    if (data.oId && data.content) {
      // 先处理红包格式转换
      data.content = convertLegacyRedPacketTags(data.content);
      if (data.md) {
        data.md = convertLegacyRedPacketTags(data.md);
      }
      // 再处理图片格式转换
      data.content = convertLegacyImageTags(data.content);
      if (data.md) {
        data.md = convertLegacyImageTags(data.md);
      }
      const isSelf = data.userName === userStore.userInfo?.userName;
      const hasImgTag = /\<img[^>]+src=/.test(data.content);
      const containsGenUrlInContent = /https?:\/\/fishpi\.cn\/gen/.test(data.content || '');
      const containsGenUrlInMd = /https?:\/\/fishpi\.cn\/gen/.test(data.md || '');
      // 优先处理“引用”场景：md 中包含引用头，渲染为嵌套 blockquote，并在内部替换特殊图片
      let handledQuote = false;
      if ((data.md || '').includes('引用')) {
        try {
          const md = data.md || '';
          const rendered = renderNestedQuotesFromMd(md);
          if (rendered && rendered.trim()) {
            data.content = rendered;
            handledQuote = true;
          }
        } catch (e) {
          handledQuote = false;
        }
      }
      if (!handledQuote) {
        if (hasImgTag && containsGenUrlInContent) {
          data.content = generateImageCardFromString(data.content);
        } else if (containsGenUrlInMd) {
          data.content = generateImageCardFromString(data.md);
        }
      }

      messages.value = [
        ...messages.value,
        { ...data, isHistory: false, isSelf },
      ];
    }
  },
  barrager: (data) => {
    console.log("处理弹幕消息:", data);
    // 将弹幕消息添加到消息列表，包含完整的用户信息
    messages.value = [
      ...messages.value,
      {
        type: "barrager",
        content: data.barragerContent,
        time: new Date().getTime(),
        _key: `barrager-${Date.now()}`,
        isHistory: false,
        isSelf: false,
        userAvatarURL: data.userAvatarURL,
        userAvatarURL20: data.userAvatarURL20,
        userAvatarURL48: data.userAvatarURL48,
        userAvatarURL210: data.userAvatarURL210,
        userNickname: data.userNickname,
        userName: data.userName,
        barragerColor: data.barragerColor,
      },
    ];
  },
  revoke: (data) => {
    console.log("处理撤回消息:", data);
    // 找到要撤回的消息
    const index = messages.value.findIndex((msg) => msg.oId === data.oId);
    if (index !== -1) {
      // 替换为撤回提示消息
      messages.value[index] = {
        ...messages.value[index],
        content: `<div class="revoke-message">该消息已被撤回</div>`,
        isRevoked: true,
      };
    }
  },
  userMessageRevoke: (data) => {
    console.log("处理用户撤回消息:", data);
    // 获取要撤回的消息ID
    // 根据发送的消息格式 { type: 2, data: { type: 'userMessageRevoke', content: messageId } }
    // 服务器可能返回相同的格式，所以优先使用 data.data.content
    // 如果服务器转换了格式，也可能直接返回 data.data（字符串类型）
    let messageId = null;
    
    if (data.data) {
      // 如果 data.data 是对象且包含 content，使用 content
      if (typeof data.data === 'object' && data.data.content) {
        messageId = data.data.content;
      } 
      // 如果 data.data 是字符串，直接使用
      else if (typeof data.data === 'string') {
        messageId = data.data;
      }
    }
    
    // 如果没有找到消息ID，尝试使用 data.content
    if (!messageId && data.content) {
      messageId = data.content;
    }
    
    if (!messageId) {
      console.warn("撤回消息ID不存在:", data);
      return;
    }

    // 从消息列表中过滤掉被撤回的消息
    // 检查消息的 oId 或 id 是否匹配
    const beforeLength = messages.value.length;
    messages.value = messages.value.filter((msg) => {
      return msg.oId !== messageId && msg.id !== messageId;
    });
    const afterLength = messages.value.length;
    
    if (beforeLength > afterLength) {
      console.log(`已撤回消息，ID: ${messageId}，从 ${beforeLength} 条消息减少到 ${afterLength} 条`);
    }
  },
  redPacketStatus: (data) => {
    console.log("处理红包状态更新:", data);
    // 添加红包领取提示消息
    messages.value = [
      ...messages.value,
      {
        type: "red-packet-status",
        content: `<div class=\"red-packet-status-message\">\n          <span class=\"receiver\">${data.whoGot}</span> 领取了 <span class=\"sender\">${data.whoGive}</span> 的红包\n        </div>`,
        time: new Date().getTime(),
        _key: `red-packet-status-${data.oId}-${Date.now()}`,
        isHistory: false,
        isSelf: false,
      },
    ];

    // 更新原红包消息的状态
    const index = messages.value.findIndex((msg) => {
      if (msg.oId !== data.oId) {
        return false;
      }
      // 检查是否是红包消息（支持 JSON 格式和 [redpacket]...[/redpacket] 格式）
      if (!msg.content || typeof msg.content !== "string") {
        return false;
      }
      // 检查是否是 [redpacket]...[/redpacket] 格式
      if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(msg.content)) {
        return true;
      }
      // 检查是否是 JSON 格式的红包消息
      try {
        const content = JSON.parse(msg.content);
        return content.msgType === "redPacket";
      } catch {
        return false;
      }
    });

    if (index !== -1) {
      const originalMsg = messages.value[index];
      try {
        // 如果内容是 [redpacket]...[/redpacket] 格式，先转换
        let contentStr = originalMsg.content;
        if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(contentStr)) {
          contentStr = convertLegacyRedPacketTags(contentStr);
        }
        const content = JSON.parse(contentStr);
        content.got = data.got;
        content.count = data.count;
        messages.value[index] = {
          ...originalMsg,
          content: JSON.stringify(content),
        };
      } catch (error) {
        console.error("更新红包状态失败:", error);
      }
    }
  },
  discussChanged: (data) => {
    console.log("处理话题变更:", data);
    // 更新当前话题
    currentTopic.value = data.newDiscuss;
    // 更新store中的话题
    chatroomStore.updateTopic(data.newDiscuss);

    // 添加话题变更提示消息
    messages.value = [
      ...messages.value,
      {
        type: "discuss-changed",
        whoChanged: data.whoChanged,
        newDiscuss: data.newDiscuss,
        time: new Date().getTime(),
        _key: `discuss-changed-${Date.now()}`,
        isHistory: false,
        isSelf: false,
      },
    ];
  },
  customMessage: (data) => {
    console.log("处理自定义消息:", data);
    // 将自定义消息添加到消息列表
    messages.value = [
      ...messages.value,
      {
        type: "custom-message",
        content: data.message,
        time: new Date().getTime(),
        _key: `custom-message-${Date.now()}`,
        isHistory: false,
        isSelf: false,
      },
    ];
  },
  // 可以根据需要添加其他消息类型的处理器
};

// 连接WebSocket
const connectWebSocket = async () => {
  try {
    // 直接使用后端地址建立连接
    await wsManager.connect(BACKEND_HOST_WS, {
      connectionId: "chat-room",
    });

    wsManager.on("message", handleMessage, "chat-room");
  } catch (error) {
    console.error("WebSocket连接失败:", error);
  }
};

// 处理接收到的消息
const handleMessage = (data) => {
  // 判断是否为黑名单用户
  const incomingUserName =
    data.userName ||
    data?.sender?.userName ||
    data?.sender?.name ||
    data?.data?.message?.sender?.userName ||
    data?.data?.message?.sender?.name;

  if (incomingUserName) {
    const blacklist = getCurrentBlacklist();
    if (blacklist.some((u) => u.userName === incomingUserName)) {
      return; // 黑名单消息直接丢弃
    }
  }
  // console.log("接收到消息：", data);

  // 检查是否是 userMessageRevoke 消息（可能是嵌套在 data.data.type 中）
  if (data.data?.type === 'userMessageRevoke') {
    const handler = messageHandlers.userMessageRevoke;
    if (handler) {
      handler(data);
      return;
    }
  }

  // 根据消息类型调用相应的处理器
  const handler = messageHandlers[data.type];

  if (handler) {
    handler(data);
  } else {
    // 如果没有特定的处理器，将其视为普通聊天消息
    // 确保消息有必要字段，并添加到消息列表
    if (data.oId && data.content) {
      // 先处理红包格式转换
      data.content = convertLegacyRedPacketTags(data.content);
      if (data.md) {
        data.md = convertLegacyRedPacketTags(data.md);
      }
      // 再处理图片格式转换
      data.content = convertLegacyImageTags(data.content);
      if (data.md) {
        data.md = convertLegacyImageTags(data.md);
      }
      const isSelf = data.userName === userStore.userInfo?.userName;
      messages.value = [...messages.value, { ...data, isSelf }];
    }
  }
};

// 加载历史消息
const loadMessages = async (page = 1) => {
  if (isLoadingMore.value || (!hasMoreMessages.value && page !== 1)) return;
  isLoadingMore.value = true;
  try {
    const response = await chatApi.getChatMessages({
      current: page,
      pageSize: DEFAULT_MESSAGE_PAGE_SIZE,
      roomId: -1,
      sortField: "id",
      sortOrder: "desc",
    });
    const pageData = response?.data || {};
    const records = Array.isArray(pageData.records)
      ? pageData.records
      : [];
    const transformedMessages = records
      .map(transformRoomMessageVoToLegacy)
      .filter(Boolean);
    if (transformedMessages.length > 0) {
      // 过滤黑名单消息
      const blacklist = getCurrentBlacklist();
      const filteredMessages = transformedMessages.filter((msg) => {
        if (!msg?.userName) return true;
        return !blacklist.some((u) => u.userName === msg.userName);
      });
      // 所有分页的消息都需要翻转
      const reversedMessages = filteredMessages
        .reverse()
        .map((msg) => {
          try {
            // 先处理红包格式转换
            let content = convertLegacyRedPacketTags(msg.content || '');
            // 再处理特殊图片
            content = replaceSpecialImagesInHtmlContent(content);
            return { ...msg, content, isHistory: true };
          } catch (e) {
            return { ...msg, isHistory: true };
          }
        });

      if (page === 1) {
        messages.value = reversedMessages;
        // 重置连续空页计数
        resetConsecutiveEmptyPages();
        // 只在第一次加载时滚动到底部
        nextTick(() => {
          const messageList = document.querySelector(".message-list");
          if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
          }
        });
      } else {
        // 保存当前滚动位置
        const messageList = document.querySelector(".message-list");
        const scrollHeight = messageList.scrollHeight;
        const scrollTop = messageList.scrollTop;

        // 将新消息添加到数组前面
        messages.value = [...reversedMessages, ...messages.value];

        // 在下一个渲染周期恢复滚动位置
        nextTick(() => {
          const newScrollHeight = messageList.scrollHeight;
          messageList.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
        });
      }

      // 检查是否还有更多消息
      // 注意：判断是否还有更多消息应该基于服务器返回的原始数据（records.length），
      // 而不是过滤后的数据（filteredMessages.length），因为黑名单过滤可能导致
      // 当前页过滤后没有消息，但服务器端可能还有更多消息
      const totalPages = pageData?.pages;
      const pageSizeFromResponse =
        pageData?.size ?? DEFAULT_MESSAGE_PAGE_SIZE;
      
      // 如果过滤后没有有效消息，增加连续空页计数
      if (filteredMessages.length === 0 && records.length > 0) {
        consecutiveEmptyPages.value++;
      } else if (filteredMessages.length > 0) {
        // 如果有有效消息，重置计数器
        consecutiveEmptyPages.value = 0;
      }
      
      if (
        typeof totalPages === "number" &&
        totalPages > 0
      ) {
        // 如果有总页数信息，优先使用总页数判断
        hasMoreMessages.value = page < totalPages;
        // 但如果连续太多页都没有有效消息，也停止加载
        if (consecutiveEmptyPages.value >= MAX_CONSECUTIVE_EMPTY_PAGES) {
          hasMoreMessages.value = false;
        }
      } else if (records.length < pageSizeFromResponse) {
        // 使用原始 records.length 而不是 filteredMessages.length
        hasMoreMessages.value = false;
      } else {
        // 如果服务器返回了完整的一页数据，即使过滤后没有消息，也应该继续尝试加载
        // 因为可能下一页有非黑名单的消息
        // 但如果连续太多页都没有有效消息，停止加载
        hasMoreMessages.value = consecutiveEmptyPages.value < MAX_CONSECUTIVE_EMPTY_PAGES;
      }
    } else {
      // 服务器返回空数据，确实没有更多消息了
      hasMoreMessages.value = false;
    }
  } catch (error) {
    console.error("加载消息失败:", error);
    hasMoreMessages.value = false;
  } finally {
    isLoadingMore.value = false;
  }
};

// 处理加载更多消息
const handleLoadMore = () => {
  currentPage.value++;
  loadMessages(currentPage.value);
};

// 重置连续空页计数（在重新加载第一页时调用）
const resetConsecutiveEmptyPages = () => {
  consecutiveEmptyPages.value = 0;
};

// 处理发送消息
const handleSendMessage = async (content) => {
  if (!content || !content.trim()) return;

  try {
    const currentUser = userStore.userInfo;
    const userIpInfo = {}; // 如果有IP信息，可以从其他地方获取
    const now = Date.now();
    const userName = currentUser.userName || "游客";
    const userNickname =
      currentUser.userNickname || currentUser.userName || "游客";
    const fallbackAvatar =
      currentUser.userAvatar ||
      "https://api.dicebear.com/7.x/avataaars/svg?seed=visitor";
    const clientName = import.meta.env.VITE_CLIENT || "";
    
    const message = {
      id: `${now}`,
      content,
      sender: {
        id: String(currentUser.id),
        name: userName,
        avatar: fallbackAvatar,
        level: currentUser.level || 1,
        points: currentUser.points || 0,
        isAdmin: currentUser.userRole === "admin",
        isVip: currentUser.vip,
        region: userIpInfo?.region || "未知地区",
        country: userIpInfo?.country || "未知国家",
        avatarFramerUrl: currentUser.avatarFramerUrl,
        titleId: currentUser.titleId,
        titleIdList: currentUser.titleIdList,
      },
      timestamp: new Date(now).toISOString(),
      region: userIpInfo?.region || "未知地区",
      country: userIpInfo?.country || "未知国家",
    };

    // 由于服务端全局广播会跳过发送人，前端需要立即将消息插入本地列表
    const localMessage = {
      oId: message.id,
      content,
      md: content,
      userId: currentUser.id,
      userName,
      userNickname,
      userAvatarURL: fallbackAvatar,
      userAvatarURL20: fallbackAvatar,
      userAvatarURL48: fallbackAvatar,
      userAvatarURL210: fallbackAvatar,
      userPoint: currentUser.points || 0,
      userIntro: currentUser.userProfile || "",
      client: clientName,
      time: now,
      timestamp: now,
      isHistory: false,
      isSelf: true,
    };

    messages.value = [...messages.value, localMessage];

    const messageData = JSON.stringify({
      type: 2, // 聊天消息类型
      userId: -1,
      data: {
        type: "chat",
        content: {
          message: message,
        },
      },
    });
    wsManager.send(messageData, "chat-room");
  } catch (error) {
    console.error("发送消息失败:", error);
  }
};

// 处理选择表情
const handleSelectEmoji = (emoji) => {
  if (typeof emoji === "string") {
    // 默认表情已经在 RoomChatInput 中处理了
    return;
  }

  // 处理表情包 - 发送 Markdown 格式的图片表情
  const markdownEmoji = `![图片表情](${emoji.cover})`;
  chatApi
    .sendMessage(markdownEmoji)
    .then(() => {
      // 重新加载消息列表
      messages.value = [];
      currentPage.value = 1;
      hasMoreMessages.value = true;
      loadMessages(1);
    })
    .catch((error) => {
      console.error("发送表情包消息失败:", error);
    });
};

// 处理选择图片
const handleSelectImage = () => {
  // TODO: 处理图片选择
  console.log("选择图片");
};

// 处理发送红包
const handleSendRedPacket = async (redPacketData) => {
  try {
    const { msg, money, count, type, gesture, recivers } = redPacketData;
    const redPacketContent = JSON.stringify({
      msg,
      money,
      count,
      type,
      gesture,
      recivers: recivers || [],
    });

    const content = `[redpacket]${redPacketContent}[/redpacket]`;
    await chatApi.sendMessage(content);
  } catch (error) {
    console.error("发送红包失败:", error);
  }
};

const handleAtUser = (userName) => {
  chatInputRef.value?.insertAtUser(userName);
};

// 处理+1按钮
const handleSendSameMessage = (content) => {
  if (!content) return;
  handleSendMessage(content);
};

// 处理话题点击
const handleTopicClick = (formattedTopic) => {
  chatInputRef.value?.insertTopic(formattedTopic);
};

// 处理引用消息
const handleQuote = (message) => {
  chatInputRef.value?.setQuote(message);
};

// 处理添加表情
const handleAddEmoji = async (item) => {
  try {
    // 从消息内容中提取图片URL
    const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (!match || !match[1]) {
      ElMessage.warning("无法提取表情图片地址");
      return;
    }

    const imgSrc = match[1];
    // 获取当前表情包列表
    const res = await userApi.getEmotionPack("emojis");

    if (res.code !== 0) {
      ElMessage.error("获取表情包列表失败");
      return;
    }

    // 解析表情包数据，处理空数据的情况
    let urls = [];
    try {
      urls = res.data ? JSON.parse(res.data) : [];
      // 确保urls是数组
      if (!Array.isArray(urls)) {
        urls = [];
      }
    } catch (e) {
      console.warn("解析表情包数据失败，将使用空数组", e);
      urls = [];
    }

    // 检查是否已存在相同的表情
    if (urls.includes(imgSrc)) {
      ElMessage.warning("该表情已存在");
      return;
    }

    // 添加新的图片URL
    urls.push(imgSrc);

    // 同步到服务器
    const syncRes = await userApi.syncEmotionPack(
      "emojis",
      JSON.stringify(urls)
    );
    if (syncRes.code === 0) {
      ElMessage.success("添加表情成功");
    } else {
      ElMessage.error("同步表情包失败");
    }
  } catch (error) {
    console.error("添加表情失败:", error);
    ElMessage.error("添加表情失败：" + (error.message || "未知错误"));
  }
};

// 处理黑名单过滤后的消息更新
const handleUpdateMessages = (updatedMessages) => {
  // 如果传入的是数组，直接替换
  if (Array.isArray(updatedMessages)) {
    messages.value = updatedMessages;
  } else {
    // 兼容旧格式
    messages.value = updatedMessages;
  }
};

// 定义账号切换处理函数
const handleAccountSwitch = async () => {
  // 断开旧的连接
  wsManager.close("chat-room");
  // 清空消息列表
  messages.value = [];
  currentPage.value = 1;
  hasMoreMessages.value = true;
  // 重置连续空页计数
  resetConsecutiveEmptyPages();
  // 清除聊天室缓存
  chatroomStore.clearCache();
  // 重新连接并加载消息
  await connectWebSocket();
  await loadMessages();
  // 重新获取侧边栏状态
  const userSettings = getUserSettings();
  showSidebar.value = !userSettings.defaultChatSidebarCollapsed;
};

// 监听黑名单更新事件
const handleBlacklistUpdated = (event) => {
  const { action, userName } = event.detail;

  if (action === "add") {
    // 添加黑名单：过滤当前消息列表，移除该用户的消息
    const blacklist = getCurrentBlacklist();
    const blacklistUserNames = blacklist.map((u) => u.userName);

    // 过滤掉黑名单用户的消息
    const filteredMessages = messages.value.filter((msg) => {
      if (!msg.userName) return true; // 系统消息保留
      return !blacklistUserNames.includes(msg.userName);
    });

    messages.value = filteredMessages;
  } else if (action === "remove") {
    // 移除黑名单：需要重新加载消息，因为可能有该用户的历史消息需要显示
    // 重新加载当前页的消息
    const currentMessages = messages.value;
    currentPage.value = 1;
    hasMoreMessages.value = true;
    loadMessages(1);
  }
};

const getBells = () => {
  const savedBells = utools.dbStorage.getItem("fishpi_bells") || [];
  return savedBells;
}
// 检查是否包含
const checkBellsInMessage = (mainString, elementsArray) => {
  const foundElements = elementsArray.filter(element =>
    mainString.includes(element)
  );
  return foundElements.length > 0;
}

//从特殊图片链接字符串中解析参数
const parseImageParams = (inputStr) => {
  console.log("parseImageParams12222222222222222222222222222333333123333333333333333333333333333333:", inputStr);
  // 支持三种输入：Markdown 图片、HTML <img>、直接 URL 字符串
  let url = null;
  let title = null;
  // Markdown
  const mdMatch = inputStr.match(/!\[.*?\]\((https?[^)]+)\)/);
  if (mdMatch) {
    url = mdMatch[1];
  }
  // HTML <img>
  if (!url) {
    const htmlMatch = inputStr.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch) {
      url = htmlMatch[1];
      const titleMatch = inputStr.match(/<img[^>]+title=["']([^"']+)["']/i);
      if (titleMatch) {
        title = titleMatch[1];
      }
    }
  }
  // 直接 URL
  if (!url && /^https?:\/\//.test(inputStr.trim())) {
    url = inputStr.trim();
  }

  if (!url) {
    throw new Error('未找到有效的图片URL');
  }

  // 解析URL参数
  const decodeHtmlEntities = (s) => String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  const normalizedUrl = decodeHtmlEntities(url);
  const urlObj = new URL(normalizedUrl);
  const urlParams = new URLSearchParams(urlObj.search);
  // 解析颜色参数：支持单色、逗号分隔多色或 auto
  const parseColorParam = (raw) => {
    if (!raw) return { value: null, values: null, isAuto: false };
    const v = String(raw).trim();
    if (!v) return { value: null, values: null, isAuto: false };
    if (v.toLowerCase() === 'auto') return { value: 'auto', values: null, isAuto: true };
    const parts = v.split(',').map(s => s.trim()).filter(Boolean);
    const normalizeHex = (s) => s.startsWith('#') ? s : ('#' + s);
    if (parts.length > 1) {
      return { value: null, values: parts.map(normalizeHex), isAuto: false };
    }
    return { value: normalizeHex(parts[0]), values: null, isAuto: false };
  };

  const backParsed = parseColorParam(urlParams.get('backcolor'));
  const fontParsed = parseColorParam(urlParams.get('fontcolor'));

  return {
    // 原有字段
    imageUrl: urlParams.get('url'),
    text: (() => { const t = urlParams.get('txt'); try { return t ? decodeURIComponent(t) : t; } catch { return t; } })(),
    backgroundColor: backParsed.value, // 单色时为字符串；多色/auto时为 null
    fontColor: fontParsed.value,       // 单色时为字符串；多色/auto时为 null
    altText: "图片表情",
    originalUrl: normalizedUrl,
    title: title || '加辣',

    // 新增字段
    version: urlParams.get('ver') || '0.1',
    way: urlParams.get('way') || 'bottom',
    fontway: urlParams.get('fontway') || 'bottom',
    shadow: parseFloat(urlParams.get('shadow')),
    anime: parseFloat(urlParams.get('anime')),
    border: parseInt(urlParams.get('border')),
    barlen: parseInt(urlParams.get('barlen')),
    fontsize: parseInt(urlParams.get('fontsize')),
    barradius: parseInt(urlParams.get('barradius')),

    // 颜色增强信息
    backgroundColors: backParsed.values, // 多色时为数组，否则为 null
    backgroundAuto: backParsed.isAuto,
    fontColors: fontParsed.values,       // 多色时为数组，否则为 null
    fontAuto: fontParsed.isAuto,
  };
}
//重新生成特殊图片消息内容（兼容旧签名 + 新参数对象）
const generateImageCard = (arg1, text, backgroundColor = '#F59B95', fontColor = '#f3f1f1', scale = 0.7) => {
  const isNew = typeof arg1 === 'object' && arg1 !== null && 'imageUrl' in arg1;
  const p = isNew
    ? arg1
    : {
      imageUrl: arg1,
      text,
      backgroundColor,
      fontColor,
      scale,
      title: '加辣',
      version: '0.1',
      way: 'bottom',
      fontway: 'bottom',
      shadow: 0,
      anime: 0.7,
      size: 48,
      border: 10,
      barlen: undefined,
      fontsize: 18,
      barradius: 80,
      backgroundColors: null,
      backgroundAuto: false,
      fontColors: null,
      fontAuto: false,
    };

  const toCssDirection = (dir) => {
    const map = {
      top: 'to top',
      bottom: 'to bottom',
      left: 'to left',
      right: 'to right',
      'top-left': 'to top left',
      'top-right': 'to top right',
      'bottom-left': 'to bottom left',
      'bottom-right': 'to bottom right',
    };
    if (!dir) return 'to bottom';
    if (/^\d+deg$/.test(dir)) return dir;
    return map[dir] || 'to bottom';
  };

  const buildBackground = () => {
    const dir = toCssDirection(p.way);
    if (p.backgroundAuto) {
      return `linear-gradient(${dir}, #ffecd2, #fcb69f)`;
    }
    if (Array.isArray(p.backgroundColors) && p.backgroundColors.length > 1) {
      return `linear-gradient(${dir}, ${p.backgroundColors.join(', ')})`;
    }
    return p.backgroundColor || '#F59B95';
  };

  const buildFontStyles = () => {
    const dir = toCssDirection(p.fontway);
    if (p.fontAuto) {
      return {
        color: 'transparent',
        bg: `linear-gradient(${dir}, #89f7fe, #66a6ff)`,
      };
    }
    if (Array.isArray(p.fontColors) && p.fontColors.length > 1) {
      return {
        color: 'transparent',
        bg: `linear-gradient(${dir}, ${p.fontColors.join(', ')})`,
      };
    }
    return { color: p.fontColor || '#f3f1f1', bg: null };
  };

  const bg = buildBackground();
  const font = buildFontStyles();
  const figureHeight = Number.isFinite(p.size) ? `${p.size}px` : '48px';
  const avatarSize = Number.isFinite(p.size) ? `${Math.max(24, Math.round(p.size * 0.98))}px` : '47px';
  const padding = Number.isFinite(p.border) ? `${p.border}px` : '10px';
  const boxShadowBlur = Number.isFinite(p.border) ? Math.max(6, 10 + p.border) : 10;
  const shadowOpacity = Number.isFinite(p.shadow) ? Math.min(1, Math.max(0, p.shadow)) : 0.5;
  const animationDuration = Number.isFinite(p.anime) ? p.anime : 0.7;
  const captionFontSize = Number.isFinite(p.fontsize) ? `${p.fontsize}px` : '18px';
  const captionRadius = Number.isFinite(p.barradius) ? `${p.barradius}px` : '80px';
  const captionWidth = Number.isFinite(p.barlen) ? `${p.barlen}px` : 'auto';
  const transformScale = Number.isFinite(p.scale) ? p.scale : 0.7;

  const captionExtra = font.bg
    ? `background: ${font.bg}; -webkit-background-clip: text; background-clip: text; color: transparent;`
    : `color: ${font.color};`;

  return `
<figure style="
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    line-height: 0;
    background: ${bg};
    padding: ${padding};
    border-radius: ${captionRadius};
    text-align: center;
    box-shadow: rgba(0,0,0,${shadowOpacity}) 0px 0px ${boxShadowBlur}px;
    position: relative;
    height: ${figureHeight};
    transform: scale(${transformScale});
    transform-origin: left center;
">
    <img src="${p.imageUrl}"
         alt="${p.text}"
         title="${p.title || '加辣'}"
         style="
            position: absolute;
            width:${avatarSize};
            height: ${avatarSize};
            left:0px;
            border-radius: 50%;
            box-shadow: rgba(255, 254, 238, ${Math.min(1, 0.6 + shadowOpacity / 2)}) 0px 0px 10px;
         ">
    <figcaption style="
        ${captionExtra}
        font-family: sans-serif;
        font-size: ${captionFontSize};
        line-height: 1.2;
        margin-left: calc(${avatarSize} - 5px);
        opacity: 0;
        transform: translateX(-30px);
        animation: fadeSlideIn ${animationDuration}s ease-out 0.5s forwards;
        display: inline-block;
        min-width: ${captionWidth};
        border-radius: ${captionRadius};
        padding: 0 6px;
    ">${p.text}</figcaption>
</figure>
  `.trim();
}
//根据输入字符串生成图片卡片内容
const generateImageCardFromString = (inputStr) => {
  const params = parseImageParams(inputStr);
  return generateImageCard(params);
}

// 在完整 HTML 片段中将 fishpi 特殊图片 <img> 原位替换为 <figure>
const replaceSpecialImagesInHtmlContent = (html) => {
  if (!html) return html;
  const htmlWithConvertedImages = convertLegacyImageTags(html);
  return htmlWithConvertedImages.replace(/<img[^>]+src=["'](https?:[^"']*fishpi\.cn\/gen[^"']*)["'][^>]*>/gi, (match) => {
    console.log("match12222222222222222222222222222333333123333333333333333333333333333333:", match);
    try {
      return generateImageCardFromString(match);
    } catch (e) {
      return match;
    }
  });
};

// 将 Markdown 中的特殊图片语法替换成生成的 figure（支持多处）
const replaceSpecialImagesInLine = (line) => {
  return line.replace(/!\[[^\]]*\]\((https?:[^)]+fishpi\.cn\/gen[^)]*)\)/g, (match) => {
    try {
      return generateImageCardFromString(match);
    } catch (e) {
      return match;
    }
  });
};

// 转义 HTML
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;')
  .replace(/'/g, '&#39;');

// 渲染引用头部 h5（##### 引用 @user [↩](url "title")）
const renderQuoteHeader = (content) => {
  const m = content.match(/^#{1,6}\s*引用\s*@([^\s\[]+)\s*\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)/);
  if (!m) return null;
  const user = m[1];
  const link = m[2];
  const memberUrl = user ? `https://yucoder.cn/member/${user}` : '#';
  return `<h5>引用 @<a href="${memberUrl}" aria-label="${user}" rel="nofollow">${user}</a> <a href="${link}" title="跳转至原消息" rel="nofollow">↩</a></h5>`;
};

// 将包含多级 > 的 Markdown 引用转换为嵌套的 blockquote 结构，且在任意层内替换特殊图片
const renderNestedQuotesFromMd = (md) => {
  const full = String(md || '');
  const headerIdx = full.search(/#{1,6}\s*引用\s*@/);
  const lines = full.split('\n');
  // 计算第一条以 > 开头的行的字符位置
  let firstQuoteLineIdx = -1;
  let pos = 0;
  for (let li = 0; li < lines.length; li++) {
    if (/^\s*>+/.test(lines[li])) { firstQuoteLineIdx = pos; break; }
    pos += lines[li].length + 1; // +1 for the newline
  }
  // 计算起始：取最早出现的 引用头 或 > 行
  let startIdx = -1;
  if (headerIdx >= 0 && firstQuoteLineIdx >= 0) startIdx = Math.min(headerIdx, firstQuoteLineIdx);
  else if (headerIdx >= 0) startIdx = headerIdx;
  else startIdx = firstQuoteLineIdx; // may be -1

  let leadRaw = '';
  let quoteSegment = '';
  if (startIdx >= 0) {
    leadRaw = full.slice(0, startIdx).trim();
    quoteSegment = full.slice(startIdx);
  } else {
    // 没有引用，仅正文
    return full.trim() ? `<p>${escapeHtml(full.trim())}</p>` : '';
  }

  const qLines = quoteSegment.split('\n');
  let htmlParts = [];
  let currentLevel = 0;
  // 如果开头就是“##### 引用 @...”而非 > 行，先渲染 header 行
  const firstLine = qLines[0] || '';
  const firstHeader = renderQuoteHeader(firstLine.trim());
  let qStart = 0;
  if (firstHeader) {
    htmlParts.push(firstHeader);
    qStart = 1;
  }
  // 从 qStart 开始处理 > 引用行
  for (let i = qStart; i < qLines.length; i++) {
    const line = qLines[i];
    const m = line.match(/^\s*(>+)\s?(.*)$/);
    if (!m) { continue; }
    const level = m[1].length;
    const content = m[2];
    if (level > currentLevel) {
      for (let k = 0; k < level - currentLevel; k++) htmlParts.push('<blockquote>');
    } else if (level < currentLevel) {
      for (let k = 0; k < currentLevel - level; k++) htmlParts.push('</blockquote>');
    }
    currentLevel = level;
    const trimmed = content.trim();
    const headerHtml = renderQuoteHeader(trimmed);
    if (headerHtml) {
      htmlParts.push(headerHtml);
    } else {
      const replaced = replaceSpecialImagesInLine(trimmed);
      if (replaced === trimmed) {
        const safe = escapeHtml(trimmed);
        if (safe.trim()) htmlParts.push(`<p>${safe}</p>`);
      } else {
        htmlParts.push(`<p>${replaced}</p>`);
      }
    }
  }
  for (let k = 0; k < currentLevel; k++) htmlParts.push('</blockquote>');

  const leadHtml = leadRaw ? `<p>${escapeHtml(leadRaw)}</p>` : '';
  return leadHtml + htmlParts.join('');
};


// 获取在线用户列表
let onlineUsersPollingTimer = null;

const fetchOnlineUsers = async () => {
  try {
    const response = await chatApi.getOnlineUserListUsingGet();
    if (response.code === 0 && response.data) {
      // 转换新格式到旧格式
      const transformedUsers = response.data
        .map(transformUserChatResponse)
        .filter(Boolean); // 过滤掉 null 值
      
      // 更新 store 和本地 ref
      chatroomStore.updateOnlineUsers(transformedUsers);
      onlineUsers.value = transformedUsers;
    }
  } catch (error) {
    console.error("获取在线用户列表失败:", error);
    // 如果 API 失败，继续使用 WebSocket 数据
  }
};

onMounted(() => {
  // 初始化聊天室store
  chatroomStore.init();


  // 从缓存加载数据到本地ref
  onlineUsers.value = chatroomStore.cachedOnlineUsers;
  currentTopic.value = chatroomStore.cachedTopic;

  bells.value = getBells();

  // 从设置中获取侧边栏状态
  const userSettings = getUserSettings();
  showSidebar.value = !userSettings.defaultChatSidebarCollapsed;

  // 获取在线用户列表
  fetchOnlineUsers();
  onlineUsersPollingTimer = setInterval(fetchOnlineUsers, 30000);

  connectWebSocket();
  loadMessages();
  // 设置输入框焦点
  nextTick(() => {
    chatInputRef.value?.focus();
  });

  // 监听账号切换事件
  window.addEventListener("fishpi:account-switched", handleAccountSwitch);

  // 监听黑名单更新事件
  window.addEventListener("fishpi:blacklist-updated", handleBlacklistUpdated);
});

onUnmounted(() => {
  wsManager.close("chat-room");
  if (onlineUsersPollingTimer) {
    clearInterval(onlineUsersPollingTimer);
    onlineUsersPollingTimer = null;
  }
  // 移除事件监听
  window.removeEventListener("fishpi:account-switched", handleAccountSwitch);
  window.removeEventListener(
    "fishpi:blacklist-updated",
    handleBlacklistUpdated
  );
});
</script>

<style scoped>
.chatroom-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--background-color);
  position: relative;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.chat-area.full-width {
  margin-right: 0;
}

.sidebar {
  width: 150px;
  background-color: var(--card-bg);
  border-left: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.sidebar-toggle {
  position: absolute;
  right: 150px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 40px;
  background-color: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: 12px 0 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  opacity: 0;
  pointer-events: none;
}

.sidebar-toggle.sidebar-hidden {
  right: 0;
}

.sidebar-toggle:hover {
  background-color: var(--border-color);
}

.sidebar-toggle i {
  font-size: 12px;
  color: var(--sub-text-color);
}

/* 通知消息样式 */
.notification-message {
  text-align: center;
  color: var(--sub-text-color);
  font-size: 12px;
  margin: 8px auto;
  padding: 4px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.notification-message .changer {
  color: var(--primary-color);
  font-weight: 500;
}

.notification-message .new-topic {
  color: var(--primary-color);
  font-weight: 500;
  font-style: italic;
}

.sidebar-toggle {
  opacity: 1;
  pointer-events: auto;
}
</style>
