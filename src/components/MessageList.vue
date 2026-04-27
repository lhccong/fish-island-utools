<template>
  <div class="message-list" ref="messageListRef" @scroll="handleScroll">
    <!-- 弹幕容器 -->
    <div class="barrager-container">
      <div v-for="barrager in barragers" :key="barrager.id" class="barrager-item" :style="{
        top: barrager.top + 'px',
        animationDuration: barrager.duration + 's',
        color: barrager.color,
      }">
        <img :src="barrager.avatar" class="barrager-avatar" />
        <span class="barrager-content">{{ barrager.content }}</span>
      </div>
    </div>
    <div v-if="isLoadingMore" class="loading-more">
      <div class="loading-spinner"></div>
      加载中...
    </div>
    <div v-if="!hasMoreMessages && messages.length > 0" class="no-more-messages">
      没有更多消息了
    </div>

    <!-- 新消息提示 -->
    <div v-if="hasNewMessages && !isAtBottom && newMessageCount > 0" class="new-messages-notification"
      :style="{ right: showSidebar ? '180px' : '32px' }" @click="scrollToBottom">
      <i class="notification-icon">↓</i>
      <span class="notification-text">{{ newMessageCount }} 条新消息</span>
    </div>

    <div class="messages">
      <template v-for="item in groupedMessages" :key="item.oId || item._key">
        <!-- 时间分隔符 -->
        <div v-if="item.type === 'time-separator'" class="time-separator">
          {{ item.timestamp }}
        </div>
        <!-- 红包状态提示 -->
        <div v-else-if="item.type === 'red-packet-status'" class="red-packet-status-separator">
          <div class="red-packet-status-content" v-html="item.content"></div>
        </div>
        <!-- 话题变更提示 -->
        <div v-else-if="item.type === 'discuss-changed'" class="red-packet-status-separator">
          <div class="red-packet-status-content">
            <span class="changer">{{ item.whoChanged }}</span>
            修改了话题为：<span class="new-topic">{{ item.newDiscuss }}</span>
          </div>
        </div>
        <!-- 自定义消息提示 -->
        <div v-else-if="item.type === 'custom-message'" class="red-packet-status-separator">
          <div class="red-packet-status-content">
            <span class="message-content">{{ item.content }}</span>
          </div>
        </div>
        <!-- 弹幕消息 -->
        <div v-else-if="item.type === 'barrager'" class="barrager-message"></div>
        <!-- 消息内容 -->
        <div v-else class="message-row" :class="{
          'message-row-self': item.userName === userStore.userInfo?.userName,
          'message-row-mentioned': isMentionedMessage(item),
        }">
          <img v-if="showAvatars" :src="item.userAvatarURL48" alt="avatar" class="message-avatar"
            @click="openUserInfoCard(item.userId, item.userName, $event, item)" @contextmenu.prevent="
              onAvatarContextMenu($event, item.userName, item.userAvatarURL48)
              " />
          <div class="message-bubble">
            <div class="message-header" v-if="item.userName !== userStore.userInfo?.userName">
              <span
                class="user-nickname at-clickable"
                @click="openUserInfoCard(item.userId, item.userName, $event, item)"
                @contextmenu.prevent="
                  onAvatarContextMenu($event, item.userName, item.userAvatarURL48)
                "
              >
                {{
                  getDisplayName(item)
                }}
              </span>
              <i v-if="isMentionedMessage(item)" class="fas fa-at mention-icon" title="提到了你"></i>
            </div>
            <div class="message-content" @click="
              (e) => {
                handleImageClick(e);
                handleLinkClick(e);
              }
            ">
              <!-- 显示引用消息 -->
              <div v-if="item.quotedMessage" class="quoted-message-preview">
                <div class="quoted-message-header">
                  <span class="quoted-message-author">{{ item.quotedMessage.sender?.name || '未知用户' }}</span>
                </div>
                <div class="quoted-message-content">
                  <!-- 如果是红包，显示红包卡片 -->
                  <div v-if="isQuotedMessageRedPacket(item.quotedMessage)" class="quoted-red-packet">
                    <div class="quoted-red-packet-icon">🧧</div>
                    <div class="quoted-red-packet-info">
                      <div class="quoted-red-packet-type">红包</div>
                      <div class="quoted-red-packet-msg">
                        {{ (() => {
                          const redPacket = parseQuotedMessageRedPacket(item.quotedMessage);
                          return redPacket?.msg || redPacket?.detail?.name || '红包';
                        })() }}
                      </div>
                    </div>
                  </div>
                  <!-- 否则显示处理后的内容（可能包含图片和文本） -->
                  <div v-else class="quoted-message-body" 
                    v-html="getProcessedQuotedMessageContent(item.quotedMessage)"
                    @click="(e) => { handleImageClick(e); handleLinkClick(e); }"
                    @load="handleImageLoad"></div>
                </div>
              </div>
              <div style="display: flex; align-items: flex-end">
                <div class="message-text" v-if="isMusicMessage(item.content)">
                  <div class="music-card" @click="playMusic(parseMusicMessage(item.content))">
                    <img :src="parseMusicMessage(item.content).coverURL" class="music-cover" alt="cover" />
                    <div class="music-info">
                      <div class="music-title">
                        {{ parseMusicMessage(item.content).title }}
                      </div>
                      <div class="music-source">网易云音乐</div>
                    </div>
                  </div>
                </div>
                <div class="message-text" v-else-if="isWeatherMessage(item.content)">
                  <div class="weather-card">
                    <div class="weather-header">
                      <div class="weather-city">
                        {{ parseWeatherMessage(item.content).t }}
                      </div>
                      <div class="weather-desc">
                        {{ parseWeatherMessage(item.content).st }}
                      </div>
                    </div>
                    <div class="weather-forecast">
                      <div v-for="(day, index) in getWeatherDays(item.content)" :key="index" class="weather-day">
                        <div class="weather-date">{{ day.date }}</div>
                        <div class="weather-icon">
                          {{ getWeatherIcon(day.weatherCode) }}
                        </div>
                        <div class="weather-temp">{{ day.max }}°</div>
                        <div class="weather-temp" style="opacity: 0.8">
                          {{ day.min }}°
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="message-text" v-else-if="isRedPacketMessage(item.content)">
                  <div class="red-packet-card" :class="{
                    finished: isRedPacketFinished(item),
                  }">
                    <div class="red-packet-content">
                      <i class="red-packet-icon">🧧</i>
                      <div class="red-packet-info">
                        <div class="red-packet-type">红包</div>
                        <div class="red-packet-msg">
                          {{ getRedPacketName(item) || "红包" }}
                        </div>
                      </div>
                    </div>
                    <div class="red-packet-footer">
                      <div class="red-packet-amount">
                        {{ getRedPacketAmount(item) || 0
                        }}<span class="unit">积分</span>
                      </div>
                      <div class="red-packet-status">
                        {{
                          isRedPacketFinished(item)
                            ? "已领完"
                            : `剩余${getRedPacketRemaining(item)}/${getRedPacketTotal(item)}个`
                        }}
                      </div>
                    </div>
                    <!-- 抢红包按钮：在卡片内部，只在未领完且用户未抢过时显示 -->
                    <div v-if="!isRedPacketFinished(item) && !isRedPacketGrabbed(item)" class="grab-red-packet-button-inner">
                      <button class="grab-btn-inner" @click.stop="grabRedPacket(item)" :disabled="isGrabbingRedPacket(item)">
                        {{ isGrabbingRedPacket(item) ? "抢红包中..." : "抢红包" }}
                      </button>
                    </div>
                    <!-- 查看详情按钮：在卡片内部，显示在底部 -->
                    <div class="view-details-button-inner">
                      <button class="view-details-btn" @click.stop="showRedPacketRecords(item)">
                        查看详情
                      </button>
                    </div>
                  </div>
                </div>
                <div class="message-text" v-else v-html="getProcessedMessageContent(item)"
                  @contextmenu.prevent="onMsgContextMenu($event, item)" @load="handleImageLoad"></div>
                <!-- +1按钮移动到气泡右侧 -->
                <button v-if="item.isGrouped" class="plus-one-btn" @click="sendSameMessage(item.content)">
                  +1
                </button>
              </div>
              <!-- 合并消息头像和人数，显示所有头像 -->
              <div v-if="item.isGrouped && showAvatars" class="grouped-users">
                <img v-for="user in item.groupUsers" :key="user.userName" :src="user.userAvatarURL48"
                  class="group-avatar" />
                <span v-if="item.groupUsers.length > 2">{{ item.groupUsers.length }}人+1</span>
              </div>
              <div
                class="message-footer"
                :class="{
                  'message-footer-self':
                    item.userName === userStore.userInfo?.userName,
                }"
              >
                <span class="message-time" v-if="getMessageTime(item)">
                  {{ getMessageTime(item) }}
                </span>
                <ClientInfo
                  v-if="item.userName !== userStore.userInfo?.userName"
                  :client="item.client"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 红包详情弹窗 -->
    <RedPacketModal :visible="showRedPacketModal" :red-packet="currentRedPacket"
      :current-user="userStore.userInfo?.userName" @close="closeRedPacketModal" />

    <!-- 用户信息卡片弹窗 -->
    <div v-if="showUserInfoModal" class="user-info-modal" @click.self="closeUserInfoCard">
      <UserInfoCard :userId="selectedUserId" :userName="selectedUserName" :x="userInfoCardX" :y="userInfoCardY"
        :currentUser="userStore.userInfo?.userName" @close="closeUserInfoCard" @detail="handleUserDetail"
        @mention="handleUserMention" />
    </div>

    <UserContextMenu :visible="showContextMenu" :x="contextMenuX" :y="contextMenuY" :items="userContextMenuItems"
      @action="handleContextMenuAction" />

    <MsgContextMenu :visible="showMsgContextMenu" :x="msgContextMenuX" :y="msgContextMenuY" :items="msgContextMenuItems"
      @action="handleMsgContextMenuAction" />

    <!-- 红包抢购记录详情弹窗 -->
    <div v-if="showRedPacketRecordsModal" class="red-packet-records-modal" @click.self="closeRedPacketRecordsModal">
      <div class="red-packet-records-modal-content">
        <div class="red-packet-records-modal-header">
          <h3>红包详情</h3>
          <button class="close-btn" @click="closeRedPacketRecordsModal">×</button>
        </div>
        <div class="red-packet-records-modal-body">
          <div v-if="loadingRecords" class="loading-records">加载中...</div>
          <div v-else-if="redPacketRecords.length === 0" class="no-records">暂无抢购记录</div>
          <div v-else class="records-list">
            <div
              v-for="record in redPacketRecords"
              :key="record.id"
              class="record-item"
              :class="{ 'lucky-king': record.isLuckyKing }"
            >
              <img :src="record.userAvatar" class="record-avatar" :alt="record.userName" />
              <div class="record-info">
                <div class="record-user">
                  <span class="user-name">{{ record.userName }}</span>
                  <span v-if="record.isLuckyKing" class="lucky-king-tag">手气王</span>
                </div>
                <div class="record-time">{{ formatRecordTime(record.grabTime) }}</div>
              </div>
              <div class="record-amount">
                {{ record.amount }} 积分
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from "vue";
import dayjs from "dayjs";
import { useUserStore } from "../stores/user";
import { chatApi } from "../api/chat";
import { userRemarkApi } from "../api/userRemark";
import { useRouter } from "vue-router";
import ClientInfo from "./ClientInfo.vue";
import UserInfoCard from "./UserInfoCard.vue";
import UserContextMenu from "./UserContextMenu.vue";
import MsgContextMenu from "./MsgContextMenu.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import RedPacketModal from "./RedPacketModal.vue";
import { createImagePreviewWindow } from "../utils/imagePreview";
import wsManager from "../utils/websocket";

const props = defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  isLoadingMore: {
    type: Boolean,
    default: false,
  },
  hasMoreMessages: {
    type: Boolean,
    default: true,
  },
  showSidebar: {
    type: Boolean,
    default: true,
  },
  hideImages: {
    type: Boolean,
    default: false,
  },
  showAvatars: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  "load-more",
  "red-packet-updated",
  "at-user",
  "quote",
  "add-emoji",
  "send-same-message",
  "update-messages",
]);

const userStore = useUserStore();
const messageListRef = ref(null);
const previousScrollHeight = ref(0);
const isAtBottom = ref(true);
const hasNewMessages = ref(false);
const newMessageCount = ref(0);
const lastMessageCount = ref(0);
const isReceiving = ref(false);
const router = useRouter();
const isPageVisible = ref(true);
const bells = ref([]);
const expandedImages = ref(new Set());
const hideImages = computed(() => props.hideImages === true);
const showAvatars = computed(() => props.showAvatars !== false);

// 用户备注状态（从后端加载）
const userRemarks = ref({});
const remarksLoaded = ref(false);

// 监听页面可见性变化
onMounted(() => {
  document.addEventListener("visibilitychange", () => {
    console.log("页面监听页面可见性变化");
    isPageVisible.value = document.visibilityState === "visible";
  });
  // 加载用户备注
  loadUserRemarks();
});

// 从后端加载用户备注
const loadUserRemarks = async () => {
  try {
    // 先尝试从后端获取
    const response = await userRemarkApi.getRemark();
    if (response.data?.content) {
      // 后端返回的是备注内容的JSON字符串，解析它
      try {
        const remarksData = JSON.parse(response.data.content);
        userRemarks.value = remarksData;
        remarksLoaded.value = true;
        console.log("已从后端加载备注数据");
      } catch (e) {
        console.error("解析后端备注数据失败:", e);
      }
    } else {
      // 后端没有数据，尝试从localStorage迁移
      migrateLocalRemarksToBackend();
    }
  } catch (error) {
    console.error("从后端加载备注失败:", error);
    // 失败后回退到localStorage
    remarksLoaded.value = false;
  }
};

// 将本地备注数据迁移到后端
const migrateLocalRemarksToBackend = async () => {
  const currentUser = userStore.userInfo?.userName;
  if (!currentUser) return;
  
  const allRemarks = utools.dbStorage.getItem("fishpi_remarks") || {};
  const localRemarks = allRemarks[currentUser] || {};
  
  if (Object.keys(localRemarks).length > 0) {
    try {
      const remarksJson = JSON.stringify(localRemarks);
      userRemarks.value = localRemarks;
      await userRemarkApi.saveRemark(remarksJson);
      console.log("已将本地备注数据迁移到后端");
    } catch (error) {
      console.error("迁移本地备注数据失败:", error);
    }
  }
  remarksLoaded.value = true;
};

// 时间分隔阈值（分钟）
const TIME_SEPARATOR_THRESHOLD_MINUTES = 5;

// 计算显示的消息列表（包含时间分隔符）
const displayedMessages = computed(() => {
  const list = [];
  let lastMessageTime = null;

  // 遍历消息（不需要反转，因为消息已经按时间顺序排列）
  for (const message of props.messages) {
    const currentTime = dayjs(message.time);

    // 检查是否需要在当前消息前添加分隔符
    if (lastMessageTime) {
      const timeDiffMinutes = currentTime.diff(lastMessageTime, "minute");
      const isDifferentDay = !currentTime.isSame(lastMessageTime, "day");

      if (
        isDifferentDay ||
        timeDiffMinutes > TIME_SEPARATOR_THRESHOLD_MINUTES
      ) {
        list.push({
          type: "time-separator",
          timestamp: isDifferentDay
            ? currentTime.format("YYYY-MM-DD")
            : currentTime.format("HH:mm"),
          _key: `separator-${message.oId || Math.random()
            }-${currentTime.valueOf()}`,
        });
      }
    } else if (props.messages.length > 0) {
      // 为第一条消息添加分隔符
      list.push({
        type: "time-separator",
        timestamp: currentTime.format("YYYY-MM-DD"),
        _key: `separator-first-${message.oId || Math.random()
          }-${currentTime.valueOf()}`,
      });
    }

    // 添加当前消息
    list.push(message);
    lastMessageTime = currentTime;
  }

  return list;
});

// 新增：分组合并消息
const groupedMessages = computed(() => {
  const groups = [];
  let buffer = [];
  const flushBuffer = () => {
    if (buffer.length >= 3) {
      groups.push({
        ...buffer[0],
        isGrouped: true,
        groupUsers: buffer.slice(1).map((m) => ({
          userName: m.userName,
          userAvatarURL48: m.userAvatarURL48,
        })),
        groupCount: buffer.length - 1,
      });
    } else {
      groups.push(...buffer);
    }
    buffer = [];
  };
  for (const message of displayedMessages.value) {
    // 跳过特殊类型
    if (
      message.type === "time-separator" ||
      message.type === "red-packet-status"
    ) {
      flushBuffer();
      groups.push(message);
      continue;
    }
    if (
      buffer.length > 0 &&
      buffer[0].content === message.content &&
      !isRedPacketMessage(message.content) &&
      !isWeatherMessage(message.content) &&
      !isMusicMessage(message.content)
    ) {
      buffer.push(message);
    } else {
      flushBuffer();
      buffer.push(message);
    }
  }
  flushBuffer();
  return groups;
});

// 检查是否在底部
const checkIfAtBottom = () => {
  if (messageListRef.value) {
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.value;
    isAtBottom.value = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
  }
};

// 监听消息变化，自动加载红包详情
watch(
  () => props.messages,
  (newMessages, oldMessages) => {
    // 检测新增的红包消息，自动加载详情
    if (newMessages.length > oldMessages.length) {
      const oldMessageIds = new Set(oldMessages.map(msg => msg.oId));
      const newRedPacketMessages = newMessages.filter(msg => {
        return !oldMessageIds.has(msg.oId) && isRedPacketMessage(msg.content);
      });

      // 异步加载所有新增红包的详情
      newRedPacketMessages.forEach(item => {
        loadRedPacketDetail(item);
      });
    }

    if (newMessages.length > oldMessages.length) {
      const oldMessageSet = new Set(oldMessages);
      const addedMessages = newMessages.filter(
        (msg) => !oldMessageSet.has(msg)
      );
      const onlyHistoryAdded =
        addedMessages.length > 0 &&
        oldMessages.length > 0 &&
        addedMessages.every((msg) => msg?.isHistory);

      if (onlyHistoryAdded) {
        // 加载历史消息时不自动滚动到底部
        nextTick(() => {
          checkIfAtBottom();
        });
        return;
      }

      // 获取新增的消息
      const newMsg = newMessages[newMessages.length - 1];
      bells.value = getBells();
      
      // 检查所有新增的非历史消息是否@了当前用户或包含关键词
      const oldMessageIds = new Set(oldMessages.map(msg => msg.oId || msg.id));
      const realNewMessages = newMessages.filter(msg => 
        !oldMessageIds.has(msg.oId || msg.id) && 
        !msg.isHistory && 
        !msg.isSelf &&
        msg.type !== "barrager"
      );
      
      // 检查关键词和@用户提醒
      realNewMessages.forEach(msg => {
        // 检查关键词提醒
        if (checkBellsInMessage(msg.md || msg.content || '', bells.value)) {
          utools.showNotification(`有人提了关键词`, 'fishpi');
        }
        
        // 检查是否@了当前用户
        if (checkMentionedUser(msg)) {
          const senderName = msg.userNickname || msg.userName || '有人';
          utools.showNotification(`${senderName} @了你`, 'fishpi');
        }
      });
      
      // 如果是弹幕消息，直接处理并返回，不进行后续处理
      if (newMsg.type === "barrager") {
        handleBarrager(newMsg);
        return;
      }

      // 如果页面不可见，不处理新消息
      if (!isPageVisible.value) {
        console.log("页面不可见，不处理新消息");
        return;
      }

      // 保存当前滚动位置
      const scrollHeight = messageListRef.value?.scrollHeight || 0;
      const scrollTop = messageListRef.value?.scrollTop || 0;
      const clientHeight = messageListRef.value?.clientHeight || 0;
      const wasAtBottom = scrollHeight - scrollTop - clientHeight < 200;

      nextTick(() => {
        const lastMessage = newMessages[newMessages.length - 1];
        // 如果是弹幕消息，不进行后续处理
        if (lastMessage.type === "barrager") {
          return;
        }

        const isSystemOrSpecialMsg = (msg) => {
          if (
            msg.type === "discuss-changed" ||
            msg.type === "red-packet-status"
          ) {
            return true;
          }
          try {
            const content = JSON.parse(msg.content);
            return (
              content.msgType === "redPacket" ||
              content.msgType === "weather" ||
              content.msgType === "music"
            );
          } catch {
            return false;
          }
        };

        // 重新检测底部状态
        checkIfAtBottom();

        // 使用 requestAnimationFrame 确保在下一帧渲染完成后再处理滚动
        requestAnimationFrame(() => {
          if (
            (isAtBottom.value || wasAtBottom || lastMessage?.isSelf) &&
            lastMessage &&
            lastMessage.isHistory === false &&
            !props.isLoadingMore
          ) {
            console.log("[watch] 自动滚动到底部");
            // 检查消息中是否包含图片
            const hasImages = /<img[^>]+src=/.test(lastMessage.content);
            if (hasImages) {
              // 如果包含图片，等待图片加载完成后再滚动
              const images = document.querySelectorAll(".message-text img");
              let loadedImages = 0;
              const totalImages = images.length;

              if (totalImages === 0) {
                scrollToBottom();
              } else {
                images.forEach((img) => {
                  if (img.complete) {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                      scrollToBottom();
                    }
                  } else {
                    img.onload = () => {
                      loadedImages++;
                      if (loadedImages === totalImages) {
                        scrollToBottom();
                      }
                    };
                  }
                });
              }
            } else {
              scrollToBottom();
            }
            hasNewMessages.value = false;
            newMessageCount.value = 0;
          } else if (
            lastMessage &&
            lastMessage.isHistory === false &&
            !lastMessage.isSelf &&
            !props.isLoadingMore
          ) {
            if (isSystemOrSpecialMsg(lastMessage) || !lastMessage.isSelf) {
              console.log("[watch] 弹出新消息提示");
              hasNewMessages.value = true;
              const newCount = newMessages.length - oldMessages.length;
              if (newCount > 0) {
                newMessageCount.value += newCount;
                lastMessageCount.value = newMessageCount.value; // 保存原始消息数量
              }
            }
          }
        });
      });
    }
  },
  { deep: true }
);

watch(
  () => props.hideImages,
  (enabled) => {
    if (!enabled) {
      expandedImages.value = new Set();
    }
  }
);

// 修改 scrollToBottom 函数
const scrollToBottom = () => {
  if (messageListRef.value) {
    nextTick(() => {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
    });
  }
};

// 处理滚动事件
const handleScroll = () => {
  if (messageListRef.value) {
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.value;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    checkIfAtBottom();

    // 如果滚动到底部，清除新消息提示
    if (isAtBottom.value) {
      hasNewMessages.value = false;
      newMessageCount.value = 0;
    } else if (hasNewMessages.value && newMessageCount.value > 0) {
      // 计算滚动比例，用于动态更新新消息数量
      const maxDistance = 500; // 最大滚动距离阈值
      const scrollRatio = Math.min(distanceToBottom / maxDistance, 1);
      const originalCount = lastMessageCount.value;
      const newCount = Math.max(Math.floor(originalCount * scrollRatio), 0);

      if (newCount !== newMessageCount.value) {
        newMessageCount.value = newCount;
        if (newCount === 0) {
          hasNewMessages.value = false;
        }
      }
    }

    if (scrollTop === 0 && !props.isLoadingMore && props.hasMoreMessages) {
      // 保存当前滚动高度
      previousScrollHeight.value = messageListRef.value.scrollHeight;
      // 触发加载更多消息
      emit("load-more");
    }
  }
};

// 判断是否为音乐消息
const isMusicMessage = (content) => {
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === "music";
  } catch {
    return false;
  }
};

// 解析音乐消息
const parseMusicMessage = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
};

// 播放音乐
const playMusic = (musicInfo) => {
  if (musicInfo.source) {
    window.open(musicInfo.source, "_blank");
  }
};

// 判断是否为天气消息
const isWeatherMessage = (content) => {
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === "weather";
  } catch {
    return false;
  }
};

// 解析天气消息
const parseWeatherMessage = (content) => {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
};

// 获取天气日期数据
const getWeatherDays = (content) => {
  try {
    const weather = JSON.parse(content);
    const dates = weather.date.split(",");
    const weatherCodes = weather.weatherCode.split(",");
    const maxTemps = weather.max.split(",");
    const minTemps = weather.min.split(",");

    return dates.map((date, index) => ({
      date: date.split("/")[1] + "日",
      weatherCode: weatherCodes[index],
      max: maxTemps[index],
      min: minTemps[index],
    }));
  } catch {
    return [];
  }
};

// 获取天气图标
const getWeatherIcon = (code) => {
  const icons = {
    SUNNY: "☀️",
    CLOUDY: "☁️",
    PARTLY_CLOUDY_DAY: "⛅",
    RAINY: "🌧️",
    SNOWY: "❄️",
    WINDY: "🌪️",
    FOGGY: "🌫️",
    THUNDER: "⛈️",
  };
  return icons[code] || "☀️";
};

// 判断是否为红包消息
const isRedPacketMessage = (content) => {
  if (!content || typeof content !== "string") {
    return false;
  }
  // 检查是否是 [redpacket]...[/redpacket] 格式
  if (/\[redpacket\]\s*[\s\S]*?\s*\[\/redpacket\]/i.test(content)) {
    return true;
  }
  // 检查是否是 JSON 格式的红包消息
  try {
    const parsed = JSON.parse(content);
    return parsed.msgType === "redPacket";
  } catch {
    return false;
  }
};

// 解析红包消息
const parseRedPacketMessage = (content) => {
  if (!content || typeof content !== "string") {
    return {};
  }
  // 处理 [redpacket]...[/redpacket] 格式
  const redPacketMatch = content.match(/\[redpacket\]\s*([\s\S]*?)\s*\[\/redpacket\]/i);
  if (redPacketMatch) {
    const redPacketContent = String(redPacketMatch[1] || "").trim();
    // 如果内容是 JSON 字符串，解析它
    try {
      const parsed = JSON.parse(redPacketContent);
      if (parsed.msgType === "redPacket") {
        return parsed;
      }
    } catch {
      // 不是 JSON，是红包ID，返回默认结构
      return {
        msgType: "redPacket",
        redPacketId: redPacketContent,
        msg: "红包",
        money: 0,
        count: 0,
        got: 0,
        type: "random",
      };
    }
  }
  // 处理 JSON 格式
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return "";
  const parsed = dayjs(time);
  return parsed.isValid() ? parsed.format("HH:mm:ss") : "";
};

const getMessageTime = (message) => {
  if (!message) return "";

  const timeValue =
    message.time ??
    message.timestamp ??
    message.sentAt ??
    message.sentTime ??
    message.createdAt ??
    message.createTime ??
    message.messageWrapper?.message?.timestamp ??
    message.messageWrapper?.message?.sentAt ??
    message.messageWrapper?.message?.sentTime;

  return formatTime(timeValue);
};

// 格式化红包类型
const formatRedPacketType = (type) => {
  const typeMap = {
    random: "拼手气红包",
    average: "平分红包",
    // specify: "专属红包",
    // heartbeat: "心跳红包",
    // rockPaperScissors: "猜拳红包",
  };
  return typeMap[type] || type;
};

// 抢红包状态管理
const grabbingRedPackets = ref(new Map()); // 正在抢的红包 oId -> true
const grabbedRedPackets = ref(new Map()); // 已抢到的红包 oId -> 积分数量
const redPacketDetails = ref(new Map()); // 红包详情 oId -> RedPacket详情

// 加载红包详情
const loadRedPacketDetail = async (item) => {
  const redPacket = parseRedPacketMessage(item.content);
  const redPacketId = redPacket.redPacketId;

  if (!redPacketId) {
    return;
  }

  // 如果已经加载过详情，不再重复加载
  if (redPacketDetails.value.has(item.oId)) {
    return;
  }

  try {
    const response = await chatApi.getRedPacketDetail(redPacketId);
    if (response.code === 0 && response.data) {
      redPacketDetails.value.set(item.oId, response.data);

      // 更新消息内容，使用详情接口返回的数据
      const detail = response.data;
      const updatedRedPacket = {
        msgType: "redPacket",
        redPacketId: redPacketId,
        msg: detail.name || "红包",
        money: detail.totalAmount || 0,
        count: detail.count || 0,
        got: (detail.count || 0) - (detail.remainingCount || 0),
        type: detail.type === 1 ? "random" : detail.type === 2 ? "average" : "random",
        detail: detail, // 保存完整详情
      };

      const index = props.messages.findIndex(msg => msg.oId === item.oId);
      if (index !== -1) {
        const updatedMessages = [...props.messages];
        updatedMessages[index] = {
          ...updatedMessages[index],
          content: JSON.stringify(updatedRedPacket),
        };
        emit("update-messages", updatedMessages);
      }
    }
  } catch (error) {
    console.error("获取红包详情失败:", error);
  }
};

// 判断红包是否已领完
const isRedPacketFinished = (item) => {
  // 优先使用详情接口的数据
  const detail = redPacketDetails.value.get(item.oId);
  if (detail) {
    return detail.remainingCount === 0 || detail.status !== 0;
  }

  // 回退到使用消息内容中的数据
  const redPacket = parseRedPacketMessage(item.content);
  if (redPacket.detail) {
    return redPacket.detail.remainingCount === 0 || redPacket.detail.status !== 0;
  }

  // 最后使用got和count判断
  return redPacket.got >= redPacket.count;
};

// 判断当前用户是否已抢过红包
const isRedPacketGrabbed = (item) => {
  return grabbedRedPackets.value.has(item.oId);
};

// 判断是否正在抢红包
const isGrabbingRedPacket = (item) => {
  return grabbingRedPackets.value.get(item.oId) === true;
};

// 获取剩余数量
const getRedPacketRemaining = (item) => {
  const detail = redPacketDetails.value.get(item.oId);
  if (detail) {
    return detail.remainingCount || 0;
  }

  const redPacket = parseRedPacketMessage(item.content);
  if (redPacket.detail) {
    return redPacket.detail.remainingCount || 0;
  }

  return Math.max(0, (redPacket.count || 0) - (redPacket.got || 0));
};

// 获取总数量
const getRedPacketTotal = (item) => {
  const detail = redPacketDetails.value.get(item.oId);
  if (detail) {
    return detail.count || 0;
  }

  const redPacket = parseRedPacketMessage(item.content);
  if (redPacket.detail) {
    return redPacket.detail.count || 0;
  }

  return redPacket.count || 0;
};

// 获取红包总金额
const getRedPacketAmount = (item) => {
  const detail = redPacketDetails.value.get(item.oId);
  if (detail) {
    return detail.totalAmount || 0;
  }

  const redPacket = parseRedPacketMessage(item.content);
  if (redPacket.detail) {
    return redPacket.detail.totalAmount || 0;
  }

  return redPacket.money || 0;
};

// 获取红包名称
const getRedPacketName = (item) => {
  const detail = redPacketDetails.value.get(item.oId);
  if (detail && detail.name) {
    return detail.name;
  }

  const redPacket = parseRedPacketMessage(item.content);
  if (redPacket.detail && redPacket.detail.name) {
    return redPacket.detail.name;
  }

  return redPacket.msg || "红包";
};

// 获取抢到的积分
const getGrabbedAmount = (item) => {
  return grabbedRedPackets.value.get(item.oId) || 0;
};

// 抢红包
const grabRedPacket = async (item) => {
  const redPacket = parseRedPacketMessage(item.content);
  const redPacketId = redPacket.redPacketId;

  if (!redPacketId) {
    ElMessage.error("红包ID不存在");
    return;
  }

  if (isGrabbingRedPacket(item) || isRedPacketGrabbed(item)) {
    return;
  }

  try {
    grabbingRedPackets.value.set(item.oId, true);
    const response = await chatApi.grabRedPacket(redPacketId);

    if (response.code === 0 && response.data !== undefined) {
      const grabbedAmount = response.data;
      grabbedRedPackets.value.set(item.oId, grabbedAmount);
      ElMessage.success(`恭喜！抢到 ${grabbedAmount} 积分`);

      // 重新加载红包详情以获取最新状态
      redPacketDetails.value.delete(item.oId);
      await loadRedPacketDetail(item);
    } else {
      ElMessage.error(response.message || "抢红包失败");
    }
  } catch (error) {
    console.error("抢红包失败:", error);
    ElMessage.error(error.message || "抢红包失败");
  } finally {
    grabbingRedPackets.value.delete(item.oId);
  }
};

// 红包弹窗状态
const showRedPacketModal = ref(false);
const currentRedPacket = ref(null);

// 红包抢购记录弹窗状态
const showRedPacketRecordsModal = ref(false);
const redPacketRecords = ref([]);
const loadingRecords = ref(false);
const currentRedPacketIdForRecords = ref(null);

// 显示红包详情
const showRedPacketDetails = async (item) => {
  try {
    isReceiving.value = true;
    const gesture =
      parseRedPacketMessage(item.content).type === "rockPaperScissors"
        ? 0
        : undefined;
    const response = await chatApi.openRedPacket(item.oId, gesture);
    // 更新红包信息
    currentRedPacket.value = {
      ...parseRedPacketMessage(item.content),
      who: response.who,
      got: response.info.got,
      count: response.info.count,
      msg: response.info.msg,
      info: response.info,
    };
    showRedPacketModal.value = true;
  } catch (error) {
    console.error("获取红包详情失败:", error);
  } finally {
    isReceiving.value = false;
  }
};

// 关闭红包弹窗
const closeRedPacketModal = () => {
  showRedPacketModal.value = false;
  currentRedPacket.value = null;
};

// 显示红包抢购记录
const showRedPacketRecords = async (item) => {
  const redPacket = parseRedPacketMessage(item.content);
  const redPacketId = redPacket.redPacketId;

  if (!redPacketId) {
    ElMessage.error("红包ID不存在");
    return;
  }

  currentRedPacketIdForRecords.value = redPacketId;
  showRedPacketRecordsModal.value = true;
  loadingRecords.value = true;
  redPacketRecords.value = [];

  try {
    const response = await chatApi.getRedPacketRecords(redPacketId);
    if (response.code === 0 && response.data) {
      // 处理记录数据，标识手气王
      const records = response.data.map(record => ({ ...record }));

      // 找到手气王：金额最大，如果金额相同则时间最早
      if (records.length > 0) {
        // 按金额降序，时间升序排序来找到手气王
        const sortedRecords = [...records].sort((a, b) => {
          const amountDiff = (b.amount || 0) - (a.amount || 0);
          if (amountDiff !== 0) {
            return amountDiff;
          }
          // 金额相同，按时间升序（最早的为手气王）
          const timeA = new Date(a.grabTime || 0).getTime();
          const timeB = new Date(b.grabTime || 0).getTime();
          return timeA - timeB;
        });

        // 第一个是手气王
        const luckyKing = sortedRecords[0];
        const maxAmount = luckyKing.amount || 0;

        // 标记所有金额等于最大金额且时间最早的记录为手气王
        records.forEach(record => {
          if (record.amount === maxAmount) {
            const recordTime = new Date(record.grabTime || 0).getTime();
            const kingTime = new Date(luckyKing.grabTime || 0).getTime();
            if (recordTime === kingTime) {
              record.isLuckyKing = true;
            }
          }
        });
      }

      // 按积分大小从大到小排序
      records.sort((a, b) => {
        const amountDiff = (b.amount || 0) - (a.amount || 0);
        if (amountDiff !== 0) {
          return amountDiff;
        }
        // 金额相同，按时间升序（最早的在前）
        const timeA = new Date(a.grabTime || 0).getTime();
        const timeB = new Date(b.grabTime || 0).getTime();
        return timeA - timeB;
      });

      redPacketRecords.value = records;
    } else {
      ElMessage.error(response.message || "获取抢购记录失败");
    }
  } catch (error) {
    console.error("获取红包抢购记录失败:", error);
    ElMessage.error(error.message || "获取抢购记录失败");
  } finally {
    loadingRecords.value = false;
  }
};

// 关闭红包抢购记录弹窗
const closeRedPacketRecordsModal = () => {
  showRedPacketRecordsModal.value = false;
  redPacketRecords.value = [];
  currentRedPacketIdForRecords.value = null;
};

// 格式化记录时间
const formatRecordTime = (time) => {
  if (!time) return "";
  return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
};

// 查看用户信息（优先使用 userId，保证能取到积分/签名等）
const showUserProfile = (userId, userName) => {
  const identifier =
    userId === null || typeof userId === "undefined" || userId === ""
      ? userName
      : String(userId);
  router.push(`/user/${identifier}`);
};

// 用户信息卡片弹窗
const showUserInfoModal = ref(false);
const selectedUserId = ref(null);
const selectedUserName = ref("");
const userInfoCardX = ref(0);
const userInfoCardY = ref(0);
const selectedUserSourceMessage = ref(null);

const openUserInfoCard = (userId, userName, event, sourceMessage = null) => {
  selectedUserId.value =
    userId === null || typeof userId === "undefined" ? null : String(userId);
  selectedUserName.value = userName;
  selectedUserSourceMessage.value = sourceMessage;

  const cardWidth = 320; // 估算卡片宽度
  const cardHeight = 450; // 估算卡片高度
  const padding = 20; // 边缘边距

  let clientX = event.clientX;
  let clientY = event.clientY;

  // 检查是否超出右边界
  if (clientX + cardWidth > window.innerWidth - padding) {
    clientX = window.innerWidth - cardWidth - padding;
  }

  // 检查是否超出下边界
  if (clientY + cardHeight > window.innerHeight - padding) {
    clientY = window.innerHeight - cardHeight - padding;
  }

  // 确保不会超出左边界和上边界
  if (clientX < padding) clientX = padding;
  if (clientY < padding) clientY = padding;

  userInfoCardX.value = clientX;
  userInfoCardY.value = clientY;
  showUserInfoModal.value = true;
};
const closeUserInfoCard = () => {
  showUserInfoModal.value = false;
  selectedUserId.value = null;
  selectedUserName.value = "";
  selectedUserSourceMessage.value = null;
};

// 用户信息卡片操作
const handleUserDetail = (userName) => {
  // 把“点详情时关联的那条消息”按 WS 结构写入缓存，供 UserProfile 页面渲染
  try {
    const m = selectedUserSourceMessage.value;
    if (m) {
      const wsPayload = {
        type: "chat",
        data: {
          message: {
            id: String(m.id ?? m.oId ?? m._key ?? ""),
            content: m.content ?? "",
            sender: {
              id: m.userId ?? m.senderId ?? m.sender?.id ?? "",
              name: m.userName ?? m.senderName ?? m.sender?.name ?? "",
              avatar:
                m.userAvatarURL48 ??
                m.userAvatarURL ??
                m.userAvatar ??
                m.senderAvatar ??
                m.sender?.avatar ??
                "",
              points: m.points ?? m.userPoint ?? m.sender?.points,
              level: m.level ?? m.sender?.level,
              avatarFramerUrl: m.avatarFramerUrl ?? m.sender?.avatarFramerUrl,
              titleId: m.titleId ?? m.sender?.titleId,
              titleIdList: m.titleIdList ?? m.sender?.titleIdList,
              isAdmin: m.isAdmin ?? m.sender?.isAdmin,
              isVip: m.isVip ?? m.sender?.isVip,
              region: m.region ?? m.sender?.region,
              country: m.country ?? m.sender?.country,
            },
            timestamp:
              m.time ??
              m.timestamp ??
              m.sentAt ??
              m.sentTime ??
              m.createdAt ??
              m.createTime ??
              "",
          },
        },
      };
      if (typeof utools !== "undefined") {
        utools.dbStorage.setItem("user-profile-ws-message", wsPayload);
      }
    }
  } catch (e) {
    console.error("写入 user-profile-ws-message 失败:", e);
  }

  closeUserInfoCard();
  const identifier =
    selectedUserId.value === null || typeof selectedUserId.value === "undefined" || selectedUserId.value === ""
      ? userName
      : String(selectedUserId.value);
  router.push(`/user/${identifier}`);
};
const handleUserMessage = (userName) => {
  closeUserInfoCard();
  utools.dbStorage.setItem("private-chat-user", userName);
  router.push(`/private-chat?user=${userName}`);
};
const handleUserMention = (userName) => {
  closeUserInfoCard();
  if (!userName) return;
  emit("at-user", userName);
};

const showContextMenu = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuUser = ref("");
const contextMenuUserAvatar = ref("");

function onAvatarContextMenu(e, userName, avatarUrl) {
  e.preventDefault();
  contextMenuX.value = e.clientX;
  contextMenuY.value = e.clientY;
  contextMenuUser.value = userName;
  contextMenuUserAvatar.value = avatarUrl;
  showContextMenu.value = true;
}

function handleContextMenuAction(type) {
  showContextMenu.value = false;
  if (type === "blacklist") {
    addToBlacklist(contextMenuUser.value, contextMenuUserAvatar.value);
    return;
  }
  if (type === "remark") {
    // 通过userName查找对应的userId
    const targetMsg = props.messages.find(msg => msg.userName === contextMenuUser.value);
    editRemark(targetMsg?.userId, contextMenuUser.value);
    return;
  }
  if (type === "message") {
    handleUserMessage(contextMenuUser.value);
  } else if (type === "at") {
    emit("at-user", contextMenuUser.value);
  } else if (type === "profile") {
    handleUserDetail(contextMenuUser.value);
  }
}

window.addEventListener("click", () => {
  showContextMenu.value = false;
});

const showMsgContextMenu = ref(false);
const msgContextMenuX = ref(0);
const msgContextMenuY = ref(0);
const msgContextMenuItem = ref(null);
const msgContextMenuItems = ref([]);

const canRevokeMessage = (item) => {
  const userRole = userStore.userInfo?.userRole;
  const isAdmin = userRole === "admin";
  const isSelf = item.userName === userStore.userInfo?.userName;

  // 如果是管理员，可以撤回任何消息
  if (isAdmin) {
    return true;
  }

  // 如果是自己的消息，且未撤回过
  if (isSelf && !item.revoked) {
    return true;
  }

  return false;
};

function onMsgContextMenu(e, item) {
  e.preventDefault();
  // 判断类型
  if (
    isRedPacketMessage(item.content) ||
    isWeatherMessage(item.content) ||
    isMusicMessage(item.content)
  ) {
    return; // 不弹出菜单
  }
  msgContextMenuX.value = e.clientX;
  msgContextMenuY.value = e.clientY;
  msgContextMenuItem.value = item;
  if (/\<img[^>]+src=/.test(item.content)) {
    // 图片消息
    const isSelf = item.userName === userStore.userInfo?.userName;
    msgContextMenuItems.value = [
      { label: "引用", action: "quote", icon: "fas fa-quote-right" },
      { label: "添加到表情", action: "add-emoji", icon: "fas fa-plus-circle" },
      { label: "复制", action: "copy-image", icon: "fas fa-copy" },
      ...(isSelf ? [] : [{ label: "@TA", action: "at", icon: "fas fa-at" }]),
      { label: "复读机", action: "repeat", icon: "fas fa-redo" },
      // 添加撤回选项，根据条件显示
      ...(canRevokeMessage(item)
        ? [{ label: "撤回", action: "revoke", icon: "fas fa-undo" }]
        : []),
      ...(isSelf ? [] : [
        { divider: true },
        { label: "修改备注", action: "remark", icon: "fas fa-edit" },
      ]),
      { label: "加入黑名单", action: "blacklist", icon: "fas fa-user-slash" },
    ];
  } else {
    // 文字消息
    const isSelf = item.userName === userStore.userInfo?.userName;
    msgContextMenuItems.value = [
      { label: "复制", action: "copy", icon: "fas fa-copy" },
      { label: "引用", action: "quote", icon: "fas fa-quote-right" },
      ...(isSelf ? [] : [{ label: "@TA", action: "at", icon: "fas fa-at" }]),
      { label: "复读机", action: "repeat", icon: "fas fa-redo" },
      // 添加撤回选项，根据条件显示
      ...(canRevokeMessage(item)
        ? [{ label: "撤回", action: "revoke", icon: "fas fa-undo" }]
        : []),
      ...(isSelf ? [] : [
        { divider: true },
        { label: "修改备注", action: "remark", icon: "fas fa-edit" },
      ]),
      { label: "加入黑名单", action: "blacklist", icon: "fas fa-user-slash" },
    ];
  }
  showMsgContextMenu.value = true;
}
function handleMsgContextMenuAction(type) {
  showMsgContextMenu.value = false;
  const item = msgContextMenuItem.value;

  if (type === "revoke") {
    handleRevokeMessage(item);
    return;
  }

  if (type === "copy") {
    // 复制文字
    const temp = document.createElement("div");
    temp.innerHTML = item.content;
    navigator.clipboard.writeText(temp.innerText).then(() => {
      ElMessage.success("复制成功");
    });
  } else if (type === "quote") {
    emit("quote", msgContextMenuItem.value);
  } else if (type === "at") {
    emit("at-user", item.userName);
  } else if (type === "repeat") {
    // 复读机功能
    const temp = document.createElement("div");
    temp.innerHTML = item.content;
    emit("send-same-message", item.md || item.content);
    ElMessage.success(" 复读成功");
  } else if (type === "add-emoji") {
    emit("add-emoji", item);
  } else if (type === "copy-image") {
    // 复制图片
    const match = item.content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (match && match[1]) {
      const imgSrc = match[1];
      if (imgSrc.startsWith("data:image")) {
        // 如果是base64图片，直接复制
        utools.copyImage(imgSrc);
        ElMessage.success("复制成功");
      } else {
        // 如果是URL图片，先下载再复制
        fetch(imgSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              utools.copyImage(reader.result);
              ElMessage.success("复制成功");
            };
            reader.readAsDataURL(blob);
          });
      }
    }
  } else if (type === "remark") {
    editRemark(item.userId, item.userName);
  } else if (type === "blacklist") {
    addToBlacklist(item.userName, item.userAvatarURL48);
  }
}
window.addEventListener("click", () => {
  showMsgContextMenu.value = false;
});

// 发送同样内容
function sendSameMessage(content) {
  emit("send-same-message", content);
}

// 在 script setup 部分添加手气王判断函数
const isLuckyKing = (receiver) => {
  if (!currentRedPacket.value) return false;

  // 如果是平分红包 专属红包 猜拳红包 ，没有手气王
  if (
    currentRedPacket.value.type === "average" ||
    currentRedPacket.value.type === "specify" ||
    currentRedPacket.value.type === "rockPaperScissors"
  )
    return false;

  // 找出最大金额
  const maxMoney = Math.max(
    ...currentRedPacket.value.who.map((w) => w.userMoney)
  );

  // 如果当前用户金额等于最大金额，且是第一个达到最大金额的用户，则为手气王
  return (
    receiver.userMoney === maxMoney &&
    currentRedPacket.value.who.findIndex((w) => w.userMoney === maxMoney) ===
    currentRedPacket.value.who.indexOf(receiver)
  );
};

// 图片预览相关
let previewWindow = null;

// 处理图片点击
const handleImageClick = async (e) => {
  const placeholder = e.target?.closest?.(".speed-image-placeholder");
  if (placeholder) {
    const imageUrl = placeholder.getAttribute("data-image-url");
    if (imageUrl) {
      const next = new Set(expandedImages.value);
      next.add(imageUrl);
      expandedImages.value = next;
    }
    return;
  }

  if (e.target.tagName === "IMG") {
    const imgSrc = e.target.src;
    // 收集所有图片，包括消息中的图片和引用消息中的图片
    const allImages = Array.from(
      document.querySelectorAll(".message-text img, .quoted-image-content img, .quoted-text-content img")
    ).map((img) => ({
      src: img.src,
    }));
    const currentIndex = allImages.findIndex((img) => img.src === imgSrc);

    // 关闭之前的预览窗口
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.close();
    }

    try {
      // 使用新的工具函数创建预览窗口
      previewWindow = await createImagePreviewWindow(allImages, currentIndex);

      // 窗口关闭时重置变量
      const checkWindowClosed = () => {
        if (
          previewWindow &&
          previewWindow.isDestroyed &&
          previewWindow.isDestroyed()
        ) {
          previewWindow = null;
        } else {
          setTimeout(checkWindowClosed, 1000);
        }
      };
      checkWindowClosed();
    } catch (error) {
      console.error("创建图片预览窗口失败:", error);
      ElMessage.error("图片预览失败");
    }
  }
};

// 在 script setup 部分添加新的方法
const openRedPacketWithGesture = async (item, gesture) => {
  try {
    isReceiving.value = true;
    const response = await chatApi.openRedPacket(item.oId, gesture);
    // 更新红包信息
    currentRedPacket.value = {
      ...parseRedPacketMessage(item.content),
      who: response.who,
      got: response.info.got,
      count: response.info.count,
      msg: response.info.msg,
      info: response.info,
    };
    showRedPacketModal.value = true;
  } catch (error) {
    console.error("获取红包详情失败:", error);
    ElMessage.error("领取红包失败");
  } finally {
    isReceiving.value = false;
  }
};

// 弹幕相关
const barragers = ref([]);
let barragerId = 0;

// 处理弹幕消息
const handleBarrager = (data) => {
  console.log(data);
  // 确保数据完整性
  if (!data.content || !data.userAvatarURL48) {
    console.warn("弹幕消息数据不完整:", data);
    return;
  }

  const barrager = {
    id: barragerId++,
    content: data.content,
    avatar: data.userAvatarURL48,
    color: data.barragerColor || "rgba(255,255,255,1)",
    top: getRandomTop(),
    duration: 8, // 固定动画时间为8秒
  };

  // 添加到弹幕列表
  barragers.value.push(barrager);

  // 动画结束后移除弹幕，确保动画完整播放
  setTimeout(() => {
    barragers.value = barragers.value.filter((b) => b.id !== barrager.id);
  }, barrager.duration * 1000 + 100); // 额外添加100ms的缓冲时间
};

// 获取随机弹幕位置，避免重叠
const getRandomTop = () => {
  const containerHeight = messageListRef.value?.clientHeight || 300;
  const maxTop = containerHeight * 0.8; // 使用80%的容器高度
  const minGap = 40; // 最小间距
  const existingTops = barragers.value.map((b) => b.top);

  let newTop;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    newTop = Math.random() * maxTop;
    attempts++;
  } while (
    attempts < maxAttempts &&
    existingTops.some((top) => Math.abs(top - newTop) < minGap)
  );

  return newTop;
};

// 修改链接处理函数
const handleLinkClick = (e) => {
  if (e.target.tagName === "A") {
    e.preventDefault();
    const url = e.target.href;
    // 使用系统默认浏览器打开链接
    utools.shellOpenExternal(url);
  }
};

// 添加图片加载完成的处理函数
const handleImageLoad = () => {
  if (isAtBottom.value) {
    nextTick(() => {
      scrollToBottom();
    });
  }
};

// 检查内容中是否包含图片
const isImageInContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  return /\<img[^>]+src=/.test(content) || /!\[.*?\]\(.*?\)/.test(content) || /\[img\]/i.test(content);
};

// 获取引用消息的文本内容
const getQuotedMessageText = (content) => {
  if (!content || typeof content !== 'string') return '';
  try {
    // 如果是HTML，提取文本
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.innerText || temp.textContent || '';
    const maxLength = 50; // 最大显示长度
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  } catch (error) {
    // 如果不是HTML，直接返回文本
    const maxLength = 50;
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content;
  }
};

// 转换旧格式的 [img]url[/img] 标记为标准 img 标签
const convertLegacyImageTags = (input = "") => {
  if (typeof input !== "string" || !input) {
    return input;
  }
  return input.replace(/\[img\]\s*([\s\S]*?)\s*\[\/img\]/gi, (_match, url) => {
    const normalized = String(url || "").trim();
    if (!normalized) {
      return "";
    }
    // 转义 URL 中的引号，防止 XSS（但保留 URL 中的其他字符，如 &、? 等）
    const safeUrl = normalized.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return `<img src="${safeUrl}" alt="图片" style="max-width: 150px; height: auto; border-radius: 6px; margin: 4px 0; cursor: pointer; display: block;" />`;
  });
};

// 转换旧格式的 [redpacket]id[/redpacket] 标记为 JSON 格式
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

// 处理HTML中已有的img标签，修复alt和title属性
const fixHtmlImageAttributes = (input = "") => {
  if (typeof input !== "string" || !input) {
    return input;
  }
  // 替换已有img标签中的alt和title属性
  return input.replace(/<img[^>]*>/gi, (match) => {
    // 如果已经包含我们想要的alt，不修改
    if (match.includes('alt="图片"')) {
      return match;
    }
    // 替换alt和title属性
    let fixed = match.replace(/\s+alt=["'][^"']*["']/gi, ' alt="图片"');
    fixed = fixed.replace(/\s+title=["'][^"']*["']/gi, '');
    // 如果没有alt属性，添加一个
    if (!fixed.includes('alt="图片"') && !fixed.includes("alt='图片'")) {
      fixed = fixed.replace(/<img/i, '<img alt="图片"');
    }
    return fixed;
  });
};

// 处理引用消息内容，转换图片和红包格式
const processQuotedMessageContent = (content) => {
  if (!content || typeof content !== 'string') return content;
  // 先处理红包格式转换
  let processedContent = convertLegacyRedPacketTags(content);
  // 再处理旧格式图片标记
  processedContent = convertLegacyImageTags(processedContent);
  // 最后处理HTML中已有的img标签属性
  processedContent = fixHtmlImageAttributes(processedContent);
  return processedContent;
};

const escapeAttribute = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getImageSrcFromHtmlTag = (imgTag = "") => {
  const srcMatch = imgTag.match(/\ssrc=["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1] : "";
};

const buildImagePlaceholderHtml = (imageUrl) => {
  const escapedUrl = escapeAttribute(imageUrl);
  return `
    <div class="speed-image-placeholder" data-image-url="${escapedUrl}">
      <i class="fas fa-image"></i>
      <span>点击展开图片</span>
    </div>
  `.trim();
};

const processSpeedModeContent = (content) => {
  if (!hideImages.value || !content || typeof content !== "string") {
    return content;
  }
  return content.replace(/<img[^>]*>/gi, (imgTag) => {
    const imageUrl = getImageSrcFromHtmlTag(imgTag);
    if (!imageUrl) return imgTag;
    if (expandedImages.value.has(imageUrl)) return imgTag;
    return buildImagePlaceholderHtml(imageUrl);
  });
};

const getProcessedMessageContent = (item) => {
  const content = item?.content || "";
  return processSpeedModeContent(content);
};

// 检查引用消息是否是红包
const isQuotedMessageRedPacket = (quotedMessage) => {
  if (!quotedMessage || !quotedMessage.content) return false;
  return isRedPacketMessage(quotedMessage.content);
};

// 检查引用消息是否包含图片
const isQuotedMessageImage = (quotedMessage) => {
  if (!quotedMessage || !quotedMessage.content) return false;
  return isImageInContent(quotedMessage.content);
};

// 获取处理后的引用消息内容（用于渲染）
const getProcessedQuotedMessageContent = (quotedMessage) => {
  if (!quotedMessage || !quotedMessage.content) return '';
  const processed = processQuotedMessageContent(quotedMessage.content);
  return processSpeedModeContent(processed);
};

// 解析引用消息中的红包（用于在引用消息中显示红包信息）
const parseQuotedMessageRedPacket = (quotedMessage) => {
  if (!quotedMessage || !quotedMessage.content) return null;
  if (!isQuotedMessageRedPacket(quotedMessage)) return null;
  // 创建一个临时消息对象用于解析红包
  const tempMessage = {
    content: quotedMessage.content,
    oId: quotedMessage.id || 'quoted-' + Date.now(),
  };
  return parseRedPacketMessage(tempMessage.content);
};

// 处理消息撤回
const handleRevokeMessage = (item) => {
  const messageId = item.oId || item.id;
  if (!messageId) {
    ElMessage.error("消息ID不存在");
    return;
  }

  // 使用 WebSocket 发送撤回消息
  const revokeData = JSON.stringify({
    type: 2,
    userId: -1,
    data: {
      type: 'userMessageRevoke',
      content: messageId,
    },
  });

  wsManager.send(revokeData, "chat-room");
  ElMessage.info('消息已撤回');
};
const getBells = () => {
  const savedBells = utools.dbStorage.getItem("fishpi_bells") || [];
  return savedBells;
}
// 检查是否包含
const checkBellsInMessage = (mainString, elementsArray) => {

  console.log("检查关键词:", mainString, elementsArray);
  const foundElements = elementsArray.filter(element =>
    mainString.includes(element)
  );
  return foundElements.length > 0;
}

// 检查消息中是否@了当前用户
const checkMentionedUser = (message) => {
  // 如果是自己发送的消息，不检测
  if (message.isSelf) {
    return false;
  }
  
  // 获取当前用户名
  const currentUserName = userStore.userInfo?.userName;
  if (!currentUserName) {
    return false;
  }
  
  // 优先使用md（原始Markdown内容），如果没有则使用content
  // 对于content，需要移除HTML标签来获取纯文本
  let messageContent = message.md || '';
  
  // 如果没有md，使用content并移除HTML标签
  if (!messageContent && message.content) {
    // 创建一个临时div来解析HTML并获取文本内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message.content;
    messageContent = tempDiv.textContent || tempDiv.innerText || '';
  }
  
  if (!messageContent) {
    return false;
  }
  
  // 转义用户名中的特殊字符，用于正则表达式
  const escapedUserName = currentUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 检查是否包含@当前用户名
  // 支持多种格式：
  // - @用户名（后面跟空格、标点、换行或字符串结尾）
  // - @用户名（独立出现，后面不是字母数字下划线）
  // 使用更精确的匹配模式
  const mentionPattern = new RegExp(`@${escapedUserName}(?![a-zA-Z0-9_])`, 'i');
  
  return mentionPattern.test(messageContent);
}

// 判断消息是否@了当前用户（用于样式显示）
const isMentionedMessage = (message) => {
  return checkMentionedUser(message);
}

onMounted(() => {
  bells.value = getBells();
  scrollToBottom();

  // 加载已有红包消息的详情
  props.messages.forEach(msg => {
    if (isRedPacketMessage(msg.content)) {
      loadRedPacketDetail(msg);
    }
  });
});

const userContextMenuItems = computed(() => [
  // { label: "发送消息", action: "message", icon: "fas fa-comment-dots" },
  { label: "@TA", action: "at", icon: "fas fa-at" },
  { divider: true },
  { label: "修改备注", action: "remark", icon: "fas fa-edit" },
  { divider: true },
  // { label: "查看资料", action: "profile", icon: "fas fa-user" },
  { label: "加入黑名单", action: "blacklist", icon: "fas fa-user-slash" },
]);

// 黑名单相关
const addToBlacklist = (userName, avatarUrl) => {
  const currentUser = userStore.userInfo?.userName;
  if (!currentUser) return;
  const allBlacklists = utools.dbStorage.getItem("fishpi_blacklist") || {};
  const list = allBlacklists[currentUser] || [];
  if (list.some((u) => u.userName === userName)) {
    ElMessage.warning("该用户已在黑名单");
    return;
  }
  list.push({ userName, avatarUrl });
  allBlacklists[currentUser] = list;
  utools.dbStorage.setItem("fishpi_blacklist", allBlacklists);
  ElMessage.success("已加入黑名单");

  // 立即过滤当前显示的消息，移除黑名单用户的消息
  filterBlacklistMessages();

  // 触发全局事件，通知其他组件黑名单已更新
  window.dispatchEvent(
    new CustomEvent("fishpi:blacklist-updated", {
      detail: { action: "add", userName },
    })
  );
};

// 过滤黑名单消息的函数
const filterBlacklistMessages = () => {
  const currentUser = userStore.userInfo?.userName;
  if (!currentUser) return;

  const allBlacklists = utools.dbStorage.getItem("fishpi_blacklist") || {};
  const blacklist = allBlacklists[currentUser] || [];
  const blacklistUserNames = blacklist.map((u) => u.userName);

  // 过滤掉黑名单用户的消息
  const filteredMessages = props.messages.filter((msg) => {
    if (!msg.userName) return true; // 系统消息保留
    return !blacklistUserNames.includes(msg.userName);
  });

  // 通过emit通知父组件更新消息列表
  emit("update-messages", filteredMessages);
};

// 备注相关
// 获取用户的备注（优先使用后端数据，使用userId作为key）
const getUserRemark = (userId) => {
  const currentUser = userStore.userInfo?.userName;
  if (!currentUser || !userId) return null;
  
  const userIdKey = String(userId);
  
  // 优先使用从后端加载的数据
  if (remarksLoaded.value && userRemarks.value[userIdKey]) {
    return userRemarks.value[userIdKey];
  }
  
  // 回退到localStorage
  const allRemarks = utools.dbStorage.getItem("fishpi_remarks") || {};
  const remarks = allRemarks[currentUser] || {};
  return remarks[userIdKey] || null;
};

// 保存用户备注（同步到后端和本地，使用userId作为key）
const saveUserRemark = async (userId, remark) => {
  const currentUser = userStore.userInfo?.userName;
  if (!currentUser || !userId) return;
  
  const userIdKey = String(userId);
  
  // 更新内存中的备注数据
  const newRemarks = { ...userRemarks.value };
  if (remark && remark.trim()) {
    newRemarks[userIdKey] = remark.trim();
  } else {
    delete newRemarks[userIdKey];
  }
  userRemarks.value = newRemarks;
  
  // 同时更新localStorage作为备份
  const allRemarks = utools.dbStorage.getItem("fishpi_remarks") || {};
  if (!allRemarks[currentUser]) {
    allRemarks[currentUser] = {};
  }
  if (remark && remark.trim()) {
    allRemarks[currentUser][userIdKey] = remark.trim();
  } else {
    delete allRemarks[currentUser][userIdKey];
  }
  utools.dbStorage.setItem("fishpi_remarks", allRemarks);
  
  // 同步保存到后端
  try {
    const remarksJson = JSON.stringify(newRemarks);
    await userRemarkApi.saveRemark(remarksJson);
  } catch (error) {
    console.error("保存备注到后端失败:", error);
  }
};

// 获取显示名称（如果有备注则显示：用户名 (备注)，如果有昵称但没有备注则显示：昵称，否则只显示用户名）
const getDisplayName = (item) => {
  // 使用userId作为key获取备注
  const remark = getUserRemark(item.userId);
  if (remark) {
    // 有备注：用户名 (备注)
    return `${item.userName} (${remark})`;
  }
  if (item.userNickname) {
    // 有昵称但没有备注：只显示昵称
    return item.userNickname;
  }
  // 没有备注也没有昵称：只显示用户名，不显示括号
  return item.userName;
};

// 编辑备注（使用userId作为key）
const editRemark = async (userId, userName) => {
  const currentRemark = getUserRemark(userId);
  const displayName = userName || userId;
  ElMessageBox.prompt(
    `请输入 ${displayName} 的备注`,
    "修改备注",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      inputValue: currentRemark || "",
      inputPlaceholder: "留空则删除备注",
      inputValidator: (value) => {
        if (value && value.trim().length > 20) {
          return "备注长度不能超过20个字符";
        }
        return true;
      },
    }
  )
    .then(async ({ value }) => {
      await saveUserRemark(userId, value);
      if (value && value.trim()) {
        ElMessage.success("备注已保存");
      } else {
        ElMessage.success("备注已删除");
      }
    })
    .catch(() => {
      // 用户取消操作，不处理
    });
};
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  background-color: var(--chatroom-bg);

}

.messages {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  position: relative;
  min-width: 0;
}

.message-row-self {
  flex-direction: row-reverse;
  margin-bottom: 8px;
}

/* @用户消息的高亮样式 */
.message-row-mentioned {
  animation: mention-pulse 1.5s ease-in-out;
}

.message-row-mentioned .message-bubble {
  position: relative;
}

.message-row-mentioned .message-text {
  border-left: 3px solid #ff6b6b;
  background-color: rgba(255, 107, 107, 0.08);
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.2);
  transition: all 0.3s ease;
}

.message-row-self.message-row-mentioned .message-text {
  border-left: none;
  border-right: 3px solid #ff6b6b;
  background-color: rgba(255, 107, 107, 0.12);
}

.message-row-mentioned:hover .message-text {
  background-color: rgba(255, 107, 107, 0.12);
  box-shadow: 0 3px 12px rgba(255, 107, 107, 0.3);
}

.message-row-self.message-row-mentioned:hover .message-text {
  background-color: rgba(255, 107, 107, 0.16);
}

@keyframes mention-pulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.01);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin: 0 8px;
  flex-shrink: 0;
  border: 2px solid var(--avatar-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-bubble {
  max-width: 80%;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-row-self .message-bubble {
  align-items: flex-end;
  margin-bottom: 0;
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding: 0 4px;
  margin-left: -4px;
}

.message-row-self .message-header {
  flex-direction: row-reverse;
  margin-left: 0;
  margin-right: -4px;
}

.user-nickname {
  font-weight: 500;
  color: var(--text-color);
  margin: 0 6px;
  font-size: 13px;
}

.at-clickable {
  cursor: pointer;
}

.mention-icon {
  color: #ff6b6b;
  font-size: 14px;
  margin-left: 4px;
  animation: mention-icon-bounce 2s ease-in-out infinite;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@keyframes mention-icon-bounce {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.9;
  }
}

.message-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.message-text {
  padding: 10px 12px;
  border-radius: 12px;
  background-color: var(--bubble-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  word-break: break-word;
  line-height: 1.5;
  font-size: 14px;
  color: var(--text-color);
  position: relative;
  width: fit-content;
  max-width: 100%;
}

.message-row-self .message-text {
  background-color: var(--hover-bg);
  margin-left: auto;
  margin-top: 0;
}

/* 音乐卡片样式 */
.message-text :deep(.music-card) {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  width: 250px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.message-text :deep(.music-cover) {
  width: 80px;
  height: 80px;
  object-fit: cover;
  flex-shrink: 0;
}

.message-text :deep(.music-info) {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.message-text :deep(.music-title) {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-text :deep(.music-source) {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-text :deep(.music-source::before) {
  content: "♪";
  font-size: 14px;
}

.message-row-self .message-text :deep(.music-card) {
  background: #e6f4ff;
}

.message-row-self .message-text :deep(.music-title) {
  color: #1890ff;
}

.message-text::before {
  content: "";
  position: absolute;
  top: 12px;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.message-row:not(.message-row-self) .message-text::before {
  left: -12px;
  border-right-color: var(--card-bg);
}

.message-row-self .message-text::before {
  right: -12px;
  border-left-color: var(--hover-bg);
}

.message-footer {
  margin-top: 4px;
  padding: 0 4px;
  font-size: 12px;
  color: var(--sub-text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-footer-self {
  justify-content: flex-end;
}

.message-time {
  font-variant-numeric: tabular-nums;
}

.client-info {
  font-size: 12px;
  color: var(--sub-text-color);
}

.message-text :deep(img) {
  max-width: 200px;
  height: auto;
  border-radius: 8px;
  margin: 4px 0;
  cursor: pointer;
  display: block;
}

.message-text :deep(.speed-image-placeholder) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--hover-bg);
  color: var(--sub-text-color);
  cursor: pointer;
  user-select: none;
}

.message-text :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 2px solid var(--border-color);
  background-color: var(--hover-bg);
  border-radius: 4px;
  color: var(--sub-text-color);
  font-size: 13px;
  line-height: 1.5;
}

.message-text :deep(blockquote p) {
  margin: 0;
}

.message-text :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.message-row-self .message-text :deep(blockquote) {
  background-color: var(--background-color);
}

.message-text :deep(p) {
  margin: 8px 0 0 0;
}

.message-text :deep(p:first-child) {
  margin-top: 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.time-separator {
  text-align: center;
  margin: 16px 0;
  font-size: 12px;
  color: var(--sub-text-color);
  position: relative;
}

.loading-more,
.no-more-messages {
  text-align: center;
  padding: 12px;
  color: var(--sub-text-color);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  margin-right: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.new-messages-notification {
  position: fixed;
  bottom: 170px;
  /* right 由 :style 动态控制 */
  z-index: 1000;
  background-color: var(--primary-color);
  color: var(--button-text);
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.new-messages-notification:hover {
  background-color: var(--button-bg);
  transform: translateY(-2px);
}

.notification-text {
  font-size: 14px;
  font-weight: 500;
}

.notification-count {
  background-color: var(--badge-bg);
  color: var(--badge-text);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  min-width: 16px;
  text-align: center;
}

.notification-icon {
  font-size: 16px;
  animation: bounce 1s infinite;
}

@keyframes bounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

/* 天气卡片样式 */
.message-text :deep(.weather-card) {
  width: 300px;
  background: linear-gradient(135deg, #8e9eab 0%, #eef2f3 100%);
  border-radius: 12px;
  color: #333;
  overflow: hidden;
}

.message-text :deep(.weather-header) {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.message-text :deep(.weather-city) {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.message-text :deep(.weather-desc) {
  font-size: 13px;
  color: #666;
}

.message-text :deep(.weather-forecast) {
  display: flex;
  padding: 12px;
  gap: 12px;
}

.message-text :deep(.weather-day) {
  flex: 1;
  text-align: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.message-text :deep(.weather-date) {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.message-text :deep(.weather-temp) {
  font-size: 14px;
  font-weight: 500;
  margin: 4px 0;
}

.message-text :deep(.weather-icon) {
  font-size: 20px;
  margin: 4px 0;
}

.message-row-self .message-text :deep(.weather-card) {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
}

/* 红包卡片样式 */
.message-text :deep(.red-packet-card) {
  width: 220px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: #fff;
  padding: 12px;
  position: relative;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  border: none;
  transition: all 0.2s ease;
  cursor: default;
}

.message-text :deep(.red-packet-content) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.message-text :deep(.red-packet-icon) {
  font-size: 32px;
  flex-shrink: 0;
}

.message-text :deep(.red-packet-info) {
  flex: 1;
  min-width: 0;
}

.message-text :deep(.red-packet-type) {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.message-text :deep(.red-packet-msg) {
  font-size: 12px;
  color: #fffbe6;
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-text :deep(.red-packet-footer) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  height: 24px;
}

.message-text :deep(.red-packet-amount) {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.message-text :deep(.red-packet-amount .unit) {
  font-size: 12px;
  font-weight: 400;
  color: #fffbe6;
}

.message-text :deep(.red-packet-status) {
  font-size: 12px;
  color: #fffbe6;
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 8px;
  border-radius: 10px;
  height: 20px;
  line-height: 18px;
}

.message-text :deep(.red-packet-card.finished) {
  background: linear-gradient(135deg, #a8071a 0%, #d4380d 100%);
}

.message-text :deep(.red-packet-card.finished .red-packet-status) {
  background: rgba(255, 255, 255, 0.3);
}

/* 抢红包按钮样式 - 在卡片内部 */
.message-text :deep(.grab-red-packet-button-inner) {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.message-text :deep(.grab-btn-inner) {
  background: rgba(255, 255, 255, 0.95);
  color: #ff4d4f;
  border: none;
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 100%;
}

.message-text :deep(.grab-btn-inner:hover:not(:disabled)) {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.message-text :deep(.grab-btn-inner:active:not(:disabled)) {
  transform: translateY(0);
}

.message-text :deep(.grab-btn-inner:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 查看详情按钮样式 */
.message-text :deep(.view-details-button-inner) {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.message-text :deep(.view-details-btn) {
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 4px 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.message-text :deep(.view-details-btn:hover) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

/* 抢红包结果样式 */
.grabbed-result {
  margin-top: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: #fff;
  border-radius: 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
}

/* 红包抢购记录弹窗样式 */
.red-packet-records-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.red-packet-records-modal-content {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.red-packet-records-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.red-packet-records-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.red-packet-records-modal-header .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.red-packet-records-modal-header .close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.red-packet-records-modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.loading-records,
.no-records {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f9f9f9;
  transition: all 0.3s ease;
}

.record-item:hover {
  background: #f0f0f0;
}

.record-item.lucky-king {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
  border: 1px solid #ffd591;
}

.record-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.lucky-king-tag {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #8b6914;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(255, 215, 0, 0.3);
}

.record-time {
  font-size: 12px;
  color: #999;
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
  color: #ff4d4f;
  flex-shrink: 0;
}

/* 红包详情弹窗 */
.red-packet-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.red-packet-modal-content {
  width: 360px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.red-packet-modal-header {
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  padding: 24px;
  color: #fff;
  text-align: center;
  position: relative;
}

.red-packet-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.red-packet-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.red-packet-modal-body {
  padding: 20px;
  padding-right: 24px;
  max-height: 40vh;
  /* 设置最大高度为视窗高度的60% */
  display: flex;
  flex-direction: column;
}

.red-packet-modal-title {
  font-size: 15px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 500;
  flex-shrink: 0;
  /* 防止标题被压缩 */
}

.red-packet-modal-receivers {
  max-height: calc(60vh - 100px);
  /* 减去标题和padding的高度 */
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;
  flex: 1;
}

/* 自定义滚动条样式 */
.red-packet-modal-receivers::-webkit-scrollbar {
  width: 6px;
}

.red-packet-modal-receivers::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.red-packet-modal-receivers::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
  transition: all 0.3s;
}

.red-packet-modal-receivers::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

.receiver-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.receiver-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.receiver-item:first-child {
  padding-top: 0;
}

.receiver-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 12px;
}

.receiver-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.receiver-name {
  font-size: 14px;
  color: #333;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.receiver-time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.receiver-amount {
  font-size: 15px;
  font-weight: 500;
  color: #ff4d4f;
  margin-left: 8px;
  white-space: nowrap;
}

.red-packet-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
}

.red-packet-modal-button {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.red-packet-modal-button.default {
  background: #f5f5f5;
  color: #666;
}

.red-packet-modal-button.default:hover {
  background: #e8e8e8;
}

/* 撤回消息样式 */
.message-text :deep(.revoke-message) {
  color: #999;
  font-style: italic;
  font-size: 13px;
}

.message-row-self .message-text :deep(.revoke-message) {
  color: #999;
}

/* 红包状态提示样式 */
.red-packet-status-separator {
  text-align: center;
  margin: 12px 0;
  font-size: 12px;
  color: #999;
  position: relative;
}

.red-packet-status-content {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  font-size: 12px;
  color: #666;
}

.red-packet-status-content :deep(.receiver) {
  color: #1890ff;
  font-weight: 500;
}

.red-packet-status-content :deep(.sender) {
  color: #ff4d4f;
  font-weight: 500;
}

.red-packet-status-content :deep(.message-content) {
  color: #999;
  font-weight: 500;
}

.user-info-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

.grouped-users {
  display: flex;
  align-items: center;
  margin-top: 4px;
  gap: 2px;
}

.group-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #fff;
  margin-right: -6px;
}

.plus-one-btn {
  margin-left: 8px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
  border-radius: 12px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 14px;
  align-self: center;
  height: 28px;
  display: flex;
  align-items: center;
}

.grouped-users span {
  margin-left: 8px;
}

.red-packet-sender {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.sender-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.sender-name {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
}

.current-user-tag {
  display: inline-block;
  background: #1890ff;
  color: #fff;
  font-size: 12px;
  padding: 0 6px;
  border-radius: 10px;
  margin-left: 6px;
  line-height: 1.5;
}

.lucky-king-tag {
  display: inline-block;
  background: #ffd700;
  color: #fff;
  font-size: 12px;
  padding: 0 6px;
  border-radius: 10px;
  margin-left: 6px;
  line-height: 1.5;
}

.red-packet-message {
  font-size: 15px;
  margin: 12px 0;
  color: #fffbe6;
}

.red-packet-amount {
  font-size: 32px;
  font-weight: bold;
  margin: 8px 0;
}

.red-packet-amount .unit {
  font-size: 16px;
  font-weight: normal;
  margin-left: 4px;
}

.red-packet-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 添加新的样式 */
.rock-paper-scissors-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: center;
}

.gesture-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ff4d4f;
  background: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.gesture-btn:hover {
  background: #fff1f0;
  transform: scale(1.1);
}

.message-row-self .gesture-btn {
  border-color: #1890ff;
}

.message-row-self .gesture-btn:hover {
  background: #e6f7ff;
}

/* 弹幕样式 */
.barrager-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 9999;
}

.barrager-item {
  position: fixed;
  left: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  white-space: nowrap;
  animation: barrager-move linear;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  will-change: transform;
  transform: translateZ(0);
}

.barrager-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.barrager-content {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

@keyframes barrager-move {
  from {
    transform: translate3d(100vw, 0, 0);
  }

  to {
    transform: translate3d(-100%, 0, 0);
  }
}

/* 添加链接样式 */
.message-text :deep(a) {
  color: #1890ff;
  text-decoration: none;
  word-break: break-all;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}

.message-row-self .message-text :deep(a) {
  color: #096dd9;
}

/* 添加弹幕消息的隐藏样式 */
.barrager-message {
  display: none;
}

/* 引用消息预览样式 */
.quoted-message-preview {
  margin-bottom: 8px;
  padding: 8px 12px;
  background-color: var(--hover-bg);
  border-left: 3px solid var(--primary-color);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.quoted-message-header {
  margin-bottom: 4px;
}

.quoted-message-author {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 12px;
}

.quoted-message-content {
  color: var(--sub-text-color);
  font-size: 12px;
  overflow: visible;
  word-wrap: break-word;
}

/* 引用消息中的红包样式 */
.quoted-red-packet {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  margin: 4px 0;
}

.quoted-red-packet-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.quoted-red-packet-info {
  flex: 1;
  min-width: 0;
}

.quoted-red-packet-type {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
}

.quoted-red-packet-msg {
  font-size: 11px;
  color: #fffbe6;
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 引用消息内容主体样式（包含图片和文本） */
.quoted-message-body {
  color: var(--sub-text-color);
  font-size: 12px;
  line-height: 1.5;
  word-wrap: break-word;
  max-height: 120px;
  overflow: hidden;
  position: relative;
}

.quoted-message-body img {
  max-width: 150px;
  height: auto;
  border-radius: 6px;
  cursor: pointer;
  display: block;
  margin: 4px 0;
}

.quoted-message-body :deep(img) {
  max-width: 150px;
  height: auto;
  border-radius: 6px;
  cursor: pointer;
  display: block;
  margin: 4px 0;
}

.quoted-image-indicator {
  color: var(--sub-text-color);
  font-style: italic;
}
</style>
