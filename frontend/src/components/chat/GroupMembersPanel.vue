<template>
  <aside class="group-panel">
    <!-- Header -->
    <header class="gp-header">
      <button class="gp-close" title="Dong" @click="$emit('close')">x</button>
      <div class="gp-avatar-wrap">
        <Avatar
          :src="conversation.groupAvatarUrl ?? undefined"
          :name="groupName"
          :size="56"
          :is-group="true"
          :gradient-seed="conversation.id"
          class="gp-avatar"
        />
      </div>
      <div class="gp-group-name" :title="groupName">{{ groupName }}</div>
      <div class="gp-meta">
        <span v-if="conversation.groupMembersCount" class="gp-member-count">
          👥 {{ conversation.groupMembersCount }} thanh vien
        </span>
        <span v-if="joinedAtLabel" class="gp-joined">
          📅 Tham gia: {{ joinedAtLabel }}
        </span>
      </div>
    </header>

    <!-- Members list -->
    <div class="gp-body">
      <div class="gp-section-title">
        <span>Thanh vien nhom</span>
        <button class="gp-refresh-btn" :disabled="loading" title="Tai lai" @click="loadMembers">
          <span :class="{ spin: loading }">↻</span>
        </button>
      </div>

      <div v-if="loading" class="gp-loading">
        <v-progress-circular indeterminate size="24" color="primary" />
        <span class="gp-loading-text">Dang tai thanh vien...</span>
      </div>

      <div v-else-if="error" class="gp-error">
        <v-icon color="error" size="20">mdi-alert-circle-outline</v-icon>
        <span>{{ error }}</span>
        <button class="gp-retry" @click="loadMembers">Thu lai</button>
      </div>

      <div v-else-if="members.length === 0" class="gp-empty">
        Khong co du lieu thanh vien
      </div>

      <ul v-else class="gp-member-list">
        <li
          v-for="m in membersSorted"
          :key="m.uid"
          class="gp-member-item"
          :class="`role-${m.role}`"
        >
          <Avatar
            :src="m.avatar ?? undefined"
            :name="m.name"
            :size="36"
            :gradient-seed="m.uid"
            class="gp-member-avatar"
          />
          <div class="gp-member-info">
            <span class="gp-member-name">{{ m.name }}</span>
            <span class="gp-member-uid">UID: {{ m.uid }}</span>
          </div>
          <span v-if="m.role === 'owner'" class="gp-role-badge owner" title="Chu nhom">👑</span>
          <span v-else-if="m.role === 'admin'" class="gp-role-badge admin" title="Quan tri vien">🛡</span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { Conversation } from '@/composables/use-chat';
import Avatar from '@/components/ui/Avatar.vue';
import { api } from '@/api';

interface GroupMember {
  uid: string;
  name: string;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member';
}

const props = defineProps<{
  conversation: Conversation;
}>();

defineEmits<{ close: [] }>();

const members = ref<GroupMember[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const groupName = computed(() =>
  (props.conversation as any).groupName || 'Nhom khong ten'
);

const joinedAtLabel = computed(() => {
  const raw = (props.conversation as any).groupJoinedAt;
  if (!raw) return null;
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(raw));
  } catch {
    return null;
  }
});

/** Owner first, then admin, then member (alphabetical within tier) */
const membersSorted = computed(() => {
  const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
  return [...members.value].sort((a, b) => {
    const diff = (order[a.role] ?? 2) - (order[b.role] ?? 2);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'vi');
  });
});

async function loadMembers() {
  const accountId = props.conversation.zaloAccount?.id;
  const groupId = props.conversation.externalThreadId;
  if (!accountId || !groupId) {
    error.value = 'Thieu thong tin tai khoan hoac nhom';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get(`/zalo-accounts/${accountId}/groups/${groupId}/members`);
    members.value = res.data?.members ?? [];
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'Khong the tai danh sach thanh vien';
  } finally {
    loading.value = false;
  }
}

// Reload when conversation changes
watch(() => props.conversation.id, () => { loadMembers(); }, { immediate: false });
onMounted(() => { loadMembers(); });
</script>

<style scoped>
.group-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-1, #fff);
  border-left: 1px solid var(--border-subtle, #e5e7eb);
  font-size: 13px;
  overflow: hidden;
}

/* Header */
.gp-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 16px 16px;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #fff;
}

.gp-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: rgba(255,255,255,.2);
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  color: #fff;
  transition: background .15s;
}
.gp-close:hover { background: rgba(255,255,255,.4); }

.gp-avatar { border: 3px solid rgba(255,255,255,.6); border-radius: 50%; }

.gp-group-name {
  font-weight: 700;
  font-size: 15px;
  text-align: center;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gp-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 11.5px;
  opacity: .88;
}

/* Body */
.gp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 16px;
}

.gp-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text-muted, #6b7280);
}

.gp-refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-muted, #6b7280);
  padding: 2px 4px;
  border-radius: 4px;
  transition: color .15s, background .15s;
}
.gp-refresh-btn:hover:not(:disabled) { color: #0ea5e9; background: #e0f2fe; }
.gp-refresh-btn:disabled { opacity: .4; }

.spin { display: inline-block; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.gp-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
}
.gp-loading-text { color: var(--text-muted, #6b7280); }

.gp-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  color: var(--text-muted, #6b7280);
  text-align: center;
  font-size: 12px;
}
.gp-retry {
  color: #0ea5e9;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
}

.gp-empty {
  padding: 20px 16px;
  color: var(--text-muted, #6b7280);
  text-align: center;
  font-size: 12px;
}

/* Member list */
.gp-member-list {
  list-style: none;
  margin: 0;
  padding: 0 8px;
}

.gp-member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  transition: background .12s;
  cursor: default;
}
.gp-member-item:hover { background: var(--surface-2, #f3f4f6); }
.gp-member-item.role-owner { background: linear-gradient(90deg, #fef9c3 0%, transparent 60%); }
.gp-member-item.role-owner:hover { background: #fef08a55; }
.gp-member-item.role-admin { background: linear-gradient(90deg, #ede9fe 0%, transparent 60%); }
.gp-member-item.role-admin:hover { background: #ddd6fe55; }

.gp-member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.gp-member-name {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gp-member-uid {
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
}

.gp-role-badge {
  font-size: 16px;
  flex-shrink: 0;
}
</style>
