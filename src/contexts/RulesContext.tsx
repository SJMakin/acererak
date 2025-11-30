import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

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
  const [rules, setRules] = useState<Rule[]>([]);

  const addRule = (rule: Omit<Rule, 'id'>) => {
    const newRule = {
      ...rule,
      id: Date.now().toString(),
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updatedFields: Partial<Rule>) => {
    setRules(
      rules.map(rule => (rule.id === id ? { ...rule, ...updatedFields } : rule))
    );
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  // Toggle a rule's enabled state
  const toggleRule = (id: string) => {
    setRules(
      rules.map(rule =>
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
    <RulesContext.Provider
      value={{
        rules,
        addRule,
        updateRule,
        deleteRule,
        toggleRule,
        getEnabledRulesForStoryContext,
      }}
    >
      {children}
    </RulesContext.Provider>
  );
};

export default RulesContext;
