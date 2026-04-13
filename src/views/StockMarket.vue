<template>
  <div class="stock-market-container">
    <!-- 内容区 -->
    <div class="stock-market-content">
      <!-- 刷新按钮 -->
      <div class="toolbar">
        <el-button
          :icon="Refresh"
          @click="refreshData"
          :loading="loading"
          round
        >
          刷新数据
        </el-button>
      </div>

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card blue">
          <div class="stat-icon">
            <el-icon><Wallet /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">总积分</div>
            <div class="stat-value">{{ formatNumber(stats.totalMarketValue) }}</div>
          </div>
        </div>
        <div class="stat-card" :class="stats.dayProfit >= 0 ? 'red' : 'green'">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">今日盈亏</div>
            <div class="stat-value">
              {{ (stats.dayProfit >= 0 ? '+' : '') + formatNumber(stats.dayProfit) }}
            </div>
          </div>
        </div>
        <div class="stat-card" :class="stats.totalProfit >= 0 ? 'red' : 'green'">
          <div class="stat-icon">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">累计盈亏</div>
            <div class="stat-value">
              {{ (stats.totalProfit >= 0 ? '+' : '') + formatNumber(stats.totalProfit) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" type="card">
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
              <div class="market-card" :class="parseNumericValue(index.changeValue) >= 0 ? 'up' : 'down'">
                <div class="market-header">
                  <div class="market-info">
                    <div class="market-name">{{ index.indexName }}</div>
                    <div class="market-code">{{ index.indexCode }}</div>
                  </div>
                  <div class="market-trend">
                    <el-icon v-if="parseNumericValue(index.changeValue) >= 0" class="trend-up"><ArrowUp /></el-icon>
                    <el-icon v-else class="trend-down"><ArrowDown /></el-icon>
                  </div>
                </div>
                <div class="market-value">
                  <span class="current-price">{{ parseNumericValue(index.currentValue).toFixed(2) }}</span>
                </div>
                <div class="market-change">
                  <span class="change-amount" :class="parseNumericValue(index.changeValue) >= 0 ? 'up' : 'down'">
                    {{ parseNumericValue(index.changeValue) >= 0 ? '+' : '' }}{{ parseNumericValue(index.changeValue).toFixed(2) }}
                  </span>
                  <span class="change-percent" :class="parseNumericValue(index.changePercent) >= 0 ? 'up' : 'down'">
                    {{ parseNumericValue(index.changePercent) >= 0 ? '+' : '' }}{{ parseNumericValue(index.changePercent).toFixed(2) }}%
                  </span>
                </div>
                <div class="market-action">
                  <el-button
                    type="primary"
                    :icon="ShoppingCart"
                    :disabled="index.indexCode !== 'sh000001'"
                    @click="handleOpenTradeModal('buy', index)"
                    round
                  >
                    买入
                  </el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 我的持仓 -->
        <el-tab-pane name="positions">
          <template #label>
            <span><el-icon><Wallet /></el-icon> 我的持仓</span>
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
                <div class="position-card" :class="(position.changePercent || 0) >= 0 ? 'up' : 'down'">
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
                      @click="handleOpenTradeModal('buy', undefined, position)"
                      round
                      plain
                    >
                      加仓
                    </el-button>
                    <el-button
                      type="danger"
                      :disabled="!position.availableShares"
                      @click="handleOpenTradeModal('sell', undefined, position)"
                      round
                      plain
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
          <div class="transaction-table-wrapper">
            <el-table
              :data="transactions"
              v-loading="loading"
              style="width: 100%"
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
          <el-pagination
            v-model:current-page="transactionPage"
            :page-size="10"
            :total="transactionTotal"
            layout="total, prev, pager, next"
            @current-change="loadTransactions"
            style="margin-top: 16px;"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 交易弹窗 -->
    <el-dialog
      v-model="tradeModalVisible"
      :title="tradeType === 'buy' ? '买入指数' : '卖出指数'"
      width="500px"
    >
      <el-form ref="formRef" :model="form" label-position="top">
        <!-- 买入表单 -->
        <template v-if="tradeType === 'buy'">
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
          </el-form-item>
          <div class="trade-info" v-if="selectedIndex">
            <el-text type="info">
              当前指数: {{ selectedIndex.indexName }} ({{ selectedIndex.indexCode }})
            </el-text>
            <br />
            <el-text type="info">
              最新点位: {{ parseNumericValue(selectedIndex.currentValue).toFixed(2) }}
              （{{ parseNumericValue(selectedIndex.changePercent) >= 0 ? '+' : '' }}{{ parseNumericValue(selectedIndex.changePercent).toFixed(2) }}%）
            </el-text>
          </div>
        </template>

        <!-- 卖出表单 -->
        <template v-else>
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
        <el-button @click="handleCloseTradeModal">取消</el-button>
        <el-button type="primary" @click="handleTradeSubmit">
          {{ tradeType === 'buy' ? '确认买入' : '确认卖出' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  TrendCharts,
  InfoFilled,
  Refresh,
  ShoppingCart,
  Wallet,
  Clock,
  Coin,
  ArrowUp,
  ArrowDown,
} from '@element-plus/icons-vue';
import { stockApi } from '../api/stock';

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

// 加载持仓
const loadPositions = async () => {
  try {
    const response = await stockApi.getPosition();
    if (response.code === 0 && response.data) {
      const data = response.data;
      if (Array.isArray(data)) {
        positions.value = data;
      } else if (data.indexCode) {
        positions.value = [data];
      } else {
        positions.value = [];
      }
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

// 刷新所有数据
const refreshData = async () => {
  refreshing.value = true;
  loading.value = true;
  await Promise.all([
    loadMarketIndices(),
    loadPositions(),
    loadTransactions(transactionPage.value),
  ]);
  loading.value = false;
  refreshing.value = false;
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
  try {
    await formRef.value.validate();

    if (tradeType.value === 'buy') {
      const response = await stockApi.buyIndex({
        indexCode: form.value.indexCode,
        amount: form.value.amount,
      });

      if (response.code === 0) {
        ElMessage.success(`买入成功！成交份额: ${formatNumber(response.data?.shares)}`);
        handleCloseTradeModal();
        refreshData();
      } else {
        ElMessage.error(response.msg || '买入失败');
      }
    } else {
      const response = await stockApi.sellIndex({
        indexCode: form.value.indexCode,
        shares: form.value.shares,
      });

      if (response.code === 0) {
        ElMessage.success('卖出成功！');
        handleCloseTradeModal();
        refreshData();
      } else {
        ElMessage.error(response.msg || '卖出失败');
      }
    }
  } catch (error) {
    console.error('交易失败:', error);
  }
};

// 初始加载
onMounted(() => {
  refreshData();
});
</script>

<style scoped>
/* ========== 容器 ========== */
/* ========== 容器 ========== */
.stock-market-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ========== 内容区 ========== */
.stock-market-content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ========== 工具栏 ========== */
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

/* ========== 统计卡片 ========== */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-card.blue {
  border-left-color: #409eff;
}

.stat-card.red {
  border-left-color: #ff4d4f;
}

.stat-card.green {
  border-left-color: #52c41a;
}

.stat-card.blue .stat-icon {
  background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
}

.stat-card.red .stat-icon {
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
}

.stat-card.green .stat-icon {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  margin-right: 16px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.stat-card.red .stat-value {
  color: #ff4d4f;
}

.stat-card.green .stat-value {
  color: #52c41a;
}

/* ========== 市场行情卡片 ========== */
.market-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.market-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.market-card.up {
  border-color: rgba(255, 77, 79, 0.2);
}

.market-card.down {
  border-color: rgba(82, 196, 26, 0.2);
}

.market-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.market-info {
  flex: 1;
}

.market-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.market-code {
  font-size: 12px;
  color: #8c8c8c;
  font-family: 'Monaco', 'Consolas', monospace;
}

.market-trend {
  font-size: 24px;
}

.trend-up {
  color: #ff4d4f;
  animation: pulse-up 2s infinite;
}

.trend-down {
  color: #52c41a;
  animation: pulse-down 2s infinite;
}

@keyframes pulse-up {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes pulse-down {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.market-value {
  margin-bottom: 12px;
}

.current-price {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -1px;
}

.market-change {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.change-amount,
.change-percent {
  font-size: 15px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.change-amount.up,
.change-percent.up {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.change-amount.down,
.change-percent.down {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.market-action {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}

/* ========== 持仓卡片 ========== */
.position-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.position-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.position-card.up {
  border-color: rgba(255, 77, 79, 0.15);
}

.position-card.down {
  border-color: rgba(82, 196, 26, 0.15);
}

.position-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.position-info {
  flex: 1;
}

.position-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.position-code {
  font-size: 12px;
  color: #8c8c8c;
  font-family: 'Monaco', 'Consolas', monospace;
}

.position-percent {
  font-size: 15px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.position-percent.up {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.position-percent.down {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.position-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.grid-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.grid-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 6px;
}

.grid-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: 'Monaco', 'Consolas', monospace;
}

.grid-value.highlight {
  color: #409eff;
}

.grid-value.profit {
  color: #ff4d4f;
}

.grid-value.loss {
  color: #52c41a;
}

.position-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
}

/* ========== 交易弹窗 ========== */
.trade-info {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 8px;
  margin-top: 16px;
}

.trade-info .el-text {
  line-height: 1.8;
}

/* ========== 交易记录表格 ========== */
.transaction-table-wrapper {
  max-width: 680px;
  overflow-x: auto;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 16px 20px;
  }

  .stat-value {
    font-size: 22px;
  }

  .current-price {
    font-size: 28px;
  }
}
</style>
