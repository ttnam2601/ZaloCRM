<template>
  <v-dialog v-model="open" max-width="540" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="success">mdi-link-variant-plus</v-icon>
        Gia nhập nhóm bằng link
      </v-card-title>

      <v-card-text>
        <div v-if="!isProcessing && !showResults">
          <v-select
            v-model="accountId"
            :items="accounts"
            item-title="displayName"
            item-value="id"
            label="Chọn tài khoản Zalo thực hiện"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            :rules="[v => !!v || 'Vui lòng chọn tài khoản']"
          />

          <v-textarea
            v-model="linksInput"
            label="Danh sách link nhóm Zalo"
            variant="outlined"
            density="comfortable"
            placeholder="Nhập hoặc dán các link nhóm (mỗi dòng một link hoặc cách nhau bằng dấu phẩy)&#10;Ví dụ:&#10;https://zalo.me/g/abc123xyz&#10;https://zalo.me/g/def456uvw"
            rows="6"
            hint="Hệ thống sẽ tự động trích xuất mã nhóm (linkId) để gia nhập."
            persistent-hint
          />
        </div>

        <div v-else>
          <div class="text-subtitle-2 mb-2">Tiến trình gia nhập nhóm:</div>
          <v-list class="border rounded pa-0 max-h-300 overflow-y-auto">
            <v-list-item
              v-for="(item, index) in items"
              :key="index"
              :title="item.link"
              class="border-bottom"
            >
              <template #append>
                <v-progress-circular
                  v-if="item.status === 'joining'"
                  indeterminate
                  size="20"
                  width="2"
                  color="primary"
                />
                <v-icon
                  v-else-if="item.status === 'success'"
                  color="success"
                >
                  mdi-check-circle
                </v-icon>
                <v-icon
                  v-else-if="item.status === 'failed'"
                  color="error"
                  :title="item.error"
                >
                  mdi-alert-circle
                </v-icon>
                <v-icon
                  v-else
                  color="grey-lighten-1"
                >
                  mdi-clock-outline
                </v-icon>
              </template>
              <v-list-item-subtitle v-if="item.error" class="text-error text-caption">
                {{ item.error }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-progress-linear
            color="success"
            :model-value="progress"
            class="mt-3"
            height="6"
            rounded
          />
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn
          v-if="!isProcessing && !showResults"
          variant="text"
          @click="cancel"
        >
          Hủy
        </v-btn>
        <v-btn
          v-if="!isProcessing && !showResults"
          color="success"
          variant="elevated"
          :disabled="!accountId || !linksInput.trim()"
          @click="startJoin"
        >
          Gia nhập
        </v-btn>
        <v-btn
          v-if="showResults && !isProcessing"
          color="primary"
          variant="elevated"
          @click="closeResults"
        >
          Hoàn thành
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  accounts: any[];
  defaultAccountId: string;
  joinByLinkFn: (accountId: string, linkId: string) => Promise<any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [val: boolean];
  'success': [msg: string, conversationId?: string];
}>();

const lastJoinedConversationId = ref<string | null>(null);

const open = ref(props.modelValue);
watch(() => props.modelValue, v => {
  open.value = v;
  if (v) {
    reset();
  }
});
watch(open, v => emit('update:modelValue', v));

const accountId = ref(props.defaultAccountId);
watch(() => props.defaultAccountId, v => {
  if (!accountId.value) {
    accountId.value = v;
  }
});

const linksInput = ref('');
const isProcessing = ref(false);
const showResults = ref(false);

interface JoinItem {
  link: string;
  status: 'pending' | 'joining' | 'success' | 'failed';
  error?: string;
}

const items = ref<JoinItem[]>([]);

const progress = computed(() => {
  if (items.value.length === 0) return 0;
  const completed = items.value.filter(i => i.status === 'success' || i.status === 'failed').length;
  return (completed / items.value.length) * 100;
});

function parseLinks(): string[] {
  return linksInput.value
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function reset() {
  linksInput.value = '';
  isProcessing.value = false;
  showResults.value = false;
  items.value = [];
  accountId.value = props.defaultAccountId;
  lastJoinedConversationId.value = null;
}

function cancel() {
  open.value = false;
}

function closeResults() {
  open.value = false;
  emit('success', 'Đã hoàn tất tiến trình gia nhập nhóm', lastJoinedConversationId.value || undefined);
}

async function startJoin() {
  const links = parseLinks();
  if (links.length === 0 || !accountId.value) return;

  items.value = links.map(link => ({
    link,
    status: 'pending'
  }));

  isProcessing.value = true;
  showResults.value = true;

  for (let i = 0; i < items.value.length; i++) {
    const item = items.value[i];
    item.status = 'joining';

    // Parse clean invite linkId
    let rawInput = item.link;
    let cleanId = rawInput.trim();
    if (cleanId.includes('?')) {
      cleanId = cleanId.split('?')[0];
    }
    if (cleanId.includes('/')) {
      cleanId = cleanId.split('/').pop() || cleanId;
    }

    try {
      const res = await props.joinByLinkFn(accountId.value, cleanId);
      if (res) {
        item.status = 'success';
        if (res.conversationId) {
          lastJoinedConversationId.value = res.conversationId;
        }
      } else {
        item.status = 'failed';
        item.error = 'Thao tác thất bại từ Zalo API';
      }
    } catch (err: any) {
      item.status = 'failed';
      item.error = err.message || 'Lỗi kết nối';
    }

    // Delay a bit between joins to avoid rate limits
    if (i < items.value.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  isProcessing.value = false;
}
</script>

<style scoped>
.max-h-300 {
  max-height: 300px;
}
.border-bottom {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.border-bottom:last-child {
  border-bottom: none;
}
</style>
