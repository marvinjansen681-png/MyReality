# CLAUDE.md
### Auto-loaded by Claude Code on every session start
### This file tells Claude exactly what to do the moment it wakes up

---

## WAKE UP SEQUENCE

When you start a session in this project, do this immediately — no waiting, no asking:

```
1. Read CLAUDE_CODE_INSTRUCTIONS.md
2. Read MYREALITY_BUILD.md
3. Read PROGRESS.md  ← this tells you exactly where you are
4. Run `npm run dev` — confirm the app starts cleanly
5. Report to Marvin and start the next step
```

When Marvin says **"get to work"** or **"continue"** or **"let's go"** — that is your signal to execute the wake up sequence above and immediately begin the next incomplete step from PROGRESS.md. No questions. No waiting. Just work.

---

## PROJECT OVERVIEW

**App:** MyReality — personal productivity + team management platform
**Owner:** Marvin
**Stack:** Next.js 14 · TypeScript · Supabase · Tailwind · Vercel
**Platforms:** Web · PWA (installable) · Android (Capacitor → Play Store)

**GitHub account:** shaficajansen96-beep
**GitHub repo:** https://github.com/shaficajansen96-beep/MyReality
**Supabase project URL:** https://khcpvjtphzidwzbhtayh.supabase.co
**Supabase REST endpoint:** https://khcpvjtphzidwzbhtayh.supabase.co/rest/v1/

**Spec file:** `MYREALITY_BUILD.md` — what to build
**Behaviour file:** `CLAUDE_CODE_INSTRUCTIONS.md` — how to work
**Progress file:** `PROGRESS.md` — where you are right now

---

## THE ONE RULE THAT OVERRIDES ALL OTHERS

If PROGRESS.md says a step is incomplete — finish it.
If PROGRESS.md says a step is complete — do not redo it.
If PROGRESS.md is unclear — check git log to confirm, then update PROGRESS.md.

---

*Place this file in the project root. Claude Code reads it automatically.*
