<template>
  <div class="lottery-container">
    <!-- 顶部积分 -->
    <div class="currency-bar">
      <div class="currency-item">
        <span>💎</span>
        <span class="currency-value">{{ availablePoints }}</span>
      </div>
    </div>

    <div class="lottery-content">
      <!-- 左侧九宫格 -->
      <div class="left-section">
        <!-- 转盘TAB -->
        <div v-if="turntableList.length" class="tabs">
          <div
            v-for="item in turntableList"
            :key="item.id"
            :class="[
              'tab',
              activeTabKey === String(item.id) ? 'tab-active' : ''
            ]"
            @click="switchTab(item.id)"
          >
            <img v-if="item.icon" :src="item.icon" class="tab-icon" />
            <span>{{ item.name }}</span>
          </div>
        </div>

        <!-- 加载遮罩 -->
        <div v-if="turntableLoading" class="loading-mask">
          <div class="loading-spinner"></div>
        </div>

        <div class="grid-container" :class="{ 'blur': turntableLoading }">
          <!-- 九宫格 -->
          <div class="prize-grid">
            <div
              v-for="(prize, idx) in prizes"
              :key="prize.id"
              :class="[
                'prize-item',
                getQualityClass(prize.quality),
                activeIndex === idx ? 'prize-active' : ''
              ]"
            >
              <div class="prize-icon">
                <img
                  v-if="prize.icon && prize.icon.startsWith('http')"
                  :src="prize.icon"
                  :class="{ shine: prize.quality === 4 }"
                />
                <span v-else>{{ prize.icon }}</span>
              </div>
              <div class="prize-name">{{ prize.name }}</div>
              <div v-if="prize.qualityName" class="prize-quality">
                {{ prize.qualityName }}
              </div>
            </div>
          </div>

          <!-- 抽奖按钮 -->
          <div class="btn-group">
            <button
              :disabled="drawing || !currentTurntable"
              class="btn btn-single"
              @click="doDraw"
            >
              <span>单抽</span>
              <span>
                <span v-if="isDailyFirstFree" class="free">🎁 免费</span>
                <span v-else>💎 {{ currentTurntable?.costPoints || 0 }}</span>
              </span>
            </button>
            <button
              :disabled="drawing || !currentTurntable"
              class="btn btn-ten"
              @click="doTenDraw"
            >
              <span>十连抽</span>
              <span>💎 {{ (currentTurntable?.costPoints || 0) * 10 }}</span>
            </button>
          </div>
        </div>

        <!-- 保底进度条 -->
        <div
          v-if="currentTurntable?.guaranteeCount > 0"
          class="progress-group"
        >
          <span>保底进度</span>
          <div class="progress-bar">
            <div
              class="progress-inner"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <span>{{ currentTurntable.userProgress?.totalDrawCount || 0 }}/{{
            currentTurntable.guaranteeCount
          }}</span>
        </div>
        <div v-if="currentTurntable?.guaranteeCount > 0" class="progress-tip">
          * 抽奖 {{ currentTurntable.guaranteeCount }} 次必出传说
        </div>
      </div>

      <!-- 右侧记录 -->
      <div class="right-section">
        <div class="record-card">
          <div class="record-header">
            <div class="record-title">🏆 我的中奖记录</div>
            <div class="record-total">共 {{ recordsPagination.total }} 条</div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="lotteryRecords.length === 0"
            class="empty"
          >
            暂无中奖记录
          </div>

          <!-- 记录列表 -->
          <div v-else class="record-list">
            <div v-for="item in lotteryRecords" :key="item.id" class="record-item">
              <div class="record-icon">
                <img v-if="item.prizeIcon.startsWith('http')" :src="item.prizeIcon" />
                <span v-else>{{ item.prizeIcon }}</span>
              </div>
              <div class="record-text">
                恭喜我抽中：{{ item.prizeName }}
              </div>
            </div>
          </div>

          <!-- 分页（置底） -->
          <div
            v-if="recordsPagination.total > recordsPagination.pageSize"
            class="pagination"
          >
            <span
              @click="goPage(recordsPagination.current - 1)"
              :class="{ disabled: recordsPagination.current <= 1 }"
            >
              &lt;
            </span>
            <span class="page-input-wrapper">
              <input
                v-model.number="jumpPage"
                type="number"
                min="1"
                :max="totalPages"
                class="page-input"
                @keyup.enter="goPage(jumpPage)"
              />
              <span class="page-total">/ {{ totalPages }}</span>
            </span>
            <span
              @click="goPage(recordsPagination.current + 1)"
              :class="{ disabled: recordsPagination.current >= totalPages }"
            >
              &gt;
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 十连抽弹窗 -->
    <div v-if="showTenModal" class="modal-mask">
      <div class="modal">
        <div class="modal-header">十连抽结果</div>
        <div class="modal-body">
          <div v-for="res in tenResults" :key="res.id" class="ten-item">
            <img v-if="res.prizeIcon.startsWith('http')" :src="res.prizeIcon" />
            <span v-else>{{ res.prizeIcon }}</span>
            <div>{{ res.prizeName }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="closeTenModal">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useUserStore } from "../stores/user";
import { turntableApi } from "../api/turntableApi";
import { ElMessage } from "element-plus";

const userStore = useUserStore()
const currentUser = computed(() => userStore.userInfo)
const availablePoints = computed(() =>
  (currentUser.value?.points || 0) - (currentUser.value?.usedPoints || 0)
)

// 状态
const loading = ref(false)
const drawing = ref(false)
const activeIndex = ref(null)
const turntableList = ref([])
const currentTurntable = ref(null)
const activeTabKey = ref('')
const turntableLoading = ref(false)
const prizes = ref([])

const lotteryRecords = ref([])
const jumpPage = ref(1)
const recordsPagination = reactive({
  current: 1,
  pageSize: 12,
  total: 0,
})

const showTenModal = ref(false)
const tenResults = ref([])
const animationSequence = [0, 1, 2, 5, 8, 7, 6, 3]
const totalPages = computed(() => Math.ceil(recordsPagination.total / recordsPagination.pageSize))
const progressPercent = computed(() => {
  if (!currentTurntable.value) return 0
  const total = currentTurntable.value.guaranteeCount || 1
  const cur = currentTurntable.value.userProgress?.totalDrawCount || 0
  return (cur / total) * 100
})

// ================== 方法 ==================
async function loadTurntables() {
  const res = await turntableApi.listTurntables()
  if (res.data) {
    turntableList.value = res.data
    activeTabKey.value = res.data[0]?.id + ''
  }
}

async function loadDetail(id) {
  turntableLoading.value = true
  try {
    const res = await turntableApi.getTurntableDetail(id)
    const data = res.data
    currentTurntable.value = data
    const list = data.prizeList || []
    const fill = []
    for (let i = 0; i < 9; i++) {
      fill.push(list[i] || { id: i, name: '暂无奖品', icon: '❓', quality: 0 })
    }
    prizes.value = fill
  } finally {
    turntableLoading.value = false
  }
}

async function loadRecords(tid, page = 1) {
  const params = {
    turntableId: tid,
    current: page,
    pageSize: recordsPagination.pageSize,
    sortField: 'createTime',
    sortOrder: 'descend',
  }
  const res = await turntableApi.listDrawRecords(params)
  const data = res.data
  lotteryRecords.value = data.records.map((i) => ({
    id: i.id || Date.now(),
    prizeName: i.name || '',
    prizeIcon: i.icon || '🎁',
    quality: i.quality,
  }))
  recordsPagination.total = data.total
}

// 空转动画（加载中效果）
function runIdleAnimation(duration = 1500) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const speed = 100
    let step = 0
    const run = () => {
      const elapsed = Date.now() - startTime
      if (elapsed < duration) {
        const i = step % animationSequence.length
        activeIndex.value = animationSequence[i]
        step++
        setTimeout(run, speed)
      } else {
        resolve()
      }
    }
    run()
  })
}

// 结果动画（减速停在目标）
function runResultAnimation(target) {
  return new Promise((resolve) => {
    let step = 0
    let speed = 60
    const rounds = 2
    const total = animationSequence.length * rounds + animationSequence.indexOf(target)
    const run = () => {
      const i = step % animationSequence.length
      activeIndex.value = animationSequence[i]
      step++
      if (step <= total) {
        if (step > total - 6) speed += 80
        setTimeout(run, speed)
      } else {
        activeIndex.value = target
        setTimeout(() => {
          activeIndex.value = null
          resolve()
        }, 400)
      }
    }
    run()
  })
}

// 抽奖
async function doDraw() {
  if (drawing.value) return
  drawing.value = true

  // 先开始空转制造悬念
  const idlePromise = runIdleAnimation(1200)

  try {
    const res = await turntableApi.draw(currentTurntable.value.id, 1)
    await idlePromise // 确保至少空转1.2秒

    if (res.code === 0) {
      const prize = res.data.prizeList[0]
      const idx = prizes.value.findIndex((p) => p.prizeId == prize.prizeId || p.id == prize.prizeId)
      const target = idx >= 0 ? idx : animationSequence[Math.random() * 8 | 0]
      await runResultAnimation(target)

      // 自定义消息通知
      ElMessage.success({
        message: `恭喜获得：${prize.name}`,
        duration: 3000,
        showClose: true
      })
      loadDetail(currentTurntable.value.id)
      loadRecords(currentTurntable.value.id)
    } else {
      ElMessage.error(res.message || '抽奖失败')
    }
  } catch (e) {
    await idlePromise
    ElMessage.error(e.message || '抽奖失败')
  } finally {
    drawing.value = false
  }
}

// 十连
async function doTenDraw() {
  if (drawing.value) return
  drawing.value = true

  // 先开始空转制造悬念（十连时间稍长）
  const idlePromise = runIdleAnimation(1500)

  try {
    const res = await turntableApi.draw(currentTurntable.value.id, 10)
    await idlePromise // 确保至少空转1.5秒

    if (res.code === 0) {
      const list = res.data.prizeList
      const last = list[list.length - 1]
      const idx = prizes.value.findIndex((p) => p.prizeId == last.prizeId || p.id == last.prizeId)
      await runResultAnimation(idx >= 0 ? idx : animationSequence[Math.random() * 8 | 0])

      tenResults.value = list.map((i) => ({
        id: Date.now() + Math.random(),
        prizeName: i.name,
        prizeIcon: i.icon || '',
      }))
      showTenModal.value = true

      // 十连成功消息
      const hasRare = list.some(i => i.quality >= 3)
      ElMessage.success({
        message: hasRare ? `十连抽完成！获得稀有奖品！` : `十连抽完成！`,
        duration: 3000,
        showClose: true
      })
      loadDetail(currentTurntable.value.id)
      loadRecords(currentTurntable.value.id)
    } else {
      ElMessage.error(res.message || '十连抽失败')
    }
  } catch (e) {
    await idlePromise
    ElMessage.error(e.message || '十连抽失败')
  } finally {
    drawing.value = false
  }
}

// 切换TAB
async function switchTab(id) {
  activeTabKey.value = id + ''
  await loadDetail(id)
  await loadRecords(id)
}

// 分页
function goPage(p) {
  if (p < 1 || p > totalPages.value) return
  jumpPage.value = p
  loadRecords(+activeTabKey.value, p)
}

// 样式
function getQualityClass(q) {
  if (q === 4) return 'legend'
  if (q === 3) return 'epic'
  if (q === 2) return 'rare'
  return 'common'
}

// 每日免费
const isDailyFirstFree = computed(() => {
  if (!currentTurntable.value?.userProgress?.lastDrawTime) return true
  const last = new Date(currentTurntable.value.userProgress.lastDrawTime)
  return last.toDateString() !== new Date().toDateString()
})

function closeTenModal() {
  showTenModal.value = false
}

onMounted(() => {
  loadTurntables()
})

watch(activeTabKey, (id) => {
  if (id) {
    loadDetail(+id)
    loadRecords(+id)
  }
})
</script>

<style scoped>
/* 整体布局 */
.lottery-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  overflow: hidden;
}
.currency-bar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}
.currency-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
}
.lottery-content {
  display: flex;
  gap: 24px;
}
.left-section {
  flex: 1;
}
.right-section {
  width: 380px;
}

/* TAB */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.tab {
  padding: 8px 14px;
  background: #f2f2f2;
  border-radius: 8px;
  cursor: pointer;
}
.tab-active {
  background: #4096ff;
  color: #fff;
}
.tab-icon {
  width: 20px;
  height: 20px;
  margin-right: 6px;
}

/* 加载 */
.loading-mask {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #eee;
  border-top: 3px solid #4096ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.blur {
  filter: blur(2px);
}
.grid-container {
  position: relative;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(249, 115, 22, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 九宫格 */
.prize-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.prize-item {
  padding: 16px;
  border-radius: 10px;
  background: #fff;
  text-align: center;
  border: 1.5px solid #000000;
}
.prize-active {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 12px rgba(251, 191, 36, 0.2);
}
.prize-icon img {
  width: 50px;
  height: 50px;
  object-fit: contain;
}
.prize-name {
  margin-top: 6px;
  font-size: 14px;
}
.shine {
  animation: shine 1s infinite alternate;
}
@keyframes shine {
  from { filter: brightness(1); }
  to { filter: brightness(1.4); }
}

/* 品质 */
.common { background: #fff; border-color: #d3d1d1;}
.rare { background: linear-gradient(135deg,#e3f2fd,#bbdefb); border-color: #6facff;}
.epic { background: linear-gradient(135deg,#f3e5f5,#e1bee7); border-color: #b27dff;}
.legend { background: linear-gradient(135deg,#fff3e0,#ffe0b2); border-color: #f88b1f; }

/* 按钮 */
.btn-group {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.btn {
  width: 45%;
  height: 52px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.1);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
}
.btn-single {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.5);
}
.btn-ten {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.5);
}
.free {
  color: #fde047;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(253, 224, 71, 0.6);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 进度条 */
.progress-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.progress-bar {
  flex: 1;
  height: 10px;
  background: #eee;
  border-radius: 5px;
  overflow: hidden;
}
.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #ff8c42, #ff681f);
  width: 0%;
  transition: width 0.5s;
}
.progress-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 记录卡片 */
.record-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  max-height: calc(100vh - 90px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.record-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}
.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.record-icon img {
  width: 32px;
  height: 32px;
}
.empty {
  padding: 30px 0;
  text-align: center;
  color: #999;
}

/* 记录头部 */
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.record-total {
  font-size: 13px;
  color: #666;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  font-size: 14px;
  flex-shrink: 0;
}

.pagination span {
  cursor: pointer;
  padding: 0 6px;
}
.disabled {
  opacity: 0.4;
  cursor: not-allowed !important;
}
.page-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}
.page-input {
  width: 40px;
  height: 24px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.page-input:focus {
  outline: none;
  border-color: #4096ff;
}
.page-total {
  color: #666;
}

/* 十连弹窗 */
.modal-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal {
  background: white;
  width: 700px;
  border-radius: 12px;
  overflow: hidden;
}
.modal-header {
  padding: 16px;
  font-weight: bold;
  text-align: center;
  border-bottom: 1px solid #eee;
}
.modal-body {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.ten-item {
  text-align: center;
  padding: 10px;
  background: #f8f8f8;
  border-radius: 8px;
}
.ten-item img {
  width: 48px;
  height: 48px;
}
.modal-footer {
  padding: 12px;
  text-align: center;
  border-top: 1px solid #eee;
}
.modal-btn {
  padding: 8px 24px;
  background: #4096ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* 宽度不够时收窄抽奖记录 */
@media (max-width: 1100px) {
  .right-section {
    width: 230px;
  }
  
  .lottery-content {
    gap: 16px;
  }
}

/* 宽度很小时隐藏抽奖记录 */
@media (max-width: 700px) {
  .right-section {
    display: none;
  }
  
  .left-section {
    width: 100%;
  }
}

/* 小屏幕优化 */
@media (max-width: 600px) {
  .lottery-container {
    padding: 12px;
  }
  
  .prize-grid {
    gap: 8px;
  }
  
  .prize-item {
    padding: 12px;
  }
  
  .prize-icon img {
    width: 40px;
    height: 40px;
  }
  
  .prize-name {
    font-size: 12px;
  }
  
  .btn {
    height: 44px;
    font-size: 14px;
  }
  
  .modal {
    width: 95%;
    margin: 0 auto;
  }
  
  .modal-body {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}

/* 高度响应式布局 - 按优先级逐步隐藏元素 */

/* 第一步：高度较小时缩放抽奖框 */
@media (max-height: 700px) {
  .lottery-container {
    padding: 10px;
  }
  
  .grid-container {
    padding: 12px;
  }
  
  .prize-grid {
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .prize-item {
    padding: 10px;
  }
  
  .prize-icon img {
    width: 45px;
    height: 45px;
  }
  
  .prize-name {
    font-size: 13px;
    margin-top: 4px;
  }
  
  .btn {
    height: 42px;
    font-size: 14px;
  }
  
  .btn-group {
    gap: 12px;
  }
}

/* 第二步：高度更小时隐藏TAB */
@media (max-height: 600px) {
  .tabs {
    display: none;
  }
  
  .grid-container {
    padding: 10px;
  }
  
  .prize-item {
    padding: 8px;
  }
  
  .prize-icon img {
    width: 40px;
    height: 40px;
  }
  
  .prize-name {
    font-size: 12px;
  }
}

/* 第三步：高度很小时隐藏积分栏和进度条 */
@media (max-height: 500px) {
  /* .currency-bar {
    display: none;
  } */
  
  /* .progress-group,
  .progress-tip {
    display: none;
  } */
  
  .lottery-container {
    padding: 8px;
  }
  
  .grid-container {
    padding: 8px;
  }
  
  .prize-grid {
    gap: 6px;
    margin-bottom: 8px;
  }
  
  .prize-item {
    padding: 6px;
  }
  
  .prize-icon img {
    width: 35px;
    height: 35px;
  }
  
  .btn {
    height: 38px;
    font-size: 13px;
  }
}

/* 第四步：高度极小时进一步缩放，但始终保留抽奖框 */
/* @media (max-height: 400px) {
  .lottery-container {
    padding: 6px;
  }
  
  .grid-container {
    padding: 6px;
  }
  
  .prize-grid {
    gap: 4px;
    margin-bottom: 6px;
  }
  
  .prize-item {
    padding: 4px;
  }
  
  .prize-icon img {
    width: 30px;
    height: 30px;
  }
  
  .prize-name {
    font-size: 11px;
  }
  
  .btn {
    height: 34px;
    font-size: 12px;
  }
  
  .btn-group {
    gap: 8px;
  }
} */

/* 右侧记录区域高度同步缩放 - 断点比左侧晚50px */
@media (max-height: 550px) {
  .record-card {
    max-height: calc(100vh - 150px);
    padding: 12px;
  }
  
  .record-title {
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .record-list {
    gap: 6px;
  }
  
  .record-item {
    gap: 8px;
  }
  
  .record-icon img {
    width: 28px;
    height: 28px;
  }
}

@media (max-height: 550px) {
  .record-card {
    max-height: calc(100vh - 120px);
    padding: 10px;
  }
  
  .record-text {
    font-size: 13px;
  }
}

@media (max-height: 450px) {
  .record-card {
    max-height: calc(100vh - 100px);
    padding: 8px;
  }
  
  .record-title {
    font-size: 13px;
  }
  
  .record-icon img {
    width: 24px;
    height: 24px;
  }
  
  .record-text {
    font-size: 12px;
  }
}

@media (max-height: 350px) {
  .record-card {
    max-height: calc(100vh - 80px);
    padding: 6px;
  }
  
  .record-list {
    gap: 4px;
  }
  
  .record-item {
    gap: 6px;
  }
}
</style>