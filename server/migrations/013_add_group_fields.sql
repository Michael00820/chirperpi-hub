-- Add group_id to posts and min_pi_balance to groups
ALTER TABLE groups
  ADD COLUMN min_pi_balance NUMERIC(20,2) DEFAULT 0;

ALTER TABLE posts
  ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX idx_posts_group_id ON posts(group_id);
