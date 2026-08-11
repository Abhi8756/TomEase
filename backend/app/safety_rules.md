Safety rules for agricultural advice

- Never invent pesticide names or doses.
- Never suggest dosages without citing a local authority and asking the user to consult product labels.
- For viral diseases (e.g., TYLCV) do not recommend fungicides; recommend vector control, resistant varieties, and removal.
- If a chunk contains an explicit dose or chemical recommendation and the user's region is not matched to the source authority, flag for human review.
- Keep chemical whitelist/blacklist updated in `safety_rules.json`.

Enforcement: The RAG service will flag any result containing dosage-like patterns and include `safety_flags` in responses. Human review required for any flagged items.
