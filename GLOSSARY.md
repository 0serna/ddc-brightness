# DDC Brightness

Cinnamon applet that adjusts external Display brightness via DDC/CI using mouse scroll on the panel icon and a fixed evening Schedule.

## Language

**Display**:
An external monitor addressable via DDC/CI. This product assumes exactly one.
_Avoid_: Monitor (except in user-facing UI text), screen, output

**Brightness**:
The luminance level of the Display (VCP code 0x10), as an integer percentage from 0 to 100.
_Avoid_: Contrast, backlight (internal laptop panel brightness), volume

**Schedule**:
The daily list of ScheduleStep entries. Value for this product: 17:00, 17:30, and 18:00.
_Avoid_: timetable, cron

**ScheduleStep**:
A fixed local time with a Brightness cap. A ScheduleStep lowers Brightness only when the current value is above the cap.
_Avoid_: timer, event

**BrightnessStep**:
The increment or decrement applied to Brightness per scroll gesture. Value for this product: 10.
_Avoid_: delta, tick

**StartupBrightness**:
The Brightness level the Applet applies when no ScheduleStep has elapsed that day. Value for this product: 100.
_Avoid_: default brightness (ambiguous: UI-only vs hardware state)

**Applet**:
The panel applet instance with UUID `ddc-brightness@oserna` and display name "DDC Brightness".
_Avoid_: spice, extension (different extension types in Cinnamon)
