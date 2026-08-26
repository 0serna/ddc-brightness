# DDC Brightness

Cinnamon applet that adjusts external Display brightness via DDC/CI using mouse scroll on the panel icon.

## Language

**Display**:
An external monitor addressable via DDC/CI. This product assumes exactly one.
_Avoid_: Monitor (except in user-facing UI text), screen, output

**Brightness**:
The luminance level of the Display (VCP code 0x10), as an integer percentage from 0 to 100.
_Avoid_: Contrast, backlight (internal laptop panel brightness), volume

**BrightnessStep**:
The increment or decrement applied to Brightness per scroll gesture. Value for this product: 10.
_Avoid_: delta, tick

**StartupBrightness**:
The Brightness level the applet applies upon initialization. Value for this product: 80.
_Avoid_: default brightness (ambiguous: UI-only vs hardware state)

**Applet**:
The panel applet instance with UUID `ddc-brightness@oserna` and display name "DDC Brightness".
_Avoid_: spice, extension (different extension types in Cinnamon)
