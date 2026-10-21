# DDC brightness

This Cinnamon panel applet is `ddc-brightness@oserna`. It sets external Display brightness over DDC/CI. Scroll the panel icon and `applet.js` runs `/usr/bin/ddcutil setvcp 10` on I2C bus 10. It also lowers brightness at fixed evening times.

## Inventory

| Path | Role |
|---|---|
| `applet.js` | Cinnamon `IconApplet`: scroll ±10%, daily Schedule, startup 100 % or the current ScheduleStep, latest `ddcutil setvcp` wins if a call is already running |
| `metadata.json` | Xlet metadata: UUID, Cinnamon 6.0-6.6, symbolic icon |
| `Makefile` | Symlink into `~/.local/share/cinnamon/applets/`, DBus reload/restart |
| `manage-panel.py` | Enable/disable via `org.cinnamon enabled-applets` |
| `GLOSSARY.md` | Domain terms: Display, Brightness, Schedule, ScheduleStep, BrightnessStep, StartupBrightness |

Brightness control is all in `applet.js`. Bus, VCP code, step, startup level, and check interval are constants: `I2C_BUS = "10"`, `VCP_CODE = "10"`, `BRIGHTNESS_STEP = 10`, `STARTUP_BRIGHTNESS = 100`, `SCHEDULE_CHECK_SECONDS = 30`. The applet assumes one Display. If a `ddcutil` subprocess is already running, later scrolls overwrite `_targetBrightness`. The next `ddcutil` runs when the current call finishes.

## Schedule

`SCHEDULE` holds the daily steps, in minutes from local midnight and Brightness:

| Local time | Brightness |
|---|---|
| 17:00 | 80 % |
| 17:30 | 60 % |
| 18:00 | 40 % |

`applet.js` checks the schedule every 30 seconds. A ScheduleStep lowers Brightness only when the current value is above the step value. Equal or lower values do nothing. The applet never raises Brightness on its own. A manual scroll after a step stays until the next day's step. At startup or resume, the applet applies the most recent elapsed step once. Step tracking resets at local midnight.

The applet does not read Brightness from the Display. A change from the monitor OSD is invisible to the applet. A later step can set Brightness to the scheduled value.

`make install` only symlinks this repo to `~/.local/share/cinnamon/applets/ddc-brightness@oserna`. `manage-panel.py` appends `panel1:right:14:{uuid}:{instance}` to the GSettings applet list.

## Layout

```
.
├── applet.js          # Cinnamon entry, main()
├── metadata.json      # UUID ddc-brightness@oserna
├── Makefile           # install, enable, reload, uninstall
├── manage-panel.py    # gsettings panel list
└── GLOSSARY.md         # vocabulary
```

## Setup

Cinnamon 6.0+ and `ddcutil` at `/usr/bin/ddcutil`. You usually need to be in the `i2c` group. Hardware is I2C bus 10 only.

```bash
make enable    # symlink + add to panel1 right
make status    # symlink and GSettings
make reload    # hot-reload via DBus
```

Other targets: `install` which only creates the symlink, `update-main` which pulls `main` in the main worktree and installs from there, `disable`, `restart`, `uninstall`.
