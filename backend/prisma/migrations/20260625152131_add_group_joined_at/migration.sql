-- Migration: add_group_joined_at
-- Adds group_joined_at column to conversations table to track when the Zalo account joined the group.

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "group_joined_at" TIMESTAMP(3);
