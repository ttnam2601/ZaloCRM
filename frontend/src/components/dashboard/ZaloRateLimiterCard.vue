<template>
  <v-card class="rate-limiter-card flex-grow-1" min-height="350">
    <v-card-title class="text-body-1 d-flex align-center justify-between py-3 px-4">
      <span>📊 Tần suất Zalo Rate (Hôm nay)</span>
      <v-select
        v-if="accounts.length > 1"
        v-model="selectedAccountId"
        :focus="false"
        :items="accountOptions"
        density="compact"
        hide-details
        variant="outlined"
        class="account-selector ml-auto"
        style="max-width: 180px;"
      />
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-4">
      <div v-if="loading" class="d-flex align-center justify-center py-8">
        <v-progress-circular indeterminate color="primary" size="32" />
        <span class="ml-3 text-grey">Đang tải dữ liệu...</span>
      </div>

      <div v-else-if="accounts.length === 0" class="text-center pa-8 text-grey">
        Không có tài khoản Zalo nào đang kết nối
      </div>

      <div v-slot:default v-else-if="selectedAccount">
        <div v-if="accounts.length === 1" class="account-name-single mb-3 text-grey-darken-1">
          Tài khoản: <strong>{{ selectedAccount.displayName }}</strong> ({{ selectedAccount.phone }})
        </div>

        <div class="rate-table-container">
          <table class="rate-table">
            <thead>
              <tr>
                <th>Loại tác vụ</th>
                <th class="text-right">Đã dùng / Giới hạn</th>
                <th style="width: 40%">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rateRows" :key="row.category">
                <td class="font-weight-medium text-grey-darken-3">{{ row.label }}</td>
                <td class="text-right font-mono">
                  <span :class="usageClass(row.percent)">{{ row.current }}</span>
                  <span class="text-grey"> / {{ row.max }}</span>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <v-progress-linear
                      :model-value="row.percent"
                      :color="barColor(row.percent)"
                      height="8"
                      rounded
                      class="flex-grow-1"
                    />
                    <span class="ml-2 font-mono text-caption text-right" style="min-width: 32px">
                      {{ Math.round(row.percent) }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/api';

interface RateInfo {
  current: number;
  max: number;
}

interface ZaloAccountRate {
  accountId: string;
  displayName: string;
  phone: string;
  rates: Record<string, RateInfo>;
}

const CATEGORY_LABELS: Record<string, string> = {
  message: 'Gửi tin nhắn',
  reaction: 'Thả tim / Reaction',
  chat_action: 'Thao tác chat (gửi typing...)',
  group_admin: 'Quản trị nhóm (tạo, duyệt...)',
  group_read: 'Đọc thông tin nhóm',
  friend_action: 'Thao tác bạn bè (kết bạn...)',
  friend_read: 'Đọc danh sách bạn bè',
  profile: 'Xem profile người dùng',
  query: 'Truy vấn chung (Query)',
};

const loading = ref(false);
const accounts = ref<ZaloAccountRate[]>([]);
const selectedAccountId = ref<string | null>(null);

const accountOptions = computed(() => {
  return accounts.value.map(a => ({
    title: `${a.displayName} (${a.phone})`,
    value: a.accountId,
  }));
});

const selectedAccount = computed(() => {
  if (!selectedAccountId.value) return accounts.value[0] || null;
  return accounts.value.find(a => a.accountId === selectedAccountId.value) || accounts.value[0] || null;
});

const rateRows = computed(() => {
  const acc = selectedAccount.value;
  if (!acc) return [];

  return Object.entries(acc.rates).map(([category, info]) => {
    const label = CATEGORY_LABELS[category] || category;
    const current = info.current;
    const max = info.max;
    const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    return {
      category,
      label,
      current,
      max,
      percent,
    };
  });
});

async function fetchRates() {
  loading.value = true;
  try {
    const res = await api.get('/dashboard/zalo-rate');
    accounts.value = res.data?.data || [];
    if (accounts.value.length > 0 && !selectedAccountId.value) {
      selectedAccountId.value = accounts.value[0].accountId;
    }
  } catch (err) {
    console.error('Failed to fetch Zalo rates:', err);
  } finally {
    loading.value = false;
  }
}

function barColor(percent: number): string {
  if (percent >= 90) return '#dc2626'; // Red (Danger)
  if (percent >= 70) return '#ea580c'; // Orange (Warning)
  return '#C2410C'; // Terracotta theme accent (Primary)
}

function usageClass(percent: number): string {
  if (percent >= 90) return 'text-red-darken-1 font-weight-bold';
  if (percent >= 70) return 'text-orange-darken-3 font-weight-bold';
  return '';
}

onMounted(() => {
  fetchRates();
});
</script>

<style scoped>
.rate-limiter-card {
  border: 1px solid var(--color-border, #D6D3D1);
  border-radius: 12px;
}

.account-selector :deep(.v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 13px;
}

.account-name-single {
  font-size: 13px;
}

.rate-table-container {
  overflow-x: auto;
}

.rate-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.rate-table th {
  padding: 8px 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid #e2e8f0;
}

.rate-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.font-mono {
  font-family: monospace;
}
</style>
