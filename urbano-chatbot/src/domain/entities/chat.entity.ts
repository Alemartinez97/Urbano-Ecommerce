export type MessageRole = 'user' | 'assistant' | 'system';

export interface ToolCallInfo {
  id: string;
  name: string;
  args: any;
  result?: any;
  status: 'executing' | 'success' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  toolCalls?: ToolCallInfo[];
  isHumanHandover?: boolean;
  humanAgentName?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
