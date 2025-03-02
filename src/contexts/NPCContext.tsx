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
  removeNPC: (id: string) => void;
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
  const [npcs, setNPCs] = useState<NPC[]>([
    {
      id: '1',
      name: 'Gundren Rockseeker',
      race: 'Dwarf',
      occupation: 'Tavern Owner',
      personality: 'Gruff but fair, knows all the local gossip',
      notes: 'Has a mysterious scar on his right hand that he refuses to talk about.',
    },
    {
      id: '2',
      name: 'Sildar Hallwinter',
      race: 'Human',
      occupation: 'Town Guard Captain',
      personality: 'Dutiful and honorable, takes his job very seriously',
      notes: 'Former adventurer who settled down after an injury. Has connections to the local nobility.',
    },
  ]);

  const addNPC = (npc: Omit<NPC, 'id'>) => {
    const newNPC = {
      ...npc,
      id: Date.now().toString(),
    };
    setNPCs([...npcs, newNPC]);
  };

  const updateNPC = (id: string, updatedFields: Partial<NPC>) => {
    setNPCs(
      npcs.map((npc) =>
        npc.id === id ? { ...npc, ...updatedFields } : npc
      )
    );
  };

  const removeNPC = (id: string) => {
    setNPCs(npcs.filter((npc) => npc.id !== id));
  };
  
  // Alias for removeNPC to match the interface used in GameContext
  const deleteNPC = (id: string) => {
    removeNPC(id);
  };
  
  // Format NPCs for use in story generation
  const getNPCsForStoryContext = () => {
    return npcs.map(npc => 
      `Name: ${npc.name}, Race: ${npc.race}, Occupation: ${npc.occupation}, Personality: ${npc.personality}, Notes: ${npc.notes}`
    );
  };

  return (
    <NPCContext.Provider value={{ 
      npcs, 
      addNPC, 
      updateNPC, 
      removeNPC, 
      deleteNPC, 
      getNPCsForStoryContext 
    }}>
      {children}
    </NPCContext.Provider>
  );
};

export default NPCContext;
