-- Add group-specific notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_join';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_post';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'group_role_change';
