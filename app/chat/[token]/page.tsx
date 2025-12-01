import { AgentChatWidget } from '@/components/agent-chat'

interface ChatPageProps {
  params: Promise<{ token: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { token } = await params

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <AgentChatWidget token={token} className="flex-1" />
      </div>
    </main>
  )
}
