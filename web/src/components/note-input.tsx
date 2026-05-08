import { useState, useEffect, type KeyboardEvent } from 'react';
import { Mic, MicOff, Loader2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface NoteInputProps {
  onSubmit: (note: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
}

export function NoteInput({ onSubmit, isLoading, onCancel }: NoteInputProps) {
  const [note, setNote] = useState('');
  const { transcript, isSupported, isListening, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setNote(transcript);
    }
  }, [transcript]);

  const handleSubmit = () => {
    const trimmed = note.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type or speak your advisor note... (Ctrl+Enter to submit)"
        className="min-h-[120px] resize-y bg-transparent border-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground text-sm"
        disabled={isLoading}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? 'destructive' : 'outline'}
              size="sm"
              onClick={toggleMic}
              disabled={isLoading}
              className={isListening ? 'animate-pulse' : ''}
            >
              {isListening ? <MicOff /> : <Mic />}
              {isListening ? 'Listening...' : 'Voice'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              <X />
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!note.trim() || isLoading}
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Submit
                <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
