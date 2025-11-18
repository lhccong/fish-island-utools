<template>
  <div class="book-import-container">
    <div class="search-header">
      <el-input
        v-model="searchKeyword"
        placeholder="输入书名或作者搜索"
        size="large"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button
            :loading="searching && searchResults.length === 0"
            @click="handleSearch"
          >
            搜索
          </el-button>
        </template>
      </el-input>
    </div>

    <div class="search-content">
      <div v-if="searching && searchResults.length === 0" class="loading-container">
        <el-icon class="is-loading" :size="24">
          <Loading />
        </el-icon>
        <p>正在搜索...</p>
      </div>

      <div v-else-if="searchResults.length > 0" class="results-container">
        <el-scrollbar>
          <div class="book-list">
            <div
              v-for="result in searchResults"
              :key="`${result.bookUrl}-${result.origin}`"
              class="book-item"
            >
              <div class="book-cover">
                <img
                  v-if="result.coverUrl && !isImageError(result)"
                  :src="result.coverUrl"
                  :alt="result.name"
                  @error="() => handleImageError(result)"
                />
                <div v-else class="cover-placeholder">
                  <el-icon :size="24">
                    <Reading />
                  </el-icon>
                </div>
              </div>

              <div class="book-info">
                <div class="book-title">{{ result.name }}</div>
                <div class="book-author">作者: {{ result.author || '未知' }}</div>
                <div class="book-meta">
                  <span v-if="result.kind">
                    分类/时间: {{ result.kind.split(',')[0] }}
                  </span>
                  <span v-if="result.wordCount">
                    字数: {{ result.wordCount }}
                  </span>
                </div>
                <div class="book-origin">
                  <el-icon><Link /></el-icon>
                  {{ result.originName || result.origin }}
                </div>
                <div v-if="result.intro" class="book-intro">
                  <el-tooltip
                    :content="result.intro"
                    placement="bottom-start"
                    :show-after="300"
                    raw-content
                  >
                    <div class="intro-text">{{ result.intro }}</div>
                  </el-tooltip>
                </div>
              </div>

              <div class="book-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click="addSearchResultToShelf(result)"
                >
                  添加到书架
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="hasMore" class="load-more" @click="loadMore">
            <el-icon v-if="loadingMore" class="is-loading">
              <Loading />
            </el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            <span>{{ loadingMore ? '加载中...' : '加载更多' }}</span>
          </div>

          <div v-if="searching" class="searching-indicator">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>搜索中...</span>
          </div>
        </el-scrollbar>
      </div>

      <el-empty
        v-else-if="searchKeyword && !searching"
        description="没有找到相关书籍"
      />

      <div v-else class="empty-state">
        <el-icon :size="40" color="#ccc">
          <Search />
        </el-icon>
        <p>输入关键词搜索书籍</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Reading, Link, ArrowDown, Search } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  onAddOnlineBook: {
    type: Function,
    required: true
  }
})

// 全局变量
const SEARCH_URL = 'https://reader.yucoder.cn/reader3/searchBookMultiSSE'
const ACCESS_TOKEN = 'congg:7e0efee65786976202e4fc20c6a98d89'

// 搜索相关状态
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const lastIndex = ref(-1)
const page = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
// 图片加载错误状态
const imageErrors = ref(new Set())

// 使用ref保存EventSource实例
const eventSourceRef = ref(null)
const lastIndexRef = ref(-1)

// 同步lastIndex到ref
watch(lastIndex, (newVal) => {
  lastIndexRef.value = newVal
})

// 清理EventSource连接
const cleanupEventSource = () => {
  if (eventSourceRef.value) {
    eventSourceRef.value.close()
    eventSourceRef.value = null
  }
}

// 组件卸载时清理资源
onUnmounted(() => {
  cleanupEventSource()
})

// 处理搜索请求
const handleSearch = async () => {
  if (!searchKeyword.value) {
    ElMessage.error('请输入搜索关键词')
    return
  }

  // 重置搜索状态
  searchResults.value = []
  searching.value = true
  lastIndex.value = -1
  lastIndexRef.value = -1
  page.value = 1
  hasMore.value = false
  imageErrors.value.clear() // 清空图片错误状态

  // 清理之前可能存在的连接
  cleanupEventSource()

  // 构建搜索URL
  const queryParams = new URLSearchParams({
    key: searchKeyword.value,
    bookSourceUrl: '',
    bookSourceGroup: '',
    concurrentCount: '8',
    lastIndex: '-1',
    page: '1',
    accessToken: ACCESS_TOKEN
  })

  const searchUrl = `${SEARCH_URL}?${queryParams.toString()}`

  try {
    // 创建SSE连接
    const eventSource = new EventSource(searchUrl)
    eventSourceRef.value = eventSource

    let newResults = []

    // 监听message事件
    eventSource.onmessage = (event) => {
      try {
        // 提取data部分
        const data = event.data.trim()
        if (!data) return

        // 解析JSON
        const parsedData = JSON.parse(data)
        lastIndex.value = parsedData.lastIndex

        // 过滤封面为空的数据
        const filteredData = parsedData.data && Array.isArray(parsedData.data)
          ? parsedData.data.filter((item) => item.coverUrl)
          : []

        // 合并搜索结果
        if (filteredData.length > 0) {
          newResults = [...newResults, ...filteredData]
          searchResults.value = [...searchResults.value, ...filteredData]
        }
      } catch (error) {
        console.error('解析SSE消息失败:', error)
      }
    }

    // 监听end事件
    eventSource.addEventListener('end', (event) => {
      try {
        const data = event.data.trim()
        if (!data) return

        const parsedData = JSON.parse(data)

        // 更新lastIndex
        if (parsedData.lastIndex !== undefined) {
          lastIndex.value = parsedData.lastIndex
        }

        // 根据isEnd确定是否还有更多数据
        hasMore.value = parsedData.isEnd === false

        // 完成搜索
        eventSource.close()
        eventSourceRef.value = null
        searching.value = false
      } catch (error) {
        console.error('解析end事件失败:', error)
      }
    })

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error)
      ElMessage.error('搜索请求异常，请稍后重试')
      eventSource.close()
      eventSourceRef.value = null
      searching.value = false
    }

    // 监听连接关闭
    eventSource.addEventListener('complete', () => {
      eventSource.close()
      eventSourceRef.value = null
      searching.value = false

      // 如果没有收到end事件，我们假设有更多结果
      if (newResults.length > 0) {
        hasMore.value = true
      }
    })
  } catch (error) {
    console.error('创建SSE连接失败:', error)
    ElMessage.error('搜索请求失败，请检查网络连接')
    searching.value = false
  }
}

// 加载更多结果
const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  const nextPage = page.value + 1

  // 构建搜索URL
  const queryParams = new URLSearchParams({
    key: searchKeyword.value,
    bookSourceUrl: '',
    bookSourceGroup: '',
    concurrentCount: '8',
    lastIndex: lastIndexRef.value.toString(),
    page: nextPage.toString(),
    accessToken: ACCESS_TOKEN
  })

  const searchUrl = `${SEARCH_URL}?${queryParams.toString()}`

  try {
    // 创建SSE连接
    const eventSource = new EventSource(searchUrl)
    eventSourceRef.value = eventSource

    let newResults = []

    // 监听message事件
    eventSource.onmessage = (event) => {
      try {
        // 提取data部分
        const data = event.data.trim()
        if (!data) return

        // 解析JSON
        const parsedData = JSON.parse(data)
        lastIndex.value = parsedData.lastIndex
        const filteredData = parsedData.data && Array.isArray(parsedData.data)
          ? parsedData.data.filter((item) => item.coverUrl)
          : []
        // 合并搜索结果
        if (filteredData && Array.isArray(filteredData) && filteredData.length > 0) {
          newResults = [...newResults, ...filteredData]
          searchResults.value = [...searchResults.value, ...filteredData]
        }
      } catch (error) {
        console.error('解析SSE消息失败:', error)
      }
    }

    // 监听end事件
    eventSource.addEventListener('end', (event) => {
      try {
        const data = event.data.trim()
        if (!data) return

        const parsedData = JSON.parse(data)

        // 更新lastIndex
        if (parsedData.lastIndex !== undefined) {
          lastIndex.value = parsedData.lastIndex
        }

        // 根据isEnd确定是否还有更多数据
        hasMore.value = parsedData.isEnd === false

        // 完成加载
        eventSource.close()
        eventSourceRef.value = null
        loadingMore.value = false
        page.value = nextPage
      } catch (error) {
        console.error('解析end事件失败:', error)
      }
    })

    // 监听错误
    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error)
      eventSource.close()
      eventSourceRef.value = null
      loadingMore.value = false
    }

    // 监听连接关闭
    eventSource.addEventListener('complete', () => {
      eventSource.close()
      eventSourceRef.value = null
      loadingMore.value = false
      page.value = nextPage

      // 如果没有收到end事件，我们假设有更多结果
      if (newResults.length > 0) {
        hasMore.value = true
      }
    })
  } catch (error) {
    console.error('创建SSE连接失败:', error)
    ElMessage.error('加载更多失败，请检查网络连接')
    loadingMore.value = false
  }
}

// 将搜索结果添加到书架
const addSearchResultToShelf = (result) => {
  const newBook = {
    id: Date.now(),
    title: result.name,
    author: result.author || '未知作者',
    cover: result.coverUrl,
    format: 'online',
    source: 'online',
    url: result.bookUrl,
    sourceInfo: {
      name: result.originName || '未知来源',
      url: result.origin
    },
    chapters: [], // 初始为空，后续会从URL加载章节
    lastReadPosition: 0,
    lastReadChapter: 0,
    lastReadTime: null
  }

  props.onAddOnlineBook(newBook)
  ElMessage.success(`已添加《${result.name}》到书架`)
}

// 检查图片是否加载错误
const isImageError = (result) => {
  const key = `${result.bookUrl}-${result.origin}`
  return imageErrors.value.has(key)
}

// 处理图片加载错误
const handleImageError = (result) => {
  const key = `${result.bookUrl}-${result.origin}`
  imageErrors.value.add(key)
}
</script>

<style scoped>
.book-import-container {
  position: relative;
  height: 60vh;
  display: flex;
  flex-direction: column;
}

.search-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--el-bg-color);
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 16px;
}

.search-header :deep(.el-input) {
  border-radius: 8px;
}

.search-header :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
  transition: all 0.2s;
}

.search-header :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
}

.search-header :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.search-content {
  flex: 1;
  overflow: hidden;
  padding: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.loading-container {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--el-text-color-secondary);
}

.loading-container .el-icon {
  font-size: 32px;
  color: var(--el-color-primary);
}

.loading-container p {
  margin: 0;
  font-size: 14px;
}

.results-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.results-container :deep(.el-scrollbar) {
  height: 100%;
}

.results-container :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.book-list {
  padding: 0;
}

.book-item {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 16px;
  transition: all 0.2s;
  border-radius: 8px;
  margin-bottom: 8px;
}

.book-item:hover {
  background-color: var(--el-fill-color-light);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.book-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.book-cover {
  flex-shrink: 0;
  width: 70px;
  height: 100px;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.book-item:hover .book-cover {
  transform: scale(1.05);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.book-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;
}

.book-origin {
  font-size: 12px;
  color: var(--el-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.book-intro {
  margin-top: 4px;
}

.intro-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  line-height: 1.6;
}

.book-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 0;
}

.book-actions .el-button {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.book-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.load-more {
  text-align: center;
  padding: 16px 0;
  cursor: pointer;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  border-radius: 6px;
  margin-top: 8px;
  font-weight: 500;
}

.load-more:hover {
  color: var(--el-color-primary-light-3);
  background-color: var(--el-fill-color-light);
}

.searching-indicator {
  text-align: center;
  padding: 16px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--el-text-color-placeholder);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.empty-state .el-icon {
  opacity: 0.5;
  transition: all 0.3s;
}

.empty-state:hover .el-icon {
  opacity: 0.8;
  transform: scale(1.1);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}
</style>

