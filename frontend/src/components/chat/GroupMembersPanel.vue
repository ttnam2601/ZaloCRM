<template>
  <aside class="group-panel">
    <!-- Header -->
    <header class="gp-header">
      <button class="gp-close" title="Đóng" @click="$emit('close')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <div class="gp-avatar-wrap">
        <Avatar
          :src="conversation.groupAvatarUrl ?? undefined"
          :name="groupName"
          :size="64"
          :is-group="true"
          :gradient-seed="conversation.id"
          class="gp-avatar"
        />
        <div class="gp-avatar-ring" />
      </div>

      <div class="gp-group-name" :title="groupName">{{ groupName }}</div>

      <div class="gp-meta">
        <div v-if="conversation.groupMembersCount" class="gp-meta-chip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          {{ conversation.groupMembersCount }} thành viên
        </div>
        <div v-if="joinedAtLabel" class="gp-meta-chip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          Tham gia {{ joinedAtLabel }}
        </div>
      </div>
      <div v-if="conversation.contact" class="gp-care-status mt-2">
        <CareStatusBadge
          :model-value="groupContactStatus"
          @update:model-value="onChangeGroupStatus"
        />
      </div>
    </header>

    <!-- ════════ Tab bar ════════ -->
    <nav class="gp-tabs">
      <button
        class="gp-tab"
        :class="{ active: activeTab === 'members' }"
        @click="activeTab = 'members'"
      >
        <span class="ic">👥</span> Thành viên
      </button>
      <button
        class="gp-tab"
        :class="{ active: activeTab === 'notes' }"
        @click="activeTab = 'notes'"
      >
        <span class="ic">📝</span> Ghi chú
      </button>
    </nav>

    <!-- Body -->
    <div class="gp-body" :class="{ 'no-scroll': activeTab === 'notes' }">
      <!-- TAB 1: MEMBERS -->
      <div v-show="activeTab === 'members'" class="gp-tab-pane">
        <!-- Section title -->
        <div class="gp-section-title">
          <span>Thành viên nhóm</span>
          <button class="gp-refresh-btn" :disabled="loading" title="Tải lại danh sách" @click="() => loadMembers(true)">
            <svg :class="{ spin: loading }" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="gp-loading">
          <div class="gp-spinner">
            <div class="gp-spinner-ring" />
          </div>
          <span class="gp-loading-text">Đang tải danh sách thành viên...</span>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="gp-error">
          <div class="gp-error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <p>{{ error }}</p>
          <button class="gp-retry-btn" @click="() => loadMembers()">Thử lại</button>
        </div>

        <!-- Empty -->
        <div v-else-if="members.length === 0" class="gp-empty">
          <div class="gp-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <p>Không có dữ liệu thành viên</p>
        </div>

        <!-- Member list -->
        <ul v-else class="gp-member-list">
          <li
            v-for="m in membersSorted"
            :key="m.uid"
            class="gp-member-item"
            :class="`role-${m.role}`"
          >
            <div class="gp-member-avatar-wrap">
              <Avatar
                :src="m.avatar ?? undefined"
                :name="m.name"
                :size="38"
                :gradient-seed="m.uid"
                class="gp-member-avatar"
              />
              <span v-if="m.role === 'owner'" class="gp-role-dot owner" title="Chủ nhóm">👑</span>
              <span v-else-if="m.role === 'admin'" class="gp-role-dot admin" title="Quản trị viên">🛡️</span>
            </div>
            <div class="gp-member-info">
              <span class="gp-member-name">{{ m.name }}</span>
              <span class="gp-member-uid">{{ m.uid }}</span>
            </div>
            <span v-if="m.role === 'owner'" class="gp-role-label owner">Chủ nhóm</span>
            <span v-else-if="m.role === 'admin'" class="gp-role-label admin">Phó nhóm</span>
          </li>
        </ul>
      </div>

      <!-- TAB 2: NOTES -->
      <div v-show="activeTab === 'notes'" class="gp-tab-pane gp-notes-pane">
        <section class="gp-section gp-notes-section">
          <CustomerTimelineSection
            :contact-id="conversation.contact?.id || null"
            :contact-name="groupName"
          />
        </section>
      </div>
    </div>

    <!-- Footer: Leave Group Button -->
    <div class="gp-footer">
      <button class="gp-leave-btn" @click="openLeaveDialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
        </svg>
        Rời nhóm
      </button>
    </div>

    <!-- Leave Group Dialog -->
    <div v-if="leaveDialogOpen" class="gp-dialog-overlay" @click.self="leaveDialogOpen = false">
      <div class="gp-dialog">
        <div class="gp-dialog-header">
          <div class="gp-dialog-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </div>
          <h3>Rời khỏi nhóm?</h3>
        </div>

        <div class="gp-dialog-body">
          <p>Bạn có chắc muốn rời nhóm <strong>{{ groupName }}</strong>? Lịch sử trò chuyện vẫn được giữ lại trên hệ thống.</p>

          <label class="gp-silent-toggle" :class="{ checked: leaveSilent }">
            <div class="gp-toggle-track" @click="leaveSilent = !leaveSilent">
              <div class="gp-toggle-thumb" :class="{ active: leaveSilent }" />
            </div>
            <div class="gp-toggle-label">
              <span class="gp-toggle-title">Rời nhóm trong im lặng</span>
              <span class="gp-toggle-desc">Không gửi thông báo cho các thành viên khác</span>
            </div>
          </label>
        </div>

        <div v-if="leaveError" class="gp-dialog-error">
          {{ leaveError }}
        </div>

        <div class="gp-dialog-actions">
          <button class="gp-dialog-cancel" @click="leaveDialogOpen = false">Hủy</button>
          <button class="gp-dialog-confirm" :disabled="leaveLoading" @click="confirmLeave">
            <span v-if="leaveLoading" class="gp-btn-spinner" />
            <span v-else>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -2px; margin-right: 4px">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              Rời nhóm
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { Conversation } from '@/composables/use-chat';
import Avatar from '@/components/ui/Avatar.vue';
import { api } from '@/api';
import { useToast } from '@/composables/use-toast';
import CustomerTimelineSection from './CustomerTimelineSection.vue';
import CareStatusBadge from '@/components/ui/CareStatusBadge.vue';
import { useContacts } from '@/composables/use-contacts';

const { updateContact } = useContacts();
const groupContactStatus = ref<string | null>(null);

interface GroupMember {
  uid: string;
  name: string;
  avatar: string | null;
  role: 'owner' | 'admin' | 'member';
}

const props = defineProps<{
  conversation: Conversation;
}>();

const activeTab = ref<'members' | 'notes'>('members');

const emit = defineEmits<{
  close: [];
  left: [];
}>();

const members = ref<GroupMember[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Leave group state
const leaveDialogOpen = ref(false);
const leaveSilent = ref(true); // mặc định im lặng
const leaveLoading = ref(false);
const leaveError = ref<string | null>(null);
const toast = useToast();

groupContactStatus.value = props.conversation.contact?.status || null;
watch(() => props.conversation.contact?.status, (newStatus) => {
  groupContactStatus.value = newStatus || null;
});

async function onChangeGroupStatus(value: string) {
  const contactId = props.conversation.contact?.id;
  if (!contactId) return;
  groupContactStatus.value = value;
  try {
    await updateContact(contactId, { status: value });
    toast.success('Cập nhật trạng thái nhóm thành công');
    window.dispatchEvent(new CustomEvent('timeline-updated', { detail: { contactId } }));
  } catch (err) {
    toast.error('Lỗi khi cập nhật trạng thái nhóm');
  }
}

const groupName = computed(() =>
  (props.conversation as any).groupName || 'Nhóm không tên'
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
    const nameA = a.name || (a as any).displayName || '';
    const nameB = b.name || (b as any).displayName || '';
    return nameA.localeCompare(nameB, 'vi');
  });
});

async function loadMembers(force: boolean = false) {
  const accountId = props.conversation.zaloAccount?.id;
  const groupId = props.conversation.externalThreadId;
  if (!accountId || !groupId) {
    error.value = 'Thiếu thông tin tài khoản hoặc nhóm';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const url = `/zalo-accounts/${accountId}/groups/${groupId}/members` + (force ? '?refresh=true' : '');
    const res = await api.get(url);
    members.value = res.data?.members ?? [];
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'Không thể tải danh sách thành viên';
  } finally {
    loading.value = false;
  }
}

function openLeaveDialog() {
  leaveSilent.value = true;
  leaveError.value = null;
  leaveDialogOpen.value = true;
}

async function confirmLeave() {
  const accountId = props.conversation.zaloAccount?.id;
  const groupId = props.conversation.externalThreadId;
  if (!accountId || !groupId) {
    leaveError.value = 'Thiếu thông tin cuộc trò chuyện hoặc tài khoản Zalo';
    return;
  }
  leaveLoading.value = true;
  leaveError.value = null;
  try {
    await api.post(`/zalo-accounts/${accountId}/groups/${groupId}/leave`, { silent: leaveSilent.value });
    leaveDialogOpen.value = false;
    toast.success('Đã rời nhóm thành công');
    emit('left');
    emit('close');
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || 'Lỗi kết nối';
    leaveError.value = msg;
    toast.error('Rời nhóm thất bại: ' + msg);
  } finally {
    leaveLoading.value = false;
  }
}

// Reload when conversation changes
watch(() => props.conversation.id, () => {
  activeTab.value = 'members';
  loadMembers();
}, { immediate: false });
onMounted(() => { loadMembers(); });
</script>

<style scoped>
/* ─── Import Google Font hỗ trợ tiếng Việt ─── */
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

.group-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  font-family: 'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  overflow: hidden;
  position: relative;
}

/* ─── Header ─── */
.gp-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px 20px;
  background: linear-gradient(145deg, #0f4c75 0%, #1b6ca8 45%, #6366f1 100%);
  color: #fff;
  flex-shrink: 0;
}

.gp-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  cursor: pointer;
  color: #fff;
  transition: background 0.18s, transform 0.15s;
  backdrop-filter: blur(4px);
}
.gp-close:hover {
  background: rgba(255, 255, 255, 0.32);
  transform: scale(1.1);
}

.gp-avatar-wrap {
  position: relative;
  margin-top: 4px;
}

.gp-avatar {
  border: 3px solid rgba(255, 255, 255, 0.7) !important;
  border-radius: 50% !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.gp-avatar-ring {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  animation: pulse-ring 2.5s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

.gp-group-name {
  font-weight: 700;
  font-size: 15.5px;
  text-align: center;
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.gp-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.gp-meta-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  backdrop-filter: blur(4px);
}

/* ─── Body ─── */
.gp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 8px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.gp-body::-webkit-scrollbar { width: 4px; }
.gp-body::-webkit-scrollbar-track { background: transparent; }
.gp-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* ─── Section Title ─── */
.gp-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.gp-refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.15s;
}
.gp-refresh-btn:hover:not(:disabled) {
  color: #1b6ca8;
  border-color: #1b6ca8;
  background: #eff6ff;
}
.gp-refresh-btn:disabled { opacity: 0.4; cursor: default; }

.spin { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Loading ─── */
.gp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 32px 16px;
}

.gp-spinner {
  width: 36px;
  height: 36px;
  position: relative;
}
.gp-spinner-ring {
  width: 100%;
  height: 100%;
  border: 3px solid #e2e8f0;
  border-top-color: #1b6ca8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.gp-loading-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

/* ─── Error ─── */
.gp-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
  text-align: center;
}
.gp-error-icon { color: #f87171; }
.gp-error p { font-size: 12px; color: #64748b; margin: 0; }

.gp-retry-btn {
  padding: 6px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1b6ca8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.gp-retry-btn:hover { background: #dbeafe; }

/* ─── Empty ─── */
.gp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: #94a3b8;
}
.gp-empty p { font-size: 12px; margin: 0; }

/* ─── Member List ─── */
.gp-member-list {
  list-style: none;
  margin: 0;
  padding: 0 8px 4px;
}

.gp-member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  transition: background 0.13s;
  cursor: default;
  margin-bottom: 2px;
}
.gp-member-item:hover { background: #f1f5f9; }
.gp-member-item.role-owner {
  background: linear-gradient(90deg, #fefce8 0%, transparent 70%);
}
.gp-member-item.role-owner:hover { background: linear-gradient(90deg, #fef9c3 0%, #f9fafb 70%); }
.gp-member-item.role-admin {
  background: linear-gradient(90deg, #f5f3ff 0%, transparent 70%);
}
.gp-member-item.role-admin:hover { background: linear-gradient(90deg, #ede9fe 0%, #f9fafb 70%); }

.gp-member-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.gp-role-dot {
  position: absolute;
  bottom: -2px;
  right: -4px;
  font-size: 11px;
  line-height: 1;
}

.gp-member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gp-member-name {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gp-member-uid {
  font-size: 10.5px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gp-role-label {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  letter-spacing: 0.03em;
}
.gp-role-label.owner {
  background: #fef9c3;
  color: #a16207;
  border: 1px solid #fde047;
}
.gp-role-label.admin {
  background: #ede9fe;
  color: #7c3aed;
  border: 1px solid #c4b5fd;
}

/* ─── Footer: Leave Button ─── */
.gp-footer {
  flex-shrink: 0;
  padding: 10px 12px 14px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.gp-leave-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: #fff0f0;
  border: 1.5px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
  letter-spacing: 0.01em;
}
.gp-leave-btn:hover {
  background: #fee2e2;
  border-color: #f87171;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.18);
  transform: translateY(-1px);
}
.gp-leave-btn:active { transform: translateY(0); }

/* ─── Leave Group Dialog ─── */
.gp-dialog-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: fade-in 0.18s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.gp-dialog {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.3), 0 4px 16px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 300px;
  overflow: hidden;
  animation: slide-up 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slide-up {
  from { transform: translateY(20px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.gp-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.gp-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: #fee2e2;
  border-radius: 10px;
  color: #dc2626;
  flex-shrink: 0;
}

.gp-dialog-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  font-family: inherit;
}

.gp-dialog-body {
  padding: 14px 18px;
}

.gp-dialog-body p {
  margin: 0 0 14px;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

/* Toggle switch */
.gp-silent-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.gp-silent-toggle:hover { border-color: #94a3b8; background: #f1f5f9; }
.gp-silent-toggle.checked { border-color: #3b82f6; background: #eff6ff; }

.gp-toggle-track {
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  background: #cbd5e1;
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
  cursor: pointer;
}
.gp-silent-toggle.checked .gp-toggle-track { background: #3b82f6; }

.gp-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gp-toggle-thumb.active { left: 21px; }

.gp-toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gp-toggle-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #1e293b;
}
.gp-toggle-desc {
  font-size: 11px;
  color: #64748b;
}

.gp-dialog-error {
  color: #ef4444;
  font-size: 11.5px;
  padding: 4px 18px 8px;
  line-height: 1.4;
  word-break: break-word;
}

/* Dialog actions */
.gp-dialog-actions {
  display: flex;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid #f1f5f9;
}

.gp-dialog-cancel {
  flex: 1;
  padding: 9px;
  background: #f1f5f9;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.gp-dialog-cancel:hover { background: #e2e8f0; }

.gp-dialog-confirm {
  flex: 1.2;
  padding: 9px;
  background: #dc2626;
  border: none;
  border-radius: 9px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: inherit;
}
.gp-dialog-confirm:hover:not(:disabled) {
  background: #b91c1c;
  box-shadow: 0 3px 10px rgba(220, 38, 38, 0.35);
}
.gp-dialog-confirm:disabled { opacity: 0.7; cursor: default; }

.gp-btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ─── Tabs & Tab Panels ─── */
.gp-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.gp-tab {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  position: relative;
  transition: all 0.15s;
}

.gp-tab .ic {
  font-size: 14px;
  line-height: 1;
}

.gp-tab:hover {
  color: #1b6ca8;
  background: #f1f5f9;
}

.gp-tab.active {
  color: #1b6ca8;
  border-bottom-color: #1b6ca8;
  background: #fff;
  font-weight: 600;
}

.gp-tab-pane {
  display: flex;
  flex-direction: column;
}

.gp-notes-pane {
  padding: 12px 14px;
}

.gp-notes-section {
  display: flex;
  flex-direction: column;
}

.gp-body.no-scroll {
  overflow-y: hidden;
}
</style>
