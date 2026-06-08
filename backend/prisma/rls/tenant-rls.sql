-- ============================================================================
-- tenant-rls.sql — Phase 1a Postgres Row-Level Security (Bảo mật xác thực)
-- Sinh tự động từ prisma/schema.prisma (62 bảng org-scoped, cột org_id).
-- ============================================================================
-- BIÊN GIỚI CHÍNH cô lập tenant (T1-A). Bắt MỌI query shape kể cả raw SQL,
-- updateMany, nested write — thứ Prisma extension dễ sót.
--
-- ⚠️ CHƯA APPLY tự động. Quy trình rollout an toàn:
--   1. App set per-connection: SELECT set_config('app.current_org', $orgId, true)
--      trong tenant-scoped transaction (withTenant → SET LOCAL).
--   2. Chạy app với TENANT_GUARD_MODE=warn trên staging tới khi 0 cảnh báo
--      (mọi worker đã withTenant).
--   3. Apply file này trên staging, test IDOR HTTP 6 path CRITICAL.
--   4. Apply production + TENANT_GUARD_MODE=enforce.
--
-- LƯU Ý ROLE: DB role app dùng KHÔNG được là superuser/owner (BYPASSRLS).
-- Owner bảng bỏ qua RLS trừ khi FORCE. Dùng FORCE + role thường cho app.
-- Migration/seed chạy bằng role owner (bypass) là chủ ý.
-- ============================================================================

-- Helper: đọc org hiện hành từ session var (NULL nếu chưa set → policy chặn hết).
-- current_setting(..., true) = missing_ok → trả NULL thay vì lỗi.

-- teams
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "teams";
CREATE POLICY tenant_isolation ON "teams"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- zalo_accounts
ALTER TABLE "zalo_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zalo_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "zalo_accounts";
CREATE POLICY tenant_isolation ON "zalo_accounts"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- sdk_limits
ALTER TABLE "sdk_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sdk_limits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "sdk_limits";
CREATE POLICY tenant_isolation ON "sdk_limits"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- zalo_account_status_log
ALTER TABLE "zalo_account_status_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zalo_account_status_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "zalo_account_status_log";
CREATE POLICY tenant_isolation ON "zalo_account_status_log"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- Contact
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Contact";
CREATE POLICY tenant_isolation ON "Contact"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- statuses
ALTER TABLE "statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "statuses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "statuses";
CREATE POLICY tenant_isolation ON "statuses"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- Conversation
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Conversation";
CREATE POLICY tenant_isolation ON "Conversation"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- phone_search_events
ALTER TABLE "phone_search_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phone_search_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "phone_search_events";
CREATE POLICY tenant_isolation ON "phone_search_events"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- system_notify_recipients
ALTER TABLE "system_notify_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_notify_recipients" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "system_notify_recipients";
CREATE POLICY tenant_isolation ON "system_notify_recipients"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- system_notifications
ALTER TABLE "system_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "system_notifications";
CREATE POLICY tenant_isolation ON "system_notifications"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- appointments
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appointments";
CREATE POLICY tenant_isolation ON "appointments"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- notes
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "notes";
CREATE POLICY tenant_isolation ON "notes"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- crm_tags
ALTER TABLE "crm_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_tags" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "crm_tags";
CREATE POLICY tenant_isolation ON "crm_tags"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- crm_tag_groups
ALTER TABLE "crm_tag_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_tag_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "crm_tag_groups";
CREATE POLICY tenant_isolation ON "crm_tag_groups"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- tags
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tags";
CREATE POLICY tenant_isolation ON "tags"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- tag_groups
ALTER TABLE "tag_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tag_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tag_groups";
CREATE POLICY tenant_isolation ON "tag_groups"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- zalo_labels
ALTER TABLE "zalo_labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zalo_labels" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "zalo_labels";
CREATE POLICY tenant_isolation ON "zalo_labels"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- ActivityLog
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ActivityLog";
CREATE POLICY tenant_isolation ON "ActivityLog"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- daily_message_stats
ALTER TABLE "daily_message_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_message_stats" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "daily_message_stats";
CREATE POLICY tenant_isolation ON "daily_message_stats"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- Integration
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Integration";
CREATE POLICY tenant_isolation ON "Integration"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- app_settings
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "app_settings";
CREATE POLICY tenant_isolation ON "app_settings"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- duplicate_groups
ALTER TABLE "duplicate_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "duplicate_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "duplicate_groups";
CREATE POLICY tenant_isolation ON "duplicate_groups"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- parent_candidates
ALTER TABLE "parent_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parent_candidates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "parent_candidates";
CREATE POLICY tenant_isolation ON "parent_candidates"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- SavedReport
ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedReport" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SavedReport";
CREATE POLICY tenant_isolation ON "SavedReport"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- automation_rules
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "automation_rules";
CREATE POLICY tenant_isolation ON "automation_rules"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- message_templates
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "message_templates";
CREATE POLICY tenant_isolation ON "message_templates"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- ai_configs
ALTER TABLE "ai_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_configs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ai_configs";
CREATE POLICY tenant_isolation ON "ai_configs"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- AiSuggestionApplied
ALTER TABLE "AiSuggestionApplied" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSuggestionApplied" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AiSuggestionApplied";
CREATE POLICY tenant_isolation ON "AiSuggestionApplied"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- ai_suggestions
ALTER TABLE "ai_suggestions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_suggestions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ai_suggestions";
CREATE POLICY tenant_isolation ON "ai_suggestions"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- pinned_conversations
ALTER TABLE "pinned_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pinned_conversations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "pinned_conversations";
CREATE POLICY tenant_isolation ON "pinned_conversations"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- GroupPoll
ALTER TABLE "GroupPoll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupPoll" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "GroupPoll";
CREATE POLICY tenant_isolation ON "GroupPoll"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- friendship_attempts
ALTER TABLE "friendship_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "friendship_attempts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "friendship_attempts";
CREATE POLICY tenant_isolation ON "friendship_attempts"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- Friend
ALTER TABLE "Friend" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friend" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Friend";
CREATE POLICY tenant_isolation ON "Friend"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- contact_access
ALTER TABLE "contact_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_access" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "contact_access";
CREATE POLICY tenant_isolation ON "contact_access"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- scoring_configs
ALTER TABLE "scoring_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scoring_configs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "scoring_configs";
CREATE POLICY tenant_isolation ON "scoring_configs"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- score_signal_rules
ALTER TABLE "score_signal_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "score_signal_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "score_signal_rules";
CREATE POLICY tenant_isolation ON "score_signal_rules"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- StageTransitionRule
ALTER TABLE "StageTransitionRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StageTransitionRule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "StageTransitionRule";
CREATE POLICY tenant_isolation ON "StageTransitionRule"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- stuck_thresholds
ALTER TABLE "stuck_thresholds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stuck_thresholds" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "stuck_thresholds";
CREATE POLICY tenant_isolation ON "stuck_thresholds"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- NbaTemplate
ALTER TABLE "NbaTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NbaTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "NbaTemplate";
CREATE POLICY tenant_isolation ON "NbaTemplate"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- account_folders
ALTER TABLE "account_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_folders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "account_folders";
CREATE POLICY tenant_isolation ON "account_folders"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- SavedFilterPreset
ALTER TABLE "SavedFilterPreset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavedFilterPreset" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SavedFilterPreset";
CREATE POLICY tenant_isolation ON "SavedFilterPreset"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- block_folders
ALTER TABLE "block_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "block_folders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "block_folders";
CREATE POLICY tenant_isolation ON "block_folders"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- Block
ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Block" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Block";
CREATE POLICY tenant_isolation ON "Block"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- AutomationSequence
ALTER TABLE "AutomationSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationSequence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AutomationSequence";
CREATE POLICY tenant_isolation ON "AutomationSequence"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- AutomationTrigger
ALTER TABLE "AutomationTrigger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationTrigger" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AutomationTrigger";
CREATE POLICY tenant_isolation ON "AutomationTrigger"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- AutomationBroadcast
ALTER TABLE "AutomationBroadcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationBroadcast" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AutomationBroadcast";
CREATE POLICY tenant_isolation ON "AutomationBroadcast"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- automation_campaigns
ALTER TABLE "automation_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_campaigns" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "automation_campaigns";
CREATE POLICY tenant_isolation ON "automation_campaigns"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- automation_event_log
ALTER TABLE "automation_event_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_event_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "automation_event_log";
CREATE POLICY tenant_isolation ON "automation_event_log"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- contact_engagement_daily
ALTER TABLE "contact_engagement_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_engagement_daily" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "contact_engagement_daily";
CREATE POLICY tenant_isolation ON "contact_engagement_daily"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- customer_lists
ALTER TABLE "customer_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_lists" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "customer_lists";
CREATE POLICY tenant_isolation ON "customer_lists"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- trigger_queue_entries
ALTER TABLE "trigger_queue_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trigger_queue_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "trigger_queue_entries";
CREATE POLICY tenant_isolation ON "trigger_queue_entries"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- departments
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "departments";
CREATE POLICY tenant_isolation ON "departments"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- PermissionGroup
ALTER TABLE "PermissionGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionGroup" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PermissionGroup";
CREATE POLICY tenant_isolation ON "PermissionGroup"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- lead_requests
ALTER TABLE "lead_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lead_requests";
CREATE POLICY tenant_isolation ON "lead_requests"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- LeadPoolConfig
ALTER TABLE "LeadPoolConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeadPoolConfig" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "LeadPoolConfig";
CREATE POLICY tenant_isolation ON "LeadPoolConfig"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- lead_pool_bonus_quotas
ALTER TABLE "lead_pool_bonus_quotas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_pool_bonus_quotas" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lead_pool_bonus_quotas";
CREATE POLICY tenant_isolation ON "lead_pool_bonus_quotas"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- facebook_page_accounts
ALTER TABLE "facebook_page_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "facebook_page_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "facebook_page_accounts";
CREATE POLICY tenant_isolation ON "facebook_page_accounts"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- facebook_leadgen_forms
ALTER TABLE "facebook_leadgen_forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "facebook_leadgen_forms" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "facebook_leadgen_forms";
CREATE POLICY tenant_isolation ON "facebook_leadgen_forms"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- WebhookLog
ALTER TABLE "WebhookLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "WebhookLog";
CREATE POLICY tenant_isolation ON "WebhookLog"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- meta_campaign_cache
ALTER TABLE "meta_campaign_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meta_campaign_cache" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "meta_campaign_cache";
CREATE POLICY tenant_isolation ON "meta_campaign_cache"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

-- notify_dedup_state
ALTER TABLE "notify_dedup_state" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notify_dedup_state" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "notify_dedup_state";
CREATE POLICY tenant_isolation ON "notify_dedup_state"
  USING ("org_id" = current_setting('app.current_org', true)::uuid)
  WITH CHECK ("org_id" = current_setting('app.current_org', true)::uuid);

