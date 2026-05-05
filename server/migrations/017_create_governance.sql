-- Create governance proposals and voting system

CREATE TYPE proposal_status AS ENUM ('draft', 'active', 'passed', 'rejected', 'executed', 'cancelled');
CREATE TYPE proposal_category AS ENUM ('governance', 'treasury', 'technical', 'community', 'other');

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category proposal_category NOT NULL DEFAULT 'other',
    status proposal_status NOT NULL DEFAULT 'draft',
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voting_options JSONB NOT NULL, -- Array of {id, label, description}
    min_pi_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
    voting_duration INTEGER NOT NULL, -- in hours
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    total_votes INTEGER DEFAULT 0,
    execution_data JSONB, -- For storing execution parameters
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_id VARCHAR(50) NOT NULL,
    vote_weight NUMERIC(20, 4) NOT NULL, -- Based on Pi balance or verification level
    signature TEXT NOT NULL, -- Pi wallet signature for verification
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, voter_id)
);

-- Indexes for performance
CREATE INDEX idx_proposals_creator_id ON proposals(creator_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_category ON proposals(category);
CREATE INDEX idx_proposals_start_time ON proposals(start_time);
CREATE INDEX idx_proposals_end_time ON proposals(end_time);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_voted_at ON votes(voted_at);

-- RLS policies
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Proposals are visible to all authenticated users
CREATE POLICY "Proposals are viewable by authenticated users" ON proposals
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create proposals
CREATE POLICY "Users can create proposals" ON proposals
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Only creators can update their draft proposals
CREATE POLICY "Creators can update draft proposals" ON proposals
    FOR UPDATE USING (auth.uid() = creator_id AND status = 'draft');

-- Votes are viewable by authenticated users
CREATE POLICY "Votes are viewable by authenticated users" ON votes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own votes
CREATE POLICY "Users can cast votes" ON votes
    FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Function to calculate proposal results
CREATE OR REPLACE FUNCTION calculate_proposal_results(proposal_uuid UUID)
RETURNS TABLE (
    option_id VARCHAR(50),
    vote_count BIGINT,
    total_weight NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.option_id,
        COUNT(*) as vote_count,
        SUM(v.vote_weight) as total_weight
    FROM votes v
    WHERE v.proposal_id = proposal_uuid
    GROUP BY v.option_id
    ORDER BY total_weight DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can vote on proposal
CREATE OR REPLACE FUNCTION can_user_vote(proposal_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    proposal_record RECORD;
    user_balance NUMERIC;
BEGIN
    -- Get proposal details
    SELECT * INTO proposal_record FROM proposals WHERE id = proposal_uuid;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if proposal is active
    IF proposal_record.status != 'active' THEN
        RETURN FALSE;
    END IF;

    -- Check voting period
    IF NOW() < proposal_record.start_time OR NOW() > proposal_record.end_time THEN
        RETURN FALSE;
    END IF;

    -- Check if user already voted
    IF EXISTS (SELECT 1 FROM votes WHERE proposal_id = proposal_uuid AND voter_id = user_uuid) THEN
        RETURN FALSE;
    END IF;

    -- Check minimum Pi balance
    SELECT pi_balance INTO user_balance FROM profiles WHERE id = user_uuid;
    IF user_balance < proposal_record.min_pi_balance THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;