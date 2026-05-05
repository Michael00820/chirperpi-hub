-- Create transaction and Pi access support

CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    amount NUMERIC(20, 4) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    external_transaction_id VARCHAR(255),
    explorer_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pi_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

ALTER TABLE posts
  ADD COLUMN payment_amount NUMERIC(20, 4) DEFAULT 0,
  ADD COLUMN is_pi_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN pi_unlock_amount NUMERIC(20, 4) DEFAULT 0,
  ADD COLUMN donation_goal NUMERIC(20, 4) DEFAULT 0,
  ADD COLUMN donation_received NUMERIC(20, 4) DEFAULT 0;

CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_entity_type ON transactions(entity_type);
CREATE INDEX idx_transactions_entity_id ON transactions(entity_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_pi_access_user_post ON pi_access(user_id, post_id);
