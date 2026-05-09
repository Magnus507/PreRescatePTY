-- Migration: add_performance_indexes
-- Generated: 2026-04-12
-- Purpose: Add database indexes to prevent full table scans on high-frequency queries
-- Apply via: Supabase SQL Editor, or run `prisma migrate deploy` with production DB credentials

-- Chip: scan lookup (shortCode already has UNIQUE index from schema)
-- Chip: dashboard count active chips per account
CREATE INDEX IF NOT EXISTS "Chip_accountId_idx" ON "Chip" ("accountId");

-- Chip: activation - find chips by owner
CREATE INDEX IF NOT EXISTS "Chip_ownerUserId_idx" ON "Chip" ("ownerUserId");

-- Chip: cron job - filter by status (expired, activated, etc.)
CREATE INDEX IF NOT EXISTS "Chip_status_idx" ON "Chip" ("status");

-- Chip: cron job - filter chips near expiry date
CREATE INDEX IF NOT EXISTS "Chip_serviceEndDate_idx" ON "Chip" ("serviceEndDate");

-- ScanEvent: AccountStateService - count scans per account (used in every dashboard load)
CREATE INDEX IF NOT EXISTS "ScanEvent_accountId_idx" ON "ScanEvent" ("accountId");

-- ScanEvent: history page - list scans per chip
CREATE INDEX IF NOT EXISTS "ScanEvent_chipId_idx" ON "ScanEvent" ("chipId");

-- ScanEvent: analytics - time-range queries
CREATE INDEX IF NOT EXISTS "ScanEvent_scannedAt_idx" ON "ScanEvent" ("scannedAt");

-- Profile: dashboard - list profiles per account
CREATE INDEX IF NOT EXISTS "Profile_accountId_idx" ON "Profile" ("accountId");

-- Notification: history per chip
CREATE INDEX IF NOT EXISTS "Notification_chipId_idx" ON "Notification" ("chipId");

-- Notification: filter pending/failed notifications for retry
CREATE INDEX IF NOT EXISTS "Notification_status_idx" ON "Notification" ("status");
