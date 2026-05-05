-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_photo TEXT,
    privacy group_privacy DEFAULT 'public',
    category group_category DEFAULT 'general',
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_groups_creator_id ON groups(creator_id);
CREATE INDEX idx_groups_privacy ON groups(privacy);
CREATE INDEX idx_groups_category ON groups(category);
CREATE INDEX idx_groups_created_at ON groups(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();