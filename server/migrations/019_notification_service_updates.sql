-- Extend notification type to support service updates
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'service_update';

-- Add optional rich notification fields and aggregation support
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS target_url VARCHAR(2048),
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS aggregation_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS group_count INTEGER DEFAULT 1;

-- Create push subscription storage for web push notifications
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification preferences storage
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_follow BOOLEAN DEFAULT TRUE,
    push_like BOOLEAN DEFAULT TRUE,
    push_comment BOOLEAN DEFAULT TRUE,
    push_mention BOOLEAN DEFAULT TRUE,
    push_group_invite BOOLEAN DEFAULT TRUE,
    push_pi_transaction BOOLEAN DEFAULT TRUE,
    push_service_update BOOLEAN DEFAULT TRUE,
    email_digest_enabled BOOLEAN DEFAULT FALSE,
    email_digest_frequency VARCHAR(20) DEFAULT 'daily',
    sound_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for the new storage tables
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Cleanup function for old notifications and stale subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_notifications() RETURNS VOID AS $$
BEGIN
    DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM notification_subscriptions WHERE updated_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;
