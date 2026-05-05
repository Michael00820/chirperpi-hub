-- Enable Row Level Security on key tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can see their own data and verified users can see others
CREATE POLICY users_select_policy ON users
    FOR SELECT USING (
        id = current_setting('app.current_user_id')::UUID OR
        verification_status = 'verified'
    );

CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (id = current_setting('app.current_user_id')::UUID);

-- RLS Policies for posts table
-- Only verified users can view posts
CREATE POLICY posts_select_policy ON posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.current_user_id')::UUID
            AND users.verification_status = 'verified'
        )
    );

CREATE POLICY posts_insert_policy ON posts
    FOR INSERT WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = user_id
            AND users.verification_status = 'verified'
        )
    );

CREATE POLICY posts_update_policy ON posts
    FOR UPDATE USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Similar policies for comments
CREATE POLICY comments_select_policy ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.current_user_id')::UUID
            AND users.verification_status = 'verified'
        )
    );

CREATE POLICY comments_insert_policy ON comments
    FOR INSERT WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = user_id
            AND users.verification_status = 'verified'
        )
    );

-- For messages, private messages between verified users
CREATE POLICY messages_select_policy ON messages
    FOR SELECT USING (
        sender_id = current_setting('app.current_user_id')::UUID OR
        receiver_id = current_setting('app.current_user_id')::UUID OR
        (group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = messages.group_id
            AND gm.user_id = current_setting('app.current_user_id')::UUID
        ))
    );

-- Notifications for the user
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Note: You'll need to set the current_user_id in your application using set_config or similar