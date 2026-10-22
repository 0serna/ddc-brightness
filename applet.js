const Applet = imports.ui.applet;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const BRIGHTNESS_STEP = 10;
const STARTUP_BRIGHTNESS = 100;
const VCP_CODE = "10";
const I2C_BUS = "10";
const SCHEDULE_CHECK_SECONDS = 30;
const SCHEDULE = [
    [17 * 60, 80],
    [17 * 60 + 30, 60],
    [18 * 60, 40],
];
const HISTORY_DIR = GLib.build_filenamev([GLib.get_user_state_dir(), "ddc-brightness"]);
const HISTORY_FILE = GLib.build_filenamev([HISTORY_DIR, "history.csv"]);

function appendHistory(source, from, to) {
    try {
        GLib.mkdir_with_parents(HISTORY_DIR, 0o700);
        GLib.chmod(HISTORY_DIR, 0o700);
        let stream = Gio.File.new_for_path(HISTORY_FILE).append_to(Gio.FileCreateFlags.PRIVATE, null);
        try {
            GLib.chmod(HISTORY_FILE, 0o600);
            let now = GLib.DateTime.new_now_local().format("%Y-%m-%dT%H:%M:%S%z");
            stream.write_all(`${now},${source},${from},${to}\n`, null);
        } finally {
            stream.close(null);
        }
    } catch (e) {
        global.logError(`[ddc-brightness@oserna] history write error: ${e.message}`);
    }
}

function latestStepIndex(minutes) {
    let index = -1;
    for (let i = 0; i < SCHEDULE.length; i++) {
        if (SCHEDULE[i][0] <= minutes)
            index = i;
    }
    return index;
}

class DdcBrightnessApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.brightness = STARTUP_BRIGHTNESS;
        this._isBusy = false;
        this._targetBrightness = null;
        this._lastStepKey = null;
        this._timerId = 0;

        this.set_applet_icon_symbolic_name("display-brightness-symbolic");
        this._updateTooltip();

        this.actor.connect("scroll-event", (actor, event) => this._onScrollEvent(actor, event));

        this._checkSchedule(false);
        this._applyBrightness(this.brightness);
        appendHistory("startup", "", this.brightness);

        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, SCHEDULE_CHECK_SECONDS, () => {
            this._checkSchedule(true);
            return true;
        });
    }

    _checkSchedule(apply) {
        let now = GLib.DateTime.new_now_local();
        let minutes = now.get_hour() * 60 + now.get_minute();
        let index = latestStepIndex(minutes);

        if (index < 0) {
            this._lastStepKey = null;
            return;
        }

        let key = `${now.format("%Y-%m-%d")}:${index}`;
        if (key === this._lastStepKey)
            return;

        this._lastStepKey = key;
        let target = SCHEDULE[index][1];
        if (this.brightness <= target)
            return;

        let previous = this.brightness;
        this.brightness = target;
        this._updateTooltip();
        if (apply) {
            appendHistory("schedule", previous, target);
            this._applyBrightness(target);
        }
    }

    on_applet_removed_from_panel() {
        if (this._timerId > 0) {
            GLib.source_remove(this._timerId);
            this._timerId = 0;
        }
    }

    _updateTooltip() {
        this.set_applet_tooltip(`Brightness: ${this.brightness}%`);
    }

    _onScrollEvent(actor, event) {
        let direction = event.get_scroll_direction();
        if (direction === Clutter.ScrollDirection.SMOOTH) {
            return Clutter.EVENT_PROPAGATE;
        }

        let newBrightness = this.brightness;

        if (direction === Clutter.ScrollDirection.UP) {
            newBrightness = Math.min(100, this.brightness + BRIGHTNESS_STEP);
        } else if (direction === Clutter.ScrollDirection.DOWN) {
            newBrightness = Math.max(0, this.brightness - BRIGHTNESS_STEP);
        } else {
            return Clutter.EVENT_PROPAGATE;
        }

        if (newBrightness !== this.brightness) {
            appendHistory("scroll", this.brightness, newBrightness);
            this.brightness = newBrightness;
            this._updateTooltip();
            this._applyBrightness(this.brightness);
        }

        return Clutter.EVENT_STOP;
    }

    _applyBrightness(value) {
        if (this._isBusy) {
            this._targetBrightness = value;
            return;
        }

        this._isBusy = true;
        let argv = [
            "/usr/bin/ddcutil",
            "--bus", I2C_BUS,
            "--sleep-multiplier", ".2",
            "setvcp", VCP_CODE, value.toString()
        ];

        try {
            let proc = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE
            });
            proc.init(null);
            proc.wait_async(null, (source, res) => {
                try {
                    source.wait_finish(res);
                } catch (e) {
                    global.logError(`[ddc-brightness@oserna] setvcp error: ${e.message}`);
                }

                this._isBusy = false;
                if (this._targetBrightness !== null) {
                    let nextValue = this._targetBrightness;
                    this._targetBrightness = null;
                    this._applyBrightness(nextValue);
                }
            });
        } catch (e) {
            this._isBusy = false;
            global.logError(`[ddc-brightness@oserna] Could not spawn ddcutil: ${e.message}`);
        }
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new DdcBrightnessApplet(metadata, orientation, panel_height, instance_id);
}
