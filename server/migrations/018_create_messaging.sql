-- Create conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(255),
    description TEXT,
    avatar_url VARCHAR(2048),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation participants table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    is_online BOOLEAN DEFAULT false,
    UNIQUE(conversation_id, user_id)
);

-- Create enhanced messages table for conversations
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(30) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'pi_transaction', 'pi_payment_request', 'system')),
    media_url VARCHAR(2048),
    reply_to_message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message reactions table
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create message read receipts table
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create typing indicators table
CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pi transactions in messages table
CREATE TABLE message_pi_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL UNIQUE,
    amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'PI',
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    explorer_url VARCHAR(2048),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pi payment requests table
CREATE TABLE message_payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'PI',
    description TEXT NOT NULL,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_is_online ON conversation_participants(is_online);

CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_sender_id ON conversation_messages(sender_id);
CREATE INDEX idx_conversation_messages_message_type ON conversation_messages(message_type);
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages(created_at);
CREATE INDEX idx_conversation_messages_is_read ON conversation_messages(is_read);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);

CREATE INDEX idx_typing_indicators_conversation_id ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_user_id ON typing_indicators(user_id);

CREATE INDEX idx_message_pi_transactions_message_id ON message_pi_transactions(message_id);
CREATE INDEX idx_message_pi_transactions_from_user_id ON message_pi_transactions(from_user_id);
CREATE INDEX idx_message_pi_transactions_to_user_id ON message_pi_transactions(to_user_id);
CREATE INDEX idx_message_pi_transactions_status ON message_pi_transactions(status);

CREATE INDEX idx_message_payment_requests_message_id ON message_payment_requests(message_id);
CREATE INDEX idx_message_payment_requests_requester_id ON message_payment_requests(requester_id);
CREATE INDEX idx_message_payment_requests_status ON message_payment_requests(status);

-- Enable RLS on messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_pi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_payment_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY conversations_select ON conversations FOR SELECT
    USING (
        created_by = current_setting('app.current_user_id', true)::UUID OR
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

CREATE POLICY conversations_insert ON conversations FOR INSERT
    WITH CHECK (created_by = current_setting('app.current_user_id', true)::UUID);

CREATE POLICY conversations_update ON conversations FOR UPDATE
    USING (
        created_by = current_setting('app.current_user_id', true)::UUID OR
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID AND role = 'admin'
        )
    );

-- RLS Policies for conversation participants
CREATE POLICY conversation_participants_select ON conversation_participants FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)::UUID OR
        conversation_id IN (
            SELECT id FROM conversations WHERE created_by = current_setting('app.current_user_id', true)::UUID
        )
    );

CREATE POLICY conversation_participants_insert ON conversation_participants FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE created_by = current_setting('app.current_user_id', true)::UUID
        ) OR user_id = current_setting('app.current_user_id', true)::UUID
    );

-- RLS Policies for messages
CREATE POLICY conversation_messages_select ON conversation_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

CREATE POLICY conversation_messages_insert ON conversation_messages FOR INSERT
    WITH CHECK (
        sender_id = current_setting('app.current_user_id', true)::UUID AND
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID
        )
    );

CREATE POLICY conversation_messages_update ON conversation_messages FOR UPDATE
    USING (
        sender_id = current_setting('app.current_user_id', true)::UUID OR
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = current_setting('app.current_user_id', true)::UUID AND role = 'admin'
        )
    );

-- RLS Policies for message reactions
CREATE POLICY message_reactions_all ON message_reactions FOR ALL
    USING (
        message_id IN (
            SELECT id FROM conversation_messages 
            WHERE conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    );

-- RLS Policies for read receipts
CREATE POLICY message_read_receipts_select ON message_read_receipts FOR SELECT
    USING (
        message_id IN (
            SELECT id FROM conversation_messages 
            WHERE conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    );

CREATE POLICY message_read_receipts_insert ON message_read_receipts FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.current_user_id', true)::UUID AND
        message_id IN (
            SELECT id FROM conversation_messages 
            WHERE conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = current_setting('app.current_user_id', true)::UUID
            )
        )
    );

-- Helper function to get conversation with latest message
CREATE OR REPLACE FUNCTION get_conversation_with_latest(p_conversation_id UUID)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    name VARCHAR,
    description TEXT,
    avatar_url VARCHAR,
    last_message_id UUID,
    last_message_content TEXT,
    last_message_created_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
SELECT
    c.id,
    c.type,
    c.name,
    c.description,
    c.avatar_url,
    m.id,
    m.content,
    m.created_at,
    (
        SELECT COUNT(*) FROM conversation_messages
        WHERE conversation_id = p_conversation_id
        AND is_read = false
        AND sender_id != current_setting('app.current_user_id', true)::UUID
    )
FROM conversations c
LEFT JOIN LATERAL (
    SELECT id, content, created_at
    FROM conversation_messages
    WHERE conversation_id = p_conversation_id
    ORDER BY created_at DESC
    LIMIT 1
) m ON true
WHERE c.id = p_conversation_id;
$$ LANGUAGE SQL SECURITY DEFINER;
