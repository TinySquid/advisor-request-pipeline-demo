import { User, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ContactRecord } from '@repo/shared';

interface ContactCardProps {
  contact: ContactRecord;
}

export function ContactCard({ contact }: ContactCardProps) {
  const scorePercent = (contact.leadScore / 10) * 100;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User />
          Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-lg font-semibold">{contact.name}</div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail />
              {contact.email}
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone />
              {contact.phone}
            </div>
          )}
          {!contact.email && !contact.phone && (
            <div className="italic">No contact info provided</div>
          )}
        </div>

        <Separator />

        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1.5">
            Lead Score: {contact.leadScore}/10
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Source: {contact.source}</span>
          <Badge variant="outline" className="text-xs">
            {contact.status}
          </Badge>
        </div>

        {contact.notes && (
          <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
            {contact.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
