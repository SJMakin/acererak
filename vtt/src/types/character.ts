// Character types for the Reactive Character Sheet System

export type Character = {
  id: string;
  version?: number; // Incremented on each update for conflict resolution
  name: string;
  content: string; // TipTap JSON document
  shadowState: Record<string, number | string>; // Parsed stats
  projections: {
    // What shows on token
    bar?: string; // Key for HP bar (e.g., "HP")
    barMax?: string; // Key for HP max (e.g., "MaxHP")
    badge?: string; // Key for badge (e.g., "AC")
  };
  createdAt: string;
  updatedAt: string;
};

// P2P message types for character updates (prepared for later phases)
export interface CharacterUpdateMessage {
  type: 'character-update';
  character: Character;
}

export interface CharacterDeleteMessage {
  type: 'character-delete';
  characterId: string;
}

export type CharacterP2PMessage = CharacterUpdateMessage | CharacterDeleteMessage;
