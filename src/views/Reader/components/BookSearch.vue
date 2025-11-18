<template>
  <div class="book-search-container">
    <el-input
      v-model="keyword"
      placeholder="搜索书籍内容"
      clearable
      @keyup.enter="handleSearch"
      @clear="handleClear"
    >
      <template #append>
        <el-button
          :loading="searching"
          @click="handleSearch"
        >
          搜索
        </el-button>
      </template>
    </el-input>

    <el-divider>
      <span>搜索结果</span>
    </el-divider>

    <div v-if="searching" class="loading-container">
      <el-icon class="is-loading" :size="24">
        <Loading />
      </el-icon>
      <p>正在搜索...</p>
    </div>

    <div v-else-if="localResults.length > 0" class="results-container">
      <p class="result-count">找到 {{ localResults.length }} 个匹配结果</p>

      <el-scrollbar height="60vh">
        <div class="result-list">
          <div
            v-for="result in localResults"
            :key="result.position"
            class="result-item"
            @click="handleResultClick(result.position)"
          >
            <div v-if="result.chapterTitle" class="chapter-title">
              <strong>{{ result.chapterTitle }}</strong>
            </div>
            <div class="result-text" v-html="formatResultText(result.text)"></div>
            <div class="result-position">
              <span>位置: {{ result.position }}</span>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <el-empty
      v-else-if="keyword"
      description="没有找到匹配的内容"
      :image-size="80"
    />

    <el-empty
      v-else
      description="请输入关键词进行搜索"
      :image-size="80"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  onSearch: {
    type: Function,
    required: true
  },
  onSearchResultSelect: {
    type: Function,
    required: true
  },
  results: {
    type: Array,
    default: () => []
  }
})

// 状态
const keyword = ref('')
const searching = ref(false)
const localResults = ref([])

// 处理搜索
const handleSearch = () => {
  if (!keyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true

  // 调用父组件的搜索方法
  props.onSearch(keyword.value)

  // 模拟搜索过程
  setTimeout(() => {
    // 生成模拟的搜索结果
    const mockResults = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => {
      const position = Math.floor(Math.random() * 10000)
      const prefix = '...'
      const highlight = keyword.value
      const suffix = '...'

      let text = `${prefix}${highlight}${suffix}`
      if (i % 3 === 0) {
        text = `${prefix}这是一段包含"${highlight}"的示例文本，用于展示搜索结果的上下文。${suffix}`
      } else if (i % 3 === 1) {
        text = `${prefix}这个${highlight}出现在了一个句子中间的位置，周围有一些上下文。${suffix}`
      } else {
        text = `${prefix}搜索示例，${highlight}可能出现在句子的结尾${suffix}`
      }

      return {
        position,
        text,
        chapterIndex: Math.floor(position / 1000),
        chapterTitle: `第${Math.floor(position / 1000) + 1}章`
      }
    })

    localResults.value = mockResults
    searching.value = false
  }, 1500)
}

// 处理清空
const handleClear = () => {
  keyword.value = ''
  localResults.value = []
}

// 格式化搜索结果，高亮关键词
const formatResultText = (text) => {
  if (!keyword.value || !text) return text

  const regex = new RegExp(`(${keyword.value})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (part.toLowerCase() === keyword.value.toLowerCase()) {
      return `<mark>${part}</mark>`
    }
    return part
  }).join('')
}

// 处理结果点击
const handleResultClick = (position) => {
  props.onSearchResultSelect(position)
}
</script>

<style scoped>
.book-search-container {
  padding: 8px 0;
}

.loading-container {
  text-align: center;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
}

.loading-container p {
  margin: 0;
  font-size: 14px;
}

.results-container {
  margin-top: 16px;
}

.result-count {
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
}

.result-list {
  padding: 8px 0;
}

.result-item {
  cursor: pointer;
  padding: 12px;
  border-radius: 4px;
  transition: all 0.3s;
  margin-bottom: 8px;
  background: #fafafa;
  border: 1px solid transparent;
}

.result-item:hover {
  background-color: #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  border-color: #e0e0e0;
}

.chapter-title {
  margin-bottom: 4px;
  color: #333;
  font-size: 14px;
}

.result-text {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.result-text :deep(mark) {
  background-color: #fffbe6;
  color: #d48806;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 500;
}

.result-position {
  font-size: 12px;
  color: #999;
}

:deep(.el-divider__text) {
  font-size: 14px;
  color: #666;
}
</style>



