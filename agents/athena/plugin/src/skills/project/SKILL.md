---
name: project
description: Manage projects — create, list, open, advance phase, or scan linked directory
---

When the user invokes /project, determine the subcommand from context:

- `/project new <name>` → Call `athena_project_create` with the name. Ask for description and optional directory.
- `/project list` → Call `athena_project_list`
- `/project open <query>` → Call `athena_project_open` with the search query
- `/project advance` → Call `athena_project_advance` for the current project. Confirm the phase transition first.
- `/project scan` → Call `athena_project_scan` for the current project
- `/project` (no subcommand) → Show available subcommands
