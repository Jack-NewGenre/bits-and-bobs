---
name: changelog
description: Write the next entry in CHANGELOG.md. Use when the user asks to "update the changelog", "add a changelog entry", "log this release", or is about to ship a version with new tools, features or fixes. Asks which version number to use, then summarises the work since the last entry as short pointers.
---

# Changelog

Adds one new entry to `CHANGELOG.md` at the repo root, newest first.

`CHANGELOG.md` is the only place a release is written down. The `/changelog`
page (`app/changelog/page.tsx`) reads and parses it at build time via
`lib/changelog.ts`, so the shape below is not cosmetic:

- Version headings must be `## <version> - <YYYY-MM-DD>`, with a plain hyphen.
- Only `### Added`, `### Changed`, `### Fixed` and `### Removed` are rendered.
  Any other group heading, and its bullets, are dropped from the page.
- Text between the version heading and the first group renders as a summary.
- `**Name**: description` renders the name in bold. Anything else renders as
  plain text, so no other markdown (links, code spans) will show up styled.

## Steps

1. **Read the existing changelog.** `cat CHANGELOG.md` (create it from the template
   below if it does not exist). Note the version and date of the top entry. That is
   the boundary for "what's new".

2. **Work out what changed.** Do not guess. Gather from:
   - `git log --oneline <last-tag-or-date>..HEAD` and `git diff --stat` for the range.
   - Uncommitted work: `git status --short` and `git diff`.
   - New tools: any new entry in `lib/tool-registry/*.ts`, new
     `components/tools/<slug>/`, or new `app/tools/<slug>/page.tsx`.
   - Use the tool's registry `name` and `description` as the wording, so the
     changelog matches what the user sees in the app.

3. **Ask for the version number.** Use the `AskUserQuestion` tool. Offer the three
   semver bumps from the current top entry as options, each with a one-line reason:
   - patch (e.g. 1.0.1): fixes only
   - minor (e.g. 1.1.0): new tools or features, nothing broken
   - major (e.g. 2.0.0): breaking changes
   Recommend the one that matches what you actually found in step 2, listed first.
   In the same call, also ask anything genuinely unclear (e.g. whether an
   in-progress change belongs in this release). Never ask "shall I proceed?".

4. **Write the entry** at the top of the list, under the heading, in this shape:

   ```md
   ## 1.1.0 - 2026-09-13

   ### Added
   - **Split PDF**: pull selected pages out of a PDF into a new file.

   ### Changed
   - Image queue now keeps its order after a retry.

   ### Fixed
   - Contrast checker rounded the ratio the wrong way at 4.495.
   ```

   Use today's real date (`date +%F`). Only include the sections that have
   content: `Added`, `Changed`, `Fixed`, `Removed`, in that order.

5. **Report back** with the version and the entry you wrote. Do not commit or tag
   unless the user asks.

## Style rules

- Never use an em dash (the long dash character), in the changelog or anywhere
  else in this repo. Use a colon, a comma, a full stop or brackets instead.
- One line per change, one change per line. No paragraphs.
- Lead with the tool or feature name in bold, then a colon, then what it does
  for the user. Sentence case, full stop at the end.
- Write for someone using the app, not reading the diff: "Merge PDF now keeps
  bookmarks", not "refactored `pdf-edit.ts` to thread outline nodes".
- No file paths, commit SHAs, PR links or internal refactor noise unless the user
  can feel it.
- British English.
- Skip anything invisible to a user (formatting, test-only changes, dependency
  bumps) unless it is the whole release.

## Template

```md
# Changelog

All notable changes to this project. Newest first.
```
