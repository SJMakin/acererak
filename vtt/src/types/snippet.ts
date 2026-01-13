// Snippet types for the Transclusion System

export type SnippetCategory = 'spell' | 'ability' | 'rule' | 'custom';

export interface Snippet {
  id: string;
  name: string;
  content: string; // TipTap JSON document
  category: SnippetCategory;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SnippetCreateInput {
  name: string;
  content: string;
  category: SnippetCategory;
  description?: string;
  tags?: string[];
}

export interface SnippetUpdateInput {
  name?: string;
  content?: string;
  category?: SnippetCategory;
  description?: string;
  tags?: string[];
}
