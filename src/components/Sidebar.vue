<template>
  <div class="sidebar-container">
    <div class="sidebar-section topic-section">
      <div class="vote-entry" @click="openVoteListDialog">
        <div class="vote-entry-main">
          <span class="vote-entry-title">活跃投票列表 ({{ voteList.length }}个)</span>
        </div>
      </div>
      <div class="vote-entry-actions">
        <span class="icon-tooltip" title="创建投票">
          <button class="icon-btn create-btn" aria-label="创建投票" @click.stop="openCreateDialog">
            <i class="fas fa-plus edit-icon"></i>
          </button>
        </span>
        <span class="icon-tooltip" title="刷新投票">
          <button class="icon-btn refresh-btn" aria-label="刷新投票" :disabled="votesLoading" @click.stop="loadVotes">
            <i class="fas fa-sync-alt edit-icon" :class="{ spinning: votesLoading }"></i>
          </button>
        </span>
      </div>
    </div>
    <div class="sidebar-section online-users-section">
      <h4>在线用户 ({{ onlineUsers.length }})</h4>
      <div v-if="onlineUsers.length === 0" class="loading-placeholder">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
      <ul v-else class="online-users-list">
        <li v-for="user in onlineUsers" :key="user.userName" class="user-item" @click="showUserProfile(user.userName)">
          <img 
            :src="getAvatarUrl(user)" 
            :alt="user.userName" 
            class="user-avatar" 
            @error="handleAvatarError"
          />
          <span class="user-name" :title="getUserTooltip(user)">{{ getDisplayName(user) }}</span>
        </li>
      </ul>
    </div>
    <div v-if="showCreateDialog" class="dialog-overlay" @click="closeCreateDialog">
      <div class="dialog-content" @click.stop>
        <h3>创建投票（扣除100积分）</h3>
        <div class="dialog-group">
          <label>投票标题：</label>
          <input
            v-model="createForm.title"
            maxlength="50"
            placeholder="请输入投票标题"
            class="topic-input"
          />
          <div class="length-tip">{{ createForm.title.length }}/50</div>
        </div>
        <div class="dialog-group">
          <label>投票类型：</label>
          <div class="type-row">
            <label><input type="radio" :value="true" v-model="createForm.singleChoice" /> 单选</label>
            <label><input type="radio" :value="false" v-model="createForm.singleChoice" /> 多选</label>
          </div>
        </div>
        <div class="dialog-group">
          <label>投票选项：</label>
          <div v-for="(option, index) in createForm.options" :key="index" class="option-edit-row">
            <input
              v-model="createForm.options[index]"
              maxlength="30"
              :placeholder="`选项 ${index + 1}`"
              class="topic-input option-input"
            />
            <button
              class="remove-option-btn"
              :disabled="createForm.options.length <= 2"
              @click="removeOption(index)"
            >
              ×
            </button>
          </div>
          <button class="add-option-btn" @click="addOption">+ 添加选项</button>
        </div>
        <div class="dialog-buttons">
          <button class="cancel-btn" @click="closeCreateDialog">取消</button>
          <button
            class="confirm-btn"
            :disabled="!canCreateVote || creatingVote"
            @click="handleCreateVote"
          >
            {{ creatingVote ? "创建中..." : "创建投票" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showVoteListDialog" class="dialog-overlay" @click="closeVoteListDialog">
      <div class="dialog-content vote-list-dialog" @click.stop>
        <div class="vote-list-header">
          <h3>活跃投票列表</h3>
          <button class="close-btn" @click="closeVoteListDialog">×</button>
        </div>
        <div v-if="votesLoading" class="loading-placeholder vote-loading">
          <div class="loading-spinner"></div>
          <p>刷新投票中...</p>
        </div>
        <div v-else-if="voteList.length === 0" class="topic-text">暂无活跃投票</div>
        <div v-else class="vote-summary-list">
          <div v-for="(vote, index) in voteList" :key="vote.voteId" class="vote-summary-item">
            <div class="vote-summary-main">
              <div class="vote-summary-title" :title="vote.title">
                {{ index + 1 }}. {{ vote.title }} <span class="vote-type">({{ vote.singleChoice ? "单选" : "多选" }})</span>
              </div>
              <div class="vote-summary-meta">
                <span>总票数：{{ vote.totalCount || 0 }}</span>
                <span>剩余：{{ formatRemainingMinutes(vote.remainingSeconds) }}</span>
              </div>
            </div>
            <button class="join-vote-btn" @click="openVoteDetail(vote)">参与投票</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showVoteDetail" class="dialog-overlay" @click="closeVoteDetail">
      <div class="dialog-content vote-detail-dialog" @click.stop>
        <div class="vote-detail-header">
          <h3 class="vote-detail-title" :title="voteDetail?.title || ''">
            {{ voteDetail?.title || "投票详情" }}
          </h3>
          <button v-if="isAdmin && voteDetail?.voteId" class="vote-delete-btn" @click="handleDeleteVote(voteDetail.voteId)">
            删除
          </button>
        </div>
        <div v-if="voteDetailLoading" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
        <template v-else>
          <div class="vote-meta" v-if="voteDetail">
            <span>{{ voteDetail.singleChoice ? "单选" : "多选" }}</span>
            <span>{{ voteDetail.totalCount || 0 }} 票</span>
            <span>{{ formatRemaining(voteDetail.remainingSeconds) }}</span>
          </div>
          <div class="vote-options" v-if="voteDetail">
            <label
              v-for="option in voteDetail.options"
              :key="`${voteDetail.voteId}-${option.index}`"
              class="vote-option"
            >
              <input
                :type="voteDetail.singleChoice ? 'radio' : 'checkbox'"
                :name="`vote-${voteDetail.voteId}`"
                :checked="isOptionChecked(voteDetail.voteId, option.index, voteDetail.singleChoice)"
                :disabled="voteDetail.hasVoted || voteDetail.remainingSeconds <= 0 || voteSubmitting[voteDetail.voteId]"
                @change="toggleOption(voteDetail, option.index)"
              />
              <div class="option-content">
                <div class="option-text-row">
                  <span class="option-text" :title="option.text">{{ option.text }}</span>
                  <span class="option-count">{{ option.count }} ({{ option.percentage }}%)</span>
                </div>
                <div class="option-bar">
                  <div class="option-bar-fill" :style="{ width: `${option.percentage || 0}%` }"></div>
                </div>
              </div>
            </label>
          </div>
          <div class="vote-detail-footer" v-if="voteDetail">
            <button
              class="vote-submit-btn vote-detail-submit"
              :disabled="!canSubmitVote(voteDetail) || !!voteSubmitting[voteDetail.voteId]"
              @click="submitVote(voteDetail)"
            >
              {{ voteDetail.hasVoted ? "已投票" : (voteSubmitting[voteDetail.voteId] ? "提交中..." : "提交投票") }}
            </button>
          </div>
        </template>
        <div class="vote-detail-actions">
          <button class="cancel-btn vote-detail-close" @click="closeVoteDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { defineProps, ref, onMounted, computed, reactive } from "vue";
  import { useRouter } from "vue-router";
  import { voteApi } from "../api/vote";
  import { userRemarkApi } from "../api/userRemark";
  import { ElMessage } from "element-plus";
  import { useUserStore } from "../stores/user";

  const router = useRouter();
  const userStore = useUserStore();

  const props = defineProps({
    onlineUsers: {
      type: Array,
      default: () => [],
    },
  });

  const votesLoading = ref(false);
  const creatingVote = ref(false);
  const showCreateDialog = ref(false);
  const voteList = ref([]);
  const showVoteListDialog = ref(false);
  const showVoteDetail = ref(false);
  const voteDetailLoading = ref(false);
  const voteDetail = ref(null);
  const selectedOptions = reactive({});
  const voteSubmitting = reactive({});

  // 用户备注状态
  const userRemarks = ref({});
  const remarksLoaded = ref(false);

  const createForm = reactive({
    title: "",
    singleChoice: true,
    options: ["", ""],
  });

  const isAdmin = computed(() => userStore.userInfo?.userRole === "admin");
  const canCreateVote = computed(() => {
    const titleValid = createForm.title.trim().length > 0;
    const validOptions = createForm.options.map((item) => item.trim()).filter(Boolean);
    return titleValid && validOptions.length >= 2;
  });

  const normalizeVoteListItem = (raw) => {
    const voteId = raw?.voteId || raw?.id || raw;
    return {
      voteId: String(voteId || ""),
      title: raw?.title || raw?.voteTitle || raw?.name || String(voteId || "未命名投票"),
      singleChoice: Boolean(raw?.singleChoice ?? true),
    };
  };

  const normalizeVoteDetail = (resultData, fallback = {}) => {
    const voteId = resultData?.voteId || fallback.voteId || "";
    return {
      voteId: String(voteId || ""),
      title: resultData?.title || fallback.title || "未命名投票",
      singleChoice: Boolean(resultData?.singleChoice ?? fallback.singleChoice ?? true),
      hasVoted: Boolean(resultData?.hasVoted),
      totalCount: Number(resultData?.totalCount || 0),
      remainingSeconds: Number(resultData?.remainingSeconds || 0),
      userVotedOptions: Array.isArray(resultData?.userVotedOptions) ? resultData.userVotedOptions : [],
      options: Array.isArray(resultData?.options)
        ? resultData.options.map((option) => ({
            count: Number(option?.count || 0),
            index: Number(option?.index || 0),
            percentage: Number(option?.percentage || 0),
            text: option?.text || `选项 ${Number(option?.index || 0) + 1}`,
          }))
        : [],
    };
  };

  const loadVotes = async () => {
    votesLoading.value = true;
    try {
      const listResponse = await voteApi.getActiveVotes();
      if (listResponse.code !== 0) {
        ElMessage.error(listResponse.message || "获取投票列表失败");
        return;
      }

      const list = Array.isArray(listResponse.data) ? listResponse.data : [];
      if (list.length === 0) {
        voteList.value = [];
        return;
      }
      const baseList = list.map(normalizeVoteListItem).filter((item) => item.voteId);
      const enrichedList = await Promise.all(
        baseList.map(async (item) => {
          try {
            const resultResponse = await voteApi.getVoteResult(item.voteId);
            if (resultResponse.code === 0 && resultResponse.data) {
              return {
                ...item,
                title: resultResponse.data.title || item.title,
                singleChoice: Boolean(resultResponse.data.singleChoice ?? item.singleChoice),
                totalCount: Number(resultResponse.data.totalCount || 0),
                remainingSeconds: Number(resultResponse.data.remainingSeconds || 0),
              };
            }
            return item;
          } catch {
            return item;
          }
        })
      );
      voteList.value = enrichedList;
    } catch (error) {
      console.error("获取投票失败:", error);
      ElMessage.error("获取投票失败");
    } finally {
      votesLoading.value = false;
    }
  };

  const openVoteListDialog = async () => {
    showVoteListDialog.value = true;
    if (!voteList.value.length) {
      await loadVotes();
    }
  };

  const closeVoteListDialog = () => {
    showVoteListDialog.value = false;
  };

  const openVoteDetail = async (vote) => {
    const voteId = vote?.voteId;
    if (!voteId) return;
    showVoteDetail.value = true;
    voteDetailLoading.value = true;
    voteDetail.value = null;
    try {
      const resultResponse = await voteApi.getVoteResult(voteId);
      if (resultResponse.code === 0 && resultResponse.data) {
        voteDetail.value = normalizeVoteDetail(resultResponse.data, vote);
        selectedOptions[voteId] = Array.isArray(voteDetail.value.userVotedOptions)
          ? [...voteDetail.value.userVotedOptions]
          : [];
      } else {
        ElMessage.error(resultResponse.message || "获取投票详情失败");
      }
    } catch (error) {
      console.error("获取投票详情失败:", error);
      ElMessage.error("获取投票详情失败");
    } finally {
      voteDetailLoading.value = false;
    }
  };

  const closeVoteDetail = () => {
    showVoteDetail.value = false;
    voteDetailLoading.value = false;
    voteDetail.value = null;
  };

  const openCreateDialog = () => {
    createForm.title = "";
    createForm.singleChoice = true;
    createForm.options = ["", ""];
    showCreateDialog.value = true;
  };

  const closeCreateDialog = () => {
    showCreateDialog.value = false;
  };

  const addOption = () => {
    if (createForm.options.length >= 8) {
      ElMessage.warning("最多添加 8 个选项");
      return;
    }
    createForm.options.push("");
  };

  const removeOption = (index) => {
    if (createForm.options.length <= 2) return;
    createForm.options.splice(index, 1);
  };

  const handleCreateVote = async () => {
    if (!canCreateVote.value) return;
    creatingVote.value = true;
    try {
      const payload = {
        title: createForm.title.trim(),
        singleChoice: createForm.singleChoice,
        options: createForm.options.map((item) => item.trim()).filter(Boolean),
      };
      const response = await voteApi.createVote(payload);
      if (response.code === 0) {
        ElMessage.success("创建投票成功");
        closeCreateDialog();
        loadVotes();
      } else {
        ElMessage.error(response.message || "创建投票失败");
      }
    } catch (error) {
      console.error("创建投票失败:", error);
      ElMessage.error("创建投票失败");
    } finally {
      creatingVote.value = false;
    }
  };

  const isOptionChecked = (voteId, index, singleChoice) => {
    const picked = selectedOptions[voteId] || [];
    if (singleChoice) {
      return picked[0] === index;
    }
    return picked.includes(index);
  };

  const toggleOption = (vote, index) => {
    const voteId = vote.voteId;
    if (!selectedOptions[voteId]) {
      selectedOptions[voteId] = [];
    }
    if (vote.singleChoice) {
      selectedOptions[voteId] = [index];
      return;
    }
    const exists = selectedOptions[voteId].includes(index);
    if (exists) {
      selectedOptions[voteId] = selectedOptions[voteId].filter((item) => item !== index);
    } else {
      selectedOptions[voteId] = [...selectedOptions[voteId], index];
    }
  };

  const canSubmitVote = (vote) => {
    if (vote.hasVoted || vote.remainingSeconds <= 0) return false;
    const picked = selectedOptions[vote.voteId] || [];
    return picked.length > 0;
  };

  const submitVote = async (vote) => {
    const picked = selectedOptions[vote.voteId] || [];
    if (picked.length === 0) return;
    voteSubmitting[vote.voteId] = true;
    try {
      const response = await voteApi.recordVote({
        voteId: vote.voteId,
        optionIndexes: picked,
      });
      if (response.code === 0) {
        ElMessage.success("投票成功");
        if (showVoteDetail.value && vote?.voteId) {
          await openVoteDetail(vote);
        } else {
          await loadVotes();
        }
      } else {
        ElMessage.error(response.message || "投票失败");
      }
    } catch (error) {
      console.error("投票失败:", error);
      ElMessage.error("投票失败");
    } finally {
      voteSubmitting[vote.voteId] = false;
    }
  };

  const handleDeleteVote = async (voteId) => {
    try {
      const response = await voteApi.deleteVote({ voteId });
      if (response.code === 0) {
        ElMessage.success("删除投票成功");
        if (voteDetail.value?.voteId === voteId) {
          closeVoteDetail();
        }
        loadVotes();
      } else {
        ElMessage.error(response.message || "删除投票失败");
      }
    } catch (error) {
      console.error("删除投票失败:", error);
      ElMessage.error("删除投票失败");
    }
  };

  const formatRemaining = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "已结束";
    const totalMinutes = Math.ceil(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const formatRemainingMinutes = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "已结束";
    const totalMinutes = Math.ceil(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  onMounted(() => {
    loadVotes();
    loadUserRemarks();
  });

  // 从后端加载用户备注
  const loadUserRemarks = async () => {
    try {
      const response = await userRemarkApi.getRemark();
      if (response.data?.content) {
        try {
          const remarksData = JSON.parse(response.data.content);
          userRemarks.value = remarksData;
          remarksLoaded.value = true;
        } catch (e) {
          console.error("解析后端备注数据失败:", e);
        }
      } else {
        // 后端没有数据，尝试从localStorage加载
        migrateLocalRemarks();
      }
    } catch (error) {
      console.error("从后端加载备注失败:", error);
      remarksLoaded.value = false;
    }
  };

  // 从localStorage加载备注数据
  const migrateLocalRemarks = () => {
    const currentUser = userStore.userInfo?.userName;
    if (!currentUser) return;
    
    const allRemarks = utools.dbStorage.getItem("fishpi_remarks") || {};
    const localRemarks = allRemarks[currentUser] || {};
    
    if (Object.keys(localRemarks).length > 0) {
      userRemarks.value = localRemarks;
    }
    remarksLoaded.value = true;
  };
  const showUserProfile = (userName) => {
    router.push(`/user/${userName}`);
  };

  // 获取用户显示名称（优先显示备注，使用userId作为key）
  const getDisplayName = (user) => {
    const userName = user.userName;
    const userId = user.id || user.userId;
    if (!userName) return '';
    
    // 如果有备注，显示备注（使用userId作为key）
    const userIdKey = userId ? String(userId) : null;
    const remark = userIdKey ? userRemarks.value[userIdKey] : null;
    if (remark) {
      return truncateName(remark);
    }
    
    return truncateName(userName);
  };

  // 获取用户提示文本（显示原始用户名和备注）
  const getUserTooltip = (user) => {
    const userName = user.userName;
    const userId = user.id || user.userId;
    if (!userName) return '';
    
    const userIdKey = userId ? String(userId) : null;
    const remark = userIdKey ? userRemarks.value[userIdKey] : null;
    if (remark) {
      return `${userName} (备注: ${remark})`;
    }
    
    return userName;
  };

  // 截断用户名，限制显示长度
  const truncateName = (name) => {
    if (!name) return '';
    // 限制最大显示长度为 8 个字符（中文字符算 1 个）
    const maxLength = 8;
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength) + '...';
  };

  // 获取头像 URL，优先使用 userAvatarURL48，如果没有则使用 avatar
  const getAvatarUrl = (user) => {
    const avatarUrl = user.userAvatarURL48 || user.avatar || user.userAvatarURL || '';
    // 确保返回有效的 URL
    if (!avatarUrl) return '';
    // 如果已经是完整 URL，直接返回
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    // 如果是相对路径，尝试添加基础 URL
    if (avatarUrl.startsWith('/')) {
      // 这里可以根据实际情况调整，如果 API 返回的是相对路径
      return avatarUrl;
    }
    return avatarUrl;
  };

  // 处理头像加载错误
  const handleAvatarError = (event) => {
    // 设置默认头像（灰色圆形占位符）
    const defaultAvatar = 'data:image/svg+xml;base64,' + btoa(`
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#E0E0E0"/>
        <circle cx="14" cy="11" r="4" fill="#999999"/>
        <path d="M6 22C6 18 9 15 14 15C19 15 22 18 22 22" fill="#999999"/>
      </svg>
    `);
    event.target.src = defaultAvatar;
    event.target.onerror = null; // 防止无限循环
  };
</script>

<style scoped>
  .sidebar-container {
    padding: 0;
    width: 150px;
    background-color: var(--card-bg);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  .sidebar-section {
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .topic-section {
    padding: 10px;
  }

  .sidebar-section:last-of-type {
    border-bottom: none;
  }

  .sidebar-section h4 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--text-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .edit-icon {
    font-size: 14px;
    color: var(--sub-text-color);
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .edit-icon:hover {
    color: var(--primary-color);
  }

  .vote-entry {
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: linear-gradient(135deg, rgba(47, 126, 247, 0.08), rgba(47, 126, 247, 0.03));
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .vote-entry:hover {
    border-color: rgba(47, 126, 247, 0.35);
    box-shadow: 0 3px 10px rgba(47, 126, 247, 0.12);
  }

  .vote-entry-main {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .vote-entry-title {
    font-size: 12px;
    color: #2f7ef7;
    font-weight: 500;
  }

  .vote-entry-subtitle {
    font-size: 11px;
    color: var(--sub-text-color);
  }

  .vote-entry-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }

  .icon-tooltip {
    flex: 1;
    width: 0;
    display: inline-flex;
  }

  .icon-btn {
    width: 100%;
    height: 30px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--card-bg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .icon-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .create-btn {
    border-color: #f39a43;
  }

  .create-btn .edit-icon {
    color: #f39a43;
  }

  .create-btn:hover:not(:disabled) {
    filter: brightness(0.98);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(246, 163, 90, 0.3);
  }

  .refresh-btn {
    background: #fff;
    border-color: #d8e7ff;
  }

  .refresh-btn .edit-icon {
    color: #2f7ef7;
  }

  .refresh-btn:hover:not(:disabled) {
    border-color: #2f7ef7;
    background: #f5f9ff;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(47, 126, 247, 0.18);
  }

  .refresh-btn:disabled {
    background: #f5f9ff;
    border-color: #d8e7ff;
  }

  .topic-text {
    font-size: 12px;
    color: var(--sub-text-color);
  }

  .vote-list-dialog {
    width: 720px;
  }

  .vote-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .vote-list-header h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }

  .close-btn {
    border: none;
    background: transparent;
    font-size: 28px;
    line-height: 1;
    color: #999;
    cursor: pointer;
  }

  .vote-summary-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vote-summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 10px 12px;
    background: linear-gradient(180deg, var(--card-bg), rgba(0, 0, 0, 0.01));
    transition: all 0.2s ease;
  }

  .vote-summary-item:hover {
    border-color: rgba(47, 126, 247, 0.3);
    box-shadow: 0 4px 14px rgba(47, 126, 247, 0.1);
  }

  .vote-summary-main {
    flex: 1;
    min-width: 0;
  }

  .vote-summary-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vote-type {
    color: var(--sub-text-color);
    font-size: 12px;
    font-weight: 400;
  }

  .vote-summary-meta {
    display: flex;
    gap: 14px;
    margin-top: 6px;
    font-size: 12px;
    color: var(--sub-text-color);
  }

  .join-vote-btn {
    flex-shrink: 0;
    border: none;
    border-radius: 8px;
    background: #f6a35a;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .join-vote-btn:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
  }

  .vote-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  .vote-detail-title {
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 18px;
    font-weight: 700;
  }

  .vote-delete-btn {
    border: none;
    background: transparent;
    color: #ff4d4f;
    cursor: pointer;
    font-size: 12px;
  }

  .vote-meta {
    display: flex;
    gap: 12px;
    color: var(--sub-text-color);
    font-size: 13px;
    margin: 2px 0 10px;
  }

  .vote-options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .vote-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }

  .option-content {
    flex: 1;
  }

  .option-text-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
  }

  .option-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: var(--text-color);
  }

  .option-count {
    color: var(--sub-text-color);
    font-size: 13px;
  }

  .option-bar {
    width: 100%;
    height: 8px;
    background: var(--hover-bg);
    border-radius: 999px;
    margin-top: 5px;
    overflow: hidden;
  }

  .option-bar-fill {
    height: 100%;
    background: var(--primary-color);
    transition: width 0.2s;
  }

  .vote-submit-btn {
    width: 100%;
    margin-top: 8px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    cursor: pointer;
    color: var(--text-color);
    transition: all 0.2s ease;
  }

  .vote-submit-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .vote-detail-dialog {
    width: 760px;
    max-width: calc(100vw - 40px);
    padding: 18px 18px 14px;
    border-radius: 14px;
  }

  .vote-detail-dialog .vote-option input[type="radio"],
  .vote-detail-dialog .vote-option input[type="checkbox"] {
    margin-top: 6px;
    transform: scale(1.05);
  }

  .vote-detail-footer {
    margin-top: 12px;
  }

  .vote-detail-submit {
    height: 38px;
    font-size: 14px;
    color: #fff;
    background: #f6a35a;
    border: none;
  }

  .vote-detail-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .vote-detail-close {
    min-width: 88px;
    height: 34px;
    font-size: 13px;
    border-radius: 8px;
    color: #fff;
    background: #f6a35a;
    border: none;
  }

  .vote-detail-close:hover,
  .vote-detail-submit:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
  }

  .vote-detail-close:disabled,
  .vote-detail-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .online-users-section {
    padding: 15px 20px;
    border-bottom: 1px solid var(--border-color);
    height: calc(100% - 80px);
  }

  .online-users-section h4 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 15px;
    color: var(--text-color);
  }

  .online-users-list {
    list-style: none;
    padding: 0;
    margin: 0;
    height: calc(100% - 40px);
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .online-users-list::-webkit-scrollbar {
    display: none;
  }

  .user-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--text-color);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 2px 0;
    min-width: 0; /* 允许 flex 子元素收缩 */
  }

  .user-item:last-child {
    margin-bottom: 0;
  }

  .user-item:hover {
    color: var(--primary-color);
    background-color: var(--hover-bg);
    border-radius: 4px;
    padding-left: 4px;
    padding-right: 4px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    min-width: 28px; /* 防止头像被压缩 */
    border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
    border: 1px solid var(--border-color);
    object-fit: cover; /* 确保图片正确填充 */
    background-color: var(--hover-bg); /* 默认背景色 */
  }

  .user-name {
    flex: 1;
    min-width: 0; /* 允许文本截断 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .placeholder-section h4 {
    color: var(--sub-text-color);
  }

  .placeholder-text {
    color: var(--sub-text-color);
    font-style: italic;
  }

  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog-content {
    width: 520px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    overflow-y: auto;
    background: var(--card-bg);
    border-radius: 10px;
    padding: 14px;
  }

  .dialog-group {
    margin-bottom: 12px;
  }

  .dialog-group label {
    font-weight: 600;
    display: block;
    margin-bottom: 6px;
  }

  .type-row {
    display: flex;
    gap: 16px;
    font-size: 14px;
  }

  .topic-input {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--card-bg);
    color: var(--text-color);
  }

  .length-tip {
    text-align: right;
    color: var(--sub-text-color);
    font-size: 12px;
    margin-top: 4px;
  }

  .option-edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .option-input {
    flex: 1;
  }

  .remove-option-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: var(--hover-bg);
    cursor: pointer;
  }

  .add-option-btn {
    width: 100%;
    height: 34px;
    border: 1px dashed var(--border-color);
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
  }

  .dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }

  .cancel-btn,
  .confirm-btn {
    min-width: 90px;
    height: 36px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .cancel-btn {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  .confirm-btn {
    background: #f6a35a;
    color: #fff;
  }

  .confirm-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 0;
    color: var(--sub-text-color);
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;
  }

  .vote-loading p {
    margin: 0;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>