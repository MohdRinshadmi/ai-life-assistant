export interface KnowledgeItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  source: 'note' | 'task' | 'import';
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeItemRequest {
  title: string;
  content: string;
  source?: 'note' | 'task' | 'import';
}

export interface UpdateKnowledgeItemRequest {
  title?: string;
  content?: string;
}

// Returned from search — includes relevance score
export interface KnowledgeSearchResult extends KnowledgeItem {
  similarity: number;
}
