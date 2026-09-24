export const REWARD_MISSION_KINDS = [
  "profile_complete",
  "first_device_activated",
  "first_paid_order",
] as const;

export type RewardMissionKind = (typeof REWARD_MISSION_KINDS)[number];

export const COMMUNITY_METRICS = [
  "activated_units",
  "activated_members",
] as const;

export type CommunityMetricType = (typeof COMMUNITY_METRICS)[number];

export function communityProgressPercent(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

export function founderLabel(founderNumber: number) {
  const safe = Number.isInteger(founderNumber) && founderNumber > 0 ? founderNumber : 0;
  return `#${String(safe).padStart(4, "0")}`;
}
