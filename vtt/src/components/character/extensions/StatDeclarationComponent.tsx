import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useState, useEffect } from 'react';
import './StatDeclaration.css';

interface StatDeclarationComponentProps {
  node: {
    attrs: {
      key: string;
      value: string | number;
      projections: string[];
    };
  };
  updateAttributes: (attrs: { key?: string; value?: string | number; projections?: string[] }) => void;
  selected: boolean;
  extension: {
    name: string;
  };
}

export function StatDeclarationComponent({
  node,
  updateAttributes,
  selected,
}: StatDeclarationComponentProps) {
  const { key, value, projections } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(key);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditKey(key);
    setEditValue(value);
  }, [key, value]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ key: editKey, value: editValue });
    setIsEditing(false);
  }, [editKey, editValue, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditKey(key);
    setEditValue(value);
    setIsEditing(false);
  }, [key, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const toggleProjection = useCallback(
    (projection: 'bar' | 'badge') => {
      const newProjections = projections.includes(projection)
        ? projections.filter((p) => p !== projection)
        : [...projections, projection];
      updateAttributes({ projections: newProjections });
    },
    [projections, updateAttributes]
  );

  if (isEditing) {
    return (
      <NodeViewWrapper className={`stat-declaration stat-declaration--editing ${selected ? 'stat-declaration--selected' : ''}`}>
        <span className="stat-declaration__bracket">[</span>
        <input
          type="text"
          className="stat-declaration__key-input"
          value={editKey}
          onChange={(e) => setEditKey(e.target.value)}
          placeholder="Stat name"
          autoFocus
        />
        <span className="stat-declaration__separator">: </span>
        <input
          type={typeof editValue === 'number' ? 'number' : 'text'}
          className="stat-declaration__value-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Value"
          onKeyDown={handleKeyDown}
        />
        <span className="stat-declaration__bracket">▾]</span>
        
        <div className="stat-declaration__projections">
          <button
            type="button"
            className={`stat-declaration__projection-btn ${projections.includes('bar') ? 'stat-declaration__projection-btn--active' : ''}`}
            onClick={() => toggleProjection('bar')}
            title="Project to token bar (HP)"
          >
            📊 #bar
          </button>
          <button
            type="button"
            className={`stat-declaration__projection-btn ${projections.includes('badge') ? 'stat-declaration__projection-btn--active' : ''}`}
            onClick={() => toggleProjection('badge')}
            title="Project to token badge (AC)"
          >
            🏷️ #badge
          </button>
        </div>
        
        <div className="stat-declaration__actions">
          <button type="button" className="stat-declaration__save-btn" onClick={handleSave}>
            ✓
          </button>
          <button type="button" className="stat-declaration__cancel-btn" onClick={handleCancel}>
            ✕
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={`stat-declaration ${selected ? 'stat-declaration--selected' : ''}`}>
      <span className="stat-declaration__bracket">[</span>
      <span className="stat-declaration__key">{key}</span>
      <span className="stat-declaration__separator">: </span>
      <span className="stat-declaration__value">{value}</span>
      <span className="stat-declaration__dropdown">▾</span>
      <span className="stat-declaration__bracket">]</span>
      
      {projections.length > 0 && (
        <span className="stat-declaration__projection-icons">
          {projections.includes('bar') && <span className="stat-declaration__icon" title="Projects to token bar">📊</span>}
          {projections.includes('badge') && <span className="stat-declaration__icon" title="Projects to token badge">🏷️</span>}
        </span>
      )}
      
      <button
        type="button"
        className="stat-declaration__edit-trigger"
        onClick={handleClick}
        title="Click to edit"
      />
    </NodeViewWrapper>
  );
}
