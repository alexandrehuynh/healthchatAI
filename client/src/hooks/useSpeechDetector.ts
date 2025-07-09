import { useState, useRef, useCallback, useEffect } from 'react';

// TypeScript interfaces for speech detection
interface SpeechDetectorConfig {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  healthcareMode: boolean;
  silenceThreshold: number; // milliseconds
  turnDetectionTimeout: number; // milliseconds
  lang: string;
}

interface TranscriptResult {
  finalTranscript: string;
  interimTranscript: string;
  isComplete: boolean;
  confidence: number;
  totalLength: number;
}

interface SpeechDetectorState {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  lastActivity: number;
}

// Web Speech API type extensions
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

class HybridSpeechDetector {
  private recognition: SpeechRecognition | null = null;
  private config: SpeechDetectorConfig;
  private isRecording: boolean = false;
  private shouldContinue: boolean = false;
  
  // Transcript accumulation
  private accumulatedTranscript: string = '';
  private currentInterimTranscript: string = '';
  
  // Timing and activity detection
  private lastSpeechActivity: number = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private turnDetectionTimer: NodeJS.Timeout | null = null;
  
  // Callbacks
  private onTranscriptUpdate: ((result: TranscriptResult) => void) | null = null;
  private onStateChange: ((state: SpeechDetectorState) => void) | null = null;
  
  // Healthcare-specific patterns for turn detection
  private readonly healthcareCompletionPatterns = [
    /\b(thank you|thanks|that's all|that's it|done|finished)\b/i,
    /\b(any questions|questions\?|help me|advice)\b/i,
    /\b(what should I|should I|can you|could you)\b/i
  ];
  
  private readonly healthcareIncompletePatterns = [
    /\b(and|but|also|because|since|when|if|so|then)\s*$/i,
    /\b(I feel|I have|I'm experiencing|my)\s*$/i,
    /\b(the pain|the symptoms|it hurts)\s*$/i,
    /\,\s*$/,  // trailing comma
    /\b(is|are|was|were|has|have|will|would|could|should)\s*$/i
  ];

  constructor(config: SpeechDetectorConfig) {
    this.config = {
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      healthcareMode: true,
      silenceThreshold: 2000, // 2 seconds
      turnDetectionTimeout: 4000, // 4 seconds for healthcare context
      lang: 'en-US',
      ...config
    };
    
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      this.notifyStateChange({
        isRecording: false,
        isSupported: false,
        error: 'Speech recognition not supported in this browser',
        lastActivity: 0
      });
      return;
    }

    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.config.lang;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.lastSpeechActivity = Date.now();
      this.notifyStateChange({
        isRecording: true,
        isSupported: true,
        error: null,
        lastActivity: this.lastSpeechActivity
      });
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleSpeechError(event);
    };

    this.recognition.onend = () => {
      this.handleSpeechEnd();
    };
  }

  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    let interimTranscript = '';
    let finalTranscript = '';
    let maxConfidence = 0;

    // Process all results from the current recognition session
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence || 0.9;

      if (result.isFinal) {
        finalTranscript += transcript;
        maxConfidence = Math.max(maxConfidence, confidence);
      } else {
        interimTranscript += transcript;
      }
    }

    // Update activity timestamp when we get speech
    if (finalTranscript || interimTranscript) {
      this.lastSpeechActivity = Date.now();
      this.resetSilenceTimer();
    }

    // Accumulate final transcript with proper spacing
    if (finalTranscript) {
      const needsSpace = this.accumulatedTranscript.length > 0 && 
                        !this.accumulatedTranscript.endsWith(' ') && 
                        !this.accumulatedTranscript.endsWith('.') &&
                        !this.accumulatedTranscript.endsWith('!') &&
                        !this.accumulatedTranscript.endsWith('?');
      
      this.accumulatedTranscript += (needsSpace ? ' ' : '') + finalTranscript;
      this.currentInterimTranscript = interimTranscript;
    } else {
      this.currentInterimTranscript = interimTranscript;
    }

    // Determine if transcript appears complete using healthcare context
    const fullTranscript = this.accumulatedTranscript + 
                          (this.currentInterimTranscript ? ' ' + this.currentInterimTranscript : '');
    const isComplete = this.analyzeTranscriptCompleteness(fullTranscript);

    // Notify with current transcript state
    this.notifyTranscriptUpdate({
      finalTranscript: this.accumulatedTranscript,
      interimTranscript: this.currentInterimTranscript,
      isComplete,
      confidence: maxConfidence,
      totalLength: fullTranscript.length
    });

    // Set turn detection timer for potential completion
    if (finalTranscript && isComplete) {
      this.setTurnDetectionTimer();
    }
  }

  private analyzeTranscriptCompleteness(transcript: string): boolean {
    if (!transcript.trim() || transcript.length < 10) {
      return false;
    }

    // Check for explicit completion patterns in healthcare context
    for (const pattern of this.healthcareCompletionPatterns) {
      if (pattern.test(transcript)) {
        return true;
      }
    }

    // Check for incomplete patterns that suggest more speech coming
    for (const pattern of this.healthcareIncompletePatterns) {
      if (pattern.test(transcript)) {
        return false;
      }
    }

    // Check for natural sentence endings
    const endsWithPunctuation = /[.!?]\s*$/.test(transcript);
    const hasMinimumLength = transcript.length > 20;
    
    return endsWithPunctuation && hasMinimumLength;
  }

  private handleSpeechError(event: SpeechRecognitionErrorEvent): void {
    console.error('Speech recognition error:', event.error, event.message);
    
    // Handle recoverable errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      if (this.shouldContinue) {
        this.scheduleRestart(500); // Quick restart for these errors
      }
    } else if (event.error === 'network') {
      this.notifyStateChange({
        isRecording: false,
        isSupported: true,
        error: 'Network error - please check your connection',
        lastActivity: this.lastSpeechActivity
      });
    } else {
      this.notifyStateChange({
        isRecording: false,
        isSupported: true,
        error: `Speech recognition error: ${event.error}`,
        lastActivity: this.lastSpeechActivity
      });
      this.shouldContinue = false;
    }
  }

  private handleSpeechEnd(): void {
    if (this.shouldContinue) {
      // Automatically restart to maintain continuous recording
      this.scheduleRestart(100);
    } else {
      this.isRecording = false;
      this.notifyStateChange({
        isRecording: false,
        isSupported: true,
        error: null,
        lastActivity: this.lastSpeechActivity
      });
    }
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    
    this.silenceTimer = setTimeout(() => {
      if (this.shouldContinue && this.isRecording) {
        // Check if we have a meaningful transcript before stopping
        const hasContent = this.accumulatedTranscript.trim().length > 0;
        const timeSinceLastActivity = Date.now() - this.lastSpeechActivity;
        
        if (hasContent && timeSinceLastActivity >= this.config.silenceThreshold) {
          this.stopRecording();
        }
      }
    }, this.config.silenceThreshold);
  }

  private setTurnDetectionTimer(): void {
    if (this.turnDetectionTimer) {
      clearTimeout(this.turnDetectionTimer);
    }
    
    this.turnDetectionTimer = setTimeout(() => {
      const fullTranscript = this.accumulatedTranscript + 
                            (this.currentInterimTranscript ? ' ' + this.currentInterimTranscript : '');
      
      if (this.analyzeTranscriptCompleteness(fullTranscript)) {
        this.stopRecording();
      }
    }, this.config.turnDetectionTimeout);
  }

  private scheduleRestart(delay: number): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    this.restartTimer = setTimeout(() => {
      if (this.shouldContinue && this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          this.shouldContinue = false;
        }
      }
    }, delay);
  }

  private clearAllTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.turnDetectionTimer) {
      clearTimeout(this.turnDetectionTimer);
      this.turnDetectionTimer = null;
    }
  }

  private notifyTranscriptUpdate(result: TranscriptResult): void {
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate(result);
    }
  }

  private notifyStateChange(state: SpeechDetectorState): void {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  public startRecording(): void {
    if (!this.recognition) {
      this.notifyStateChange({
        isRecording: false,
        isSupported: false,
        error: 'Speech recognition not initialized',
        lastActivity: 0
      });
      return;
    }

    // Reset state
    this.accumulatedTranscript = '';
    this.currentInterimTranscript = '';
    this.shouldContinue = true;
    this.lastSpeechActivity = Date.now();
    
    try {
      this.recognition.start();
      this.resetSilenceTimer();
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.notifyStateChange({
        isRecording: false,
        isSupported: true,
        error: 'Failed to start speech recognition',
        lastActivity: this.lastSpeechActivity
      });
    }
  }

  public stopRecording(): void {
    this.shouldContinue = false;
    this.clearAllTimers();
    
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
    
    // Send final transcript
    if (this.accumulatedTranscript.trim()) {
      this.notifyTranscriptUpdate({
        finalTranscript: this.accumulatedTranscript.trim(),
        interimTranscript: '',
        isComplete: true,
        confidence: 1.0,
        totalLength: this.accumulatedTranscript.length
      });
    }
  }

  public setOnTranscriptUpdate(callback: (result: TranscriptResult) => void): void {
    this.onTranscriptUpdate = callback;
  }

  public setOnStateChange(callback: (state: SpeechDetectorState) => void): void {
    this.onStateChange = callback;
  }

  public getAccumulatedTranscript(): string {
    return this.accumulatedTranscript;
  }

  public clearTranscript(): void {
    this.accumulatedTranscript = '';
    this.currentInterimTranscript = '';
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording && this.shouldContinue;
  }

  public destroy(): void {
    this.stopRecording();
    this.clearAllTimers();
    this.recognition = null;
    this.onTranscriptUpdate = null;
    this.onStateChange = null;
  }
}

// React hook for easy integration
export const useSpeechDetector = (
  onTranscriptChange: (transcript: string) => void,
  config?: Partial<SpeechDetectorConfig>
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const detectorRef = useRef<HybridSpeechDetector | null>(null);
  const lastNotifiedTranscript = useRef<string>('');

  // Initialize detector
  useEffect(() => {
    const defaultConfig: SpeechDetectorConfig = {
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      healthcareMode: true,
      silenceThreshold: 3000, // 3 seconds for healthcare
      turnDetectionTimeout: 4000, // 4 seconds for complete thoughts
      lang: 'en-US'
    };

    const finalConfig = { ...defaultConfig, ...config };
    detectorRef.current = new HybridSpeechDetector(finalConfig);

    // Set up callbacks
    detectorRef.current.setOnTranscriptUpdate((result: TranscriptResult) => {
      const fullTranscript = result.finalTranscript + 
                           (result.interimTranscript ? ' ' + result.interimTranscript : '');
      
      setCurrentTranscript(result.finalTranscript);
      setInterimTranscript(result.interimTranscript);
      
      // Only call onChange when final transcript changes
      if (result.finalTranscript !== lastNotifiedTranscript.current) {
        lastNotifiedTranscript.current = result.finalTranscript;
        onTranscriptChange(result.finalTranscript);
      }
    });

    detectorRef.current.setOnStateChange((state: SpeechDetectorState) => {
      setIsRecording(state.isRecording);
      setIsSupported(state.isSupported);
      setError(state.error);
    });

    return () => {
      if (detectorRef.current) {
        detectorRef.current.destroy();
      }
    };
  }, [onTranscriptChange]);

  const startRecording = useCallback(() => {
    if (detectorRef.current) {
      setCurrentTranscript('');
      setInterimTranscript('');
      lastNotifiedTranscript.current = '';
      detectorRef.current.clearTranscript();
      detectorRef.current.startRecording();
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stopRecording();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isSupported,
    error,
    currentTranscript,
    interimTranscript,
    startRecording,
    stopRecording,
    toggleRecording
  };
};

export type { TranscriptResult, SpeechDetectorConfig, SpeechDetectorState };
export { HybridSpeechDetector };