import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';

import type { Voice } from '../services/ttsService';
import { ttsService } from '../services/ttsService';

interface TTSSettings {
  selectedVoice: string | null;
  rate: number;
  pitch: number;
  volume: number;
  enabled: boolean;
}

interface TTSContextProps {
  settings: TTSSettings;
  voices: Voice[];
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  updateSettings: (settings: Partial<TTSSettings>) => void;
}

const TTSContext = createContext<TTSContextProps | undefined>(undefined);

const TTS_SETTINGS_KEY = 'acererak_tts_settings';

const defaultSettings: TTSSettings = {
  selectedVoice: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  enabled: true,
};

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<TTSSettings>(defaultSettings);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported] = useState(ttsService.isSupported());

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(TTS_SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse TTS settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = ttsService.getVoices();
      setVoices(availableVoices);

      // If no voice selected, select the default or first English voice
      if (!settings.selectedVoice && availableVoices.length > 0) {
        const defaultVoice =
          availableVoices.find(v => v.default) ||
          availableVoices.find(v => v.lang.startsWith('en')) ||
          availableVoices[0];
        if (defaultVoice) {
          setSettings(prev => ({
            ...prev,
            selectedVoice: defaultVoice.voiceURI,
          }));
        }
      }
    };

    // Load voices immediately
    loadVoices();

    // Also load when voices change (some browsers load them asynchronously)
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, settings.selectedVoice]);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !settings.enabled) return;

      setIsSpeaking(true);
      setIsPaused(false);

      ttsService.speak(text, {
        voice: settings.selectedVoice || undefined,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: error => {
          console.error('TTS error:', error);
          setIsSpeaking(false);
          setIsPaused(false);
        },
      });
    },
    [isSupported, settings]
  );

  const pause = useCallback(() => {
    ttsService.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    ttsService.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const value: TTSContextProps = {
    settings,
    voices,
    isSpeaking,
    isPaused,
    isSupported,
    speak,
    pause,
    resume,
    stop,
    updateSettings,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};
