-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'poll', 'pi_payment');
CREATE TYPE privacy_level AS ENUM ('public', 'followers', 'pi_community', 'private');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'care', 'celebrate', 'support', 'rocket');
CREATE TYPE group_privacy AS ENUM ('public', 'private');
CREATE TYPE group_category AS ENUM ('general', 'tech', 'business', 'entertainment', 'education', 'health', 'sports', 'other');
CREATE TYPE member_role AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE message_type AS ENUM ('text', 'image', 'pi_transaction');
CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment', 'mention', 'group_invite', 'pi_transaction');
CREATE TYPE service_type AS ENUM ('marketplace', 'education', 'governance', 'charity', 'events');
CREATE TYPE service_status AS ENUM ('active', 'completed', 'cancelled');