import { useState, useEffect, useCallback } from 'react';
import { useCharacterStore } from '../../stores/characterStore';
import { CharacterSheetEditor } from './CharacterSheetEditor';
import type { Character } from '../../types';
import './CharacterSheetModal.css';

interface CharacterSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId?: string | null;
  tokenId?: string; // Optional: link to token element
}

export function CharacterSheetModal({
  isOpen,
  onClose,
  characterId,
  tokenId,
}: CharacterSheetModalProps) {
  const { addCharacter, updateCharacter, getCharacterById, deleteCharacter } = useCharacterStore();
  
  const [name, setName] = useState('');
  const [content, setContent] = useState('{"type":"doc","content":[{"type":"paragraph"}]}');
  const [shadowState, setShadowState] = useState<Record<string, number | string>>({});
  const [projections, setProjections] = useState<Character['projections']>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing character data
  useEffect(() => {
    if (characterId) {
      const character = getCharacterById(characterId);
      if (character) {
        setName(character.name);
        setContent(character.content);
        setShadowState(character.shadowState);
        setProjections(character.projections);
        setIsEditing(true);
      }
    } else {
      // New character
      setName('');
      setContent('{"type":"doc","content":[{"type":"paragraph"}]}');
      setShadowState({});
      setProjections({});
      setIsEditing(false);
    }
  }, [characterId, getCharacterById]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      alert('Please enter a character name');
      return;
    }

    if (isEditing && characterId) {
      // Update existing character
      updateCharacter(characterId, {
        name: name.trim(),
        content,
        shadowState,
        projections,
      });
    } else {
      // Create new character
      const newId = addCharacter({
        name: name.trim(),
        content,
        shadowState,
        projections,
      });
      
      // If tokenId is provided, update the token with character reference
      if (tokenId) {
        // This will be handled by the caller via props/callback
        console.log('New character created:', newId);
      }
    }

    onClose();
  }, [name, content, shadowState, projections, isEditing, characterId, tokenId, addCharacter, updateCharacter, onClose]);

  const handleDelete = useCallback(() => {
    if (characterId) {
      deleteCharacter(characterId);
      onClose();
    }
  }, [characterId, deleteCharacter, onClose]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleProjectionsChange = useCallback((key: 'bar' | 'barMax' | 'badge', value: string) => {
    setProjections(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="character-sheet-modal-overlay" onClick={onClose}>
      <div className="character-sheet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="character-sheet-modal__header">
          <h2>{isEditing ? 'Edit Character' : 'Create Character'}</h2>
          <button className="character-sheet-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="character-sheet-modal__body">
          <div className="character-sheet-modal__name-field">
            <label htmlFor="character-name">Character Name</label>
            <input
              id="character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter character name..."
            />
          </div>

          <div className="character-sheet-modal__projections">
            <h3>Token Projections (Optional)</h3>
            <div className="character-sheet-modal__projection-fields">
              <div className="projection-field">
                <label>HP Bar Key</label>
                <input
                  type="text"
                  value={projections.bar || ''}
                  onChange={(e) => handleProjectionsChange('bar', e.target.value)}
                  placeholder="e.g., HP"
                />
              </div>
              <div className="projection-field">
                <label>HP Max Key</label>
                <input
                  type="text"
                  value={projections.barMax || ''}
                  onChange={(e) => handleProjectionsChange('barMax', e.target.value)}
                  placeholder="e.g., MaxHP"
                />
              </div>
              <div className="projection-field">
                <label>Badge Key (AC)</label>
                <input
                  type="text"
                  value={projections.badge || ''}
                  onChange={(e) => handleProjectionsChange('badge', e.target.value)}
                  placeholder="e.g., AC"
                />
              </div>
            </div>
          </div>

          <div className="character-sheet-modal__editor">
            <h3>Character Sheet</h3>
            <CharacterSheetEditor
              content={content}
              onChange={handleContentChange}
              showMarkdownPanel
            />
          </div>
        </div>

        <div className="character-sheet-modal__footer">
          {isEditing && (
            <button
              className="character-sheet-modal__delete"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          )}
          <div className="character-sheet-modal__actions">
            <button className="character-sheet-modal__cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="character-sheet-modal__save" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Create Character'}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="character-sheet-modal__confirm-overlay">
            <div className="character-sheet-modal__confirm-dialog">
              <h3>Delete Character?</h3>
              <p>Are you sure you want to delete "{name}"? This action cannot be undone.</p>
              <div className="character-sheet-modal__confirm-actions">
                <button
                  className="character-sheet-modal__confirm-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="character-sheet-modal__confirm-delete"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
