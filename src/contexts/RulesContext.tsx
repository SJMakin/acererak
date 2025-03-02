import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Rule {
  id: string;
  title: string;
  description: string;
  enabled?: boolean;
}

interface RulesContextType {
  rules: Rule[];
  addRule: (rule: Omit<Rule, 'id'>) => void;
  updateRule: (id: string, rule: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  getEnabledRulesForStoryContext: () => string[];
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const useRules = (): RulesContextType => {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
};

interface RulesProviderProps {
  children: ReactNode;
}

export const RulesProvider: React.FC<RulesProviderProps> = ({ children }) => {
  const [rules, setRules] = useState<Rule[]>([
    {
      id: '1',
      title: 'Critical Hits',
      description: 'On a natural 20, the player rolls damage dice twice and adds modifiers once. Additionally, the player can choose one of the following effects: Disarm the opponent, Knock the opponent prone, or Deal additional bleeding damage (1d4 per round for 3 rounds).',
    },
    {
      id: '2',
      title: 'Resting',
      description: 'Short rests take 30 minutes instead of 1 hour. During a long rest, characters regain all hit points and half of their spent Hit Dice.',
    },
    {
      id: '3',
      title: 'Magic Items',
      description: 'Players can attune to 4 magic items instead of the standard 3. Identifying a magic item requires a short rest and a successful Arcana check (DC 15).',
    },
  ]);

  const addRule = (rule: Omit<Rule, 'id'>) => {
    const newRule = {
      ...rule,
      id: Date.now().toString(),
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updatedFields: Partial<Rule>) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, ...updatedFields } : rule
      )
    );
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((rule) => rule.id !== id));
  };
  
  // Alias for removeRule to match the interface used in GameContext
  const deleteRule = (id: string) => {
    removeRule(id);
  };
  
  // Toggle a rule's enabled state
  const toggleRule = (id: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };
  
  // Format rules for use in story generation
  const getEnabledRulesForStoryContext = () => {
    return rules
      .filter(rule => rule.enabled !== false) // Include rules that are enabled or don't have the enabled property
      .map(rule => `${rule.title}: ${rule.description}`);
  };

  return (
    <RulesContext.Provider value={{ 
      rules, 
      addRule, 
      updateRule, 
      removeRule,
      deleteRule,
      toggleRule,
      getEnabledRulesForStoryContext
    }}>
      {children}
    </RulesContext.Provider>
  );
};

export default RulesContext;
