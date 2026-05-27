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
        <div v-if="coverShowFollow" class="cover-follow-row">
          <el-button
            size="small"
            :loading="coverFollowLoading"
            :class="
              coverIsFollowing ? 'cover-follow-btn-active' : 'cover-follow-btn-default'
            "
            @mouseenter="coverIsFollowing && (coverFollowHover = true)"
            @mouseleave="coverFollowHover = false"
            @click="handleCoverToggleFollow"
          >
            {{
              coverIsFollowing
                ? coverFollowHover
                  ? "取消关注"
                  : "✓ 已关注"
                : "+ 关注"
            }}
          </el-button>
        </div>
        <div v-if="coverProfileUser" class="cover-follow-stats">
          <span class="cover-stat">
            <b>{{ coverFollowingCount ?? "-" }}</b> 关注
          </span>
          <span class="cover-stat-divider" />
          <span class="cover-stat">
            <b>{{ coverProfileUser.followerCount ?? "-" }}</b> 粉丝
          </span>
        </div>
        <div
          class="user-avatar-wrap"
          @click="!viewingUser ? handleViewSelfCircle() : openUserDetailModal()"
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
                <div class="moment-header-meta">
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
                  <div class="moment-time-row">
                    <span class="moment-time">{{ formatTime(m.createTime) }}</span>
                    <span v-if="m.isTop === 1" class="moment-top-tag">置顶</span>
                  </div>
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
                  <span>{{ renderLikeUsers(m.likeUserNames) }}</span>
                </div>
                <div class="moment-footer">
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
                          <el-dropdown-item
                            v-if="String(m.userId) === String(meId)"
                            @click="openLottery(m.id)"
                          >
                            <i class="fas fa-trophy" /> 发起抽奖
                          </el-dropdown-item>
                          <el-dropdown-item
                            v-if="isAdmin"
                            @click="handleToggleTop(m.id, m.isTop || 0)"
                          >
                            <i class="fas fa-thumbtack" />
                            {{ m.isTop === 1 ? "取消置顶" : "置顶动态" }}
                          </el-dropdown-item>
                          <el-dropdown-item @click="confirmDelete(m.id)">
                            <span style="color: var(--el-color-danger)"><i class="fas fa-trash" /> 删除</span>
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
                <div
                  v-if="commentInputVisible(m.id, 'first')"
                  class="first-comment-input-wrap"
                >
                  <FishCircleCommentInput
                    :visible="true"
                    :inline="false"
                    :text="commentInputMap[m.id] || ''"
                    reply-hint=""
                    :images="getCommentImages(m.id)"
                    :image-uploading="!!commentImgUploading[String(m.id)]"
                    :submitting="commentSubmitting"
                    @update:text="commentInputMap[m.id] = $event"
                    @submit="submitComment(m.id)"
                    @clear-reply="replyTarget = null"
                    @remove-image="(ix) => removeCommentImg(m.id, ix)"
                    @paste="(e) => onCommentPaste(m.id, e)"
                    @file="(e) => onCommentFile(m.id, e)"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="(commentsMap[m.id] || []).length > 0"
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
                        <span class="comment-time">{{ formatTime(c.createTime) }}</span>
                        <span
                          class="link"
                          @click="setReply(m.id, c.id, c.userName)"
                        >回复</span>
                        <span
                          v-if="canDeleteComment(c)"
                          class="link danger"
                          @click="handleDeleteComment(c.id, m.id)"
                        >删除</span>
                      </div>
                      <FishCircleCommentInput
                        :visible="commentInputVisible(m.id, c.id)"
                        :text="commentInputMap[m.id] || ''"
                        :reply-hint="
                          replyTarget &&
                          String(replyTarget.momentId) === String(m.id) &&
                          String(replyTarget.anchorCommentId) === String(c.id)
                            ? replyTarget.userName
                            : ''
                        "
                        :images="getCommentImages(m.id)"
                        :image-uploading="!!commentImgUploading[String(m.id)]"
                        :submitting="commentSubmitting"
                        @update:text="commentInputMap[m.id] = $event"
                        @submit="submitComment(m.id)"
                        @clear-reply="replyTarget = null"
                        @remove-image="(ix) => removeCommentImg(m.id, ix)"
                        @paste="(e) => onCommentPaste(m.id, e)"
                        @file="(e) => onCommentFile(m.id, e)"
                      />
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
                                <span class="comment-time">{{ formatTime(child.createTime) }}</span>
                                <span
                                  class="link"
                                  @click="setReply(m.id, c.id, child.userName, child.id)"
                                >回复</span>
                                <span
                                  v-if="canDeleteComment(child)"
                                  class="link danger"
                                  @click="handleDeleteComment(child.id, m.id)"
                                >删除</span>
                              </div>
                              <FishCircleCommentInput
                                :visible="commentInputVisible(m.id, child.id)"
                                :text="commentInputMap[m.id] || ''"
                                :reply-hint="
                                  replyTarget &&
                                  String(replyTarget.momentId) === String(m.id) &&
                                  String(replyTarget.anchorCommentId) === String(child.id)
                                    ? replyTarget.userName
                                    : ''
                                "
                                :images="getCommentImages(m.id)"
                                :image-uploading="!!commentImgUploading[String(m.id)]"
                                :submitting="commentSubmitting"
                                @update:text="commentInputMap[m.id] = $event"
                                @submit="submitComment(m.id)"
                                @clear-reply="replyTarget = null"
                                @remove-image="(ix) => removeCommentImg(m.id, ix)"
                                @paste="(e) => onCommentPaste(m.id, e)"
                                @file="(e) => onCommentFile(m.id, e)"
                              />
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
                <FishCircleCommentInput
                  :visible="commentInputVisible(m.id, 'bottom')"
                  :inline="false"
                  :text="commentInputMap[m.id] || ''"
                  reply-hint=""
                  :images="getCommentImages(m.id)"
                  :image-uploading="!!commentImgUploading[String(m.id)]"
                  :submitting="commentSubmitting"
                  @update:text="commentInputMap[m.id] = $event"
                  @submit="submitComment(m.id)"
                  @clear-reply="replyTarget = null"
                  @remove-image="(ix) => removeCommentImg(m.id, ix)"
                  @paste="(e) => onCommentPaste(m.id, e)"
                  @file="(e) => onCommentFile(m.id, e)"
                />
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

    <!-- 抽奖 -->
    <el-dialog
      v-model="lotteryOpen"
      width="420px"
      destroy-on-close
      align-center
      @closed="resetLotteryDialog"
    >
      <template #header>
        <span class="lottery-dialog-title">
          <i class="fas fa-trophy" />
          发起抽奖
        </span>
      </template>
      <div class="lottery-modal-content">
        <template v-if="!lotteryResult">
          <p class="lottery-desc">
            从给这条动态点赞的用户中随机抽取幸运儿，抽奖结果将自动发布到评论区
          </p>
          <div class="lottery-count-row">
            <span class="lottery-count-label">抽取人数</span>
            <el-input-number
              v-model="lotteryWinnerCount"
              :min="1"
              :max="100"
              controls-position="right"
              style="width: 160px"
            />
          </div>
          <div class="lottery-presets">
            <span
              v-for="value in [1, 3, 5, 10]"
              :key="value"
              :class="['lottery-preset-item', { active: lotteryWinnerCount === value }]"
              @click="lotteryWinnerCount = value"
            >
              {{ value }} 人
            </span>
          </div>
          <div class="lottery-footer">
            <el-button round @click="closeLotteryDialog">取消</el-button>
            <el-button
              type="primary"
              round
              :loading="lotterying"
              @click="handleStartLottery"
            >
              <i class="fas fa-trophy" />
              开始抽奖
            </el-button>
          </div>
        </template>
        <div v-else class="lottery-result">
          <div class="lottery-result-title">🎉 抽奖结果</div>
          <div v-if="!lotteryResult.winners.length" class="lottery-no-winner">
            暂无点赞用户，无法抽奖
          </div>
          <div v-else class="lottery-winners-list">
            <div
              v-for="(winner, index) in lotteryResult.winners"
              :key="winner.userId || winner.userName || index"
              class="lottery-winner-item"
            >
              <span class="lottery-winner-rank">第 {{ index + 1 }} 名</span>
              <img
                v-if="winner.userAvatar"
                :src="winner.userAvatar"
                class="lottery-winner-avatar"
                alt=""
              />
              <span v-else class="lottery-winner-avatar lottery-winner-avatar-placeholder">
                {{ (winner.userName || "?").charAt(0) }}
              </span>
              <span class="lottery-winner-name">{{ winner.userName || "未知用户" }}</span>
            </div>
          </div>
          <p class="lottery-result-hint">抽奖结果已自动发布到评论区 🎊</p>
          <div class="lottery-footer">
            <el-button type="primary" round @click="closeLotteryDialog">
              知道了
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 打赏 -->
    <el-dialog
      v-model="rewardOpen"
      title="打赏积分"
      width="360px"
      destroy-on-close
      @closed="rewardMomentId = null"
    >
      <p class="reward-desc">扣除可用积分</p>
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

    <UserDetailModal v-model="userDetailVisible" :user="userDetailSeed" />
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
import { followApi } from "../api/follow";
import * as momentsApi from "../api/moments";
import UserDetailModal from "../components/UserDetailModal.vue";
import FishCircleCommentInput from "../components/fish-circle/FishCircleCommentInput.vue";
import { createImagePreviewWindow } from "../utils/imagePreview";
import {
  extractCommentImages,
  formatMomentTime,
  normalizeLotteryResult,
  renderLikeUsers,
  sortMomentsWithTopFirst,
  stripCommentImageMarkers,
} from "../utils/fishCircle";

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

const coverIsFollowing = ref(false);
const coverFollowLoading = ref(false);
const coverFollowHover = ref(false);
const userDetailVisible = ref(false);
const userDetailSeed = ref(null);

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

const lotteryOpen = ref(false);
const lotteryMomentId = ref(null);
const lotteryWinnerCount = ref(1);
const lotterying = ref(false);
const lotteryResult = ref(null);

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

const coverProfileUser = computed(() => {
  if (viewingUser.value) return viewingUser.value;
  if (viewingSelf.value) {
    return loginUserExtra.value || userStore.userInfo;
  }
  return null;
});

const coverFollowingCount = computed(() => {
  const u = coverProfileUser.value;
  if (!u) return undefined;
  return u.followingCount ?? u.followingUserCount;
});

const coverShowFollow = computed(
  () =>
    !!viewingUser.value &&
    !!meId.value &&
    String(viewingUser.value.id ?? viewingUser.value.userId) !== meId.value,
);

async function refreshCoverFollowState(userId) {
  if (!userId || !meId.value || String(userId) === meId.value) {
    coverIsFollowing.value = false;
    return;
  }
  try {
    const res = await followApi.isFollowing(String(userId));
    const data = res?.data ?? res;
    coverIsFollowing.value = !!(data === true || data?.data === true || res === true);
  } catch {
    coverIsFollowing.value = false;
  }
}

async function handleCoverToggleFollow() {
  const uid = viewingUser.value?.id ?? viewingUser.value?.userId;
  if (!uid || !meId.value) return;
  coverFollowLoading.value = true;
  try {
    const res = await followApi.toggleFollow(String(uid));
    const nowFollowing = !!(res?.data ?? res);
    coverIsFollowing.value = nowFollowing;
    const delta = nowFollowing ? 1 : -1;
    viewingUser.value = {
      ...viewingUser.value,
      followerCount: Math.max(
        0,
        (Number(viewingUser.value.followerCount) || 0) + delta,
      ),
    };
    ElMessage.success(nowFollowing ? "关注成功" : "已取消关注");
  } catch (err) {
    ElMessage.error(err?.message || "操作失败");
  } finally {
    coverFollowLoading.value = false;
    coverFollowHover.value = false;
  }
}

function openUserDetailModal() {
  if (!viewingUser.value) return;
  userDetailSeed.value = {
    id: viewingUser.value.id ?? viewingUser.value.userId,
    userName: viewingUser.value.userName,
    userAvatar: viewingUser.value.userAvatar || viewingUser.value.userAvatarURL,
    momentsBgUrl: viewingUser.value.momentsBgUrl,
    followerCount: viewingUser.value.followerCount,
    followingCount:
      viewingUser.value.followingCount ?? viewingUser.value.followingUserCount,
  };
  userDetailVisible.value = true;
}

function formatTime(timeStr) {
  return formatMomentTime(timeStr);
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

function renderCommentHtml(content) {
  const text = stripCommentImageMarkers(content);
  const urls = extractCommentImages(content);
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
  coverFollowHover.value = false;
  try {
    const u = await userApi.getUserVoById(userId);
    viewingUser.value = u || { id: userId, userName: name, userAvatar: avatar };
  } catch {
    viewingUser.value = { id: userId, userName: name, userAvatar: avatar };
  }
  await refreshCoverFollowState(userId);
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
  coverIsFollowing.value = false;
  coverFollowHover.value = false;
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

function commentInputVisible(momentId, anchorId) {
  if (showInputId.value !== momentId) return false;
  const list = commentsMap.value[momentId] || [];
  const mk = String(momentId);
  if (!list.length) {
    return anchorId === "first" && !replyTarget.value;
  }
  if (!replyTarget.value || String(replyTarget.value.momentId) !== mk) {
    return anchorId === "bottom";
  }
  return String(replyTarget.value.anchorCommentId) === String(anchorId);
}

function setReply(momentId, parentId, userName, anchorId) {
  const anchor = anchorId ?? parentId;
  replyTarget.value = {
    momentId,
    commentId: parentId,
    anchorCommentId: anchor,
    userName,
  };
  if (anchor !== parentId) {
    expandedReplies[parentId] = true;
  }
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

function openLottery(momentId) {
  lotteryMomentId.value = momentId;
  lotteryWinnerCount.value = 1;
  lotteryResult.value = null;
  lotteryOpen.value = true;
}

function resetLotteryDialog() {
  lotteryMomentId.value = null;
  lotteryResult.value = null;
  lotteryWinnerCount.value = 1;
}

function closeLotteryDialog() {
  lotteryOpen.value = false;
  resetLotteryDialog();
}

async function handleToggleTop(momentId, currentIsTop) {
  try {
    const nextIsTop = currentIsTop === 1 ? 0 : 1;
    const res = await momentsApi.topMoment({
      momentId,
      top: nextIsTop === 1,
    });
    if (res.code !== 0) {
      throw new Error(res.message || res.msg || "操作失败");
    }
    moments.value = sortMomentsWithTopFirst(
      moments.value.map((item) =>
        item.id === momentId ? { ...item, isTop: nextIsTop } : item
      )
    );
    ElMessage.success(nextIsTop === 1 ? "已置顶" : "已取消置顶");
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  }
}

async function handleStartLottery() {
  if (!lotteryMomentId.value) return;

  lotterying.value = true;
  try {
    const res = await momentsApi.startMomentLottery({
      momentId: lotteryMomentId.value,
      winnerCount: lotteryWinnerCount.value,
    });
    if (res.code !== 0) {
      throw new Error(
        res.message || res.msg || "抽奖失败，请确认有足够的点赞用户"
      );
    }

    lotteryResult.value = normalizeLotteryResult(res.data);
    const updated = await momentsApi.listMomentComments({
      momentId: lotteryMomentId.value,
      current: 1,
      pageSize: 50,
    });
    commentsMap.value = {
      ...commentsMap.value,
      [lotteryMomentId.value]: updated.data?.records || [],
    };
    showInputId.value = lotteryMomentId.value;
    ElMessage.success("抽奖完成");
  } catch (e) {
    ElMessage.error(e.message || "抽奖失败");
  } finally {
    lotterying.value = false;
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
    await refreshCoverFollowState(q);
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
      await refreshCoverFollowState(uid);
      moments.value = [];
      currentPage.value = 1;
      hasMore.value = true;
      await fetchMoments(false);
    }
  },
);

watch(viewingUser, (u) => {
  const uid = u?.id ?? u?.userId;
  if (uid != null) refreshCoverFollowState(uid);
});
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
  background: #F4F4F4;
  overflow: hidden;
}

.cover-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
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
  margin-bottom: 6px;
}

.cover-follow-row {
  margin-bottom: 8px;
}

.cover-follow-btn-default {
  background: #ff8c00 !important;
  border-color: #ff8c00 !important;
  color: #fff !important;
}

.cover-follow-btn-active {
  background: rgba(255, 255, 255, 0.92) !important;
  border-color: rgba(255, 255, 255, 0.92) !important;
  color: #666 !important;
}

.cover-follow-btn-active:hover {
  background: #fff5f5 !important;
  border-color: #ffccc7 !important;
  color: #ff4d4f !important;
}

.cover-follow-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
  color: #fff;
  font-size: 12px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}

.cover-stat b {
  font-size: 15px;
  font-weight: 700;
  margin-right: 2px;
}

.cover-stat-divider {
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.55);
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
  --fc-avatar-w: 44px;
  --fc-content-gap: 12px;
  background: var(--card-bg, #fff);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color, #eee);
}

.moment-content {
  display: flex;
  gap: 10px;
}

.moment-avatar {
  width: var(--fc-avatar-w);
  height: var(--fc-avatar-w);
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
}

.moment-header-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.moment-time-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

.first-comment-input-wrap {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.moment-time {
  font-size: 12px;
  color: #999;
}

.moment-top-tag {
  font-size: 12px;
  color: var(--primary-color, #409eff);
  background: rgba(64, 158, 255, 0.1);
  border-radius: 4px;
  padding: 1px 5px;
}

.moment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
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
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color, #eee);
  margin-left: calc(var(--fc-avatar-w, 44px) + var(--fc-content-gap, 12px));
}

.comment-list {
  margin-bottom: 12px;
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.comment-item.child {
  margin-left: 14px;
  margin-top: 12px;
}

.comment-avatar {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-avatar.sm {
  width: 20px;
  height: 20px;
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
  margin-right: 4px;
}

.reply-to {
  color: #bbb;
  font-size: 12px;
  margin-left: 2px;
}

.comment-content-text {
  margin-top: 4px;
  line-height: 1.6;
  word-break: break-word;
  color: #444;
}

.comment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: #bbb;
}

.comment-meta .link {
  cursor: pointer;
  color: #bbb;
  transition: color 0.15s;
}

.comment-meta .link:hover {
  color: #888;
}

.comment-meta .link.danger {
  color: #bbb;
}

.comment-meta .link.danger:hover {
  color: var(--el-color-danger);
}

.expand-replies {
  font-size: 12px;
  color: #bbb;
  cursor: pointer;
  margin: 8px 0 8px 30px;
  transition: color 0.15s;
}

.expand-replies:hover {
  color: #888;
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
  gap: 10px;
  margin: 14px 0 4px;
}

.pub-img-item {
  position: relative;
  width: 76px;
  height: 76px;
}

.pub-img-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eee;
}

.pub-img-item .rm {
  position: absolute;
  top: -6px;
  right: -6px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.pub-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 12px 0 4px;
  padding: 10px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.btn-lite {
  cursor: pointer;
  font-size: 13px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.btn-lite:hover {
  background: #f5f5f5;
  color: #555;
}

.btn-lite input {
  display: none;
}

.pub-loc {
  margin-top: 12px;
}

.lottery-dialog-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.lottery-dialog-title .fa-trophy {
  color: #f4ac70;
}

.lottery-modal-content {
  padding: 8px 4px;
}

.lottery-desc {
  color: #999;
  font-size: 13px;
  line-height: 1.7;
  margin: 0 0 20px;
}

.lottery-count-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.lottery-count-label {
  color: #333;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.lottery-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 4px;
}

.lottery-preset-item {
  flex: 1;
  min-width: 60px;
  text-align: center;
  padding: 8px 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lottery-preset-item:hover {
  border-color: #f4ac70;
  color: #f4ac70;
}

.lottery-preset-item.active {
  border-color: #f4ac70;
  background: rgba(244, 172, 112, 0.1);
  color: #f4ac70;
  font-weight: 600;
}

.lottery-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.lottery-footer :deep(.el-button--primary) {
  background: linear-gradient(135deg, #f4ac70 0%, #f07c3a 100%);
  border: none;
  padding: 8px 24px;
}

.lottery-footer :deep(.el-button:not(.el-button--primary)) {
  padding: 8px 24px;
}

.lottery-footer .fa-trophy {
  margin-right: 4px;
}

.lottery-result {
  text-align: center;
}

.lottery-result-title {
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
}

.lottery-no-winner {
  color: #999;
  font-size: 14px;
  padding: 20px 0;
}

.lottery-winners-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.lottery-winner-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fffdf9 0%, #fff8f0 100%);
  border: 1px solid rgba(244, 172, 112, 0.3);
  border-radius: 12px;
}

.lottery-winner-rank {
  color: #f4ac70;
  font-size: 13px;
  font-weight: 600;
  min-width: 40px;
}

.lottery-winner-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: #f4ac70;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lottery-winner-name {
  color: #1a1a1a;
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
}

.lottery-result-hint {
  color: #999;
  font-size: 13px;
  margin: 0 0 4px;
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

@media (max-width: 640px) {
  .cover-header {
    min-height: 180px;
  }

  .main-layout-inner {
    padding: 10px;
  }

  .moment-item {
    padding: 14px;
  }

  .comment-section {
    margin-left: 0;
  }

  .comment-input-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .comment-input-row .el-input {
    flex-basis: 100%;
  }

  .lottery-modal-content {
    padding: 4px 0;
  }
}
</style>
