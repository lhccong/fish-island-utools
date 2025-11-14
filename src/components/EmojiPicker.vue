<template>
  <Teleport to="body">
    <div v-if="visible" class="emoji-picker-mask" @click="$emit('close')"></div>
  </Teleport>
  <div class="emoji-picker" v-if="visible">
    <div class="emoji-picker-header">
      <i class="fas fa-times close-btn" @click="$emit('close')"></i>
    </div>
    <div class="emoji-picker-content">
      <!-- Emoji Mart Picker -->
      <div v-if="currentTab === 'default'" class="emoji-mart-container">
        <div ref="emojiMartRef"></div>
      </div>
      <!-- 我的收藏 -->
      <div v-else-if="currentTab === 'packs'" class="emoji-pack-grid-wrapper">
        <div class="emoji-pack-grid" @scroll="handlePacksScroll">
          <div class="emoji-pack-item upload-btn" @click="handleUpload">
            <i class="fas fa-plus"></i>
            <span>添加表情包</span>
          </div>
          <div
            v-for="pack in filteredEmotionPacks"
            :key="pack.id"
            class="emoji-pack-item"
          >
            <img
              :src="pack.cover"
              :alt="pack.name || '表情包'"
              @click="selectEmotionPack(pack)"
            />
            <div class="delete-btn" @click.stop="handleDelete(pack)">
              <i class="fas fa-trash"></i>
            </div>
          </div>
          <div
            v-if="isLoadingPacks && emotionPacks.length > 0"
            class="emoji-pack-loading"
            style="grid-column: 1 / -1; text-align: center; padding: 12px; color: var(--sub-text-color);"
          >
            <i class="fas fa-spinner fa-spin"></i>
            <span style="margin-left: 8px;">加载中...</span>
          </div>
        </div>
      </div>
      <!-- 在线搜索 -->
      <div
        v-else-if="currentTab === 'search'"
        class="emoji-picker-online-search"
      >
        <div class="emoji-picker-online-search-bar">
          <input
            v-model="onlineSearchKeyword"
            type="text"
            placeholder="搜索在线表情包..."
            class="emoji-picker-online-search-input"
            @keydown.enter="() => searchOnlineEmojis(false)"
          />
          <button
            class="emoji-picker-online-search-btn"
            @click="() => searchOnlineEmojis(false)"
          >
            搜索
          </button>
        </div>
        <div
          v-if="showOnlineEmojiSearch"
          class="emoji-picker-online-search-results"
          @scroll="handleOnlineScroll"
        >
          <div class="emoji-picker-online-search-grid">
            <div
              v-for="(image, index) in onlineEmojiSearchResults"
              :key="index"
              class="emoji-picker-online-search-item"
              @click="selectOnlineEmojiImage(image)"
            >
              <img
                :src="image.thumbURL"
                :alt="image.title"
                class="emoji-picker-online-search-image"
                @error="handleOnlineImageError"
              />
            </div>
          </div>
          <div
            v-if="
              onlineEmojiSearchLoading && onlineEmojiSearchResults.length > 0
            "
            class="emoji-picker-online-search-loading"
            style="text-align: center"
          >
            <i class="fas fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>
        </div>
        <div
          v-if="
            onlineEmojiSearchLoading && onlineEmojiSearchResults.length === 0
          "
          class="emoji-picker-online-search-loading"
          style="text-align: center; padding: 32px 0"
        >
          <i class="fas fa-spinner fa-spin"></i>
          <span>搜索中...</span>
        </div>
      </div>
    </div>
    <div class="emoji-picker-footer">
      <div class="tabs">
        <span
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
        >
          <i :class="tab.icon"></i>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick, onUnmounted } from "vue";
import { Picker } from 'emoji-mart';
import data from '@emoji-mart/data';
import { userApi } from "../api/user";
import { baiduImageAPI } from "../api/baidu";
import { ElMessage } from "element-plus";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select", "close"]);

const tabs = [
  { id: "default", name: "默认表情", icon: "fas fa-smile" },
  { id: "packs", name: "我的收藏", icon: "fas fa-heart" },
  { id: "search", name: "搜索", icon: "fas fa-search" },
];

const currentTab = ref("default");
const emojiMartRef = ref(null);
const emojiPickerInstance = ref(null);
const emotionPacks = ref([]);
const searchKeyword = ref("");

// 分页相关
const currentPage = ref(1);
const pageSize = ref(50); // 每页加载50个表情包
const hasMore = ref(true);
const isLoadingPacks = ref(false);

// 在线表情包搜索相关
const onlineSearchKeyword = ref("");
const onlineEmojiSearchResults = ref([]);
const onlineEmojiSearchLoading = ref(false);
const showOnlineEmojiSearch = ref(false);
const onlineSearchCurrentPage = ref(0);
const onlineSearchHasMore = ref(true);
const onlineSearchPageSize = 20;

// 实时搜索防抖
let debounceTimer = null;
watch(onlineSearchKeyword, (newVal, oldVal) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchOnlineEmojis(false);
  }, 400);
});

// 监听tab切换
watch(currentTab, async (newTab) => {
  if (newTab === "default") {
    await nextTick();
    initEmojiMart();
  }
  if (newTab === "packs") {
    fetchEmotionPacks();
  }
  if (newTab === "search") {
    onlineSearchKeyword.value = "表情包";
    searchOnlineEmojis();
  }
});

// 监听 visible 变化
watch(() => props.visible, async (newVal) => {
  if (newVal && currentTab.value === 'default') {
    await nextTick();
    initEmojiMart();
  }
});

// 初始化 emoji-mart picker
const initEmojiMart = async () => {
  if (!emojiMartRef.value) return;
  
  // 销毁旧实例
  if (emojiPickerInstance.value) {
    emojiMartRef.value.innerHTML = '';
  }
  
  // 创建新的 Picker 实例
  const picker = new Picker({
    data: data,
    onEmojiSelect: (emoji) => {
      // emoji 对象包含: { id, name, native, unified, keywords, shortcodes }
      emit('select', emoji.native); // 发送原生 emoji 字符
      emit('close');
    },
    theme: 'auto', // 自动主题
    locale: 'zh', // 中文
    previewPosition: 'none', // 不显示预览
    skinTonePosition: 'search', // 肤色选择在搜索栏
    set: 'native', // 使用原生 emoji
    perLine: 7, // 每行显示9个
    maxFrequentRows: 2, // 最近使用显示2行
  });
  
  emojiMartRef.value.appendChild(picker);
  emojiPickerInstance.value = picker;
};

// 获取表情包列表
const fetchEmotionPacks = async (isLoadMore = false) => {
  if (isLoadingPacks.value) return;
  if (!isLoadMore && !hasMore.value) return;
  
  isLoadingPacks.value = true;
  try {
    if (!isLoadMore) {
      // 重置分页状态
      currentPage.value = 1;
      emotionPacks.value = [];
      hasMore.value = true;
    }
    
    const res = await userApi.listEmoticonFavourByPage({
      current: currentPage.value,
      pageSize: pageSize.value,
      sortField: "createTime",
      sortOrder: "desc",
    });
    
    if (res.code === 0 && res.data) {
      const records = res.data.records || [];
      const newPacks = records.map((item) => ({
        id: item.id,
        cover: item.emoticonSrc,
        emoticonSrc: item.emoticonSrc,
      }));
      
      if (isLoadMore) {
        emotionPacks.value = [...emotionPacks.value, ...newPacks];
      } else {
        emotionPacks.value = newPacks;
      }
      
      // 检查是否还有更多数据
      const total = res.data.total || 0;
      const current = res.data.current || 1;
      const pages = res.data.pages || 1;
      
      // 判断是否还有更多数据：当前页小于总页数，或者当前加载的数据少于总数
      hasMore.value = current < pages && emotionPacks.value.length < total;
      
      // 如果有更多数据，准备加载下一页
      if (hasMore.value) {
        currentPage.value = current + 1;
      } else {
        // 没有更多数据了，保持当前页
        currentPage.value = current;
      }
    } else {
      ElMessage.error(res.message || "获取表情包列表失败");
      hasMore.value = false;
    }
  } catch (error) {
    console.error("获取表情包失败:", error);
    ElMessage.error("获取表情包列表失败");
    hasMore.value = false;
  } finally {
    isLoadingPacks.value = false;
  }
};

// 过滤本地表情包
const filteredEmotionPacks = computed(() => {
  if (!searchKeyword.value.trim()) return emotionPacks.value;
  return emotionPacks.value.filter((pack) =>
    pack.cover.includes(searchKeyword.value.trim())
  );
});

// 选择表情包
const selectEmotionPack = (pack) => {
  emit("select", pack);
  emit("close");
};

const handleUpload = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jpg,.jpeg,.png,.gif,.mp4";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // 先上传图片
        const uploadRes = await userApi.uploadImage(file);
        if (uploadRes.code === 0 && uploadRes.data.succMap) {
          const newUrl = uploadRes.data.succMap[file.name];
          if (newUrl) {
            // 使用新API添加收藏
            const addRes = await userApi.addEmoticonFavour(newUrl);
            if (addRes.code === 0) {
              ElMessage.success("添加表情包成功");
              // 重新加载第一页
              currentPage.value = 1;
              hasMore.value = true;
              await fetchEmotionPacks(false);
            } else {
              ElMessage.error(addRes.message || "添加表情包失败");
            }
          }
        } else {
          ElMessage.error(uploadRes.message || "上传失败");
        }
      } catch (error) {
        console.error("上传表情包失败:", error);
        ElMessage.error(error.message || "上传失败");
      }
    }
  };
  input.click();
};

const handleDelete = async (pack) => {
  if (!pack.id) {
    ElMessage.warning("无法删除：缺少表情包ID");
    return;
  }
  
  try {
    const deleteRes = await userApi.deleteEmoticonFavour(pack.id);
    if (deleteRes.code === 0) {
      ElMessage.success("删除表情包成功");
      // 从列表中移除
      emotionPacks.value = emotionPacks.value.filter((p) => p.id !== pack.id);
    } else {
      ElMessage.error(deleteRes.message || "删除表情包失败");
    }
  } catch (error) {
    console.error("删除表情包失败:", error);
    ElMessage.error(error.message || "删除表情包失败");
  }
};

// 在线表情包搜索
const searchOnlineEmojis = async (isLoadMore = false) => {
  let keyword = onlineSearchKeyword.value.trim();
  if (keyword && !keyword.endsWith("表情")) {
    keyword = keyword + "表情";
  }
  if (!keyword) {
    showOnlineEmojiSearch.value = false;
    onlineEmojiSearchResults.value = [];
    return;
  }
  if (!isLoadMore) {
    onlineSearchCurrentPage.value = 0;
    onlineEmojiSearchResults.value = [];
    onlineSearchHasMore.value = true;
  }
  if (!onlineSearchHasMore.value) return;

  onlineEmojiSearchLoading.value = true;
  showOnlineEmojiSearch.value = true;
  try {
    const response = await baiduImageAPI.searchEmoji(
      keyword,
      onlineSearchCurrentPage.value,
      onlineSearchPageSize
    );
    const images = baiduImageAPI.parseImageUrls(response);
    if (images.length < onlineSearchPageSize) {
      onlineSearchHasMore.value = false;
    }
    onlineEmojiSearchResults.value = [
      ...onlineEmojiSearchResults.value,
      ...images,
    ];
    onlineSearchCurrentPage.value += 1;
  } catch (error) {
    console.error("在线表情包搜索失败:", error);
    ElMessage.error("在线表情包搜索失败");
    onlineEmojiSearchResults.value = [];
    onlineSearchHasMore.value = false;
  } finally {
    onlineEmojiSearchLoading.value = false;
  }
};

const selectOnlineEmojiImage = (image) => {
  emit("select", image.middleURL || image.thumbURL);
  emit("close");
};

const handleOnlineImageError = (e) => {
  e.target.style.display = "none";
};

// 滚动加载更多（在线搜索）
const handleOnlineScroll = (e) => {
  const el = e.target;
  if (
    el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
    !onlineEmojiSearchLoading.value &&
    onlineSearchHasMore.value
  ) {
    searchOnlineEmojis(true);
  }
};

// 滚动加载更多（表情包列表）
const handlePacksScroll = (e) => {
  const el = e.target;
  if (
    el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
    !isLoadingPacks.value &&
    hasMore.value
  ) {
    fetchEmotionPacks(true);
  }
};

onMounted(async () => {
  if (props.visible && currentTab.value === 'default') {
    await nextTick();
    initEmojiMart();
  }
  fetchEmotionPacks();
});

onUnmounted(() => {
  // 清理 emoji picker 实例
  if (emojiPickerInstance.value && emojiMartRef.value) {
    emojiMartRef.value.innerHTML = '';
    emojiPickerInstance.value = null;
  }
});
</script>

<style scoped>
.emoji-picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
}
.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 320px;
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 380px;
  overflow: hidden;
}
.emoji-picker-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.close-btn {
  cursor: pointer;
  color: var(--sub-text-color);
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s, color 0.2s;
  margin-right: 0;
  margin-left: auto;
}
.close-btn:hover {
  color: var(--primary-color);
  background: var(--hover-bg);
}
.emoji-picker-content {
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  max-height: 320px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* Emoji Mart 容器样式 */
.emoji-mart-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.emoji-mart-container :deep(em-emoji-picker) {
  width: 100% !important;
  height: 280px !important;
  border: none !important;
}

/* 适配暗色主题 */
.emoji-mart-container :deep(em-emoji-picker) {
  --rgb-background: var(--card-bg);
  --rgb-input: var(--card-bg);
  --rgb-color: var(--text-color);
  --rgb-accent: var(--primary-color);
}
.emoji-picker-footer {
  padding: 8px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}
.tabs {
  display: flex;
  justify-content: flex-start;
  gap: 24px;
  padding-left: 12px;
}
.tab {
  cursor: pointer;
  color: var(--sub-text-color);
  font-size: 20px;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab:hover {
  color: var(--primary-color);
  background: var(--hover-bg);
}
.tab.active {
  color: var(--primary-color);
  background: var(--hover-bg);
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}
.emoji-item {
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  text-align: center;
  border-radius: 4px;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}
.emoji-item img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.emoji-item:hover {
  background-color: var(--hover-bg);
}
.emoji-pack-grid-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.emoji-pack-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
  max-height: 210px;
  overflow-y: auto;
  box-sizing: border-box;
}
.emoji-pack-item {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s;
  position: relative;
}
.emoji-pack-item img {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.emoji-pack-item:hover img {
  transform: scale(1.05);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--hover-bg);
  border: 2px dashed var(--border-color);
  color: var(--sub-text-color);
  gap: 8px;
}
.upload-btn:hover {
  background: var(--background-color);
  border-color: var(--primary-color);
}
.upload-btn i {
  font-size: 24px;
}
.upload-btn span {
  font-size: 12px;
}
.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}
.emoji-pack-item:hover .delete-btn {
  opacity: 1;
}
.delete-btn:hover {
  background: rgba(255, 0, 0, 0.7);
}
.emoji-picker-online-search {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.emoji-picker-online-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.emoji-picker-online-search-input {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.emoji-picker-online-search-input:focus {
  border-color: var(--primary-color);
}
.emoji-picker-online-search-btn {
  padding: 4px 12px;
  background: var(--primary-color);
  color: var(--button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}
.emoji-picker-online-search-btn:hover {
  background: var(--button-bg);
}
.emoji-picker-online-search-results {
  flex: 1;
  max-height: 180px;
  overflow-y: auto;
}
.emoji-picker-online-search-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sub-text-color);
  font-size: 13px;
  padding: 12px 0;
}
.emoji-picker-online-search-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.emoji-picker-online-search-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s, box-shadow 0.2s;
}
.emoji-picker-online-search-image {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.emoji-picker-online-search-item:hover img {
  transform: scale(1.05);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
</style>
