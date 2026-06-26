# Zod schemas

Validation schemas shared between client forms (react-hook-form + zodResolver) and server
Route Handlers. Derive form types with `z.infer<typeof schema>` — no standalone type files.
Booleans destined for tinyint columns: `z.coerce.number().min(0).max(1)`.
