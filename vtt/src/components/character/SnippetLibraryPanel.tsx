import { useState, useEffect } from 'react';
import { useSnippetStore, setSnippetStoreGM } from '../../stores/snippetStore';
import type { Snippet, SnippetCategory } from '../../types/snippet';
import './SnippetLibraryPanel.css';

interface SnippetLibraryPanelProps {
  onInsertSnippet?: (snippetName: string) => void;
  isGM?: boolean;
}

export function SnippetLibraryPanel({
  onInsertSnippet,
  isGM = false,
}: SnippetLibraryPanelProps) {
  const { snippets, searchSnippets, addSnippet, updateSnippet, deleteSnippet, loadFromDB } = useSnippetStore();
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SnippetCategory | 'all'>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorName, setEditorName] = useState('');
  const [editorCategory, setEditorCategory] = useState<SnippetCategory>('custom');
  const [editorDescription, setEditorDescription] = useState('');

  useEffect(() => {
    setSnippetStoreGM(isGM);
    if (isGM) {
      loadFromDB();
    }
  }, [isGM, loadFromDB]);

  const filteredSnippets = snippets.filter((snippet) => {
    const matchesSearch = filter === '' || 
      snippet.name.toLowerCase().includes(filter.toLowerCase()) ||
      snippet.description?.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || snippet.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateNew = () => {
    setEditingSnippet(null);
    setEditorName('');
    setEditorContent('{"type":"doc","content":[{"type":"paragraph"}]}');
    setEditorCategory('custom');
    setEditorDescription('');
    setShowEditor(true);
  };

  const handleEdit = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setEditorName(snippet.name);
    setEditorContent(snippet.content);
    setEditorCategory(snippet.category);
    setEditorDescription(snippet.description || '');
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editorName.trim()) {
      alert('Please enter a snippet name');
      return;
    }

    if (editingSnippet) {
      updateSnippet(editingSnippet.id, {
        name: editorName.trim(),
        content: editorContent,
        category: editorCategory,
        description: editorDescription,
      });
    } else {
      addSnippet({
        name: editorName.trim(),
        content: editorContent,
        category: editorCategory,
        description: editorDescription,
      });
    }

    setShowEditor(false);
  };

  const handleDelete = (snippetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this snippet?')) {
      deleteSnippet(snippetId);
    }
  };

  const handleInsert = (snippet: Snippet) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet.name);
    }
  };

  const getCategoryColor = (category: SnippetCategory): string => {
    switch (category) {
      case 'spell': return '#8b5cf6';
      case 'ability': return '#10b981';
      case 'rule': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (showEditor) {
    return (
      <div className="snippet-library-panel">
        <div className="snippet-library-panel__header">
          <h3>{editingSnippet ? 'Edit Snippet' : 'Create Snippet'}</h3>
          <button onClick={() => setShowEditor(false)}>×</button>
        </div>
        
        <div className="snippet-library-panel__form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="Snippet name"
            />
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <select
              value={editorCategory}
              onChange={(e) => setEditorCategory(e.target.value as SnippetCategory)}
            >
              <option value="spell">Spell</option>
              <option value="ability">Ability</option>
              <option value="rule">Rule</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={editorDescription}
              onChange={(e) => setEditorDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          
          <div className="form-group">
            <label>Content (JSON)</label>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={10}
              placeholder='{"type":"doc","content":[...]}'
            />
          </div>
          
          <div className="form-actions">
            <button onClick={() => setShowEditor(false)}>Cancel</button>
            <button onClick={handleSave}>Save Snippet</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="snippet-library-panel">
      <div className="snippet-library-panel__header">
        <h3>Snippet Library</h3>
        {isGM && (
          <button onClick={handleCreateNew}>+ New</button>
        )}
      </div>

      <div className="snippet-library-panel__filters">
        <input
          type="text"
          placeholder="Search snippets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as SnippetCategory | 'all')}
        >
          <option value="all">All</option>
          <option value="spell">Spells</option>
          <option value="ability">Abilities</option>
          <option value="rule">Rules</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="snippet-library-panel__list">
        {filteredSnippets.length === 0 ? (
          <div className="snippet-library-panel__empty">
            {snippets.length === 0
              ? 'No snippets yet. Create one to get started.'
              : 'No snippets match your search.'}
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="snippet-library-panel__item"
              onClick={() => handleInsert(snippet)}
            >
              <div className="snippet-library-panel__item-header">
                <span 
                  className="snippet-library-panel__category"
                  style={{ backgroundColor: getCategoryColor(snippet.category) }}
                >
                  {snippet.category}
                </span>
                <span className="snippet-library-panel__item-name">{snippet.name}</span>
              </div>
              {snippet.description && (
                <p className="snippet-library-panel__item-desc">{snippet.description}</p>
              )}
              <div className="snippet-library-panel__item-actions">
                {isGM && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(snippet);
                      }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => handleDelete(snippet.id, e)}
                      title="Delete"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
