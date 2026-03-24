---
name: harvest
description: Extract achievements, skills, challenges, and reflections from the current project
---

When the user invokes /harvest:

1. Call `athena_project_list` to identify the current project
2. Call `athena_harvest` with the project ID (no harvest_json) to get the harvest prompt
3. Use the prompt to analyze the project and generate harvest JSON
4. Call `athena_harvest` again with the harvest_json to store results
5. Call `athena_achievement_list` filtered to this project to show what was extracted
6. Suggest advancing the project to completed phase
