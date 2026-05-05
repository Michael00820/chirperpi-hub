-- Create community_services table
CREATE TABLE community_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    service_type service_type NOT NULL,
    pi_reward NUMERIC(20, 2) DEFAULT 0,
    status service_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_community_services_creator_id ON community_services(creator_id);
CREATE INDEX idx_community_services_service_type ON community_services(service_type);
CREATE INDEX idx_community_services_status ON community_services(status);
CREATE INDEX idx_community_services_created_at ON community_services(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_community_services_updated_at BEFORE UPDATE ON community_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();