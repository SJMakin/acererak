import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NPC {
  id: string;
  name: string;
  race: string;
  occupation: string;
  personality: string;
  notes: string;
}

interface NPCContextType {
  npcs: NPC[];
  addNPC: (npc: Omit<NPC, 'id'>) => void;
  updateNPC: (id: string, npc: Partial<NPC>) => void;
  deleteNPC: (id: string) => void;
  getNPCsForStoryContext: () => string[];
}

const NPCContext = createContext<NPCContextType | undefined>(undefined);

export const useNPCs = (): NPCContextType => {
  const context = useContext(NPCContext);
  if (!context) {
    throw new Error('useNPCs must be used within an NPCProvider');
  }
  return context;
};

interface NPCProviderProps {
  children: ReactNode;
}

export const NPCProvider: React.FC<NPCProviderProps> = ({ children }) => {
  const [npcs, setNPCs] = useState<NPC[]>([]);

  const addNPC = (npc: Omit<NPC, 'id'>) => {
    const newNPC = {
      ...npc,
      id: Date.now().toString(),
    };
    setNPCs([...npcs, newNPC]);
  };

  const updateNPC = (id: string, updatedFields: Partial<NPC>) => {
    setNPCs(
      npcs.map(npc => (npc.id === id ? { ...npc, ...updatedFields } : npc))
    );
  };

  const deleteNPC = (id: string) => {
    setNPCs(npcs.filter(npc => npc.id !== id));
  };

  // Format NPCs for use in story generation
  const getNPCsForStoryContext = () => {
    return npcs.map(
      npc =>
        `Name: ${npc.name}, Race: ${npc.race}, Occupation: ${npc.occupation}, Personality: ${npc.personality}, Notes: ${npc.notes}`
    );
  };

  return (
    <NPCContext.Provider
      value={{
        npcs,
        addNPC,
        updateNPC,
        deleteNPC,
        getNPCsForStoryContext,
      }}
    >
      {children}
    </NPCContext.Provider>
  );
};

export default NPCContext;
