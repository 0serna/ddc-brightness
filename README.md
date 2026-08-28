# DDC brightness

This Cinnamon panel applet is `ddc-brightness@oserna`. It sets external Display brightness over DDC/CI. Scroll the panel icon and `applet.js` runs `/usr/bin/ddcutil setvcp 10` on I2C bus 10.

## Inventory

| Path | Role |
|---|---|
| `applet.js` | Cinnamon `IconApplet`: scroll ±10%, startup 80%, latest `ddcutil setvcp` wins if a call is already running |
| `metadata.json` | Xlet metadata: UUID, Cinnamon 6.0-6.6, symbolic icon |
| `Makefile` | Symlink into `~/.local/share/cinnamon/applets/`, DBus reload/restart |
| `manage-panel.py` | Enable/disable via `org.cinnamon enabled-applets` |
| `CONTEXT.md` | Domain terms: Display, Brightness, BrightnessStep, StartupBrightness |

Brightness control is all in `applet.js`. Bus, VCP code, step, and startup level are constants: `I2C_BUS = "10"`, `VCP_CODE = "10"`, `BRIGHTNESS_STEP = 10`, `STARTUP_BRIGHTNESS = 100`. The applet assumes one Display. If a `ddcutil` subprocess is already running, later scrolls overwrite `_targetBrightness`. The next `ddcutil` runs when the current call finishes.

`make install` only symlinks this repo to `~/.local/share/cinnamon/applets/ddc-brightness@oserna`. `manage-panel.py` appends `panel1:right:14:{uuid}:{instance}` to the GSettings applet list.

## Layout

```
.
├── applet.js          # Cinnamon entry, main()
├── metadata.json      # UUID ddc-brightness@oserna
├── Makefile           # install, enable, reload, uninstall
├── manage-panel.py    # gsettings panel list
└── CONTEXT.md         # vocabulary
```

## Setup

Cinnamon 6.0+ and `ddcutil` at `/usr/bin/ddcutil`. You usually need to be in the `i2c` group. Hardware is I2C bus 10 only.

```bash
make enable    # symlink + add to panel1 right
make status    # symlink and GSettings
make reload    # hot-reload via DBus
```

Other targets: `install` which only creates the symlink, `disable`, `restart`, `uninstall`.
