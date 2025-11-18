<template>
  <el-form
    ref="formRef"
    :model="localSettings"
    label-position="top"
  >
    <div style="margin-bottom: 24px; text-align: right">
      <el-button
        :icon="Refresh"
        @click="handleReset"
        style="margin-right: 8px"
      >
        恢复默认设置
      </el-button>
      <el-button type="primary" @click="handleSubmit">
        保存设置
      </el-button>
    </div>

    <el-divider>
      <span>外观设置</span>
    </el-divider>

    <el-form-item
      label="阅读窗口透明度"
      prop="opacity"
    >
      <el-tooltip content="值越小越透明" placement="top">
        <el-slider
          v-model="localSettings.opacity"
          :min="0"
          :max="1"
          :step="0.01"
          :marks="{
            0: '0',
            0.5: '0.5',
            1: '1'
          }"
        />
      </el-tooltip>
    </el-form-item>

    <el-form-item
      label="字体大小"
      prop="fontSize"
    >
      <el-slider
        v-model="localSettings.fontSize"
        :min="12"
        :max="30"
        :marks="{
          12: '12',
          16: '16',
          20: '20',
          24: '24',
          30: '30'
        }"
      />
    </el-form-item>

    <el-form-item
      label="字体"
      prop="fontFamily"
    >
      <el-select v-model="localSettings.fontFamily">
        <el-option
          v-for="option in fontOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>

    <el-divider>
      <span>按键设置</span>
    </el-divider>

    <el-form-item
      prop="prevPageKey"
    >
      <template #label>
        <span style="margin-right: 8px">上一页按键</span>
        <el-tooltip content="按下该键可快速翻到上一页" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <el-select v-model="localSettings.prevPageKey">
        <el-option
          v-for="option in keyOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item
      prop="nextPageKey"
    >
      <template #label>
        <span style="margin-right: 8px">下一页按键</span>
        <el-tooltip content="按下该键可快速翻到下一页" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <el-select v-model="localSettings.nextPageKey">
        <el-option
          v-for="option in keyOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>

    <el-divider>
      <span>其他设置</span>
    </el-divider>

    <el-form-item
      prop="panicKey"
    >
      <template #label>
        <span style="margin-right: 8px">紧急切换键</span>
        <el-tooltip content="按下该键可快速关闭阅读器并切换到工作模式，用于紧急情况" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <el-select v-model="localSettings.panicKey">
        <el-option
          v-for="option in keyOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item
      prop="quickHide"
    >
      <template #label>
        <span style="margin-right: 8px">快速隐藏阅读窗口</span>
        <el-tooltip content="设置触发条件，让阅读窗口快速隐藏，方便摸鱼时快速隐藏内容" placement="top">
          <el-icon><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <el-select v-model="localSettings.quickHide">
        <el-option
          v-for="option in hideOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>

  </el-form>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, QuestionFilled } from '@element-plus/icons-vue'

// 定义字体选项
const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: '楷体', value: 'KaiTi, serif' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

// 定义键盘按键选项
const keyOptions = [
  { label: '左方向键', value: 'ArrowLeft' },
  { label: '右方向键', value: 'ArrowRight' },
  { label: '上方向键', value: 'ArrowUp' },
  { label: '下方向键', value: 'ArrowDown' },
  { label: 'Page Up', value: 'PageUp' },
  { label: 'Page Down', value: 'PageDown' },
  { label: 'A', value: 'KeyA' },
  { label: 'D', value: 'KeyD' },
  { label: 'W', value: 'KeyW' },
  { label: 'S', value: 'KeyS' },
  { label: 'J', value: 'KeyJ' },
  { label: 'K', value: 'KeyK' },
  { label: 'Esc', value: 'Escape' },
  { label: '空格', value: 'Space' },
]

// 定义隐藏模式选项
const hideOptions = [
  { label: '鼠标移出', value: 'mouseOut' },
  { label: '按键', value: 'key' },
  { label: '无', value: 'none' },
]

// Props
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  onSave: {
    type: Function,
    required: true
  }
})

// 表单引用
const formRef = ref(null)

// 本地设置状态
const localSettings = reactive({ ...props.settings })

// 获取初始值
const getInitialValues = () => {
  // 优先从localStorage获取最新设置
  const savedSettings = localStorage.getItem("fish-reader-settings")
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings)
    } catch (e) {
      console.error('解析已保存的阅读器设置失败:', e)
    }
  }
  // 回退到props设置
  return props.settings
}

// 组件加载时从localStorage获取最新设置
onMounted(() => {
  const latestSettings = getInitialValues()
  // 更新本地状态
  Object.assign(localSettings, latestSettings)
  
  // 确保默认设置为none
  if (!localSettings.quickHide) {
    localSettings.quickHide = 'none'
  }
})

// 保存设置
const handleSubmit = () => {
  // 验证表单
  if (formRef.value) {
    formRef.value.validate((valid) => {
      if (valid) {
        const updatedSettings = { ...localSettings }
        props.onSave(updatedSettings)
        ElMessage.success('设置已保存')
      } else {
        ElMessage.error('请检查表单输入')
      }
    })
  } else {
    const updatedSettings = { ...localSettings }
    props.onSave(updatedSettings)
    ElMessage.success('设置已保存')
  }
}

// 重置设置
const handleReset = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(localSettings, props.settings)
  ElMessage.info('已恢复默认设置')
}

// 监听 localSettings 的变化，实时更新
watch(localSettings, () => {
  // 设置已通过 v-model 自动更新到 localSettings
  // 这里可以添加额外的处理逻辑
}, { deep: true })

// 监听 props.settings 的变化
watch(() => props.settings, (newSettings) => {
  Object.assign(localSettings, newSettings)
}, { deep: true })
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>

