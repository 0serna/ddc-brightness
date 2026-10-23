# DDC brightness

This Cinnamon panel applet is `ddc-brightness@oserna`. It sets external Display brightness over DDC/CI. Scroll the panel icon with a mouse wheel or a touchpad and `applet.js` runs `/usr/bin/ddcutil setvcp 0x10` on I2C bus 10. It also lowers brightness at fixed evening times.

## Inventory

| Path | Role |
|---|---|
| `applet.js` | Cinnamon `IconApplet`: scroll ±10%, daily Schedule, CSV History, startup 100 % or the current ScheduleStep, latest `ddcutil setvcp` wins if a call is already running, a failed write keeps the last confirmed Brightness |
| `metadata.json` | Xlet metadata: UUID, Cinnamon 6.0-6.6, symbolic icon |
| `Makefile` | Symlink into `~/.local/share/cinnamon/applets/`, DBus reload/restart |
| `manage-panel.py` | Enable/disable via `org.cinnamon enabled-applets` |
| `test/history-test.js` | `cjs` self-check: CSV fields, empty `startup` value, directory and file modes, Schedule step lookup, smooth scroll |
| `GLOSSARY.md` | Domain terms: Display, Brightness, Schedule, ScheduleStep, BrightnessStep, History, StartupBrightness |

Brightness control is all in `applet.js`. Bus, VCP code, step, dedupe window, startup level, and check interval are constants: `I2C_BUS = "10"`, `VCP_BRIGHTNESS = "0x10"`, `BRIGHTNESS_STEP = 10`, `SCROLL_DEDUPE_MS = 10`, `STARTUP_BRIGHTNESS = 100`, `SCHEDULE_CHECK_SECONDS = 30`. Each wheel notch changes Brightness by one BrightnessStep. A touchpad accumulates smooth deltas until one BrightnessStep. A high-resolution wheel sends two events with the same timestamp for one notch; the duplicate event is ignored. The applet assumes one Display. If a `ddcutil` subprocess is already running, later scrolls overwrite `_targetBrightness`. The next `ddcutil` runs when the current call finishes.

## Schedule

`SCHEDULE` holds the daily steps, in minutes from local midnight and Brightness:

| Local time | Brightness |
|---|---|
| 17:00 | 80 % |
| 17:30 | 60 % |
| 18:00 | 40 % |

`applet.js` checks the schedule every 30 seconds. A ScheduleStep lowers Brightness only when the current value is above the step value. Equal or lower values do nothing. The applet never raises Brightness on its own. If a write fails, the applet keeps the last confirmed Brightness and retries the current step on the next check. A manual scroll after a step stays until the next day's step. At startup or resume, the applet applies the most recent elapsed step once. Step tracking resets at local midnight.

The applet does not read Brightness from the Display. A change from the monitor OSD is invisible to the applet. A later step can set Brightness to the scheduled value.

`make install` only symlinks this repo to `~/.local/share/cinnamon/applets/ddc-brightness@oserna`. A real directory at that path moves to `~/.local/state/ddc-brightness/` first. `manage-panel.py` appends `panel1:right:14:{uuid}:{instance}` to the GSettings applet list.

## History

The applet appends one CSV line per Brightness change it requests, plus one line on each applet start, to `$XDG_STATE_HOME/ddc-brightness/history.csv`, by default `~/.local/state/ddc-brightness/history.csv`. The applet creates the directory and the file with modes 700 and 600. Each write restores those modes. The file has no rotation.

| Field | Value |
|---|---|
| 1 | Local time, `YYYY-MM-DDTHH:MM:SS±HHMM` |
| 2 | Source: `startup`, `scroll`, or `schedule` |
| 3 | Previous Brightness. Empty for `startup`. |
| 4 | New Brightness |

A `startup` line has an empty previous value and shows the final Brightness after any ScheduleStep catch-up. That catch-up does not get a separate `schedule` line. The applet writes this line on each load, including `make reload`. The History records the change the applet requests, not a confirmed Display state. A failed request keeps its line. A change from the monitor OSD does not appear. After startup, the previous value is the applet's memory, not a read from the Display.

Example: manual scrolls with the time and the new level.

```bash
awk -F, '$2 == "scroll" {print substr($1, 12, 5), $4}' \
  "${XDG_STATE_HOME:-$HOME/.local/state}/ddc-brightness/history.csv"
```

## Layout

```
.
├── applet.js          # Cinnamon entry, main()
├── metadata.json      # UUID ddc-brightness@oserna
├── Makefile           # install, enable, reload, uninstall
├── manage-panel.py    # gsettings panel list
├── test/              # self-check with cjs
└── GLOSSARY.md         # vocabulary
```

## Setup

Cinnamon 6.0+ and `ddcutil` at `/usr/bin/ddcutil`. You usually need to be in the `i2c` group. Hardware is I2C bus 10 only.

```bash
make enable    # symlink + add to panel1 right
make status    # symlink and GSettings
make reload    # hot-reload via DBus
make check     # self-check with cjs
```

Other targets: `install` which only creates the symlink, `update-main` which pulls `main` in the main worktree and installs from there, `disable`, `restart`, `uninstall`.
