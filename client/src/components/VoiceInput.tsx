import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
  currentTranscript?: string;
}

export function VoiceInput({ onTranscriptChange, className, disabled = false, currentTranscript = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldContinueRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>(''); // Use ref to persist across recognition restarts
  
  // Silence detection timeout (in milliseconds)
  const SILENCE_TIMEOUT = 3000; // 3 seconds of silence before stopping

  // Initialize accumulated transcript from external prop on mount
  useEffect(() => {
    if (currentTranscript && accumulatedTranscript === '') {
      setAccumulatedTranscript(currentTranscript);
      accumulatedTranscriptRef.current = currentTranscript;
    }
  }, []);

  // Effect to detect when external transcript is cleared
  useEffect(() => {
    if (currentTranscript === '' && accumulatedTranscript !== '') {
      // External transcript was cleared, reset internal state
      setAccumulatedTranscript('');
      setInterimText('');
      accumulatedTranscriptRef.current = '';
    }
  }, [currentTranscript, accumulatedTranscript]);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        // Clear any pending restart timeout
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = null;
        }
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment;
          } else {
            interimTranscript += transcriptSegment;
          }
        }

        // Reset silence timeout when speech is detected
        if (finalTranscript || interimTranscript) {
          resetSilenceTimer();
        }

        // Update accumulated transcript with new final results
        if (finalTranscript) {
          // Clean up the final transcript and add proper spacing
          const cleanFinalTranscript = finalTranscript.trim();
          const currentAccumulated = accumulatedTranscriptRef.current;
          const needsSpace = currentAccumulated.length > 0 && 
                           !currentAccumulated.endsWith(' ') && 
                           cleanFinalTranscript.length > 0;
          const newAccumulated = currentAccumulated + (needsSpace ? ' ' : '') + cleanFinalTranscript;
          
          console.log('Voice Input Debug:', {
            previousAccumulated: currentAccumulated,
            newFinal: cleanFinalTranscript,
            newAccumulated: newAccumulated,
            interim: interimTranscript.trim()
          });
          
          // Update both state and ref
          accumulatedTranscriptRef.current = newAccumulated;
          setAccumulatedTranscript(newAccumulated);
          setInterimText(interimTranscript.trim());
          
          // Combine with proper spacing
          const combinedTranscript = newAccumulated + (interimTranscript.trim() ? ' ' + interimTranscript.trim() : '');
          onTranscriptChange(combinedTranscript);
        } else {
          // Only interim results
          const cleanInterimTranscript = interimTranscript.trim();
          setInterimText(cleanInterimTranscript);
          
          const currentAccumulated = accumulatedTranscriptRef.current;
          const needsSpace = currentAccumulated.length > 0 && 
                           !currentAccumulated.endsWith(' ') && 
                           cleanInterimTranscript.length > 0;
          const combinedTranscript = currentAccumulated + (needsSpace ? ' ' : '') + cleanInterimTranscript;
          onTranscriptChange(combinedTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle specific errors
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // These are recoverable errors - restart if we should continue
          if (shouldContinueRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              if (shouldContinueRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  resetSilenceTimer();
                } catch (e) {
                  console.error('Error restarting recognition:', e);
                }
              }
            }, 100);
          }
        } else {
          // Other errors - stop listening
          setIsListening(false);
          shouldContinueRef.current = false;
        }
      };

      recognition.onend = () => {
        console.log('Recognition ended, accumulated transcript:', accumulatedTranscriptRef.current);
        // Auto-restart if we should continue listening
        if (shouldContinueRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (shouldContinueRef.current && recognitionRef.current) {
              try {
                console.log('About to restart recognition, accumulated:', accumulatedTranscriptRef.current);
                recognitionRef.current.start();
                resetSilenceTimer();
              } catch (e) {
                console.error('Error restarting recognition:', e);
                setIsListening(false);
                shouldContinueRef.current = false;
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        shouldContinueRef.current = false;
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const resetSilenceTimer = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    // Don't automatically stop on silence - let the user control when to stop
    // This prevents unwanted stops during natural speech pauses
    silenceTimeoutRef.current = setTimeout(() => {
      // We could add logic here for very long silence periods if needed
      // For now, let the user control stopping manually
    }, SILENCE_TIMEOUT);
  };

  const handleStartListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    // Don't reset accumulated transcript - keep building on it
    // Only reset interim text
    setInterimText('');
    shouldContinueRef.current = true;

    try {
      recognitionRef.current.start();
      resetSilenceTimer();
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  };

  const handleStopListening = () => {
    shouldContinueRef.current = false;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="opacity-50"
        >
          <MicOff className="h-4 w-4" />
        </Button>
        <span className="text-xs text-gray-500">Voice input not supported</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggleListening}
        disabled={disabled}
        className={cn(
          "transition-all duration-200",
          isListening && "animate-pulse shadow-lg"
        )}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {isListening && (
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <Volume2 className="h-3 w-3 animate-pulse" />
          <span>Listening...</span>
          {interimText && (
            <span className="text-gray-500 ml-2 italic">
              "{interimText}"
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Legacy interface support
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
  start(): void;
  stop(): void;
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