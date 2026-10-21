# brightness-schedule Specification

## Purpose

Lets the Applet dim the Display automatically at fixed evening times, with a one-way cap that never raises Brightness on its own.

## Requirements

### Requirement: Fixed evening schedule

The Applet SHALL lower Brightness at three fixed local-time steps each day: 17:00 to 80 %, 17:30 to 60 %, and 18:00 to 40 %. The steps use the system local clock and repeat every day.

#### Scenario: First step

- **WHEN** the local time reaches 17:00
- **THEN** the Applet lowers Brightness to 80 % if the current value is above 80 %

#### Scenario: Second step

- **WHEN** the local time reaches 17:30
- **THEN** the Applet lowers Brightness to 60 % if the current value is above 60 %

#### Scenario: Third step

- **WHEN** the local time reaches 18:00
- **THEN** the Applet lowers Brightness to 40 % if the current value is above 40 %

### Requirement: One-way lowering

At a schedule step, the Applet SHALL change Brightness only when the current Brightness is greater than the scheduled value. The Applet SHALL send no command when the current value is equal to or lower than the scheduled value. The Applet SHALL NOT raise Brightness automatically.

#### Scenario: Current value is above the step

- **WHEN** a step runs and the current Brightness is above its scheduled value
- **THEN** the Applet sets Brightness to the scheduled value

#### Scenario: Current value equals the step

- **WHEN** a step runs and the current Brightness equals its scheduled value
- **THEN** the Applet sends no brightness command

#### Scenario: Current value is below the step

- **WHEN** a step runs and the current Brightness is below its scheduled value
- **THEN** the Applet sends no brightness command

### Requirement: Catch-up after start or resume

When the Applet starts or resumes and one or more steps have already elapsed that local day, it SHALL apply the most recent elapsed step once, under the one-way lowering rule. It SHALL NOT replay earlier steps.

#### Scenario: Start after the last step

- **WHEN** the Applet starts at 19:00 with Brightness at 100 %
- **THEN** it lowers Brightness to 40 %

#### Scenario: Start before the first step

- **WHEN** the Applet starts at 03:00 with Brightness at 100 %
- **THEN** it sends no brightness command

#### Scenario: Resume between steps

- **WHEN** the Applet resumes at 17:45 with Brightness at 100 %
- **THEN** it lowers Brightness to 60 % and does not apply the 80 % step

#### Scenario: Resume after the last step

- **WHEN** the Applet resumes at 18:10 with Brightness at 80 %
- **THEN** it lowers Brightness to 40 %

### Requirement: Daily reset and manual changes

The Applet SHALL apply each step at most once per local day and SHALL reset step tracking at local midnight. A manual brightness change made after a step SHALL persist until the next day's step.

#### Scenario: Manual change after a step

- **WHEN** the user raises Brightness to 90 % at 18:05
- **THEN** the Applet does not lower it again that day

#### Scenario: Next day's first step

- **WHEN** the local time reaches 17:00 the next day and Brightness is 90 %
- **THEN** the Applet lowers Brightness to 80 %

#### Scenario: Midnight passes

- **WHEN** the local time reaches 00:00
- **THEN** the Applet sends no brightness command and Brightness keeps its current value
