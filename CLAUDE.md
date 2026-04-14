# PlanUltra — Developer Notes

## App URL

The production URL is **www.planultrarace.com**.

## File Locations

All requirements documents (PRDs, mockups) go in `docs/requirements/`. Do not use `requirements/` at the project root.

## Quality Checks

After implementing any fix or feature, verify it doesn't break adjacent functionality. Run the app and test the happy path plus one edge case before committing.

## Debugging Guidelines

When debugging, identify and confirm the root cause before applying fixes. Do not cascade multiple speculative fixes — if the first attempt doesn't work, stop and re-analyze rather than trying adjacent changes that may destabilize the system.

## Tech Stack

This is a TypeScript project using Next.js, DynamoDB, and Amplify. Always check dependency version compatibility (especially @types packages) before adding or updating dependencies. Use `npm ls <package>` to verify.

## UI Guidelines

After making UI changes, check for contrast/accessibility issues — verify text is readable against its background and interactive elements are visually discoverable.

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
