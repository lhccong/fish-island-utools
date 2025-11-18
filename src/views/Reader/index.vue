<template>
  <div class="reader-container">
    <el-header class="reader-header">
      <div class="header-left">
        <el-button
          v-if="isReaderVisible"
          :icon="ArrowLeft"
          text
          circle
          @click="closeReader"
          class="header-back-btn"
        >
        </el-button>
        <div class="header-title-wrapper">
          <el-icon :size="20" class="header-icon">
            <Reading />
          </el-icon>
          <h2 class="header-title">
            <span v-if="isReaderVisible && currentBook">
              {{ readerRef?.currentChapter?.title || currentBook.title }}
            </span>
            <span v-else>我的书架</span>
          </h2>
        </div>
      </div>
      
      <!-- 阅读器工具栏 - 只在阅读器可见时显示 -->
      <div v-if="isReaderVisible && currentBook" class="header-center">
        <el-button
          :icon="Menu"
          text
          circle
          size="small"
          class="header-btn"
          @click="openChapterList(currentBook)"
        />
        <el-tooltip content="刷新章节" placement="bottom">
          <el-button
            :icon="Refresh"
            text
            circle
            size="small"
            class="header-btn"
            :disabled="readerRef?.refreshing || readerRef?.loading"
            :loading="readerRef?.loading && readerRef?.refreshing"
            @click="readerRef?.refreshCurrentChapter"
          />
        </el-tooltip>
        <el-tooltip content="上一章" placement="bottom">
          <el-button
            :icon="ArrowLeft"
            text
            circle
            size="small"
            class="header-btn"
            :disabled="!currentBook?.chapters || currentBook.chapters.length === 0 || (readerRef?.currentChapterIndex || 0) <= 0 || readerRef?.loading"
            @click="readerRef?.goToPrevChapter"
          />
        </el-tooltip>
        <el-tooltip content="下一章" placement="bottom">
          <el-button
            :icon="ArrowRight"
            text
            circle
            size="small"
            class="header-btn"
            :disabled="!currentBook?.chapters || currentBook.chapters.length === 0 || (readerRef?.currentChapterIndex || 0) >= (currentBook.chapters.length - 1) || readerRef?.loading"
            @click="readerRef?.goToNextChapter"
          />
        </el-tooltip>
        <el-popover
          placement="bottom"
          :width="200"
          trigger="click"
        >
          <template #reference>
            <el-button
              text
              size="small"
              class="header-btn font-btn"
            >
              {{ readerRef?.getCurrentFontName(readerSettings.fontFamily) || 'Arial' }}
            </el-button>
          </template>
          <div style="margin-bottom: 8px">
            <span>选择字体</span>
          </div>
          <el-space direction="vertical" style="width: 100%">
            <el-button
              v-for="font in (readerRef?.fontOptions || [])"
              :key="font.value"
              :type="readerSettings.fontFamily === font.value ? 'primary' : 'default'"
              size="small"
              style="width: 100%; text-align: left"
              @click="readerRef?.handleFontFamilyChange(font.value)"
            >
              {{ font.label }}
            </el-button>
          </el-space>
        </el-popover>
      </div>

      <div class="header-right">
        <el-button
          :icon="Setting"
          text
          circle
          @click="openSettings"
          class="header-settings-btn"
        >
        </el-button>
      </div>
    </el-header>

    <el-main class="reader-main">
      <!-- 书架视图 -->
      <el-card v-if="!isReaderVisible" class="book-list-card">

        <div v-if="books.length > 0" class="book-grid-container">
          <div class="book-grid">
            <!-- 添加书籍按钮 -->
            <div
              class="book-card add-book-card"
              @click="showImportModal"
            >
              <el-icon :size="32" style="color: var(--el-color-primary); margin-bottom: 8px">
                <Plus />
              </el-icon>
              <div class="add-book-text">搜索书籍</div>
            </div>

            <!-- 书籍列表 -->
            <div
              v-for="book in books"
              :key="book.id"
              class="book-card"
              @click="openReader(book)"
            >
              <!-- 操作按钮 -->
              <div
                class="book-actions"
                @click.stop
              >
                <el-button
                  :icon="Menu"
                  size="small"
                  text
                  @click="openChapterList(book, $event)"
                  title="章节列表"
                />
                <el-button
                  :icon="Delete"
                  size="small"
                  text
                  type="danger"
                  @click="handleDeleteBook(book.id, $event)"
                  title="删除书籍"
                />
              </div>

              <!-- 书籍格式标签 -->
              <div class="book-format">
                <el-icon style="margin-right: 4px">
                  <component :is="getFormatIcon(book.format)" />
                </el-icon>
                <el-tag size="small" type="primary">
                  {{ book.format.toUpperCase() }}
                </el-tag>
              </div>

              <!-- 书籍信息 -->
              <div class="book-info">
                <div class="book-title">{{ book.title }}</div>
                <div v-if="book.author" class="book-author">
                  作者: {{ book.author }}
                </div>
                <div v-if="book.lastReadTime" class="book-time">
                  上次阅读: {{ formatTime(book.lastReadTime) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <el-empty
          v-else
          description="你的书架空空如也～"
        >
          <el-button type="primary" :icon="Plus" @click="showImportModal">
            搜索书籍
          </el-button>
        </el-empty>
      </el-card>

      <!-- 阅读器视图 -->
      <div v-else-if="isReaderVisible && currentBook" class="reader-view">
        <BookReader
          ref="readerRef"
          :key="`book-reader-${currentBook.id}`"
          :book="currentBook"
          :settings="readerSettings"
          :embedded="true"
          :on-progress-update="(position, chapterIndex) => updateReadingProgress(currentBook.id, position, chapterIndex)"
          :on-open-chapter-list="() => openChapterList(currentBook)"
        />
      </div>
    </el-main>

    <!-- 导入书籍对话框 -->
    <el-dialog
      v-model="isImportModalVisible"
      title="搜索书籍"
      width="900px"
      :close-on-click-modal="false"
      class="book-import-dialog"
      align-center
    >
      <BookImport
        :on-add-online-book="handleAddOnlineBook"
      />
      <template #footer>
        <el-button @click="isImportModalVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 阅读器设置抽屉 -->
    <el-drawer
      v-model="isSettingsVisible"
      title="阅读器设置"
      direction="rtl"
      size="400px"
    >
      <ReaderSettings
        :settings="readerSettings"
        :on-save="saveSettings"
      />
    </el-drawer>

    <!-- 章节列表抽屉 -->
    <el-drawer
      v-model="isChapterListVisible"
      title="章节列表"
      direction="rtl"
      size="400px"
    >
      <ChapterList
        v-if="currentBook"
        :book="currentBook"
        :on-chapter-select="handleChapterSelect"
        :settings="readerSettings"
      />
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Reading,
  Setting,
  Plus,
  Menu,
  Delete,
  Close,
  Document,
  Link,
  Files,
  ArrowLeft,
  ArrowRight,
  Refresh
} from '@element-plus/icons-vue'
import BookImport from './components/BookImport.vue'
import BookReader from './components/BookReader.vue'
import ChapterList from './components/ChapterList.vue'
import ReaderSettings from './components/ReaderSettings.vue'

// 定义书籍类型
const Book = {
  id: Number,
  title: String,
  author: String,
  cover: String,
  format: String, // 'txt' | 'epub' | 'mobi' | 'online'
  source: String, // 'local' | 'online'
  filePath: String,
  url: String,
  lastReadPosition: Number,
  lastReadChapter: Number,
  lastReadTime: Number,
  tags: Array,
  chapters: Array,
  sourceInfo: Object
}

// 定义章节类型
const Chapter = {
  baseUrl: String,
  bookUrl: String,
  index: Number,
  isVolume: Boolean,
  tag: String,
  title: String,
  url: String,
  content: String,
  position: Number
}

// 定义阅读器设置类型
const ReaderSettingsType = {
  fontColor: String,
  backgroundColor: String,
  opacity: Number,
  allowWindowMove: Boolean,
  fontSize: Number,
  fontFamily: String,
  prevPageKey: String,
  nextPageKey: String,
  quickHide: String,
  panicKey: String,
  accessToken: String,
  apiBaseUrl: String
}

// 生成默认的阅读器设置
const getDefaultReaderSettings = () => {
  const savedSettings = localStorage.getItem("fish-reader-settings")
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings)
    } catch (e) {
      console.error('解析已保存的阅读器设置失败:', e)
    }
  }

  return {
    fontColor: '#333333',
    backgroundColor: '#f5f5f5',
    opacity: 1,
    allowWindowMove: true,
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    prevPageKey: 'ArrowLeft',
    nextPageKey: 'ArrowRight',
    quickHide: 'none',
    panicKey: 'Escape',
    accessToken: 'congg:7e0efee65786976202e4fc20c6a98d89',
    apiBaseUrl: 'https://reader.yucoder.cn/reader3'
  }
}

// 状态管理
const books = ref([])
const loading = ref(true)
const isImportModalVisible = ref(false)
const isReaderVisible = ref(false)
const isSettingsVisible = ref(false)
const isChapterListVisible = ref(false)
const currentBook = ref(null)
const readerSettings = ref(getDefaultReaderSettings())
const readerRef = ref(null)

// 加载书籍列表
const loadBooks = async () => {
  try {
    loading.value = true
    const savedBooks = localStorage.getItem("fish-reader-books")
    if (savedBooks) {
      books.value = JSON.parse(savedBooks)
    }

    // 加载阅读器设置
    const savedSettings = localStorage.getItem("fish-reader-settings")
    if (savedSettings) {
      readerSettings.value = JSON.parse(savedSettings)
    }
  } catch (error) {
    console.error('加载书籍列表失败:', error)
    ElMessage.error('加载书籍列表失败')
  } finally {
    loading.value = false
  }
}

// 保存阅读器设置
watch(readerSettings, () => {
  localStorage.setItem("fish-reader-settings", JSON.stringify(readerSettings.value))
}, { deep: true })

// 打开导入面板
const showImportModal = () => {
  isImportModalVisible.value = true
}

// 添加在线书籍
const handleAddOnlineBook = (book) => {
  const updatedBooks = [...books.value, book]
  books.value = updatedBooks
  localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks))
  ElMessage.success('在线书籍添加成功')
  // 添加成功后关闭弹窗
  isImportModalVisible.value = false
}

// 打开阅读器
const openReader = (book) => {
  console.log('[Reader] openReader 开始', {
    bookId: book.id,
    bookTitle: book.title,
    hasChapters: !!book.chapters,
    chaptersLength: book.chapters?.length || 0,
    bookSource: book.source,
    bookUrl: book.url
  })

  const savedBooks = JSON.parse(localStorage.getItem("fish-reader-books") || '[]')
  const currentBookData = savedBooks.find((b) => b.id === book.id)
  console.log('[Reader] openReader 查找本地存储的书籍数据', {
    found: !!currentBookData,
    lastReadChapter: currentBookData?.lastReadChapter
  })
  
  const updatedBook = {
    ...book,
    lastReadChapter: currentBookData?.lastReadChapter || 0
  }

  console.log('[Reader] openReader 更新书籍数据', {
    updatedBook: {
      id: updatedBook.id,
      title: updatedBook.title,
      lastReadChapter: updatedBook.lastReadChapter,
      hasChapters: !!updatedBook.chapters,
      chaptersLength: updatedBook.chapters?.length || 0
    }
  })

  currentBook.value = updatedBook

  // 更新书籍列表
  const updatedBooks = books.value.map(b => b.id === updatedBook.id ? updatedBook : b)
  books.value = updatedBooks
  localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks))

  isReaderVisible.value = true
  console.log('[Reader] openReader 完成，设置 isReaderVisible = true')
}

// 关闭阅读器
const closeReader = () => {
  isReaderVisible.value = false
}

// 打开设置面板
const openSettings = () => {
  isSettingsVisible.value = true
}

// 保存设置
const saveSettings = (settings) => {
  localStorage.setItem("fish-reader-settings", JSON.stringify(settings))
  readerSettings.value = settings
  isSettingsVisible.value = false
  ElMessage.success('设置已保存并应用')
}

// 打开章节列表
const openChapterList = (book, e) => {
  if (e) {
    e.stopPropagation()
  }
  currentBook.value = book
  isChapterListVisible.value = true
}

// 章节跳转
const handleChapterSelect = (chapterIndex, chapter) => {
  if (!currentBook.value) return

  let updatedBook
  if (chapter && currentBook.value.chapters) {
    const updatedChapters = currentBook.value.chapters.map(c =>
      c.index === chapterIndex
        ? { ...c, content: chapter.content }
        : c
    )

    updatedBook = {
      ...currentBook.value,
      lastReadChapter: chapterIndex,
      chapters: updatedChapters
    }
  } else {
    updatedBook = {
      ...currentBook.value,
      lastReadChapter: chapterIndex
    }
  }

  // 更新本地存储
  const savedBooks = localStorage.getItem("fish-reader-books")
  if (savedBooks) {
    const allBooks = JSON.parse(savedBooks)
    const updatedBooks = allBooks.map((b) =>
      b.id === updatedBook.id ? updatedBook : b
    )
    localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks))
  }

  // 关闭章节列表
  isChapterListVisible.value = false

  // 更新当前书籍并重新打开阅读器
  setTimeout(() => {
    currentBook.value = updatedBook
    books.value = books.value.map(book =>
      book.id === updatedBook.id ? updatedBook : book
    )
    isReaderVisible.value = true
  }, 100)
}

// 删除书籍
const handleDeleteBook = (bookId, e) => {
  if (e) {
    e.stopPropagation()
  }

  ElMessageBox.confirm(
    '确定要删除这本书吗？此操作不可恢复。',
    '确认删除',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const newBooks = books.value.filter(book => book.id !== bookId)
    books.value = newBooks
    localStorage.setItem("fish-reader-books", JSON.stringify(newBooks))
    ElMessage.success('书籍已删除')
  }).catch(() => {
    // 用户取消删除
  })
}

// 更新阅读进度
const updateReadingProgress = (bookId, position, chapterIndex) => {
  const now = Date.now()
  const updatedBooks = books.value.map(book => {
    if (book.id === bookId) {
      return {
        ...book,
        lastReadPosition: position,
        lastReadChapter: chapterIndex !== undefined ? chapterIndex : book.lastReadChapter,
        lastReadTime: now
      }
    }
    return book
  })

  books.value = updatedBooks
  localStorage.setItem("fish-reader-books", JSON.stringify(updatedBooks))

  // 同时更新当前书籍
  if (currentBook.value && currentBook.value.id === bookId) {
    currentBook.value = {
      ...currentBook.value,
      lastReadPosition: position,
      lastReadChapter: chapterIndex !== undefined ? chapterIndex : currentBook.value.lastReadChapter,
      lastReadTime: now
    }
  }
}

// 获取书籍格式图标
const getFormatIcon = (format) => {
  switch (format) {
    case 'txt':
      return Files
    case 'epub':
      return Document
    case 'mobi':
      return Document
    case 'online':
      return Link
    default:
      return Files
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 组件挂载时加载数据
onMounted(() => {
  loadBooks()
})
</script>

<style scoped>
.reader-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color-page);
  overflow: hidden;
}

.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%);
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  height: 56px;
  z-index: 100;
}

[data-theme='dark'] .reader-header {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.98) 0%, rgba(17, 24, 39, 0.98) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-icon {
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
  padding: 0 16px;
}

.header-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  transition: all 0.2s ease;
  color: var(--el-text-color-regular);
}

.header-btn:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.06);
  transform: scale(1.05);
  color: var(--el-color-primary);
}

[data-theme='dark'] .header-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.header-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-btn.font-btn {
  min-width: 60px;
  width: auto;
  padding: 0 8px;
  font-size: 12px;
}

.header-back-btn,
.header-settings-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  transition: all 0.2s;
}

.header-back-btn:hover,
.header-settings-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
  transform: scale(1.05);
}

[data-theme='dark'] .header-back-btn:hover,
[data-theme='dark'] .header-settings-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
}

.reader-main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.book-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.book-list-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.book-grid-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.book-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  min-height: 100px;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.book-card:hover .book-actions {
  opacity: 1;
}

.add-book-card {
  border: 2px dashed var(--el-border-color);
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

.add-book-card:hover {
  border-color: var(--el-color-primary);
}

.add-book-text {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.book-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

.book-format {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.book-info {
  flex: 1;
}

.book-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.book-author {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.reader-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-view :deep(.reader-container) {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  transform: none !important;
  max-width: 100% !important;
  margin: 0 !important;
}

@media (max-width: 768px) {
  .reader-main {
    padding: 12px;
  }

  .book-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .book-card {
    padding: 10px;
    min-height: 90px;
  }
}
</style>

<style>
.book-import-dialog .el-dialog__body {
  padding: 20px 24px;
  overflow: hidden;
}

.book-import-dialog .el-dialog__header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.book-import-dialog .el-dialog__footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>

