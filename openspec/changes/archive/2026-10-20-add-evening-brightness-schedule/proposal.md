# Proposal

## Why

The applet only changes brightness when the user scrolls the panel icon. The user wants the display to dim automatically at fixed evening times, without manual adjustments every day.

## What Changes

- Add a fixed daily schedule in `applet.js`: 17:00 → 80 %, 17:30 → 60 %, 18:00 → 40 %, using local time.
- At each elapsed step, lower Brightness only when the current value is above the scheduled value. Equal or lower values are left unchanged.
- Apply the most recent elapsed step once when the applet starts or resumes. This catches up after a reload or suspend.
- Reset step tracking at local midnight. Never raise Brightness automatically.
- Keep manual scroll. A manual change made after a step stays in effect until the next step of the following day.
- Document the schedule in `README.md` and add the new terms to `GLOSSARY.md`.

## Capabilities

### New Capabilities

- `brightness-schedule`: fixed daily evening steps that lower Brightness, evaluate local time, and apply the current step on startup.

### Modified Capabilities

None. This is the first capability in the project.

## Impact

- `applet.js`: schedule constant, periodic check, step tracking, startup application.
- `README.md`, `GLOSSARY.md`: behavior and vocabulary.
- No new dependencies, no settings schema, no location service, no DBus.
