import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechDetector } from '@/hooks/useSpeechDetector';

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void;
  className?: string;
  disabled?: boolean;
  currentTranscript?: string;
}

export function VoiceInput({ onTranscriptChange, className, disabled = false, currentTranscript = '' }: VoiceInputProps) {
  const {
    isRecording,
    isSupported,
    error,
    currentTranscript: detectedTranscript,
    interimTranscript,
    toggleRecording
  } = useSpeechDetector(
    (transcript: string) => {
      if (transcript.trim()) {
        onTranscriptChange(transcript);
      }
    },
    {
      healthcareMode: true,
      silenceThreshold: 3000, // 3 seconds
      turnDetectionTimeout: 4000, // 4 seconds for healthcare context
    }
  );

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

  if (error) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant="outline"
          size="sm"
          disabled
          className="opacity-50"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
        <span className="text-xs text-red-500">{error}</span>
      </div>
    );
  }

  const fullTranscript = detectedTranscript + (interimTranscript ? ' ' + interimTranscript : '');

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        onClick={toggleRecording}
        disabled={disabled}
        className={cn(
          "transition-all duration-200",
          isRecording && "animate-pulse shadow-lg"
        )}
      >
        {isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {isRecording && (
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <Volume2 className="h-3 w-3 animate-pulse" />
          <span>Listening...</span>
          {interimTranscript && (
            <span className="text-gray-500 ml-2 italic">
              "{interimTranscript}"
            </span>
          )}
        </div>
      )}
      
      {!isSupported && (
        <span className="text-xs text-gray-500">
          Voice input not supported in this browser
        </span>
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