import { useState } from 'react';
import { useCharacterStore } from '../../stores/characterStore';
import type { Character } from '../../types';
import { CharacterSheetModal } from './CharacterSheetModal';
import './CharacterLibraryPanel.css';

interface CharacterLibraryPanelProps {
  onSelectCharacter?: (character: Character) => void;
  onLinkToToken?: (characterId: string) => void;
}

export function CharacterLibraryPanel({
  onSelectCharacter,
  onLinkToToken,
}: CharacterLibraryPanelProps) {
  const { characters, deleteCharacter } = useCharacterStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleEdit = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedCharacterId(null);
    setIsModalOpen(true);
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

  return (
    <div className="character-library-panel">
      <div className="character-library-panel__header">
        <h3>Characters</h3>
        <button className="character-library-panel__create" onClick={handleCreateNew}>
          + New
        </button>
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

      <CharacterSheetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCharacterId(null);
        }}
        characterId={selectedCharacterId}
      />
    </div>
  );
}
