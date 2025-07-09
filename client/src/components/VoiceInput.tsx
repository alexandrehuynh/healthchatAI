import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceInput({ onTranscriptChange, className, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldContinueRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        // Update accumulated transcript with new final results
        if (finalTranscript) {
          const newAccumulated = accumulatedTranscript + finalTranscript;
          setAccumulatedTranscript(newAccumulated);
          setInterimText(interimTranscript);
          onTranscriptChange(newAccumulated + interimTranscript);
        } else {
          // Only interim results
          setInterimText(interimTranscript);
          onTranscriptChange(accumulatedTranscript + interimTranscript);
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
        // Auto-restart if we should continue listening
        if (shouldContinueRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (shouldContinueRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
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
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [onTranscriptChange, accumulatedTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      // Reset transcript state
      setAccumulatedTranscript('');
      setInterimText('');
      
      // Enable continuous recording
      shouldContinueRef.current = true;
      
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
        shouldContinueRef.current = false;
      }
    }
  };

  const stopListening = () => {
    // Disable continuous recording
    shouldContinueRef.current = false;
    
    // Clear any pending restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
        onClick={toggleListening}
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
          <span>Recording...</span>
        </div>
      )}
      
      {(accumulatedTranscript || interimText) && !isListening && (
        <span className="text-xs text-green-600 font-medium">
          Voice input captured
        </span>
      )}
    </div>
  );
}

// Add type definitions for Web Speech API
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