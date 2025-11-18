<template>
  <div class="chapter-list-container">
    <div class="search-header">
      <el-input
        v-model="searchText"
        placeholder="搜索章节标题"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch('')"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <div class="action-buttons">
      <el-button
        :icon="Refresh"
        :loading="refreshing"
        :disabled="refreshDisabled"
        @click="refreshChapters"
      >
        刷新章节
      </el-button>
      <el-button
        v-if="book.lastReadChapter !== undefined && book.lastReadChapter >= 0"
        @click="scrollToCurrentChapter"
      >
        定位到当前章节
      </el-button>
    </div>

    <div v-loading="loading" class="list-container" ref="listContainerRef">
      <el-scrollbar v-if="!loading && filteredChapters.length > 0" height="60vh">
        <div class="chapter-list">
          <div
            v-for="chapter in filteredChapters"
            :key="chapter.index"
            :ref="book.lastReadChapter === chapter.index ? currentChapterRef : null"
            class="chapter-item"
            :class="{ 'current-chapter': book.lastReadChapter === chapter.index }"
            @click="handleChapterClick(chapter)"
          >
            <div class="chapter-title">
              {{ chapter.title }}
              <el-text v-if="book.lastReadChapter === chapter.index" type="info" size="small" style="margin-left: 8px">
                (当前)
              </el-text>
              <el-text v-if="chapter.content" type="info" size="small" style="margin-left: 8px">
                (已缓存)
              </el-text>
            </div>
          </div>
        </div>
      </el-scrollbar>

      <el-empty
        v-else-if="!loading && filteredChapters.length === 0"
        description="没有找到章节"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

const API_URLS = {
  CHAPTER_LIST: `/getChapterList`,
  BOOK_CONTENT: `/getBookContent`
}

// 使用缓存记录已经加载过的书籍ID，避免重复请求章节列表
const loadedBooksCache = new Set()

// Props
const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  onChapterSelect: {
    type: Function,
    required: true
  },
  settings: {
    type: Object,
    required: true
  }
})

// 状态
const chapters = ref([])
const filteredChapters = ref([])
const loading = ref(true)
const searchText = ref('')
const refreshDisabled = ref(false)
const refreshing = ref(false)
const loadingContent = ref(false)
const hasInitialized = ref(false)

// Refs
const currentChapterRef = ref(null)
const listContainerRef = ref(null)

// 更新本地存储中的书籍信息
const updateBookInStorage = (updatedBook) => {
  try {
    const savedBooks = localStorage.getItem("fish-reader-books")
    if (savedBooks) {
      const books = JSON.parse(savedBooks)
      const updatedBooks = books.map(b => b.id === updatedBook.id ? updatedBook : b)
      localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks))
    }
  } catch (error) {
    console.error('更新本地存储失败:', error)
  }
}

// 搜索章节
const handleSearch = (value) => {
  if (value !== undefined) {
    searchText.value = value
  }
  
  if (!searchText.value.trim()) {
    filteredChapters.value = chapters.value
    return
  }

  const filtered = chapters.value.filter(chapter =>
    chapter.title.toLowerCase().includes(searchText.value.toLowerCase())
  )
  filteredChapters.value = filtered
}

// 获取章节内容
const fetchChapterContent = async (chapter) => {
  if (loadingContent.value) return // 防止重复请求

  // 首先检查localStorage中的最新数据
  const savedBooks = localStorage.getItem("fish-reader-books")
  if (savedBooks) {
    const books = JSON.parse(savedBooks)
    const savedBook = books.find(b => b.id === props.book.id)
    if (savedBook && savedBook.chapters) {
      const savedChapter = savedBook.chapters.find(c => c.index === chapter.index)
      if (savedChapter && savedChapter.content) {
        // 更新本地章节列表
        if (!chapter.content) {
          const updatedChapter = { ...chapter, content: savedChapter.content }
          const updatedChapters = chapters.value.map(c =>
            c.index === chapter.index ? updatedChapter : c
          )
          chapters.value = updatedChapters
          filteredChapters.value = searchText.value ?
            filteredChapters.value.map(c => c.index === chapter.index ? updatedChapter : c) :
            updatedChapters
        }
        return { ...chapter, content: savedChapter.content }
      }
    }
  }

  // 如果章节已有内容，直接返回
  if (chapter.content) {
    return chapter
  }

  loadingContent.value = true
  const loadingMessage = ElMessage({
    message: '获取章节内容...',
    type: 'info',
    duration: 0
  })

  try {
    const timestamp = new Date().getTime()
    // 从settings中获取accessToken和apiBaseUrl
    const accessToken = props.settings.accessToken || 'congg:7e0efee65786976202e4fc20c6a98d89'
    const apiBaseUrl = props.settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3'
    const apiUrl = `${apiBaseUrl}${API_URLS.BOOK_CONTENT}?accessToken=${accessToken}&v=${timestamp}`

    const response = await axios.post(apiUrl, {
      url: props.book.url,
      index: chapter.index
    })

    if (response.data && response.data.data) {
      // 直接获取response.data.data作为内容，而不是response.data.data.content
      const content = response.data.data || ''

      if (content && content.length > 0) {
        // 更新章节内容
        const updatedChapter = { ...chapter, content }

        // 更新章节列表中对应章节的内容
        const updatedChapters = chapters.value.map(c =>
          c.index === chapter.index ? updatedChapter : c
        )

        chapters.value = updatedChapters

        // 同步更新过滤后的章节列表
        if (searchText.value) {
          const updatedFilteredChapters = filteredChapters.value.map(c =>
            c.index === chapter.index ? updatedChapter : c
          )
          filteredChapters.value = updatedFilteredChapters
        } else {
          filteredChapters.value = updatedChapters
        }

        // 更新本地存储
        const updatedBook = {
          ...props.book,
          chapters: updatedChapters,
          lastReadChapter: chapter.index
        }

        // 保存到本地存储
        updateBookInStorage(updatedBook)

        ElMessage.success(`章节"${chapter.title}"内容加载完成`)

        // 确认返回带内容的章节对象
        return updatedChapter
      } else {
        console.error('获取到的内容为空')
        ElMessage.error('获取章节内容失败: 内容为空')
      }
    } else {
      console.error('章节内容数据格式不正确', response.data)
      ElMessage.error('获取章节内容失败: 响应数据格式不正确')
    }
  } catch (error) {
    console.error('获取章节内容失败:', error)
    ElMessage.error('获取章节内容失败: ' + (error.message || '请检查网络连接'))
  } finally {
    loadingContent.value = false
    loadingMessage.close()
  }

  return chapter
}

// 处理章节点击
const handleChapterClick = async (chapter) => {
  // 检查章节内容是否存在，不存在则获取
  if (!chapter.content && props.book.source === 'online') {
    const updatedChapter = await fetchChapterContent(chapter) || chapter
    // 不管有没有内容，都调用父组件回调，并传递章节对象
    props.onChapterSelect(chapter.index, updatedChapter)
  } else {
    // 直接调用父组件的回调，并传递章节对象
    props.onChapterSelect(chapter.index, chapter)
  }
}

// 刷新章节列表 - 添加节流控制
const refreshChapters = async () => {
  if (props.book.source !== 'online' || !props.book.url) {
    ElMessage.info('仅在线书籍支持刷新章节列表')
    return
  }

  if (refreshDisabled.value) {
    ElMessage.info('请稍后再试，操作过于频繁')
    return
  }

  refreshDisabled.value = true
  refreshing.value = true
  loading.value = true

  try {
    // 先检查本地存储是否有最新数据
    const savedBooks = localStorage.getItem("fish-reader-books")
    if (!refreshing.value && savedBooks) { // 只在非强制刷新时检查缓存
      const books = JSON.parse(savedBooks)
      const savedBook = books.find(b => b.id === props.book.id)
      if (savedBook && savedBook.chapters && savedBook.chapters.length > 0) {
        chapters.value = savedBook.chapters
        filteredChapters.value = savedBook.chapters
        loading.value = false
        refreshing.value = false

        // 短时间内禁用刷新按钮
        setTimeout(() => {
          refreshDisabled.value = false
        }, 1000)

        return
      }
    }

    const timestamp = new Date().getTime()
    // 从settings中获取accessToken和apiBaseUrl
    const accessToken = props.settings.accessToken || 'congg:7e0efee65786976202e4fc20c6a98d89'
    const apiBaseUrl = props.settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3'
    const apiUrl = `${apiBaseUrl}${API_URLS.CHAPTER_LIST}?accessToken=${accessToken}&v=${timestamp}`

    const response = await axios.post(apiUrl, {
      url: props.book.url || props.book.sourceInfo.url,
      refresh: 0, // 不强制刷新
      bookSourceUrl: props.book.sourceInfo.url
    })

    // 检查响应数据格式并正确处理
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const parsedChapters = response.data.data

      if (parsedChapters.length > 0) {
        // 保留现有章节的内容
        if (chapters.value.length > 0) {
          parsedChapters.forEach((newChapter) => {
            const existingChapter = chapters.value.find(c => c.index === newChapter.index || c.url === newChapter.url)
            if (existingChapter && existingChapter.content) {
              newChapter.content = existingChapter.content
            }
          })
        }

        chapters.value = parsedChapters
        filteredChapters.value = parsedChapters

        // 同时更新本地存储
        const updatedBook = {
          ...props.book,
          chapters: parsedChapters
        }

        // 更新本地存储中的书籍章节信息
        updateBookInStorage(updatedBook)
        ElMessage.success(`成功获取 ${parsedChapters.length} 个章节`)
      } else {
        ElMessage.error('未能从页面解析出章节信息')
      }
    } else {
      ElMessage.error('章节列表数据格式不正确，请稍后重试')
    }
  } catch (error) {
    console.error('刷新章节列表失败:', error)
    ElMessage.error('刷新章节列表失败: ' + (error.message || '请检查网络连接'))
  } finally {
    loading.value = false
    refreshing.value = false

    // 5秒后允许再次刷新
    setTimeout(() => {
      refreshDisabled.value = false
    }, 5000)
  }
}

// 定位到当前章节
const scrollToCurrentChapter = () => {
  const currentChapter = filteredChapters.value.find(c => c.index === props.book.lastReadChapter)
  if (currentChapter && currentChapterRef.value) {
    nextTick(() => {
      if (currentChapterRef.value) {
        if (typeof currentChapterRef.value === 'object' && currentChapterRef.value.length > 0) {
          currentChapterRef.value[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        } else if (currentChapterRef.value.scrollIntoView) {
          currentChapterRef.value.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }
    })
  }
}

// 加载章节
const loadChapters = async () => {
  // 防止重复初始化
  if (hasInitialized.value && props.book.chapters && props.book.chapters.length > 0) {
    chapters.value = props.book.chapters
    filteredChapters.value = props.book.chapters
    loading.value = false
    return
  }

  hasInitialized.value = true

  loading.value = true
  try {
    // 检查本地存储中是否已有最新数据
    const savedBooks = localStorage.getItem("fish-reader-books")
    if (savedBooks) {
      const books = JSON.parse(savedBooks)
      const savedBook = books.find(b => b.id === props.book.id)
      if (savedBook && savedBook.chapters && savedBook.chapters.length > 0) {
        chapters.value = savedBook.chapters
        filteredChapters.value = savedBook.chapters
        // 标记该书籍已加载章节列表
        loadedBooksCache.add(props.book.id)
        loading.value = false
        return
      }
    }

    if (props.book.chapters && props.book.chapters.length > 0) {
      // 如果已有章节数据，直接使用缓存数据
      chapters.value = props.book.chapters
      filteredChapters.value = props.book.chapters

      // 标记该书籍已加载章节列表
      loadedBooksCache.add(props.book.id)
    } else if (props.book.source === 'online' && props.book.url && !loadedBooksCache.has(props.book.id)) {
      // 只有当书籍没有章节列表且未曾加载过时，才调用API
      await refreshChapters()

      // 标记该书籍已加载章节列表
      loadedBooksCache.add(props.book.id)
    } else if (!props.book.chapters || props.book.chapters.length === 0) {
      ElMessage.info('无法获取章节列表，请尝试刷新')
    }
  } catch (error) {
    console.error('加载章节失败:', error)
    ElMessage.error('加载章节失败，请重试')
  } finally {
    loading.value = false
  }
}

// 监听book.id变化
watch(() => props.book.id, () => {
  hasInitialized.value = false
  loadChapters()
}, { immediate: false })

// 章节列表加载完成后，滚动到当前阅读章节
watch([() => loading.value, () => filteredChapters.value, () => props.book.lastReadChapter], () => {
  if (!loading.value && filteredChapters.value.length > 0 && props.book.lastReadChapter !== undefined && props.book.lastReadChapter >= 0) {
    // 使用setTimeout确保DOM已完全渲染
    nextTick(() => {
      setTimeout(() => {
        if (currentChapterRef.value) {
          const el = typeof currentChapterRef.value === 'object' && currentChapterRef.value.length > 0
            ? currentChapterRef.value[0]
            : currentChapterRef.value
          
          if (el && el.scrollIntoView) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }
        }
      }, 300)
    })
  }
})

onMounted(() => {
  loadChapters()
})
</script>

<style scoped>
.chapter-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-header {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.list-container {
  flex: 1;
  min-height: 0;
}

.chapter-list {
  padding: 0;
}

.chapter-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 3px solid transparent;
  border-bottom: 1px solid #f0f0f0;
}

.chapter-item:hover {
  background-color: #f5f5f5 !important;
}

.chapter-item.current-chapter {
  background-color: #f0f5ff;
  border-left: 3px solid #1890ff;
}

.chapter-title {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}
</style>


