<template>
  <div class="fish-circle-page" ref="pageRoot">
    <div class="cover-header">
      <div
        class="cover-bg"
        :style="
          coverBgUrl
            ? { backgroundImage: `url(${coverBgUrl})` }
            : {}
        "
      />
      <div v-if="viewingUser || viewingSelf" class="cover-back-btn" @click="handleBackToMain">
        <i class="fas fa-arrow-left" /> 返回
      </div>
      <div class="user-info">
        <span class="user-name">{{
          viewingUser ? viewingUser.userName : currentDisplayName
        }}</span>
        <div
          class="user-avatar-wrap"
          @click="!viewingUser ? handleViewSelfCircle() : undefined"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            alt=""
            class="user-avatar-lg"
          />
          <span v-else class="user-avatar-placeholder">摸</span>
        </div>
      </div>
    </div>

    <div class="main-layout-inner">
      <div class="moments-container">
        <div v-if="loading && moments.length === 0" class="loading-container">
          <i class="fas fa-spinner fa-spin" />
          <p>加载中...</p>
        </div>
        <el-empty
          v-else-if="!moments.length"
          description="还没有动态，快来发布第一条吧~"
        />
        <template v-else>
          <div
            v-for="m in moments"
            :key="m.id"
            class="moment-item"
          >
            <div class="moment-content">
              <div
                class="moment-avatar"
                @click="
                  m.userId && String(m.userId) !== String(meId)
                    ? handleViewUserCircle(m.userId, m.userAvatar, m.userName)
                    : undefined
                "
              >
                <img v-if="m.userAvatar" :src="m.userAvatar" alt="" />
                <span v-else>{{ (m.userName || "摸").charAt(0) }}</span>
              </div>
              <div class="moment-body">
                <div
                  class="moment-user"
                  @click="
                    m.userId && String(m.userId) !== String(meId)
                      ? handleViewUserCircle(m.userId, m.userAvatar, m.userName)
                      : undefined
                  "
                >
                  {{ m.userName }}
                </div>
                <div v-if="m.content" class="moment-text">{{ m.content }}</div>
                <div v-if="imageUrls(m).length" :class="gridClass(imageUrls(m).length)">
                  <img
                    v-for="(url, idx) in imageUrls(m).slice(0, 9)"
                    :key="idx"
                    :src="url"
                    alt=""
                    class="grid-image"
                    @click="previewImages(imageUrls(m), idx)"
                  />
                </div>
                <div v-if="m.location" class="moment-location">
                  <i class="fas fa-map-marker-alt" /> {{ m.location }}
                </div>
                <div
                  v-if="m.likeUserNames && m.likeUserNames.trim()"
                  class="like-users-bar"
                >
                  <i class="fas fa-heart like-users-icon" />
                  <span>{{ m.likeUserNames.split(",").filter(Boolean).join("，") }}</span>
                </div>
                <div class="moment-footer">
                  <span class="moment-time">{{ formatTime(m.createTime) }}</span>
                  <div class="moment-actions">
                    <button
                      type="button"
                      class="action-btn"
                      :class="{ liked: m.liked }"
                      @click="handleLike(m)"
                    >
                      <i :class="m.liked ? 'fas fa-heart' : 'far fa-heart'" />
                      <span v-if="(m.likeNum || 0) > 0" class="count">{{ m.likeNum }}</span>
                    </button>
                    <button
                      type="button"
                      class="action-btn"
                      @click="toggleCommentPanel(m.id)"
                    >
                      <i class="far fa-comment" />
                      <span v-if="(m.commentNum || 0) > 0" class="count">{{
                        m.commentNum
                      }}</span>
                    </button>
                    <button
                      v-if="meId && String(m.userId) !== String(meId)"
                      type="button"
                      class="action-btn"
                      @click="openReward(m.id)"
                    >
                      <i class="fas fa-gift" />
                    </button>
                    <el-dropdown
                      v-if="
                        meId &&
                        (String(m.userId) === String(meId) || isAdmin)
                      "
                      trigger="click"
                    >
                      <button type="button" class="action-btn">
                        <i class="fas fa-ellipsis-h" />
                      </button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item @click="openEdit(m)">
                            <i class="fas fa-edit" /> 修改
                          </el-dropdown-item>
                          <el-dropdown-item @click="confirmDelete(m.id)">
                            <span style="color: var(--el-color-danger)"><i class="fas fa-trash" /> 删除</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="
                ((commentsMap[m.id] || []).length > 0 || showInputId === m.id)
              "
              class="comment-section"
            >
              <div v-if="(commentsMap[m.id] || []).length" class="comment-list">
                <template
                  v-for="c in visibleComments(m.id)"
                  :key="c.id"
                >
                  <div class="comment-item">
                    <img
                      v-if="c.userAvatar"
                      :src="c.userAvatar"
                      class="comment-avatar"
                      alt=""
                    />
                    <div v-else class="comment-avatar comment-avatar-ph">
                      {{ (c.userName || "?").charAt(0) }}
                    </div>
                    <div class="comment-body">
                      <span class="comment-username">{{ c.userName }}</span>
                      <div class="comment-content-text" v-html="renderCommentHtml(c.content)" />
                      <div class="comment-meta">
                        <span>{{ formatTime(c.createTime) }}</span>
                        <span
                          class="link"
                          @click="
                            setReply(m.id, c.id, c.userName)
                          "
                        >回复</span>
                        <span
                          v-if="canDeleteComment(c)"
                          class="link danger"
                          @click="handleDeleteComment(c.id, m.id)"
                        >删除</span>
                      </div>
                      <template v-if="(c.children || []).length">
                        <div
                          v-if="!expandedReplies[c.id]"
                          class="expand-replies"
                          @click="expandedReplies[c.id] = true"
                        >
                          查看 {{ c.children.length }} 条回复
                        </div>
                        <template v-else>
                          <div
                            v-for="child in c.children"
                            :key="child.id"
                            class="comment-item child"
                          >
                            <img
                              v-if="child.userAvatar"
                              :src="child.userAvatar"
                              class="comment-avatar sm"
                              alt=""
                            />
                            <div v-else class="comment-avatar sm comment-avatar-ph">
                              {{ (child.userName || "?").charAt(0) }}
                            </div>
                            <div class="comment-body">
                              <span class="comment-username">{{ child.userName }}</span>
                              <span v-if="child.replyUserName" class="reply-to">
                                回复 {{ child.replyUserName }}
                              </span>
                              <div class="comment-content-text" v-html="renderCommentHtml(child.content)" />
                              <div class="comment-meta">
                                <span>{{ formatTime(child.createTime) }}</span>
                                <span
                                  class="link"
                                  @click="
                                    setReply(m.id, c.id, child.userName)
                                  "
                                >回复</span>
                                <span
                                  v-if="canDeleteComment(child)"
                                  class="link danger"
                                  @click="handleDeleteComment(child.id, m.id)"
                                >删除</span>
                              </div>
                            </div>
                          </div>
                          <div
                            class="expand-replies"
                            @click="expandedReplies[c.id] = false"
                          >
                            收起回复
                          </div>
                        </template>
                      </template>
                    </div>
                  </div>
                </template>
                <div
                  v-if="
                    !expandedComments[m.id] &&
                    (commentsMap[m.id] || []).length > 3
                  "
                  class="expand-replies"
                  @click="expandedComments[m.id] = true"
                >
                  查看更多 {{ (commentsMap[m.id] || []).length - 3 }} 条评论
                </div>
                <div
                  v-if="
                    expandedComments[m.id] &&
                    (commentsMap[m.id] || []).length > 3
                  "
                  class="expand-replies"
                  @click="expandedComments[m.id] = false"
                >
                  收起
                </div>
              </div>

              <div v-if="showInputId === m.id" class="comment-input-area">
                <div v-if="replyTarget && replyTarget.momentId === m.id" class="reply-hint">
                  回复 {{ replyTarget.userName }}
                  <i class="fas fa-times" @click="replyTarget = null" />
                </div>
                <div v-if="getCommentImages(m.id).length" class="comment-img-preview">
                  <div
                    v-for="(u, ix) in getCommentImages(m.id)"
                    :key="ix"
                    class="cimg-item"
                  >
                    <img :src="u" alt="" />
                    <span class="rm" @click="removeCommentImg(m.id, ix)"><i class="fas fa-times" /></span>
                  </div>
                </div>
                <div class="comment-input-row">
                  <el-input
                    v-model="commentInputMap[m.id]"
                    :placeholder="
                      replyTarget && replyTarget.momentId === m.id
                        ? `回复 ${replyTarget.userName}...`
                        : '写评论...'
                    "
                    maxlength="200"
                    @keyup.enter="submitComment(m.id)"
                    @paste="(e) => onCommentPaste(m.id, e)"
                  />
                  <label class="img-add">
                    <input
                      type="file"
                      accept="image/*"
                      :disabled="getCommentImages(m.id).length >= 3 || commentImgUploading[String(m.id)]"
                      @change="(e) => onCommentFile(m.id, e)"
                    >
                    <i class="fas fa-image" />
                  </label>
                  <el-button
                    type="primary"
                    size="small"
                    :loading="commentSubmitting"
                    :disabled="
                      !((commentInputMap[m.id] || '').trim()) &&
                        !getCommentImages(m.id).length
                    "
                    @click="submitComment(m.id)"
                  >
                    发送
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loadingMore" class="loading-more">
            <i class="fas fa-spinner fa-spin" /> 加载更多...
          </div>
          <div v-if="!hasMore && moments.length > 0" class="no-more">
            <el-divider>没有更多了</el-divider>
          </div>
        </template>
      </div>

      <aside class="fish-sidebar">
        <div class="sidebar-card">
          <div class="sidebar-card-title">置顶公告</div>
          <p class="pinned-item">欢迎来到摸鱼朋友圈，请文明发言。</p>
          <p class="pinned-item">有问题可联系管理员。</p>
        </div>
      </aside>
    </div>

    <button type="button" class="fab-publish" @click="publishOpen = true">
      <i class="fas fa-plus" />
    </button>

    <!-- 发布 -->
    <el-dialog
      v-model="publishOpen"
      title="发布朋友圈"
      width="520px"
      destroy-on-close
      @closed="resetPublish"
    >
      <el-input
        v-model="publishContent"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
        placeholder="分享新鲜事..."
        @paste="onPublishPaste"
      />
      <div v-if="publishImages.length" class="pub-img-preview">
        <div v-for="(u, i) in publishImages" :key="i" class="pub-img-item">
          <img :src="u" alt="">
          <span class="rm" @click="publishImages.splice(i, 1)"><i class="fas fa-times" /></span>
        </div>
      </div>
      <div class="pub-toolbar">
        <label class="btn-lite">
          <input type="file" accept="image/*" multiple @change="onPublishFiles">
          <i class="fas fa-image" /> 图片
        </label>
      </div>
      <el-input
        v-model="publishLocation"
        class="pub-loc"
        placeholder="位置（选填）"
        maxlength="50"
      >
        <template #prefix>
          <i class="fas fa-map-marker-alt" style="opacity: 0.5" />
        </template>
      </el-input>
      <template #footer>
        <el-button @click="publishOpen = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="handlePublish">
          发布
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑 -->
    <el-dialog
      v-model="editOpen"
      title="修改动态"
      width="520px"
      destroy-on-close
    >
      <el-input
        v-model="editContent"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
      />
      <div v-if="editImages.length" class="pub-img-preview">
        <div v-for="(u, i) in editImages" :key="i" class="pub-img-item">
          <img :src="u" alt="">
          <span class="rm" @click="editImages.splice(i, 1)"><i class="fas fa-times" /></span>
        </div>
      </div>
      <div class="pub-toolbar">
        <label class="btn-lite">
          <input type="file" accept="image/*" multiple @change="onEditFiles">
          <i class="fas fa-image" /> 图片
        </label>
      </div>
      <el-input v-model="editLocation" placeholder="位置（选填）" maxlength="50" />
      <template #footer>
        <el-button @click="editOpen = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 打赏 -->
    <el-dialog
      v-model="rewardOpen"
      title="打赏积分"
      width="360px"
      destroy-on-close
      @closed="rewardMomentId = null"
    >
      <p class="reward-desc">积分将从你的账户扣除（usedPoints）</p>
      <div class="reward-presets">
        <span
          v-for="v in [1, 5, 10, 20]"
          :key="v"
          :class="['rp', { active: rewardPoints === v }]"
          @click="rewardPoints = v"
        >{{ v }} 积分</span>
      </div>
      <el-input-number
        v-model="rewardPoints"
        :min="1"
        :max="20"
        style="width: 100%; margin-top: 12px"
      />
      <template #footer>
        <el-button @click="rewardOpen = false">取消</el-button>
        <el-button type="primary" :loading="rewarding" @click="submitReward">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "../stores/user";
import { userApi } from "../api/user";
import * as momentsApi from "../api/moments";
import { createImagePreviewWindow } from "../utils/imagePreview";

const route = useRoute();
const userStore = useUserStore();

const pageRoot = ref(null);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const moments = ref([]);
const viewingUserId = ref(undefined);
const viewingUser = ref(null);
const viewingSelf = ref(false);
const loginUserExtra = ref(null);

const commentsMap = ref({});
const commentInputMap = reactive({});
/** 用 ref + 整体替换，避免 reactive 动态键导致「选了图仍不能发送」 */
const commentImagesMap = ref({});
const commentImgUploading = reactive({});
const showInputId = ref(null);
const replyTarget = ref(null);
const commentSubmitting = ref(false);
const expandedReplies = reactive({});
const expandedComments = reactive({});

const publishOpen = ref(false);
const publishContent = ref("");
const publishImages = ref([]);
const publishLocation = ref("");
const publishing = ref(false);

const editOpen = ref(false);
const editingMoment = ref(null);
const editContent = ref("");
const editImages = ref([]);
const editLocation = ref("");
const editSubmitting = ref(false);

const rewardOpen = ref(false);
const rewardMomentId = ref(null);
const rewardPoints = ref(10);
const rewarding = ref(false);

const PAGE_SIZE = 10;

const meId = computed(() => {
  const id = userStore.userInfo?.id ?? userStore.userInfo?.userId;
  return id != null ? String(id) : "";
});

const isAdmin = computed(() => userStore.userRole === "admin");

const currentDisplayName = computed(
  () => userStore.userName || loginUserExtra.value?.userName || "摸鱼用户"
);

const avatarUrl = computed(() => {
  if (viewingUser.value) {
    return viewingUser.value.userAvatar || viewingUser.value.userAvatarURL;
  }
  return userStore.userAvatarURL || loginUserExtra.value?.userAvatar;
});

const coverBgUrl = computed(() => {
  if (viewingUser.value?.momentsBgUrl) return viewingUser.value.momentsBgUrl;
  if (viewingSelf.value && loginUserExtra.value?.momentsBgUrl) {
    return loginUserExtra.value.momentsBgUrl;
  }
  return loginUserExtra.value?.momentsBgUrl || userStore.userInfo?.momentsBgUrl;
});

function formatTime(timeStr) {
  if (!timeStr) return "";
  const t = new Date(timeStr.replace(/-/g, "/"));
  if (Number.isNaN(t.getTime())) return "";
  const now = Date.now();
  const diffMin = Math.floor((now - t.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffH < 24) return `${diffH}小时前`;
  if (diffD === 1) return "昨天";
  if (diffD < 7) return `${diffD}天前`;
  const mo = t.getMonth() + 1;
  const d = t.getDate();
  return `${mo}月${d}日`;
}

function imageUrls(m) {
  const list = m.mediaJson || [];
  return list.filter((i) => i.type === "image" && i.url).map((i) => i.url);
}

function gridClass(n) {
  if (n === 1) return "media-grid single";
  if (n === 2) return "media-grid grid-2";
  if (n === 4) return "media-grid grid-4";
  return "media-grid grid-3";
}

function momentKey(mid) {
  return mid != null ? String(mid) : "";
}

function getCommentImages(mid) {
  const k = momentKey(mid);
  return k ? commentImagesMap.value[k] || [] : [];
}

function setCommentImages(mid, urls) {
  const k = momentKey(mid);
  if (!k) return;
  const next = { ...commentImagesMap.value };
  if (!urls || !urls.length) {
    delete next[k];
  } else {
    next[k] = urls;
  }
  commentImagesMap.value = next;
}

function imgRegexParts(content) {
  if (!content) return { text: "", urls: [] };
  const urls = [];
  const re = /\[img:(https?:\/\/[^\]]+)\]/g;
  let text = content;
  let m;
  while ((m = re.exec(content)) !== null) {
    urls.push(m[1]);
    text = text.replace(m[0], "");
  }
  return { text: text.trim(), urls };
}

function renderCommentHtml(content) {
  const { text, urls } = imgRegexParts(content || "");
  let html = escapeHtml(text);
  urls.forEach((u) => {
    html += `<div class="cmt-img-wrap"><img src="${escapeAttr(u)}" class="cmt-img" alt="" /></div>`;
  });
  return html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

async function fetchMoments(isLoadMore = false) {
  if (loading.value || loadingMore.value) return;
  if (isLoadMore && !hasMore.value) return;

  const nextPage = isLoadMore ? currentPage.value + 1 : 1;
  const uid = viewingUserId.value;

  if (isLoadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const res = await momentsApi.listMoments({
      current: nextPage,
      pageSize: PAGE_SIZE,
      sortField: "createTime",
      sortOrder: "descend",
      userId: uid != null && uid !== "" ? uid : undefined,
    });
    if (res.code !== 0 || !res.data) {
      throw new Error(res.message || "加载失败");
    }
    const records = res.data.records || [];
    const total = res.data.total || 0;
    if (isLoadMore) {
      moments.value = [...moments.value, ...records];
    } else {
      moments.value = records;
    }
    currentPage.value = nextPage;
    hasMore.value = nextPage * PAGE_SIZE < total;

    records.forEach(async (mm) => {
      if (!mm.id) return;
      try {
        const cr = await momentsApi.listMomentComments({
          momentId: mm.id,
          current: 1,
          pageSize: 50,
        });
        if (cr.code === 0 && cr.data?.records) {
          commentsMap.value = { ...commentsMap.value, [mm.id]: cr.data.records };
        }
      } catch (_) {}
    });
  } catch (e) {
    console.error(e);
    ElMessage.error(e.message || "获取动态失败");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

/** 实际滚动在 .fish-circle-page（pageRoot）上，不是 window */
let fishCircleScrollEl = null;

function onScrollContainer() {
  const el = fishCircleScrollEl;
  if (!el) return;
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (
    scrollHeight - scrollTop - clientHeight < 120 &&
    hasMore.value &&
    !loadingMore.value &&
    !loading.value
  ) {
    fetchMoments(true);
  }
}

async function handleLike(m) {
  if (!meId.value) {
    ElMessage.warning("请先登录");
    return;
  }
  try {
    const res = await momentsApi.toggleMomentLike({ momentId: m.id });
    if (res.code !== 0) throw new Error(res.message);
    const name = userStore.userName || "";
    const liked = m.liked;
    let names = (m.likeUserNames || "").split(",").filter(Boolean);
    if (liked) {
      names = names.filter((n) => n !== name);
    } else if (!names.includes(name)) {
      names.push(name);
    }
    moments.value = moments.value.map((item) =>
      item.id === m.id
        ? {
            ...item,
            liked: !liked,
            likeNum: (item.likeNum || 0) + (liked ? -1 : 1),
            likeUserNames: names.join(","),
          }
        : item
    );
  } catch (e) {
    ElMessage.error("操作失败");
  }
}

async function handleViewSelfCircle() {
  if (!meId.value) return;
  if (viewingSelf.value) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  viewingSelf.value = true;
  viewingUser.value = null;
  moments.value = [];
  commentsMap.value = {};
  currentPage.value = 1;
  hasMore.value = true;
  viewingUserId.value = meId.value;
  await fetchMoments(false);
}

async function handleViewUserCircle(userId, avatar, name) {
  if (String(userId) === meId.value) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  viewingSelf.value = false;
  try {
    const u = await userApi.getUserVoById(userId);
    viewingUser.value = u || { id: userId, userName: name, userAvatar: avatar };
  } catch {
    viewingUser.value = { id: userId, userName: name, userAvatar: avatar };
  }
  moments.value = [];
  commentsMap.value = {};
  currentPage.value = 1;
  hasMore.value = true;
  viewingUserId.value = userId;
  await fetchMoments(false);
}

async function handleBackToMain() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  viewingUser.value = null;
  viewingSelf.value = false;
  viewingUserId.value = undefined;
  moments.value = [];
  commentsMap.value = {};
  currentPage.value = 1;
  hasMore.value = true;
  await fetchMoments(false);
}

async function toggleCommentPanel(mid) {
  showInputId.value = showInputId.value === mid ? null : mid;
  replyTarget.value = null;
  if (!commentsMap.value[mid]) {
    try {
      const cr = await momentsApi.listMomentComments({
        momentId: mid,
        current: 1,
        pageSize: 50,
      });
      if (cr.code === 0) {
        commentsMap.value = {
          ...commentsMap.value,
          [mid]: cr.data?.records || [],
        };
      }
    } catch {
      ElMessage.error("加载评论失败");
    }
  }
}

function visibleComments(momentId) {
  const all = commentsMap.value[momentId] || [];
  if (expandedComments[momentId]) return all;
  return all.slice(0, 3);
}

function setReply(momentId, commentId, userName) {
  replyTarget.value = { momentId, commentId, userName };
  showInputId.value = momentId;
}

function canDeleteComment(c) {
  if (!meId.value) return false;
  return String(c.userId) === meId.value || isAdmin.value;
}

async function handleDeleteComment(commentId, momentId) {
  try {
    const res = await momentsApi.deleteMomentComment({ id: String(commentId) });
    if (res.code !== 0 || !res.data) throw new Error("删除失败");
    ElMessage.success("已删除");
    const list = await momentsApi.listMomentComments({
      momentId,
      current: 1,
      pageSize: 50,
    });
    commentsMap.value = {
      ...commentsMap.value,
      [momentId]: list.data?.records || [],
    };
    moments.value = moments.value.map((m) =>
      m.id === momentId
        ? { ...m, commentNum: Math.max((m.commentNum || 1) - 1, 0) }
        : m
    );
  } catch {
    ElMessage.error("删除失败");
  }
}

async function submitComment(momentId) {
  const mk = momentKey(momentId);
  const text = String(commentInputMap[momentId] ?? commentInputMap[mk] ?? "").trim();
  const images = getCommentImages(momentId);
  if (!text && !images.length) return;
  if (!meId.value) {
    ElMessage.warning("请先登录");
    return;
  }
  const imgPart = images.map((url) => `[img:${url}]`).join("");
  const content = text + imgPart;
  commentSubmitting.value = true;
  try {
    const midNum = Number(momentId);
    const res = await momentsApi.addMomentComment({
      momentId: Number.isFinite(midNum) ? midNum : momentId,
      content,
      parentId:
        replyTarget.value?.momentId != null &&
        String(replyTarget.value.momentId) === mk
          ? replyTarget.value.commentId
          : undefined,
    });
    if (res.code !== 0) throw new Error(res.message);
    ElMessage.success("评论成功");
    commentInputMap[momentId] = "";
    commentInputMap[mk] = "";
    setCommentImages(momentId, []);
    replyTarget.value = null;
    const updated = await momentsApi.listMomentComments({
      momentId: Number.isFinite(midNum) ? midNum : momentId,
      current: 1,
      pageSize: 50,
    });
    commentsMap.value = {
      ...commentsMap.value,
      [momentId]: updated.data?.records || [],
    };
    moments.value = moments.value.map((m) =>
      String(m.id) === mk
        ? { ...m, commentNum: (m.commentNum || 0) + 1 }
        : m
    );
  } catch {
    ElMessage.error("评论失败");
  } finally {
    commentSubmitting.value = false;
  }
}

async function onCommentFile(momentId, e) {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const mk = momentKey(momentId);
  const cur = getCommentImages(momentId);
  if (cur.length >= 3) {
    ElMessage.warning("最多 3 张图");
    return;
  }
  commentImgUploading[mk] = true;
  try {
    const url = await userApi.uploadPostImage(file);
    setCommentImages(momentId, [...cur, url]);
  } catch (err) {
    ElMessage.error(err.message || "上传失败");
  } finally {
    commentImgUploading[mk] = false;
  }
}

async function onCommentPaste(momentId, e) {
  const items = e.clipboardData?.items;
  if (!items?.length) return;
  const files = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type.startsWith("image/")) {
      const f = it.getAsFile();
      if (f) files.push(f);
    }
  }
  if (!files.length) return;
  e.preventDefault();
  const mk = momentKey(momentId);
  for (const file of files) {
    const cur = getCommentImages(momentId);
    if (cur.length >= 3) {
      ElMessage.warning("最多 3 张图");
      return;
    }
    commentImgUploading[mk] = true;
    try {
      const url = await userApi.uploadPostImage(file);
      setCommentImages(momentId, [...getCommentImages(momentId), url]);
    } catch (err) {
      ElMessage.error(err.message || "上传失败");
    } finally {
      commentImgUploading[mk] = false;
    }
  }
}

function removeCommentImg(momentId, ix) {
  const cur = [...getCommentImages(momentId)];
  cur.splice(ix, 1);
  setCommentImages(momentId, cur);
}

function confirmDelete(momentId) {
  ElMessageBox.confirm("删除后无法恢复，确定删除？", "确认删除", {
    type: "warning",
  }).then(async () => {
    try {
      const res = await momentsApi.deleteMoment({ id: String(momentId) });
      if (res.code !== 0 || !res.data) throw new Error();
      ElMessage.success("已删除");
      moments.value = moments.value.filter((x) => x.id !== momentId);
    } catch {
      ElMessage.error("删除失败");
    }
  }).catch(() => {});
}

function openEdit(m) {
  editingMoment.value = m;
  editContent.value = m.content || "";
  editImages.value = imageUrls(m);
  editLocation.value = m.location || "";
  editOpen.value = true;
}

async function submitEdit() {
  if (!editingMoment.value?.id) return;
  editSubmitting.value = true;
  try {
    const mediaJson = editImages.value.map((url) => ({ type: "image", url }));
    const res = await momentsApi.updateMoment({
      id: editingMoment.value.id,
      content: editContent.value.trim(),
      mediaJson,
      location: editLocation.value.trim() || undefined,
    });
    if (res.code !== 0 || !res.data) throw new Error();
    ElMessage.success("已保存");
    moments.value = moments.value.map((item) =>
      item.id === editingMoment.value.id
        ? {
            ...item,
            content: editContent.value.trim(),
            mediaJson,
            location: editLocation.value.trim() || undefined,
          }
        : item
    );
    editOpen.value = false;
    editingMoment.value = null;
  } catch {
    ElMessage.error("保存失败");
  } finally {
    editSubmitting.value = false;
  }
}

async function onEditFiles(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = "";
  for (const file of files) {
    if (editImages.value.length >= 9) break;
    try {
      const url = await userApi.uploadPostImage(file);
      editImages.value.push(url);
    } catch (err) {
      ElMessage.error(err.message || "上传失败");
    }
  }
}

function openReward(mid) {
  rewardMomentId.value = mid;
  rewardPoints.value = 10;
  rewardOpen.value = true;
}

async function submitReward() {
  if (!rewardMomentId.value) return;
  if (!meId.value) {
    ElMessage.warning("请先登录");
    return;
  }
  rewarding.value = true;
  try {
    const res = await momentsApi.rewardMoment({
      momentId: rewardMomentId.value,
      points: rewardPoints.value,
    });
    if (res.code !== 0 || !res.data) throw new Error();
    ElMessage.success("打赏成功");
    rewardOpen.value = false;
    rewardMomentId.value = null;
  } catch {
    ElMessage.error("打赏失败");
  } finally {
    rewarding.value = false;
  }
}

function resetPublish() {
  publishContent.value = "";
  publishImages.value = [];
  publishLocation.value = "";
}

async function onPublishPaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  const imgs = Array.from(items).filter((it) => it.type.indexOf("image") !== -1);
  if (!imgs.length) return;
  e.preventDefault();
  for (const it of imgs) {
    const file = it.getAsFile();
    if (!file || publishImages.value.length >= 9) break;
    try {
      const url = await userApi.uploadPostImage(file);
      publishImages.value.push(url);
    } catch {
      ElMessage.error("图片上传失败");
    }
  }
}

async function onPublishFiles(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = "";
  for (const file of files) {
    if (publishImages.value.length >= 9) break;
    try {
      const url = await userApi.uploadPostImage(file);
      publishImages.value.push(url);
    } catch (err) {
      ElMessage.error(err.message || "上传失败");
    }
  }
}

async function handlePublish() {
  if (!publishContent.value.trim() && !publishImages.value.length) {
    ElMessage.warning("请输入内容或上传图片");
    return;
  }
  if (!meId.value) {
    ElMessage.warning("请先登录");
    return;
  }
  publishing.value = true;
  try {
    const mediaJson = publishImages.value.map((url) => ({ type: "image", url }));
    const res = await momentsApi.publishMoment({
      content: publishContent.value.trim(),
      mediaJson,
      location: publishLocation.value.trim() || undefined,
      visibility: 0,
    });
    if (res.code !== 0) throw new Error(res.message);
    ElMessage.success("发布成功");
    publishOpen.value = false;
    resetPublish();
    currentPage.value = 1;
    hasMore.value = true;
    await fetchMoments(false);
  } catch (e) {
    ElMessage.error(e.message || "发布失败");
  } finally {
    publishing.value = false;
  }
}

async function previewImages(urls, index) {
  const payload = urls.map((src) => ({ src }));
  try {
    await createImagePreviewWindow(payload, index);
  } catch (err) {
    console.error(err);
  }
}

async function loadLoginUser() {
  try {
    const res = await userApi.getCurrentUser();
    if (res?.code === 0 && res.data) {
      loginUserExtra.value = res.data;
    }
  } catch (_) {}
}

onMounted(async () => {
  await userStore.fetchUserInfo(true);
  await loadLoginUser();
  const q = route.query.userId;
  if (q) {
    viewingUserId.value = q;
    try {
      const u = await userApi.getUserVoById(q);
      viewingUser.value = u || { id: q };
    } catch (_) {}
    await fetchMoments(false);
  } else {
    await fetchMoments(false);
  }
  await nextTick();
  fishCircleScrollEl = pageRoot.value;
  fishCircleScrollEl?.addEventListener("scroll", onScrollContainer, {
    passive: true,
  });
});

onUnmounted(() => {
  fishCircleScrollEl?.removeEventListener("scroll", onScrollContainer);
  fishCircleScrollEl = null;
});

watch(
  () => route.query.userId,
  async (uid) => {
    if (uid) {
      viewingUserId.value = uid;
      try {
        viewingUser.value = await userApi.getUserVoById(uid);
      } catch (_) {
        viewingUser.value = { id: uid };
      }
      moments.value = [];
      currentPage.value = 1;
      hasMore.value = true;
      await fetchMoments(false);
    }
  }
);
</script>

<style scoped>
.fish-circle-page {
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  background: var(--main-layout-bg, #f5f6f7);
  padding-bottom: 80px;
}

.cover-header {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.cover-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.45;
}

.cover-back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.user-info {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 2;
}

.user-name {
  display: block;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  margin-bottom: 8px;
}

.user-avatar-wrap {
  width: 80px;
  height: 80px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  border: 3px solid #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  cursor: default;
}

.user-avatar-lg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #eee;
  font-size: 28px;
}

.main-layout-inner {
  max-width: 100vw;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.moments-container {
  flex: 1;
  min-width: 0;
}

.fish-sidebar {
  width: 260px;
  flex-shrink: 0;
}

.sidebar-card {
  background: var(--card-bg, #fff);
  border-radius: 10px;
  padding: 14px;
  border: 1px solid var(--border-color, #eee);
}

.sidebar-card-title {
  font-weight: 600;
  margin-bottom: 10px;
}

.pinned-item {
  font-size: 13px;
  color: var(--sub-text-color, #666);
  margin: 8px 0;
  line-height: 1.5;
}

.loading-container,
.loading-more {
  text-align: center;
  padding: 32px;
  color: #888;
}

.moment-item {
  background: var(--card-bg, #fff);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color, #eee);
}

.moment-content {
  display: flex;
  gap: 12px;
}

.moment-avatar {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.moment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.moment-body {
  flex: 1;
  min-width: 0;
}

.moment-user {
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  margin-bottom: 6px;
}

.moment-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  margin-bottom: 8px;
}

.media-grid {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}

.media-grid.single {
  max-width: 400px;
}

.media-grid.single .grid-image {
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
}

.media-grid.grid-2 {
  grid-template-columns: 1fr 1fr;
}

.media-grid.grid-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.media-grid.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
}

.moment-location {
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
}

.like-users-bar {
  background: rgba(0, 0, 0, 0.04);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
}

.like-users-icon {
  color: #ff6b81;
  margin-right: 6px;
}

.moment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.moment-time {
  font-size: 12px;
  color: #999;
}

.moment-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.action-btn.liked {
  color: #ff6b81;
}

.action-btn .count {
  margin-left: 4px;
  font-size: 12px;
}

.comment-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, #eee);
}

.comment-list {
  margin-bottom: 10px;
}

.comment-item {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.comment-item.child {
  margin-left: 12px;
  margin-top: 8px;
}

.comment-avatar {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-avatar.sm {
  width: 22px;
  height: 22px;
}

.comment-avatar-ph {
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.comment-body {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

.comment-username {
  font-weight: 600;
  margin-right: 6px;
}

.reply-to {
  color: #888;
  font-size: 12px;
  margin-left: 4px;
}

.comment-content-text {
  margin-top: 4px;
  line-height: 1.5;
  word-break: break-word;
}

.comment-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.comment-meta .link {
  margin-left: 10px;
  cursor: pointer;
  color: var(--primary-color, #409eff);
}

.comment-meta .link.danger {
  color: var(--el-color-danger);
}

.expand-replies {
  font-size: 12px;
  color: var(--primary-color, #409eff);
  cursor: pointer;
  margin: 6px 0 6px 36px;
}

.comment-input-area {
  margin-top: 8px;
}

.reply-hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.reply-hint .fa-times {
  cursor: pointer;
  margin-left: 8px;
}

.comment-img-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.cimg-item {
  position: relative;
  width: 56px;
  height: 56px;
}

.cimg-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.cimg-item .rm {
  position: absolute;
  top: -6px;
  right: -6px;
  cursor: pointer;
  background: #333;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.comment-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-input-row .el-input {
  flex: 1;
}

.img-add input {
  display: none;
}

.img-add {
  cursor: pointer;
  padding: 6px 10px;
  color: #666;
}

.fab-publish {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color, #409eff);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.45);
  z-index: 50;
}

.pub-img-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.pub-img-item {
  position: relative;
  width: 72px;
  height: 72px;
}

.pub-img-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.pub-img-item .rm {
  position: absolute;
  top: -6px;
  right: -6px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pub-toolbar {
  margin: 8px 0;
}

.btn-lite {
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.btn-lite input {
  display: none;
}

.pub-loc {
  margin-top: 8px;
}

.reward-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.reward-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rp {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.rp.active {
  border-color: var(--primary-color, #409eff);
  color: var(--primary-color, #409eff);
}

:deep(.cmt-img-wrap) {
  margin-top: 6px;
}

:deep(.cmt-img) {
  max-width: 160px;
  max-height: 160px;
  border-radius: 6px;
  vertical-align: top;
}

@media (max-width: 900px) {
  .fish-sidebar {
    display: none;
  }
}
</style>
