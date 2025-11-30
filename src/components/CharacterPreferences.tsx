import React from 'react';
import './CharacterPreferences.css';

interface CharacterPreferencesProps {
  characterPreferences: string;
  onCharacterPreferencesChange: (preferences: string) => void;
}

const CharacterPreferences: React.FC<CharacterPreferencesProps> = ({
  characterPreferences,
  onCharacterPreferencesChange,
}) => {
  return (
    <div className="character-preferences">
      <h3>Character Preferences (Optional)</h3>
      <textarea
        value={characterPreferences}
        onChange={e => onCharacterPreferencesChange(e.target.value)}
        placeholder="e.g., Elf wizard who specializes in fire magic, or leave blank for a random character"
        rows={6}
      />
      <p className="hint">
        You can specify race, class, background, or any other details you want.
      </p>
    </div>
  );
};

export default CharacterPreferences;
