import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiKeyContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    // 1) Prefer key stored in localStorage (set via Settings UI)
    try {
      const stored = localStorage.getItem('openRouterApiKey');
      if (stored && stored.length > 0) {
        return stored;
      }
    } catch {
      // Ignore storage errors (e.g. SSR, disabled storage)
    }

    // 2) Fall back to Vite environment variable (for local/dev testing)
    // This is expected to be defined in a gitignored .env.local file:
    // VITE_OPENROUTER_API_KEY=sk-...
    const envKey =
      ((import.meta as any).env?.VITE_OPENROUTER_API_KEY as string | undefined) ||
      '';

    return envKey;
  });

  const hasKey = apiKey.length > 0;

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openRouterApiKey', apiKey);
    } else {
      localStorage.removeItem('openRouterApiKey');
    }
  }, [apiKey]);

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, hasKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
