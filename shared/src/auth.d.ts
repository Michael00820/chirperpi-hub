export interface PiUser {
    uid: string;
    username: string;
    accessToken: string;
    paymentId?: string;
}
export interface AuthPayload {
    userId: string;
    piUserId: string;
    username: string;
    iat?: number;
    exp?: number;
}
export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        verificationStatus: string;
    };
    error?: string;
}
export interface PiAuthRequest {
    accessToken: string;
    paymentId?: string;
}
export interface SessionData {
    userId: string;
    piUserId: string;
    username: string;
    expiresAt: number;
}
export interface User {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    verificationStatus: string;
    role?: 'user' | 'moderator' | 'admin';
}
export interface Profile {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    coverPhoto?: string;
    bio?: string;
    piWalletAddress?: string;
    piBalance?: number;
    verificationStatus: string;
    location?: string;
    website?: string;
    socialLinks?: Record<string, string>;
    followersCount: number;
    followingCount: number;
    postsCount?: number;
    isOwnProfile: boolean;
    isFollowing?: boolean;
}
export interface Post {
    id: string;
    content: string;
    mediaUrls?: string[];
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
}
export interface SearchResult {
    users: User[];
    total: number;
    hasMore: boolean;
}
export interface TrendingTopic {
    tag: string;
    count: number;
    lastMentioned: string;
    example: string;
}
export interface CommunityServiceItem {
    id: string;
    title: string;
    description: string;
    category: string;
    url: string;
}
export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: string;
}
export interface ExploreSummary {
    trendingTopics: TrendingTopic[];
    suggestedUsers: User[];
    popularPosts: PostCard[];
    activeGroups: Group[];
    communityServices: CommunityServiceItem[];
    newsItems: NewsItem[];
}
export interface Group {
    id: string;
    name: string;
    description?: string;
    coverPhoto?: string;
    privacy: 'public' | 'private';
    category: 'general' | 'tech' | 'business' | 'entertainment' | 'education' | 'health' | 'sports' | 'other';
    memberCount: number;
    creatorId: string;
    creator?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    isMember?: boolean;
    isAdmin?: boolean;
    memberRole?: 'admin' | 'moderator' | 'member';
    createdAt: string;
    updatedAt: string;
    minPiBalance?: number;
}
export interface GroupMember {
    userId: string;
    groupId: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
    user: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
}
export interface CreateGroupRequest {
    name: string;
    description?: string;
    coverPhoto?: string;
    privacy: 'public' | 'private';
    category: 'general' | 'tech' | 'business' | 'entertainment' | 'education' | 'health' | 'sports' | 'other';
    minPiBalance?: number;
}
export interface UpdateGroupRequest {
    name?: string;
    description?: string;
    coverPhoto?: string;
    privacy?: 'public' | 'private';
    category?: 'general' | 'tech' | 'business' | 'entertainment' | 'education' | 'health' | 'sports' | 'other';
    minPiBalance?: number;
}
export interface GroupInvite {
    id: string;
    groupId: string;
    groupName: string;
    invitedBy: string;
    inviteCode: string;
    expiresAt: string;
    used: boolean;
    createdAt: string;
}
export interface GroupSearchResult {
    groups: Group[];
    total: number;
    hasMore: boolean;
}
export interface GroupFeed {
    posts: PostCard[];
    hasMore: boolean;
    nextCursor?: string;
}
export interface Transaction {
    id: string;
    senderId: string;
    receiverId: string;
    sender?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    receiver?: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    entityType: 'post' | 'comment' | 'post_unlock' | 'donation';
    entityId?: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    externalTransactionId?: string;
    explorerUrl?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface TransactionHistoryResult {
    transactions: Transaction[];
    total: number;
    hasMore: boolean;
}
export interface LeaderboardItem {
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    totalSupportGiven: number;
}
export interface CreatePostRequest {
    content: string;
    groupId?: string;
    mediaUrls?: string[];
    postType: 'text' | 'image' | 'video' | 'poll' | 'pi_payment';
    privacy: 'public' | 'followers' | 'pi_community' | 'private';
    pollOptions?: string[];
    paymentAmount?: number;
    isPiLocked?: boolean;
    piUnlockAmount?: number;
    donationGoal?: number;
    hashtags?: string[];
    mentions?: string[];
}
export interface PostCard extends Post {
    userId: string;
    groupId?: string;
    group?: {
        id: string;
        name: string;
        privacy: 'public' | 'private';
    };
    user: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    isPinned?: boolean;
    isPiLocked?: boolean;
    paymentAmount?: number;
    piUnlockAmount?: number;
    donationGoal?: number;
    donationReceived?: number;
    donationProgress?: number;
    postType: 'text' | 'image' | 'video' | 'poll' | 'pi_payment';
    privacy: 'public' | 'followers' | 'pi_community' | 'private';
    reactions?: ReactionCount[];
    userReaction?: 'like' | 'love' | 'care' | 'celebrate' | 'support' | 'rocket';
    editedAt?: string;
}
export interface ReactionCount {
    type: 'like' | 'love' | 'care' | 'celebrate' | 'support' | 'rocket';
    count: number;
}
export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    replies?: Comment[];
    isLiked?: boolean;
    likesCount: number;
}
export type NotificationType = 'follow' | 'like' | 'comment' | 'mention' | 'group_invite' | 'pi_transaction' | 'service_update' | 'group_join' | 'group_post' | 'group_role_change' | 'proposal_created' | 'proposal_voting_ended' | 'proposal_executed';
export interface Notification {
    id: string;
    userId?: string;
    actorId: string;
    actor?: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    notificationType: NotificationType;
    entityType?: string;
    entityId?: string;
    title?: string;
    message?: string;
    targetUrl?: string;
    metadata?: Record<string, string | number | boolean>;
    groupCount?: number;
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
}
export interface NotificationPreferences {
    userId: string;
    pushFollow: boolean;
    pushLike: boolean;
    pushComment: boolean;
    pushMention: boolean;
    pushGroupInvite: boolean;
    pushPiTransaction: boolean;
    pushServiceUpdate: boolean;
    emailDigestEnabled: boolean;
    emailDigestFrequency: 'daily' | 'weekly' | 'monthly';
    soundEnabled: boolean;
    pushEnabled: boolean;
}
export interface Timeline {
    posts: PostCard[];
    hasMore: boolean;
    nextCursor?: string;
}
export interface Proposal {
    id: string;
    title: string;
    description: string;
    category: 'governance' | 'treasury' | 'technical' | 'community' | 'other';
    status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'cancelled';
    creatorId: string;
    creator: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    votingOptions: VotingOption[];
    minPiBalance: number;
    votingDuration: number;
    startTime: string;
    endTime: string;
    totalVotes: number;
    votes: Vote[];
    executionData?: any;
    executedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface VotingOption {
    id: string;
    label: string;
    description?: string;
    voteCount: number;
    percentage: number;
}
export interface Vote {
    id: string;
    proposalId: string;
    voterId: string;
    voter: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        piBalance: number;
    };
    optionId: string;
    voteWeight: number;
    signature: string;
    votedAt: string;
}
export interface CreateProposalRequest {
    title: string;
    description: string;
    category: 'governance' | 'treasury' | 'technical' | 'community' | 'other';
    votingOptions: Omit<VotingOption, 'id' | 'voteCount' | 'percentage'>[];
    minPiBalance: number;
    votingDuration: number;
}
export interface CastVoteRequest {
    proposalId: string;
    optionId: string;
    signature: string;
}
export interface ProposalListResult {
    proposals: Proposal[];
    total: number;
    hasMore: boolean;
}
export interface ProposalResults {
    proposal: Proposal;
    winningOption?: VotingOption;
    totalVoteWeight: number;
    voterCount: number;
    quorumReached: boolean;
}
export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    avatarUrl?: string;
    participants: ConversationParticipant[];
    lastMessage?: Message;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
    isOnline?: boolean;
}
export interface ConversationParticipant {
    userId: string;
    user: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    role?: 'admin' | 'member';
    joinedAt: string;
    lastSeenAt?: string;
    isOnline: boolean;
}
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    sender: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    content: string;
    messageType: 'text' | 'image' | 'pi_transaction' | 'pi_payment_request' | 'system';
    mediaUrl?: string;
    piTransaction?: PiTransactionData;
    piPaymentRequest?: PiPaymentRequestData;
    replyToMessageId?: string;
    replyToMessage?: Message;
    reactions: MessageReaction[];
    isEdited: boolean;
    editedAt?: string;
    isRead: boolean;
    readBy: string[];
    createdAt: string;
    updatedAt: string;
}
export interface MessageReaction {
    id: string;
    messageId: string;
    userId: string;
    user: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    emoji: string;
    createdAt: string;
}
export interface PiTransactionData {
    transactionId: string;
    amount: number;
    currency: 'PI';
    fromUserId: string;
    toUserId: string;
    status: 'pending' | 'completed' | 'failed';
    explorerUrl?: string;
    notes?: string;
}
export interface PiPaymentRequestData {
    amount: number;
    currency: 'PI';
    description: string;
    requesterId: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: string;
}
export interface SendMessageRequest {
    conversationId: string;
    content: string;
    messageType: 'text' | 'image' | 'pi_transaction' | 'pi_payment_request';
    mediaUrl?: string;
    piTransaction?: PiTransactionData;
    piPaymentRequest?: PiPaymentRequestData;
    replyToMessageId?: string;
}
export interface CreateConversationRequest {
    type: 'direct' | 'group';
    participantIds: string[];
    name?: string;
    description?: string;
    avatarUrl?: string;
}
export interface ConversationListResult {
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
}
export interface MessageListResult {
    messages: Message[];
    total: number;
    hasMore: boolean;
}
export interface TypingIndicator {
    conversationId: string;
    userId: string;
    user: {
        id: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
    };
    timestamp: string;
}
export interface OnlineStatus {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string;
}
export interface ServerToClientEvents {
    message: (message: Message) => void;
    messageReaction: (reaction: MessageReaction) => void;
    typingStart: (indicator: TypingIndicator) => void;
    typingStop: (indicator: Omit<TypingIndicator, 'timestamp'>) => void;
    userOnline: (status: OnlineStatus) => void;
    userOffline: (status: OnlineStatus) => void;
    messageRead: (data: {
        messageId: string;
        userId: string;
        conversationId: string;
    }) => void;
    conversationUpdated: (conversation: Conversation) => void;
    conversationLoaded: (conversation: Conversation) => void;
    userJoined: (data: {
        conversationId: string;
        userId: string;
        timestamp: string;
    }) => void;
    userLeft: (data: {
        conversationId: string;
        userId: string;
        timestamp: string;
    }) => void;
}
export interface ClientToServerEvents {
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    sendMessage: (message: SendMessageRequest) => void;
    addReaction: (data: {
        messageId: string;
        emoji: string;
    }) => void;
    removeReaction: (data: {
        messageId: string;
        emoji: string;
    }) => void;
    typingStart: (conversationId: string) => void;
    typingStop: (conversationId: string) => void;
    markAsRead: (data: {
        messageId: string;
        conversationId: string;
    }) => void;
    goOnline: () => void;
    goOffline: () => void;
}
