-- Table for feedback and bug reports
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('bug_report', 'feature_request', 'general_feedback', 'complaint')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    attachment_urls TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX idx_feedback_business_id ON feedback(business_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_severity ON feedback(severity);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);

-- RLS policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback from their business" ON feedback
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can create feedback for their business" ON feedback
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own feedback" ON feedback
    FOR UPDATE USING (
        auth.uid() = user_id
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_feedback_updated_at_trigger
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Comments for documentation
COMMENT ON TABLE feedback IS 'Table to store user feedback, bug reports, and feature requests';
COMMENT ON COLUMN feedback.type IS 'Type of feedback: bug_report, feature_request, general_feedback, complaint';
COMMENT ON COLUMN feedback.severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN feedback.status IS 'Current status: open, in_progress, resolved, closed';
COMMENT ON COLUMN feedback.priority IS 'Priority level from 1 (lowest) to 5 (highest)';
COMMENT ON COLUMN feedback.attachment_urls IS 'Array of URLs for attached files or screenshots';
COMMENT ON COLUMN feedback.metadata IS 'Additional metadata like browser info, user agent, etc.';