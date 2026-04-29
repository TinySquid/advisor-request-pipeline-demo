# UI Specification

## Tech Stack

| Layer      | Tool            | Notes                                            |
| ---------- | --------------- | ------------------------------------------------ |
| Build      | Vite 6          | React plugin, API proxy for dev                  |
| Framework  | React 19        | Functional components, hooks                     |
| Components | shadcn/ui       | CLI-installed, copied into `components/ui/`      |
| Styling    | Tailwind CSS v4 | CSS-based config, no `tailwind.config.ts` needed |
| Icons      | Lucide React    | shadcn default icon set                          |
| Voice      | Web Speech API  | Browser-native, no deps needed                   |

---

## Component Tree

```
<App>
  ├── header area (title + subtitle, static)
  ├── <NoteInput>            ← textarea + mic + submit
  └── <ResultCards>          ← 2x2 grid (visible after response)
       ├── <ContactCard>
       ├── <EmailCard>
       ├── <TaskCard>
       └── <PropertyCard>
```

---

## App State (`App.tsx`)

```ts
type AppState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; result: PipelineResult }
  | { phase: 'error'; message: string };
```

State lives in `App.tsx`. No state management library needed.

## Interactivity Summary

| Action          | Trigger                            | Effect                                                  |
| --------------- | ---------------------------------- | ------------------------------------------------------- |
| Submit note     | Click "Process" or Ctrl+Enter      | `POST /api/process-request`, show loading state         |
| Start voice     | Click mic button                   | Web Speech API starts, mic turns red + pulses           |
| Stop voice      | Click mic again / silence detected | Transcript stays in textarea, editable                  |
| Copy email body | Click "Copy Email" button          | `navigator.clipboard.writeText()`, show "Copied!" toast |
| View result     | After successful response          | Cards animate in with stagger                           |
| Error handling  | Failed request                     | Red error box appears below input                       |

---

## Responsive Behavior

| Breakpoint       | Layout                                                      |
| ---------------- | ----------------------------------------------------------- |
| Mobile (<768px)  | Single column. Cards stack vertically. Textarea full width. |
| Desktop (≥768px) | Two-column card grid. Max-width 5xl (1024px) centered.      |

No tablet-specific layout needed. The `md:grid-cols-2` handles the breakpoint.
