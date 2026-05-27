<template>
  <div class="stock-market-container">
    <div class="stock-market-content">
      <div class="stock-page-header">
        <div class="stock-page-header__left">
          <el-icon class="stock-page-header__icon"><TrendCharts /></el-icon>
          <div>
            <div class="stock-page-header__title">摸鱼股市</div>
            <div class="stock-page-header__desc">
              使用积分交易上证、深证成指、创业板指、沪深300、上证50 等主要指数
            </div>
          </div>
        </div>
        <el-button :icon="Refresh" text type="primary" :loading="loading" @click="refreshData">
          刷新
        </el-button>
      </div>

      <div class="stats-row">
        <div class="stat-card stat-card--points">
          <div class="stat-title">可用积分</div>
          <div class="stat-value">{{ formatNumber(availablePoints) }}</div>
        </div>
        <div class="stat-card stat-card--market">
          <div class="stat-title">持仓市值</div>
          <div class="stat-value">{{ formatNumber(stats.totalMarketValue) }}</div>
        </div>
        <div class="stat-card" :class="stats.dayProfit >= 0 ? 'stat-card--up' : 'stat-card--down'">
          <div class="stat-title">今日盈亏</div>
          <div class="stat-value">
            {{ (stats.dayProfit >= 0 ? '+' : '') + formatNumber(stats.dayProfit) }}
          </div>
        </div>
        <div class="stat-card" :class="stats.totalProfit >= 0 ? 'stat-card--up' : 'stat-card--down'">
          <div class="stat-title">累计盈亏</div>
          <div class="stat-value">
            {{ (stats.totalProfit >= 0 ? '+' : '') + formatNumber(stats.totalProfit) }}
          </div>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="stock-tabs">
        <!-- 市场行情 -->
        <el-tab-pane name="market">
          <template #label>
            <span><el-icon><TrendCharts /></el-icon> 市场行情</span>
          </template>
          <el-row :gutter="16">
            <el-col
              v-for="index in marketIndices"
              :key="index.indexCode"
              :xs="24"
              :sm="12"
              :lg="8"
            >
              <div
                class="market-card"
                :class="getPositionByCode(index.indexCode) ? 'market-card--holding' : ''"
              >
                <div class="market-header">
                  <div class="market-info">
                    <div class="market-name-wrap">
                      <span class="market-name">{{ index.indexName }}</span>
                      <template v-if="getPositionByCode(index.indexCode)">
                        <el-tag type="primary" size="small" effect="light" class="holding-tag">
                          已持仓
                        </el-tag>
                        <span class="index-holding-brief">
                          持有 {{ formatNumber(getPositionByCode(index.indexCode).totalShares) }} 份 ·
                          市值 ¥{{ formatNumber(getPositionByCode(index.indexCode).marketValue) }}
                        </span>
                      </template>
                      <el-tag
                        v-if="!isTradableIndex(index.indexCode)"
                        type="info"
                        size="small"
                        effect="plain"
                        class="holding-tag"
                      >
                        暂不可交易
                      </el-tag>
                    </div>
                    <span class="market-code">{{ index.indexCode }}</span>
                  </div>
                </div>
                <div class="market-card__quote">
                  <span
                    class="current-price"
                    :class="parseNumericValue(index.changeValue) >= 0 ? 'up' : 'down'"
                  >
                    {{ parseNumericValue(index.currentValue).toFixed(2) }}
                  </span>
                  <div class="market-change">
                    <span
                      class="change-pill"
                      :class="parseNumericValue(index.changeValue) >= 0 ? 'up' : 'down'"
                    >
                      {{ parseNumericValue(index.changeValue) >= 0 ? '+' : '' }}{{ parseNumericValue(index.changeValue).toFixed(2) }}
                    </span>
                    <span
                      class="change-pill"
                      :class="parseNumericValue(index.changePercent) >= 0 ? 'up' : 'down'"
                    >
                      {{ parseNumericValue(index.changePercent) >= 0 ? '+' : '' }}{{ parseNumericValue(index.changePercent).toFixed(2) }}%
                    </span>
                  </div>
                </div>
                <div class="market-action">
                  <el-button
                    type="primary"
                    :icon="ShoppingCart"
                    :disabled="!isTradableIndex(index.indexCode)"
                    @click="handleOpenTradeModalDebounced('buy', index)"
                  >
                    {{ getPositionByCode(index.indexCode) ? '加仓' : '买入' }}
                  </el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 我的持仓 -->
        <el-tab-pane name="positions">
          <template #label>
            <span>
              <el-icon><Wallet /></el-icon> 我的持仓
              <el-badge v-if="positions.length > 0" :value="positions.length" class="position-badge" />
            </span>
          </template>
          <div v-if="positions.length > 0">
            <el-row :gutter="16">
              <el-col
                v-for="position in positions"
                :key="position.indexCode"
                :xs="24"
                :sm="12"
                :lg="8"
              >
                <div class="position-card">
                  <div class="position-header">
                    <div class="position-info">
                      <div class="position-name">{{ position.indexName }}</div>
                      <div class="position-code">{{ position.indexCode }}</div>
                    </div>
                    <div class="position-percent" :class="(position.changePercent || 0) >= 0 ? 'up' : 'down'">
                      {{ (position.changePercent || 0) >= 0 ? '+' : '' }}{{ Number(position.changePercent || 0).toFixed(2) }}%
                    </div>
                  </div>

                  <div class="position-grid">
                    <div class="grid-item">
                      <div class="grid-label">持有份额</div>
                      <div class="grid-value">{{ formatNumber(position.totalShares) }}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">可用份额</div>
                      <div class="grid-value">{{ formatNumber(position.availableShares) }}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">当前净值</div>
                      <div class="grid-value">¥{{ formatNumber(position.currentNav, 4) }}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">平均成本</div>
                      <div class="grid-value">¥{{ formatNumber(position.avgCost, 4) }}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">持仓市值</div>
                      <div class="grid-value highlight">¥{{ formatNumber(position.marketValue) }}</div>
                    </div>
                    <div class="grid-item">
                      <div class="grid-label">累计盈亏</div>
                      <div class="grid-value" :class="(position.totalProfit || 0) >= 0 ? 'profit' : 'loss'">
                        {{ (position.totalProfit || 0) >= 0 ? '+' : '' }}¥{{ formatNumber(position.totalProfit) }}
                      </div>
                    </div>
                  </div>

                  <div class="position-actions">
                    <el-button
                      type="primary"
                      plain
                      @click="handleOpenTradeModalDebounced(
                        'buy',
                        marketIndices.find((i) => i.indexCode === position.indexCode),
                        position,
                      )"
                    >
                      加仓
                    </el-button>
                    <el-button
                      type="danger"
                      plain
                      :disabled="!position.availableShares"
                      @click="handleOpenTradeModalDebounced('sell', undefined, position)"
                    >
                      卖出
                    </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
          <el-empty v-else description="暂无持仓，快去市场买入吧" />
        </el-tab-pane>

        <!-- 交易记录 -->
        <el-tab-pane name="transactions">
          <template #label>
            <span><el-icon><Clock /></el-icon> 交易记录</span>
          </template>
          <div class="transaction-panel">
            <div class="transaction-table-scroll">
            <el-table
              ref="transactionTableRef"
              :data="transactions"
              v-loading="loading"
              stripe
              class="transaction-table"
            >
              <el-table-column prop="createTime" label="交易时间" width="180" />
              <el-table-column prop="indexName" label="指数名称" width="150" />
              <el-table-column label="交易类型" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.tradeType === 1 ? 'danger' : 'success'">
                    {{ scope.row.tradeType === 1 ? '买入' : '卖出' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="成交份额" width="120" align="right">
                <template #default="scope">
                  {{ formatNumber(scope.row.shares) }}
                </template>
              </el-table-column>
              <el-table-column label="成交净值" width="120" align="right">
                <template #default="scope">
                  ¥{{ formatNumber(scope.row.nav, 4) }}
                </template>
              </el-table-column>
              <el-table-column label="交易金额" width="120" align="right">
                <template #default="scope">
                  <span :style="{ color: scope.row.tradeType === 1 ? '#cf1322' : '#3f8600' }">
                    {{ scope.row.tradeType === 1 ? '-' : '+' }}¥{{ formatNumber(scope.row.amount) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
                    {{ scope.row.statusName }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="盈亏" width="120" align="right">
                <template #default="scope">
                  <span
                    v-if="scope.row.profitLoss !== undefined && scope.row.profitLoss !== null"
                    :style="{ color: scope.row.profitLoss >= 0 ? '#cf1322' : '#3f8600', fontWeight: 'bold' }"
                  >
                    {{ scope.row.profitLoss >= 0 ? '+' : '' }}¥{{ formatNumber(scope.row.profitLoss) }}
                  </span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
            </div>
            <div class="transaction-pagination">
              <el-pagination
                v-model:current-page="transactionPage"
                :page-size="10"
                :total="transactionTotal"
                layout="total, prev, pager, next"
                small
                background
                @current-change="loadTransactions"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 交易弹窗 -->
    <el-dialog
      v-model="tradeModalVisible"
      :title="tradeType === 'buy' ? '买入指数' : '卖出指数'"
      width="500px"
      class="stock-trade-modal"
    >
      <el-form ref="formRef" :model="form" label-position="top">
        <!-- 买入表单 -->
        <template v-if="tradeType === 'buy'">
          <div class="trade-index-title">
            <strong>
              {{ selectedIndex?.indexName || selectedPosition?.indexName || form.indexName || '—' }}
            </strong>
            <span class="trade-index-code">
              {{ selectedIndex?.indexCode || selectedPosition?.indexCode || form.indexCode }}
            </span>
          </div>
          <el-form-item
            label="买入金额（积分）"
            prop="amount"
            :rules="[{ required: true, message: '请输入买入金额' }]"
          >
            <el-input-number
              v-model="form.amount"
              :min="100"
              :precision="2"
              :controls="false"
              style="width: 100%;"
              placeholder="请输入买入金额"
            >
              <template #prefix>
                <el-icon><Coin /></el-icon>
              </template>
            </el-input-number>
            <div class="form-extra">
              最小买入金额为100积分，剩余积分：{{ formatNumber(availablePoints) }}
            </div>
          </el-form-item>
          <div class="trade-info" v-if="selectedIndex || selectedPosition">
            <template v-if="selectedIndex">
              <el-text type="info">
                最新点位: {{ parseNumericValue(selectedIndex.currentValue).toFixed(2) }}
                （{{ parseNumericValue(selectedIndex.changePercent) >= 0 ? '+' : '' }}{{ parseNumericValue(selectedIndex.changePercent).toFixed(2) }}%）
              </el-text>
              <br />
            </template>
            <el-text v-if="selectedPosition" type="info">
              当前持仓: {{ formatNumber(selectedPosition.totalShares) }} 份 ·
              可用 {{ formatNumber(selectedPosition.availableShares) }} 份
            </el-text>
          </div>
        </template>

        <!-- 卖出表单 -->
        <template v-else>
          <div class="trade-index-title">
            <strong>{{ selectedPosition?.indexName || '—' }}</strong>
            <span v-if="selectedPosition?.indexCode" class="trade-index-code">
              {{ selectedPosition.indexCode }}
            </span>
          </div>
          <el-form-item
            label="卖出份额"
            prop="shares"
            :rules="[{ required: true, message: '请输入卖出份额' }]"
          >
            <el-input-number
              v-model="form.shares"
              :min="0.01"
              :max="selectedPosition?.availableShares"
              :precision="2"
              :controls="false"
              style="width: 100%;"
              placeholder="请输入卖出份额"
            />
            <div v-if="selectedPosition" class="form-extra">
              可用份额: {{ formatNumber(selectedPosition.availableShares) }}
            </div>
          </el-form-item>
          <div class="trade-info" v-if="selectedPosition">
            <el-text type="info">
              当前持仓: {{ selectedPosition.indexName }} ({{ selectedPosition.indexCode }})
            </el-text>
            <br />
            <el-text type="info">
              持仓份额: {{ formatNumber(selectedPosition.totalShares) }}
              （可用: {{ formatNumber(selectedPosition.availableShares) }}）
            </el-text>
            <br />
            <el-text type="info">
              当前净值: ¥{{ formatNumber(selectedPosition.currentNav, 4) }}
            </el-text>
          </div>
        </template>
      </el-form>
      <template #footer>
        <el-button :disabled="tradeSubmitting" @click="handleCloseTradeModal">取消</el-button>
        <el-button type="primary" :loading="tradeSubmitting" :disabled="tradeSubmitting" @click="handleTradeSubmit">
          {{ tradeType === 'buy' ? '确认买入' : '确认卖出' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  Refresh,
  ShoppingCart,
  Wallet,
  Clock,
  Coin,
} from '@element-plus/icons-vue';
import { stockApi } from '../api/stock';
import { useUserStore } from '../stores/user';

/** 买卖按钮点击间隔（毫秒） */
const TRADE_CLICK_DEBOUNCE_MS = 500;

/** 可交易指数代码（与后端一致） */
const TRADABLE_INDEX_CODES = new Set([
  'sh000001',
  'sz399001',
  'sz399006',
  'sh000300',
  'sh000016',
]);

const userStore = useUserStore();
const transactionTableRef = ref(null);
let transactionTableBodyEl = null;
let onTransactionTableBodyScroll = null;
const availablePoints = computed(
  () => (userStore.userInfo?.points ?? 0) - (userStore.userInfo?.usedPoints ?? 0),
);

// 辅助函数：安全解析数值
const parseNumericValue = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/%/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// 格式化数字
const formatNumber = (value, precision = 2) => {
  if (value === undefined || value === null) return '0.00';
  return Number(value).toFixed(precision);
};

// 响应式数据
const loading = ref(false);
const refreshing = ref(false);
const marketIndices = ref([]);
const positions = ref([]);
const transactions = ref([]);
const transactionTotal = ref(0);
const transactionPage = ref(1);
const tradeModalVisible = ref(false);
const tradeType = ref('buy');
const selectedIndex = ref(null);
const selectedPosition = ref(null);
const activeTab = ref('market');
const formRef = ref(null);
const tradeSubmitting = ref(false);
const lastTradeClickAt = ref(0);

const form = ref({
  indexCode: '',
  indexName: '',
  amount: undefined,
  shares: undefined,
});

// 计算统计数据
const stats = computed(() => {
  let totalMarketValue = 0;
  let totalProfit = 0;
  let dayProfit = 0;

  positions.value.forEach(pos => {
    totalMarketValue += Number(pos.marketValue) || 0;
    totalProfit += Number(pos.totalProfit) || 0;
    // 估算今日盈亏
    const prevValue = (Number(pos.totalShares) || 0) * ((Number(pos.currentNav) || 0) / (1 + (Number(pos.changePercent) || 0) / 100));
    dayProfit += (Number(pos.marketValue) || 0) - prevValue;
  });

  return { totalMarketValue, totalProfit, dayProfit };
});

// 加载市场指数
const loadMarketIndices = async () => {
  try {
    const response = await stockApi.getMajorIndices();
    if (response.code === 0 && response.data) {
      marketIndices.value = response.data;
    }
  } catch (error) {
    console.error('加载市场指数失败:', error);
  }
};

const getPositionByCode = (indexCode) =>
  positions.value.find((p) => p.indexCode === indexCode);

const isTradableIndex = (indexCode) =>
  !!indexCode && TRADABLE_INDEX_CODES.has(indexCode);

// 加载全部指数持仓
const loadPositions = async () => {
  try {
    const response = await stockApi.getPositions();
    if (response.code === 0 && response.data) {
      positions.value = response.data.filter(
        (p) => p.indexCode && (p.totalShares || 0) > 0,
      );
    } else {
      positions.value = [];
    }
  } catch (error) {
    console.error('加载持仓失败:', error);
  }
};

// 加载交易记录
const loadTransactions = async (page = 1) => {
  try {
    const response = await stockApi.getTransactions({
      current: page,
      pageSize: 10,
    });
    if (response.code === 0 && response.data) {
      transactions.value = response.data.records || [];
      transactionTotal.value = response.data.total || 0;
    }
  } catch (error) {
    console.error('加载交易记录失败:', error);
  }
};

// 加载所有数据（静默，不弹 toast）
const loadAllData = async () => {
  refreshing.value = true;
  loading.value = true;
  await Promise.all([
    loadMarketIndices(),
    loadPositions(),
    loadTransactions(transactionPage.value),
  ]);
  loading.value = false;
  refreshing.value = false;
};

// 手动刷新
const refreshData = async () => {
  await loadAllData();
  ElMessage.success('刷新成功');
};

// 打开交易弹窗
const handleOpenTradeModal = (type, index, position) => {
  tradeType.value = type;
  selectedIndex.value = index || null;
  selectedPosition.value = position || null;

  if (type === 'buy' && index) {
    form.value = {
      indexCode: index.indexCode,
      indexName: index.indexName,
      amount: undefined,
      shares: undefined,
    };
  } else if (type === 'buy' && position) {
    form.value = {
      indexCode: position.indexCode,
      indexName: position.indexName,
      amount: undefined,
      shares: undefined,
    };
  } else if (type === 'sell' && position) {
    form.value = {
      indexCode: position.indexCode,
      indexName: position.indexName,
      amount: undefined,
      shares: undefined,
    };
  }

  tradeModalVisible.value = true;
};

const handleOpenTradeModalDebounced = (type, index, position) => {
  const now = Date.now();
  if (now - lastTradeClickAt.value < TRADE_CLICK_DEBOUNCE_MS) {
    return;
  }
  lastTradeClickAt.value = now;
  handleOpenTradeModal(type, index, position);
};

// 关闭交易弹窗
const handleCloseTradeModal = () => {
  tradeModalVisible.value = false;
  selectedIndex.value = null;
  selectedPosition.value = null;
  form.value = {
    indexCode: '',
    indexName: '',
    amount: undefined,
    shares: undefined,
  };
};

// 提交交易
const handleTradeSubmit = async () => {
  if (tradeSubmitting.value) {
    return;
  }
  try {
    await formRef.value.validate();
    tradeSubmitting.value = true;

    if (tradeType.value === 'buy') {
      const response = await stockApi.buyIndex({
        indexCode: form.value.indexCode,
        amount: form.value.amount,
      });

      if (response.code === 0) {
        ElMessage.success(`买入成功！成交份额: ${formatNumber(response.data?.shares)}`);
        handleCloseTradeModal();
        loadAllData();
      } else {
        ElMessage.error(response.message || response.msg || '买入失败');
      }
    } else {
      const response = await stockApi.sellIndex({
        indexCode: form.value.indexCode,
        shares: form.value.shares,
      });

      if (response.code === 0) {
        ElMessage.success('卖出成功！');
        handleCloseTradeModal();
        loadAllData();
      } else {
        ElMessage.error(response.message || response.msg || '卖出失败');
      }
    }
  } catch (error) {
    console.error('交易失败:', error);
  } finally {
    tradeSubmitting.value = false;
  }
};

const teardownTransactionTableScrollSync = () => {
  if (transactionTableBodyEl && onTransactionTableBodyScroll) {
    transactionTableBodyEl.removeEventListener('scroll', onTransactionTableBodyScroll);
  }
  transactionTableBodyEl = null;
  onTransactionTableBodyScroll = null;
};

const setupTransactionTableScrollSync = () => {
  teardownTransactionTableScrollSync();
  const tableRoot = transactionTableRef.value?.$el;
  if (!tableRoot) return;

  const bodyWrapper = tableRoot.querySelector('.el-table__body-wrapper');
  const headerWrapper = tableRoot.querySelector('.el-table__header-wrapper');
  if (!bodyWrapper || !headerWrapper) return;

  onTransactionTableBodyScroll = () => {
    headerWrapper.scrollLeft = bodyWrapper.scrollLeft;
  };
  transactionTableBodyEl = bodyWrapper;
  bodyWrapper.addEventListener('scroll', onTransactionTableBodyScroll, { passive: true });
};

watch(activeTab, (tab) => {
  if (tab === 'transactions') {
    nextTick(setupTransactionTableScrollSync);
  } else {
    teardownTransactionTableScrollSync();
  }
});

watch(transactions, () => {
  if (activeTab.value === 'transactions') {
    nextTick(setupTransactionTableScrollSync);
  }
});

// 初始加载
onMounted(() => {
  loadAllData();
  nextTick(setupTransactionTableScrollSync);
});

onBeforeUnmount(() => {
  teardownTransactionTableScrollSync();
});
</script>

<style scoped lang="less">
@import '../styles/stock-market.less';
</style>
