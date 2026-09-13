@AGENTS.md

# Writing style

Applies to everything: UI copy, code comments, JSDoc, commit messages, PR
descriptions, markdown files and chat replies.

- **Never use an em dash (the long dash character).** Not in prose, not in
  strings, not in comments. Use a colon, a comma, a full stop or brackets
  instead. It is the clearest tell of generated writing and it is not wanted
  anywhere in this repo.
- En dashes are only for number ranges (`0–100`, `50–950`). Never as a
  sentence separator.
- British English throughout.

Before finishing a change, check your own diff for the character:

```bash
git diff | grep -n "—"
```
