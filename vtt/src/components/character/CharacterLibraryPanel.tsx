import { useState, useRef } from 'react';
import { useCharacterStore } from '../../stores/characterStore';
import type { Character } from '../../types';
import { CharacterSheetModal } from './CharacterSheetModal';
import { getAllTemplates, getTemplateById, type TemplateId } from '../../services/characterTemplates';
import './CharacterLibraryPanel.css';

interface CharacterLibraryPanelProps {
  onSelectCharacter?: (character: Character) => void;
  onLinkToToken?: (characterId: string) => void;
}

export function CharacterLibraryPanel({
  onSelectCharacter,
  onLinkToToken,
}: CharacterLibraryPanelProps) {
  const { characters, deleteCharacter, addCharacter } = useCharacterStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templates = getAllTemplates();

  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleEdit = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setShowTemplatePicker(true);
  };

  const handleTemplateSelect = (templateId: TemplateId) => {
    const template = getTemplateById(templateId);
    if (template) {
      setSelectedCharacterId(null);
      setShowTemplatePicker(false);
      // Open modal with template content
      setIsModalOpen(true);
      // Store template content in a way the modal can access it
      localStorage.setItem('pendingTemplate', template.content);
    }
  };

  const handleSelect = (character: Character) => {
    if (onSelectCharacter) {
      onSelectCharacter(character);
    }
    if (onLinkToToken) {
      onLinkToToken(character.id);
    }
  };

  const handleDelete = (characterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this character?')) {
      deleteCharacter(characterId);
    }
  };

  const handleDuplicate = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    addCharacter({
      name: character.name + ' (Copy)',
      content: character.content,
      shadowState: character.shadowState,
      projections: character.projections,
    });
  };

  const handleExport = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    const exportData = JSON.stringify(character, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = character.name.replace(/[^a-z0-9]/gi, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const imported = JSON.parse(importText) as Character;
      if (imported.name && imported.content) {
        addCharacter({
          name: imported.name,
          content: imported.content,
          shadowState: imported.shadowState || {},
          projections: imported.projections || {},
        });
        setImportText('');
        setShowImportExport(false);
      } else {
        alert('Invalid character data');
      }
    } catch {
      alert('Failed to parse character JSON');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string) as Character;
          if (imported.name && imported.content) {
            addCharacter({
              name: imported.name,
              content: imported.content,
              shadowState: imported.shadowState || {},
              projections: imported.projections || {},
            });
          }
        } catch {
          alert('Failed to parse file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="character-library-panel">
      <div className="character-library-panel__header">
        <h3>Characters</h3>
        <div className="character-library-panel__actions">
          <button 
            className="character-library-panel__icon-btn"
            onClick={() => setShowImportExport(true)}
            title="Import/Export"
          >
            ⇄
          </button>
          <button 
            className="character-library-panel__create" 
            onClick={handleCreateNew}
          >
            + New
          </button>
        </div>
      </div>

      <div className="character-library-panel__search">
        <input
          type="text"
          placeholder="Search characters..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="character-library-panel__list">
        {filteredCharacters.length === 0 ? (
          <div className="character-library-panel__empty">
            {characters.length === 0
              ? 'No characters yet. Create one to get started.'
              : 'No characters match your search.'}
          </div>
        ) : (
          filteredCharacters.map((character) => (
            <div
              key={character.id}
              className="character-library-panel__item"
              onClick={() => handleSelect(character)}
            >
              <div className="character-library-panel__item-info">
                <span className="character-library-panel__item-name">{character.name}</span>
                <span className="character-library-panel__item-date">
                  {new Date(character.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="character-library-panel__item-actions">
                <button
                  className="character-library-panel__action"
                  onClick={(e) => handleDuplicate(character, e)}
                  title="Duplicate"
                >
                  ⧉
                </button>
                <button
                  className="character-library-panel__action"
                  onClick={(e) => handleExport(character, e)}
                  title="Export"
                >
                  ↓
                </button>
                <button
                  className="character-library-panel__edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(character.id);
                  }}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="character-library-panel__delete"
                  onClick={(e) => handleDelete(character.id, e)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="modal-overlay" onClick={() => setShowTemplatePicker(false)}>
          <div className="template-picker" onClick={(e) => e.stopPropagation()}>
            <h3>Choose a Template</h3>
            <div className="template-picker__grid">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="template-picker__item"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <span className="template-picker__name">{template.name}</span>
                  <span className="template-picker__desc">{template.description}</span>
                </button>
              ))}
            </div>
            <button 
              className="template-picker__cancel"
              onClick={() => setShowTemplatePicker(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <div className="modal-overlay" onClick={() => setShowImportExport(false)}>
          <div className="import-export-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import/Export Characters</h3>
            
            <div className="import-export-section">
              <h4>Import</h4>
              <div className="import-buttons">
                <button onClick={() => fileInputRef.current?.click()}>
                  📁 Import from File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  style={{ display: 'none' }}
                />
              </div>
              <textarea
                placeholder="Paste character JSON here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
              />
              <button 
                className="import-btn"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                Import
              </button>
            </div>
            
            <div className="import-export-section">
              <h4>Export All</h4>
              <button onClick={() => {
                const exportData = JSON.stringify(characters, null, 2);
                const blob = new Blob([exportData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'all_characters.json';
                a.click();
                URL.revokeObjectURL(url);
              }}>
                ↓ Export All Characters
              </button>
            </div>
            
            <button 
              className="import-export-close"
              onClick={() => setShowImportExport(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <CharacterSheetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCharacterId(null);
          localStorage.removeItem('pendingTemplate');
        }}
        characterId={selectedCharacterId}
      />
    </div>
  );
}
