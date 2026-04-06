// Sheet types for the generic markdown-based content pad system

export type Sheet = {
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
  category?: string; // e.g., "Character", "Token", "Location", "Note"
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

// P2P message types for sheet updates (prepared for later phases)
export interface SheetUpdateMessage {
  type: 'sheet-update';
  sheet: Sheet;
}

export interface SheetDeleteMessage {
  type: 'sheet-delete';
  sheetId: string;
}

export type SheetP2PMessage = SheetUpdateMessage | SheetDeleteMessage;
