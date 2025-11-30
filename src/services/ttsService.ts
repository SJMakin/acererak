// Text-to-Speech service using Web Speech API
export interface Voice {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return this.synth !== null;
  }

  getVoices(): Voice[] {
    if (!this.synth) return [];
    
    const voices = this.synth.getVoices();
    return voices.map(v => ({
      name: v.name,
      lang: v.lang,
      default: v.default,
      localService: v.localService,
      voiceURI: v.voiceURI,
    }));
  }

  speak(
    text: string,
    options: {
      voice?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): void {
    if (!this.synth) {
      options.onError?.(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice if specified
    if (options.voice) {
      const voices = this.synth.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Set speech parameters
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    // Set event handlers
    utterance.onend = () => {
      this.currentUtterance = null;
      options.onEnd?.();
    };

    utterance.onerror = (event) => {
      this.currentUtterance = null;
      options.onError?.(new Error(`Speech synthesis error: ${event.error}`));
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  pause(): void {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  isPaused(): boolean {
    return this.synth?.paused ?? false;
  }
}

export const ttsService = new TTSService();