# Tasks

## 1. Schedule logic

- [x] 1.1 Add the `SCHEDULE` constant with the 17:00/80, 17:30/60, and 18:00/40 steps, plus a helper that returns the latest elapsed step for a local time. Verify `node --check applet.js` passes and the helper returns the expected step for 17:00, 17:29, 17:30, 18:00, and 03:00.
- [x] 1.2 Add the 30-second `GLib.timeout_add_seconds` check, the `_lastStepKey` one-shot guard, the one-way lower rule, and the tooltip update. Verify with a temporary step one minute ahead and `make reload` that exactly one `ddcutil` call runs and the tooltip shows the new value.
- [x] 1.3 Compute the startup value before the first apply, and remove the timer in `on_applet_removed_from_panel`. Verify a reload at 19:00 starts at 40 % without a 100 % flash, a reload at 03:00 keeps 100 %, and removing the applet stops the timer.

## 2. Documentation

- [x] 2.1 Update `README.md` with the schedule, the one-way rule, and the model desync note. Correct the startup value in the inventory table from 80 % to 100 %. Verify every stated value matches `applet.js`.
- [x] 2.2 Add `Schedule` and `ScheduleStep` to `GLOSSARY.md` and update `StartupBrightness`. Verify the terms match the language in the spec.

## 3. Integration check

- [x] 3.1 Run the spec scenario matrix with temporary times a few minutes apart, restore the real schedule, and run `make reload`. Verify the Display and tooltip at each step, that equal or lower values produce no command, and that a manual scroll after a step persists until the next day.
- [x] 3.2 Check the Cinnamon log after a reload and after removing and adding the applet. Verify there are no timer or subprocess errors.
