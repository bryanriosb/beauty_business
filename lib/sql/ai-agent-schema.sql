-- Agent Links: Enlaces para compartir el agente con control de acceso
CREATE TABLE IF NOT EXISTS agent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN (
            'single_use',
            'multi_use',
            'time_limited',
            'minute_limited'
        )
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'expired',
            'exhausted',
            'disabled'
        )
    ),
    token VARCHAR(255) NOT NULL UNIQUE,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    max_minutes INTEGER,
    minutes_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_links_business ON agent_links (business_id);

CREATE INDEX idx_agent_links_token ON agent_links (token);

CREATE INDEX idx_agent_links_status ON agent_links (status);

-- Agent Conversations: Sesiones de conversación con el agente
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    agent_link_id UUID REFERENCES agent_links (id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'completed',
            'abandoned'
        )
    ),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    actions_taken JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_conversations_business ON agent_conversations (business_id);

CREATE INDEX idx_agent_conversations_link ON agent_conversations (agent_link_id);

CREATE INDEX idx_agent_conversations_session ON agent_conversations (session_id);

CREATE INDEX idx_agent_conversations_status ON agent_conversations (status);

CREATE INDEX idx_agent_conversations_started ON agent_conversations (started_at DESC);

-- Agent Messages: Mensajes de las conversaciones
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    conversation_id UUID NOT NULL REFERENCES agent_conversations (id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN (
            'user',
            'assistant',
            'system',
            'tool'
        )
    ),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_call_id VARCHAR(255),
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_messages_conversation ON agent_messages (conversation_id);

CREATE INDEX idx_agent_messages_created ON agent_messages (created_at);

-- Function to increment message count
CREATE OR REPLACE FUNCTION increment_message_count(conv_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_conversations
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_links_updated
  BEFORE UPDATE ON agent_links
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

CREATE TRIGGER trigger_agent_conversations_updated
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

-- RLS Policies
ALTER TABLE agent_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- Policies for agent_links
CREATE POLICY "Users can view their business links" ON agent_links FOR
SELECT USING (
        business_id IN (
            SELECT id
            FROM businesses
            WHERE
                business_account_id IN (
                    SELECT bam.business_account_id
                    FROM
                        business_account_members bam
                        INNER JOIN users_profile up ON up.id = bam.user_profile_id
                    WHERE
                        up.user_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Users can manage their business links" ON agent_links FOR ALL USING (
    business_id IN (
        SELECT id
        FROM businesses
        WHERE
            business_account_id IN (
                SELECT bam.business_account_id
                FROM
                    business_account_members bam
                    INNER JOIN users_profile up ON up.id = bam.user_profile_id
                WHERE
                    up.user_id = auth.uid ()
            )
    )
);

-- Policies for agent_conversations
CREATE POLICY "Users can view their business conversations" ON agent_conversations FOR
SELECT USING (
        business_id IN (
            SELECT id
            FROM businesses
            WHERE
                business_account_id IN (
                    SELECT bam.business_account_id
                    FROM
                        business_account_members bam
                        INNER JOIN users_profile up ON up.id = bam.user_profile_id
                    WHERE
                        up.user_id = auth.uid ()
                )
        )
    );

-- Policies for agent_messages (through conversation)
CREATE POLICY "Users can view messages from their conversations" ON agent_messages FOR
SELECT USING (
        conversation_id IN (
            SELECT id
            FROM agent_conversations
            WHERE
                business_id IN (
                    SELECT id
                    FROM businesses
                    WHERE
                        business_account_id IN (
                            SELECT bam.business_account_id
                            FROM
                                business_account_members bam
                                INNER JOIN users_profile up ON up.id = bam.user_profile_id
                            WHERE
                                up.user_id = auth.uid ()
                        )
                )
        )
    );

-- Public access for agent links (via token)
CREATE POLICY "Public can access active links by token" ON agent_links FOR
SELECT USING (status = 'active');

CREATE POLICY "Public can create conversations via valid links" ON agent_conversations FOR INSERT
WITH
    CHECK (
        agent_link_id IN (
            SELECT id
            FROM agent_links
            WHERE
                status = 'active'
        )
    );

CREATE POLICY "Public can update their own conversations" ON agent_conversations
FOR UPDATE
    USING (session_id IS NOT NULL);

CREATE POLICY "Public can add messages to their conversations" ON agent_messages FOR INSERT
WITH
    CHECK (TRUE);