# DDC Brightness (`ddc-brightness@oserna`)

Cinnamon panel applet to adjust external monitor brightness via DDC/CI using mouse scroll on the panel icon.

## Features

- Direct brightness adjustment with mouse scroll (10% steps).
- Automatic startup brightness (80%).
- Panel tooltip showing current percentage (`Brightness: X%`).
- Asynchronous, non-blocking `ddcutil` execution with in-memory coalescing to handle rapid scroll bursts.

## Requirements

- Cinnamon Desktop (>= 6.0)
- `ddcutil` installed with user permissions in the `i2c` group

## Development commands (`make`)

```bash
make install    # Create symlink at ~/.local/share/cinnamon/applets/ddc-brightness@oserna
make enable     # Install symlink and add applet to Cinnamon enabled-applets
make disable    # Remove applet from enabled-applets
make reload     # Hot-reload applet via DBus (without restarting session)
make restart    # Restart Cinnamon via DBus
make status     # Show symlink and GSettings status
make uninstall  # Disable applet and remove symlink
```
