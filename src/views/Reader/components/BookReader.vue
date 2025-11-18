<template>
  <div
    ref="readerRef"
    :style="readerStyle"
    @mousedown="handleDragStart"
  >

    <!-- 加载状态 -->
    <div
      v-if="loading"
      :style="loadingStyle"
    >
      <el-icon class="is-loading" :size="24">
        <Loading />
      </el-icon>
      <p>正在加载章节内容...</p>
    </div>

    <!-- 内容区域 -->
    <div
      v-else
      ref="contentRef"
      :style="contentStyle"
      @click="handleMouseClick"
      @scroll="handleScroll"
      v-html="content"
    />

    <!-- 左右翻页按钮 -->
    <div :style="prevButtonStyle">
      <el-button
        :icon="ArrowLeft"
        circle
        :disabled="!book.chapters || book.chapters.length === 0 || currentChapterIndex <= 0 || loading"
        @click="goToPrevChapter"
      />
    </div>

    <div :style="nextButtonStyle">
      <el-button
        :icon="ArrowRight"
        circle
        :disabled="!book.chapters || book.chapters.length === 0 || currentChapterIndex >= (book.chapters.length - 1) || loading"
        @click="goToNextChapter"
      />
    </div>

    <!-- 调整大小的8个把手 -->
    <template v-if="!embedded">
      <!-- 东 - 右侧 -->
      <div
        :style="resizeHandleStyle('e')"
        @mousedown="(e) => handleResizeStart(e, 'e')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 西 - 左侧 -->
      <div
        :style="resizeHandleStyle('w')"
        @mousedown="(e) => handleResizeStart(e, 'w')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 南 - 底部 -->
      <div
        :style="resizeHandleStyle('s')"
        @mousedown="(e) => handleResizeStart(e, 's')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 北 - 顶部 -->
      <div
        :style="resizeHandleStyle('n')"
        @mousedown="(e) => handleResizeStart(e, 'n')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 东南 - 右下角 -->
      <div
        :style="resizeHandleStyle('se')"
        @mousedown="(e) => handleResizeStart(e, 'se')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 西南 - 左下角 -->
      <div
        :style="resizeHandleStyle('sw')"
        @mousedown="(e) => handleResizeStart(e, 'sw')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 东北 - 右上角 -->
      <div
        :style="resizeHandleStyle('ne')"
        @mousedown="(e) => handleResizeStart(e, 'ne')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />

      <!-- 西北 - 左上角 -->
      <div
        :style="resizeHandleStyle('nw')"
        @mousedown="(e) => handleResizeStart(e, 'nw')"
        @mouseenter="(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'"
        @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  Refresh,
  FullScreen,
  Edit,
  View,
  Loading
} from '@element-plus/icons-vue'
import axios from 'axios'

// 全局常量
const API_URLS = {
  CHAPTER_LIST: `/getChapterList`,
  BOOK_CONTENT: `/getBookContent`
}

// Props
const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    required: true
  },
  onProgressUpdate: {
    type: Function,
    required: true
  },
  onOpenChapterList: {
    type: Function,
    required: true
  },
  embedded: {
    type: Boolean,
    default: false
  }
})

// 响应式状态
const content = ref('')
const loading = ref(true)
const isReaderVisible = ref(true)
const isMovable = ref(true)
const currentChapterIndex = ref(props.book.lastReadChapter || 0)
const currentChapter = ref(null)
const localFontSize = ref(props.settings.fontSize)
const refreshDisabled = ref(false)
const lastApiCallTime = ref(0)
const refreshing = ref(false)
const localOpacity = ref(props.settings.opacity)
const readerWidth = ref(800)
const readerHeight = ref(600)
const readerPosition = reactive({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 })

// Refs
const readerRef = ref(null)
const contentRef = ref(null)
const loadingChapterIndexRef = ref(null)
const lastLoadingRef = ref({ time: 0, chapterIndex: 0 })
const chapterChangeDebounceRef = ref(null)
const mouseDownRef = ref(null)
const continuousPageTurnIntervalRef = ref(null)
const mouseMoveThrottleRef = ref(0)

// 计算属性
const readerStyle = computed(() => {
  if (props.embedded) {
    return {
      display: isReaderVisible.value ? 'block' : 'none',
      position: 'relative',
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      margin: '0',
      boxShadow: 'none',
      borderRadius: '0',
      overflow: 'hidden',
      transition: 'opacity 0.3s',
      opacity: localOpacity.value,
      backgroundColor: props.settings.backgroundColor,
      color: props.settings.fontColor,
      cursor: 'default',
      transform: 'none',
      zIndex: 1
    }
  }
  return {
    display: isReaderVisible.value ? 'block' : 'none',
    position: 'fixed',
    width: `${readerWidth.value}px`,
    height: `${readerHeight.value}px`,
    maxWidth: '100%',
    margin: '0',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'opacity 0.3s',
    opacity: localOpacity.value,
    backgroundColor: props.settings.backgroundColor,
    color: props.settings.fontColor,
    cursor: isMovable.value ? 'grab' : 'default',
    transform: `translate(${readerPosition.x}px, ${readerPosition.y}px)`,
    zIndex: 1000
  }
})


const loadingStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  padding: '24px',
  backgroundColor: props.settings.backgroundColor,
  opacity: 0.5,
  transition: 'opacity 0.2s ease-in-out',
  flexDirection: 'column',
  gap: '12px'
}))

const contentStyle = computed(() => ({
  height: '100%',
  overflow: 'auto',
  padding: '24px',
  paddingBottom: '24px',
  fontSize: `${localFontSize.value}px`,
  lineHeight: '1.5',
  letterSpacing: '0px',
  fontFamily: props.settings.fontFamily,
  color: props.settings.fontColor,
  backgroundColor: props.settings.backgroundColor,
  wordWrap: 'break-word',
  textAlign: 'justify',
  whiteSpace: 'pre-wrap',
  userSelect: 'none',
  scrollBehavior: 'smooth',
  opacity: loading.value ? 0.5 : 1,
  transition: 'opacity 0.2s ease-in-out'
}))

const prevButtonStyle = computed(() => ({
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  opacity: 0,
  transition: 'opacity 0.3s',
  zIndex: 5,
  pointerEvents: 'none'
}))

const nextButtonStyle = computed(() => ({
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
  opacity: 0,
  transition: 'opacity 0.3s',
  zIndex: 5,
  pointerEvents: 'none'
}))

const resizeHandleStyle = (direction) => {
  const baseStyle = {
    position: 'absolute',
    zIndex: 10,
    transition: 'background 0.3s',
    background: 'transparent'
  }

  const styles = {
    e: {
      ...baseStyle,
      right: 0,
      top: '50%',
      width: '16px',
      height: '100px',
      marginTop: '-50px',
      cursor: 'ew-resize',
      borderRadius: '3px 0 0 3px'
    },
    w: {
      ...baseStyle,
      left: 0,
      top: '50%',
      width: '16px',
      height: '100px',
      marginTop: '-50px',
      cursor: 'ew-resize',
      borderRadius: '0 3px 3px 0'
    },
    s: {
      ...baseStyle,
      bottom: 0,
      left: '50%',
      width: '100px',
      height: '16px',
      marginLeft: '-50px',
      cursor: 'ns-resize',
      borderRadius: '3px 3px 0 0'
    },
    n: {
      ...baseStyle,
      top: 0,
      left: '50%',
      width: '100px',
      height: '16px',
      marginLeft: '-50px',
      cursor: 'ns-resize',
      borderRadius: '0 0 3px 3px'
    },
    se: {
      ...baseStyle,
      right: 0,
      bottom: 0,
      width: '24px',
      height: '24px',
      cursor: 'nwse-resize',
      borderRadius: '0 0 8px 0'
    },
    sw: {
      ...baseStyle,
      left: 0,
      bottom: 0,
      width: '24px',
      height: '24px',
      cursor: 'nesw-resize',
      borderRadius: '0 0 0 8px'
    },
    ne: {
      ...baseStyle,
      right: 0,
      top: 0,
      width: '24px',
      height: '24px',
      cursor: 'nesw-resize',
      borderRadius: '0 8px 0 0'
    },
    nw: {
      ...baseStyle,
      left: 0,
      top: 0,
      width: '24px',
      height: '24px',
      cursor: 'nwse-resize',
      borderRadius: '8px 0 0 0'
    }
  }

  return styles[direction] || baseStyle
}

// 尺寸预设
const sizePresets = [
  { name: '小', width: 600, height: 500 },
  { name: '中', width: 800, height: 600 },
  { name: '大', width: 1000, height: 700 },
  { name: '全屏', width: window.innerWidth - 40, height: window.innerHeight - 40 }
]

// 字体选项
const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' }
]

// 方法
const saveReaderSettings = () => {
  const settings = {
    width: readerWidth.value,
    height: readerHeight.value,
    position: readerPosition
  }
  localStorage.setItem(`fish-reader-window-settings`, JSON.stringify(settings))
}

const resetReaderPosition = () => {
  if (readerRef.value) {
    const centerX = Math.max(0, (window.innerWidth - readerWidth.value) / 2)
    const centerY = Math.max(0, (window.innerHeight - readerHeight.value) / 2)
    readerPosition.x = centerX
    readerPosition.y = centerY
    if (readerRef.value) {
      readerRef.value.style.transform = `translate(${centerX}px, ${centerY}px)`
    }
  }
}

const applyPresetSize = (width, height) => {
  readerWidth.value = width
  readerHeight.value = height
  if (readerRef.value) {
    const centerX = Math.max(0, (window.innerWidth - width) / 2)
    const centerY = Math.max(0, (window.innerHeight - height) / 2)
    readerPosition.x = centerX
    readerPosition.y = centerY
    readerRef.value.style.transform = `translate(${centerX}px, ${centerY}px)`
    setTimeout(() => saveReaderSettings(), 100)
  }
}

const getCurrentFontName = (fontFamily) => {
  const font = fontOptions.find(option => option.value === fontFamily)
  return font ? font.label : '黑体'
}

const handleFontSizeChange = (value) => {
  localFontSize.value = value
  if (contentRef.value) {
    contentRef.value.style.fontSize = `${value}px`
  }
}

const handleFontFamilyChange = (fontValue) => {
  const updatedSettings = {
    ...props.settings,
    fontFamily: fontValue
  }
  localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings))
  if (contentRef.value) {
    contentRef.value.style.fontFamily = fontValue
  }
}

const toggleMovable = () => {
  const newValue = !isMovable.value
  isMovable.value = newValue
  const updatedSettings = {
    ...props.settings,
    allowWindowMove: newValue
  }
  localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings))
}

// 加载在线章节列表
const loadOnlineChapters = async (book, refresh = false) => {
  if (!book || !book.source || !book.sourceInfo || !book.sourceInfo.url) {
    console.error('书籍信息不完整，无法加载章节列表')
    ElMessage.error('书籍信息不完整，无法加载章节列表')
    return []
  }

  try {
    const timestamp = new Date().getTime()
    const accessToken = props.settings.accessToken || 'congg:7e0efee65786976202e4fc20c6a98d89'
    const apiBaseUrl = props.settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3'
    const apiUrl = `${apiBaseUrl}${API_URLS.CHAPTER_LIST}?accessToken=${accessToken}&v=${timestamp}`

    const response = await axios.post(apiUrl, {
      url: book.url || book.sourceInfo.url,
      refresh: refresh ? 1 : 0,
      bookSourceUrl: book.sourceInfo.url
    })

    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const chapters = response.data.data
      if (chapters.length > 0) {
        book.chapters = chapters
        const updatedBook = { ...book, chapters }
        updateBookInStorage(updatedBook)
        return chapters
      } else {
        console.warn('获取到空章节列表')
        ElMessage.warning('获取到空章节列表，请检查书籍信息或稍后重试')
        return []
      }
    } else {
      console.error('章节列表数据格式不正确', response.data)
      ElMessage.error('章节列表数据格式不正确，请稍后重试')
      return []
    }
  } catch (error) {
    console.error('加载章节列表失败:', error)
    ElMessage.error('加载章节列表失败，请检查网络连接或稍后重试')
    return []
  }
}

// 加载在线章节内容
const loadOnlineChapterContent = async (book, chapter) => {
  if (!book || !book.source || !chapter || !chapter.url) {
    console.error('书籍或章节信息不完整，无法加载内容')
    ElMessage.error('书籍或章节信息不完整，无法加载内容')
    return ''
  }

  try {
    const timestamp = new Date().getTime()
    const accessToken = props.settings.accessToken || 'congg:7e0efee65786976202e4fc20c6a98d89'
    const apiBaseUrl = props.settings.apiBaseUrl || 'https://reader.yucoder.cn/reader3'
    const apiUrl = `${apiBaseUrl}${API_URLS.BOOK_CONTENT}?accessToken=${accessToken}&v=${timestamp}`

    const response = await axios.post(apiUrl, {
      url: book.url,
      index: chapter.index
    })

    if (response.data && response.data.data) {
      const content = response.data.data || ''
      if (!book.chapters) {
        book.chapters = []
      }
      updateChapterContent(chapter.index, content)
      if (book.chapters) {
        const chapterToUpdate = book.chapters.find(c => c.index === chapter.index)
        if (chapterToUpdate) {
          chapterToUpdate.content = content
        }
      }
      return content
    } else {
      console.error('章节内容数据格式不正确', response.data)
      ElMessage.error('章节内容数据格式不正确，请稍后重试')
      return ''
    }
  } catch (error) {
    console.error('加载章节内容失败', error)
    ElMessage.error('加载章节内容失败，请检查网络连接或稍后重试')
    return ''
  }
}

// 更新本地存储中的书籍信息
const updateBookInStorage = (updatedBook) => {
  try {
    const savedBooks = localStorage.getItem("fish-reader-books")
    let books = []

    if (savedBooks) {
      books = JSON.parse(savedBooks)
      const existingBookIndex = books.findIndex((b) => b.id === updatedBook.id)

      if (existingBookIndex >= 0) {
        books[existingBookIndex] = updatedBook
      } else {
        books.push(updatedBook)
      }
    } else {
      books = [updatedBook]
    }

    localStorage.setItem("fish-reader-books", JSON.stringify(books))
  } catch (error) {
    console.error('更新本地存储失败:', error)
  }
}

// 更新章节内容
const updateChapterContent = (chapterIndex, chapterContent) => {
  try {
    if (!props.book.chapters) {
      props.book.chapters = []
    }

    if (props.book.chapters.length === 0) {
      console.error('章节列表为空，无法更新章节内容')
      return
    }

    const updatedChapters = props.book.chapters.map(chapter => {
      if (chapter.index === chapterIndex) {
        return { ...chapter, content: chapterContent }
      }
      return chapter
    })

    props.book.chapters = updatedChapters
    props.book.lastReadChapter = chapterIndex

    const updatedBook = {
      ...props.book,
      chapters: updatedChapters,
      lastReadChapter: chapterIndex
    }

    if (currentChapter.value && currentChapter.value.index === chapterIndex) {
      currentChapter.value = { ...currentChapter.value, content: chapterContent }
    }

    updateBookInStorage(updatedBook)
    props.onProgressUpdate(0, chapterIndex)
  } catch (error) {
    console.error('更新章节内容失败:', error)
  }
}

// 加载书籍内容
const loadContent = async () => {
  console.log('[BookReader] loadContent 开始', {
    loadingChapterIndexRef: loadingChapterIndexRef.value,
    currentChapterIndex: currentChapterIndex.value,
    bookId: props.book.id,
    bookTitle: props.book.title,
    hasChapters: !!props.book.chapters,
    chaptersLength: props.book.chapters?.length || 0,
    bookSource: props.book.source,
    bookUrl: props.book.url
  })

  if (loadingChapterIndexRef.value === currentChapterIndex.value) {
    console.log('[BookReader] loadContent 跳过：正在加载相同章节', {
      loadingChapterIndexRef: loadingChapterIndexRef.value,
      currentChapterIndex: currentChapterIndex.value
    })
    return
  }

  const currentLoadingTime = Date.now()
  const currentLoadingChapterIndex = currentChapterIndex.value

  lastLoadingRef.value = { time: currentLoadingTime, chapterIndex: currentLoadingChapterIndex }
  loadingChapterIndexRef.value = currentChapterIndex.value

  loading.value = true
  console.log('[BookReader] loadContent 设置 loading = true', {
    currentChapterIndex: currentChapterIndex.value
  })

  try {
    await new Promise(resolve => setTimeout(resolve, 50))

    if (lastLoadingRef.value.time !== currentLoadingTime ||
      lastLoadingRef.value.chapterIndex !== currentLoadingChapterIndex) {
      console.log('[BookReader] loadContent 取消：加载被中断', {
        lastLoadingTime: lastLoadingRef.value.time,
        currentLoadingTime,
        lastLoadingChapterIndex: lastLoadingRef.value.chapterIndex,
        currentLoadingChapterIndex
      })
      return
    }

    if (props.book.chapters && props.book.chapters.length > 0) {
      console.log('[BookReader] loadContent 有章节列表', {
        chaptersLength: props.book.chapters.length,
        currentChapterIndex: currentChapterIndex.value
      })
      
      const chapter = props.book.chapters.find(c => c.index === currentChapterIndex.value)
      console.log('[BookReader] loadContent 查找章节结果', {
        found: !!chapter,
        chapterIndex: currentChapterIndex.value,
        chapter: chapter ? { index: chapter.index, title: chapter.title, hasContent: !!chapter.content } : null
      })

      if (chapter) {
        currentChapter.value = chapter

        if (chapter.content) {
          console.log('[BookReader] loadContent 使用章节缓存内容', {
            chapterIndex: currentChapterIndex.value,
            contentLength: chapter.content.length
          })
          content.value = chapter.content
          loading.value = false
          props.onProgressUpdate(0, currentChapterIndex.value)
        } else if (props.book.source === 'online' && props.book.url) {
          console.log('[BookReader] loadContent 在线书籍，章节无内容，尝试从缓存加载', {
            chapterIndex: currentChapterIndex.value
          })
          const savedBooks = localStorage.getItem("fish-reader-books")
          let cachedContent = ''

          if (savedBooks) {
            const books = JSON.parse(savedBooks)
            const savedBook = books.find((b) => b.id === props.book.id)
            console.log('[BookReader] loadContent 查找本地存储的书籍', {
              found: !!savedBook,
              savedBookChaptersLength: savedBook?.chapters?.length || 0
            })
            if (savedBook && savedBook.chapters) {
              const savedChapter = savedBook.chapters.find((c) => c.index === currentChapterIndex.value)
              console.log('[BookReader] loadContent 查找本地存储的章节', {
                found: !!savedChapter,
                hasContent: !!savedChapter?.content
              })
              if (savedChapter && savedChapter.content) {
                cachedContent = savedChapter.content
              }
            }
          }

          if (cachedContent) {
            console.log('[BookReader] loadContent 使用本地存储的缓存内容', {
              chapterIndex: currentChapterIndex.value,
              contentLength: cachedContent.length
            })
            content.value = cachedContent
            chapter.content = cachedContent
            loading.value = false
            props.onProgressUpdate(0, currentChapterIndex.value)
          } else {
            console.log('[BookReader] loadContent 无缓存，开始加载在线章节内容', {
              chapterIndex: currentChapterIndex.value,
              chapterUrl: chapter.url
            })
            const chapterContent = await loadOnlineChapterContent(props.book, chapter)
            if (chapterContent) {
              console.log('[BookReader] loadContent 在线章节内容加载成功', {
                chapterIndex: currentChapterIndex.value,
                contentLength: chapterContent.length
              })
              content.value = chapterContent
              updateChapterContent(currentChapterIndex.value, chapterContent)
              loading.value = false
              props.onProgressUpdate(0, currentChapterIndex.value)
            } else {
              console.error('[BookReader] loadContent 在线章节内容加载失败', {
                chapterIndex: currentChapterIndex.value
              })
              content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>'
              loading.value = false
              ElMessage.error('章节内容获取失败')
            }
          }
        } else {
          console.warn('[BookReader] loadContent 章节无内容且不是在线书籍', {
            chapterIndex: currentChapterIndex.value,
            bookSource: props.book.source,
            hasUrl: !!props.book.url
          })
          content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节无内容</p>'
          loading.value = false
        }
      } else {
        console.warn('[BookReader] loadContent 未找到章节', {
          chapterIndex: currentChapterIndex.value,
          chaptersLength: props.book.chapters?.length || 0
        })
        content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">未找到章节信息，请尝试刷新章节列表</p>'
        loading.value = false
        ElMessage.error('未找到章节信息')
      }
    } else if (props.book.source === 'online' && props.book.url) {
      console.log('[BookReader] loadContent 无章节列表，开始加载在线章节列表', {
        bookUrl: props.book.url
      })
      const chapters = await loadOnlineChapters(props.book)
      console.log('[BookReader] loadContent 章节列表加载完成', {
        chaptersLength: chapters?.length || 0
      })

      if (chapters && chapters.length > 0) {
        const updatedBook = { ...props.book, chapters }
        updateBookInStorage(updatedBook)

        const firstChapter = chapters[0]
        currentChapter.value = firstChapter

        if (currentChapterIndex.value > 0 && currentChapterIndex.value <= chapters.length) {
          console.log('[BookReader] loadContent 跳转到指定章节', {
            currentChapterIndex: currentChapterIndex.value,
            chaptersLength: chapters.length
          })
          const savedChapter = chapters.find((c) => c.index === currentChapterIndex.value)
          if (savedChapter) {
            currentChapter.value = savedChapter

            const savedBooks = localStorage.getItem("fish-reader-books")
            let cachedContent = ''

            if (savedBooks) {
              const books = JSON.parse(savedBooks)
              const savedBook = books.find((b) => b.id === props.book.id)
              if (savedBook && savedBook.chapters) {
                const savedChapter = savedBook.chapters.find((c) => c.index === currentChapterIndex.value)
                if (savedChapter && savedChapter.content) {
                  cachedContent = savedChapter.content
                }
              }
            }

            if (cachedContent) {
              console.log('[BookReader] loadContent 使用指定章节的缓存内容', {
                chapterIndex: currentChapterIndex.value
              })
              content.value = cachedContent
              loading.value = false
              props.onProgressUpdate(0, currentChapterIndex.value)
            } else {
              console.log('[BookReader] loadContent 加载指定章节的在线内容', {
                chapterIndex: currentChapterIndex.value
              })
              const chapterContent = await loadOnlineChapterContent(props.book, savedChapter)
              if (chapterContent) {
                content.value = chapterContent
                updateChapterContent(currentChapterIndex.value, chapterContent)
                loading.value = false
                props.onProgressUpdate(0, currentChapterIndex.value)
              } else {
                content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>'
                loading.value = false
                ElMessage.error('章节内容获取失败')
              }
            }
            return
          }
        }

        console.log('[BookReader] loadContent 加载第一章内容', {
          firstChapterIndex: firstChapter.index
        })
        const chapterContent = await loadOnlineChapterContent(props.book, firstChapter)
        if (chapterContent) {
          console.log('[BookReader] loadContent 第一章内容加载成功', {
            chapterIndex: firstChapter.index,
            contentLength: chapterContent.length
          })
          content.value = chapterContent
          updateChapterContent(firstChapter.index, chapterContent)
          currentChapterIndex.value = firstChapter.index
          loading.value = false
          props.onProgressUpdate(0, firstChapter.index)
        } else {
          console.error('[BookReader] loadContent 第一章内容加载失败')
          content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新或者重新进入阅读</p>'
          loading.value = false
          ElMessage.error('章节内容获取失败')
        }
      } else {
        console.error('[BookReader] loadContent 章节列表加载失败或为空', {
          chaptersLength: chapters?.length || 0
        })
        content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节列表加载失败，请尝试刷新或重新进入</p>'
        loading.value = false
        ElMessage.error('章节列表加载失败')
      }
    } else {
      console.error('[BookReader] loadContent 书籍信息不完整', {
        bookSource: props.book.source,
        hasUrl: !!props.book.url,
        hasChapters: !!props.book.chapters,
        chaptersLength: props.book.chapters?.length || 0
      })
      content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">书籍内容加载失败，请检查书籍信息是否完整</p>'
      loading.value = false
      ElMessage.error('书籍内容加载失败')
    }
  } catch (error) {
    console.error('[BookReader] loadContent 异常', error)
    console.error('[BookReader] loadContent 异常堆栈', error.stack)
    content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载失败，请稍后重试</p>'
    loading.value = false
    ElMessage.error('加载章节内容失败，请重试')
  } finally {
    console.log('[BookReader] loadContent 结束', {
      loading: loading.value,
      hasContent: !!content.value,
      contentLength: content.value?.length || 0
    })
  }
}

// 拖动处理
const handleDragStart = (e) => {
  if (props.embedded || !isMovable.value) return

  const startX = e.clientX
  const startY = e.clientY
  const initialX = readerPosition.x
  const initialY = readerPosition.y
  let newX = initialX
  let newY = initialY
  let rafId = null

  const applyDrag = () => {
    if (readerRef.value) {
      readerRef.value.style.transform = `translate(${newX}px, ${newY}px)`
    }
  }

  const handleDragMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY

    newX = initialX + dx
    newY = initialY + dy

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(applyDrag)
  }

  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.body.style.cursor = ''

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    readerPosition.x = newX
    readerPosition.y = newY
    saveReaderSettings()
  }

  document.body.style.cursor = 'grabbing'
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)

  e.preventDefault()
  e.stopPropagation()
}

// 调整大小处理
const handleResizeStart = (e, direction) => {
  if (props.embedded || !isMovable.value) return

  const startX = e.clientX
  const startY = e.clientY
  const initialWidth = readerWidth.value
  const initialHeight = readerHeight.value
  const initialX = readerPosition.x
  const initialY = readerPosition.y
  let newWidth = initialWidth
  let newHeight = initialHeight
  let newX = initialX
  let newY = initialY
  let rafId = null

  const applyResize = () => {
    if (readerRef.value) {
      readerRef.value.style.width = `${newWidth}px`
      readerRef.value.style.height = `${newHeight}px`
      readerRef.value.style.transform = `translate(${newX}px, ${newY}px)`
    }
  }

  const handleResizeMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY

    if (direction.includes('e')) {
      newWidth = Math.max(200, initialWidth + dx)
    }
    if (direction.includes('w')) {
      const widthChange = initialWidth - Math.max(200, initialWidth - dx)
      newWidth = Math.max(200, initialWidth - dx)
      newX = initialX + widthChange
    }
    if (direction.includes('s')) {
      newHeight = Math.max(150, initialHeight + dy)
    }
    if (direction.includes('n')) {
      const heightChange = initialHeight - Math.max(150, initialHeight - dy)
      newHeight = Math.max(150, initialHeight - dy)
      newY = initialY + heightChange
    }

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(applyResize)
  }

  const handleResizeEnd = () => {
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = ''

    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    readerWidth.value = newWidth
    readerHeight.value = newHeight
    readerPosition.x = newX
    readerPosition.y = newY
    saveReaderSettings()
  }

  let cursor = 'default'
  if (direction === 'e' || direction === 'w') cursor = 'ew-resize'
  else if (direction === 'n' || direction === 's') cursor = 'ns-resize'
  else if (direction === 'ne' || direction === 'sw') cursor = 'nesw-resize'
  else if (direction === 'nw' || direction === 'se') cursor = 'nwse-resize'

  document.body.style.cursor = cursor
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)

  e.preventDefault()
  e.stopPropagation()
}

// 滚动处理
const handleScroll = () => {
  // 可以在这里添加滚动进度跟踪
}

// 切换到前一章
const goToPrevChapter = () => {
  if (!props.book.chapters || props.book.chapters.length === 0 || loading.value) {
    return
  }

  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime.value
  if (timeSinceLastCall < 800) {
    return
  }

  if (chapterChangeDebounceRef.value) {
    clearTimeout(chapterChangeDebounceRef.value)
  }

  chapterChangeDebounceRef.value = setTimeout(() => {
    const prevChapterIndex = currentChapterIndex.value - 1
    if (prevChapterIndex >= 0) {
      lastApiCallTime.value = now
      currentChapterIndex.value = prevChapterIndex

      if (props.book.chapters) {
        const prevChapter = props.book.chapters.find(c => c.index === prevChapterIndex)
        if (prevChapter) {
          currentChapter.value = prevChapter

          if (prevChapter.content) {
            content.value = prevChapter.content
            props.onProgressUpdate(0, prevChapterIndex)
          } else {
            loadOnlineChapterContent(props.book, prevChapter).then(chapterContent => {
              if (chapterContent) {
                content.value = chapterContent
                updateChapterContent(prevChapterIndex, chapterContent)
                props.onProgressUpdate(0, prevChapterIndex)
              } else {
                console.error('获取上一章内容失败')
                content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新</p>'
              }
            }).catch(error => {
              console.error('加载上一章内容出错:', error)
              content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载章节内容出错，请重试</p>'
            })
          }
        } else {
          console.error(`未找到上一章节，索引: ${prevChapterIndex}`)
        }
      }

      if (contentRef.value) {
        contentRef.value.scrollTop = 0
      }
    } else {
      ElMessage.info('已经是第一章了')
    }

    chapterChangeDebounceRef.value = null
  }, 50)
}

// 切换到下一章
const goToNextChapter = () => {
  if (!props.book.chapters || props.book.chapters.length === 0 || loading.value) {
    return
  }

  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime.value
  if (timeSinceLastCall < 800) {
    return
  }

  if (chapterChangeDebounceRef.value) {
    clearTimeout(chapterChangeDebounceRef.value)
  }

  chapterChangeDebounceRef.value = setTimeout(() => {
    const nextChapterIndex = currentChapterIndex.value + 1
    if (props.book.chapters && nextChapterIndex < props.book.chapters.length) {
      lastApiCallTime.value = now
      currentChapterIndex.value = nextChapterIndex

      const nextChapter = props.book.chapters.find(c => c.index === nextChapterIndex)
      if (nextChapter) {
        currentChapter.value = nextChapter

        if (nextChapter.content) {
          content.value = nextChapter.content
          props.onProgressUpdate(0, nextChapterIndex)
        } else {
          loadOnlineChapterContent(props.book, nextChapter).then(chapterContent => {
            if (chapterContent) {
              content.value = chapterContent
              updateChapterContent(nextChapterIndex, chapterContent)
              props.onProgressUpdate(0, nextChapterIndex)
            } else {
              console.error('获取下一章内容失败')
              content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">章节内容获取失败，请尝试刷新</p>'
            }
          }).catch(error => {
            console.error('加载下一章内容出错:', error)
            content.value = '<p style="color: #ff4d4f; text-align: center; padding: 20px;">加载章节内容出错，请重试</p>'
          })
        }
      } else {
        console.error(`未找到下一章节，索引: ${nextChapterIndex}`)
      }

      if (contentRef.value) {
        contentRef.value.scrollTop = 0
      }
    } else {
      ElMessage.info('已经是最后一章了')
    }

    chapterChangeDebounceRef.value = null
  }, 50)
}

// 刷新当前章节内容
const refreshCurrentChapter = async () => {
  if (!currentChapter.value) {
    console.error('没有当前章节，无法刷新')
    ElMessage.error('没有当前章节，无法刷新')
    return
  }

  refreshing.value = true
  loading.value = true

  try {
    const freshContent = await loadOnlineChapterContent(props.book, currentChapter.value)

    if (freshContent) {
      ElMessage.success('章节内容已刷新')
      content.value = freshContent
    } else {
      ElMessage.error('刷新章节内容失败，请稍后重试')
    }
  } catch (error) {
    console.error('刷新章节内容时出错:', error)
    ElMessage.error('刷新章节内容时出错，请稍后重试')
  } finally {
    refreshing.value = false
    loading.value = false
  }
}

// 鼠标点击处理
const handleMouseClick = (e) => {
  if (document.body.style.cursor === 'grabbing') {
    return
  }
  // 工具栏已移除，不再处理点击事件
}

// 生命周期
onMounted(() => {
  console.log('[BookReader] onMounted 开始', {
    bookId: props.book.id,
    bookTitle: props.book.title,
    lastReadChapter: props.book.lastReadChapter,
    hasChapters: !!props.book.chapters,
    chaptersLength: props.book.chapters?.length || 0,
    embedded: props.embedded,
    bookSource: props.book.source,
    bookUrl: props.book.url
  })

  // 重置加载状态
  loadingChapterIndexRef.value = null
  lastLoadingRef.value = { time: 0, chapterIndex: 0 }

  // 设置章节索引
  currentChapterIndex.value = props.book.lastReadChapter || 0
  console.log('[BookReader] onMounted 设置章节索引', {
    currentChapterIndex: currentChapterIndex.value,
    lastReadChapter: props.book.lastReadChapter
  })

  // 检查书籍章节列表状态
  if (props.book.chapters && props.book.chapters.length > 0) {
    const currentChapterIdx = currentChapterIndex.value || props.book.lastReadChapter || 0
    const chapter = props.book.chapters.find(c => c.index === currentChapterIdx)
    console.log('[BookReader] onMounted 查找章节', {
      currentChapterIdx,
      found: !!chapter,
      chapter: chapter ? { index: chapter.index, title: chapter.title, hasContent: !!chapter.content } : null
    })

    if (chapter) {
      currentChapter.value = chapter
    } else {
      currentChapter.value = props.book.chapters[0]
      console.log('[BookReader] onMounted 使用第一章', {
        firstChapter: { index: props.book.chapters[0].index, title: props.book.chapters[0].title }
      })
    }
  } else {
    currentChapter.value = null
    console.log('[BookReader] onMounted 无章节列表')
  }

  // 尝试从本地存储加载阅读器位置和大小（仅非内嵌模式）
  if (!props.embedded) {
    const savedReaderSettings = localStorage.getItem(`fish-reader-window-settings`)
    if (savedReaderSettings) {
      try {
        const { width, height, position } = JSON.parse(savedReaderSettings)
        if (width && height && position) {
          const safeX = Math.min(Math.max(0, position.x), window.innerWidth - width)
          const safeY = Math.min(Math.max(0, position.y), window.innerHeight - height)

          readerWidth.value = width
          readerHeight.value = height
          readerPosition.x = safeX
          readerPosition.y = safeY

          if (readerRef.value) {
            readerRef.value.style.width = `${width}px`
            readerRef.value.style.height = `${height}px`
            readerRef.value.style.transform = `translate(${safeX}px, ${safeY}px)`
          }
        }
      } catch (error) {
        console.error('解析保存的阅读器设置失败:', error)
      }
    } else {
      // 如果没有保存的设置，初始化阅读器位置到屏幕中央
      const centerX = Math.max(0, (window.innerWidth - readerWidth.value) / 2)
      const centerY = Math.max(0, (window.innerHeight - readerHeight.value) / 2)
      readerPosition.x = centerX
      readerPosition.y = centerY

      if (readerRef.value) {
        readerRef.value.style.transform = `translate(${centerX}px, ${centerY}px)`
      }
    }
  }

  // 延迟加载内容
  console.log('[BookReader] onMounted 准备延迟加载内容', {
    delay: 150
  })
  setTimeout(() => {
    console.log('[BookReader] onMounted 开始调用 loadContent')
    loadContent()
  }, 150)

  // 窗口调整大小处理
  const handleResize = () => {
    if (readerWidth.value > window.innerWidth - 100) {
      readerWidth.value = window.innerWidth - 40
    }
    if (readerHeight.value > window.innerHeight - 100) {
      readerHeight.value = window.innerHeight - 40
    }

    if (readerRef.value) {
      const rect = readerRef.value.getBoundingClientRect()
      if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
        const newLeft = Math.min(readerPosition.x, window.innerWidth - readerWidth.value)
        const newTop = Math.min(readerPosition.y, window.innerHeight - readerHeight.value)
        readerPosition.x = newLeft
        readerPosition.y = newTop
        readerRef.value.style.transform = `translate(${newLeft}px, ${newTop}px)`
      }
    }
  }

  window.addEventListener('resize', handleResize)

  // 键盘事件处理
  const handleKeyDown = (e) => {
    if (e.code === props.settings.prevPageKey) {
      goToPrevChapter()
    } else if (e.code === props.settings.nextPageKey) {
      goToNextChapter()
    }

    if (props.settings.quickHide === 'key' && e.code === 'Escape') {
      isReaderVisible.value = false
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  // 返回清理函数
  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  loadingChapterIndexRef.value = null
  if (chapterChangeDebounceRef.value) {
    clearTimeout(chapterChangeDebounceRef.value)
  }
  if (continuousPageTurnIntervalRef.value) {
    clearInterval(continuousPageTurnIntervalRef.value)
  }
  // 注意: resize 和 keydown 事件监听器的清理在 onMounted 的返回函数中处理
})

// 监听 book.lastReadChapter 的变化
watch(() => props.book.lastReadChapter, (newVal) => {
  if (newVal !== undefined && newVal !== currentChapterIndex.value) {
    currentChapterIndex.value = newVal

    if (props.book.chapters && props.book.chapters.length > 0) {
      const chapter = props.book.chapters.find(c => c.index === newVal)
      if (chapter) {
        currentChapter.value = chapter

        if (chapter.content) {
          loading.value = false
          content.value = chapter.content
        } else {
          if (contentRef.value) {
            contentRef.value.scrollTop = 0
          }
        }
      }
    }
  }
})

// 监听 currentChapterIndex 的变化
watch(currentChapterIndex, (newVal, oldVal) => {
  console.log('[BookReader] watch currentChapterIndex 变化', {
    oldVal,
    newVal
  })
  setTimeout(() => {
    console.log('[BookReader] watch currentChapterIndex 触发 loadContent')
    loadContent()
  }, 150)
})

// 监听 settings 的变化
watch(() => props.settings, () => {
  if (contentRef.value) {
    contentRef.value.style.color = props.settings.fontColor
    contentRef.value.style.backgroundColor = props.settings.backgroundColor
    contentRef.value.style.fontSize = `${localFontSize.value}px`
    contentRef.value.style.fontFamily = props.settings.fontFamily
  }

  localOpacity.value = props.settings.opacity
  isMovable.value = props.settings.allowWindowMove
}, { deep: true })

// 监听本地字体大小和透明度的变化
watch([localFontSize, localOpacity], ([newFontSize, newOpacity]) => {
  const updatedSettings = {
    ...props.settings,
    fontSize: newFontSize,
    opacity: newOpacity
  }
  localStorage.setItem("fish-reader-settings", JSON.stringify(updatedSettings))
}, { deep: false })

// 监听阅读器位置和大小变化
watch([() => readerWidth.value, () => readerHeight.value, () => readerPosition.x, () => readerPosition.y], () => {
  const timerId = setTimeout(() => {
    saveReaderSettings()
  }, 500)

  return () => clearTimeout(timerId)
})

// 初始化状态
watch([() => props.settings.fontSize, () => props.settings.opacity, () => props.settings.allowWindowMove], ([fontSize, opacity, allowWindowMove]) => {
  localFontSize.value = fontSize
  localOpacity.value = opacity
  isMovable.value = allowWindowMove
}, { immediate: true })

// 暴露方法和状态给父组件
defineExpose({
  currentChapter,
  currentChapterIndex,
  loading,
  refreshing,
  localFontSize,
  localOpacity,
  isMovable,
  goToPrevChapter,
  goToNextChapter,
  refreshCurrentChapter,
  handleFontSizeChange,
  handleFontFamilyChange,
  toggleMovable,
  getCurrentFontName,
  fontOptions
})
</script>

<style scoped>
</style>

