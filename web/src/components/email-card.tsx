import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import type { EmailDraft } from '@repo/shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type CopyStatus = 'idle' | 'copied' | 'error';

interface EmailCardProps {
  email: EmailDraft;
}

export function EmailCard({ email }: EmailCardProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const handleCopy = async () => {
    try {
      const fullEmail = `Subject: ${email.subject}\n\n${email.body}`;
      await navigator.clipboard.writeText(fullEmail);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail />
          Follow-up Email
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <div className="text-sm flex flex-col gap-1">
          <div className="text-muted-foreground">
            To: <span className="text-foreground">{email.to}</span>
          </div>
          <div className="text-muted-foreground">
            Subject: <span className="text-foreground font-medium">{email.subject}</span>
          </div>
        </div>

        <Separator />

        <div className="text-sm leading-relaxed flex-1 max-h-48 overflow-y-auto whitespace-pre-wrap">
          {email.body}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Tone: {email.tone}</div>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copyStatus === 'error' ? (
              <>
                <Copy />
                Copy failed
              </>
            ) : copyStatus === 'copied' ? (
              <>
                <Check />
                Copied!
              </>
            ) : (
              <>
                <Copy />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
