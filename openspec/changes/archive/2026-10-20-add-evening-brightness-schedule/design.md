# Design

## Context

`applet.js` is a single-file Cinnamon `IconApplet`. The constructor sets `this.brightness = 100` and calls `_applyBrightness(100)`. Scroll changes Brightness by 10. `_applyBrightness` runs `/usr/bin/ddcutil setvcp 10` and serializes calls: if one runs, it stores the latest value in `_targetBrightness` and applies it when the current call ends. There are no settings, timers, or modules.

A `ddcutil` call takes about one second. The schedule makes at most three calls per day.

## Goals / Non-Goals

**Goals:**

- Three fixed local-time steps that only lower Brightness.
- Correct behavior after suspend, reload, and midnight.
- Small diff in `applet.js`. No new dependencies or configuration.

**Non-Goals:**

- Sunrise, sunset, or location.
- Preferences UI or configurable schedule.
- Reading Brightness from the Display.
- Per-Display schedules.

## Decisions

### Hardcoded schedule

Store the steps as constant pairs of minutes from midnight and Brightness:

```text
SCHEDULE = [[17 * 60, 80], [17 * 60 + 30, 60], [18 * 60, 40]]
```

The user edits the array and runs `make reload` to change it. A `settings-schema.json` would add a parser, validation, and a preferences page for three values. Rejected for now.

### Wall-clock poll instead of exact timers

Check the schedule every 30 seconds with `GLib.timeout_add_seconds`. On each tick, compute the local time with `GLib.DateTime.new_now_local()` and find the latest step whose time is less than or equal to now.

Exact timers to the next step would be more precise, but they drift or miss steps after suspend and clock changes. A 30-second poll compares the wall clock on every tick and self-heals. It sends no `ddcutil` command unless a step applies.

### One-shot step key

Keep `_lastStepKey` as `"<local-date>:<step-index>"`. On each tick, compute the current key. If it equals `_lastStepKey`, do nothing. Otherwise, mark the key as consumed and apply the one-way rule:

```text
if (this.brightness > scheduled) {
    this.brightness = scheduled;
    update tooltip;
    _applyBrightness(scheduled);
}
```

Marking the key even when no command is sent is required: a manual raise after the step must not be lowered again on the next tick. When no step has elapsed today, set `_lastStepKey = null`. This resets tracking for the new day and sends no command at midnight.

Consequence: the schedule is a one-time lowering at each step, not a continuous ceiling. A manual raise at 18:05 stays until the next day's 17:00.

### Catch-up at startup

At construction, compute the latest elapsed step before the first `ddcutil` call:

- Start from `STARTUP_BRIGHTNESS` (100).
- If a step has elapsed and 100 is above its value, set `this.brightness` to that value and consume its key.
- Call `_applyBrightness(this.brightness)` once.

This applies the current step at 19:00 without a visible 100 → 40 flash and without two `ddcutil` calls. Outside the schedule window, startup keeps the current 100 behavior.

A tick after resume uses the same key comparison. If the machine was suspended across one or more steps, the next tick applies the most recent step once.

### Reuse the existing queue

The schedule calls `_applyBrightness` and does not touch subprocess handling. The existing `_isBusy`/`_targetBrightness` queue already guarantees that the latest value wins.

### Timer cleanup

Store the source id from `GLib.timeout_add_seconds` and remove it with `GLib.source_remove` in `on_applet_removed_from_panel`. Without cleanup, the callback keeps running after the applet is removed.

### Brightness model only

The applet compares against `this.brightness`, not the Display. A `getvcp 10` read at startup would make the rule exact after external changes, but it changes the current startup behavior and adds output parsing. The existing applet already assumes its internal value matches the hardware.

## Risks / Trade-offs

- **Model desync.** A change from the monitor OSD is invisible to the applet. A later step may raise Brightness to the scheduled value instead of lowering it. Existing limitation; document it in `README.md`.
- **Reload after a manual change.** A reload resets the model to 100, so catch-up can raise Brightness to the step value. Accepted trade-off of not reading the hardware.
- **Manual change is not enforced.** The step applies once. A manual raise after 18:00 persists until the next day. This matches the requested one-way rule.
- **Clock moved backward.** A step key can repeat and lower Brightness once more. The result is still a valid step value.
- **Polling cost.** One wakeup every 30 seconds. No `ddcutil` call unless a step applies, so the Display sees at most three writes per day.
- **No automated tests.** The project has no test harness. Verification uses a temporary schedule near the current clock, `make reload`, and the spec scenarios. Restore the real schedule after the check.

## Migration Plan

1. Edit `applet.js`, `README.md`, and `GLOSSARY.md`.
2. Run `make reload`.
3. Check the tooltip and the Display at each step.
4. Rollback: `git revert` the change and run `make reload`. No settings or data change.
