# PlanUltra — Developer Notes

## UI Components: shadcn v4 / Base UI

This project uses **shadcn v4** (`base-nova` style) built on **`@base-ui/react`**.
**There is NO Radix UI installed.** Do not use Radix API patterns.

### Key differences from Radix UI

| Pattern | Radix (wrong) | Base UI (correct) |
|---|---|---|
| Menu item selection | `onSelect` | `onClick` |
| Destructive item | `className="text-destructive..."` | `variant="destructive"` prop |
| Render delegation | `asChild` | `render` prop (where supported) |
| State-based styling | CSS pseudo-classes | `data-*` attributes (`data-open`, `data-disabled`, etc.) |

### Correct patterns

**Controlled Dialog:**
```tsx
<Dialog open={someState !== null} onOpenChange={(open) => { if (!open) setSomeState(null) }}>
```

**Dropdown items:**
```tsx
<DropdownMenuItem onClick={() => doSomething()}>Label</DropdownMenuItem>
<DropdownMenuItem variant="destructive" onClick={() => doDestructiveThing()}>Delete</DropdownMenuItem>
```

### Server components: buttonVariants

Do **not** import `buttonVariants` from `@/components/ui/button` in server components — it pulls in client-side code. Import from `@/lib/button-variants` instead.
