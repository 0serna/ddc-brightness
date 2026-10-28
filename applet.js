const Applet = imports.ui.applet;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const BRIGHTNESS_STEP = 10;
const SCROLL_DEDUPE_MS = 10;
const STARTUP_BRIGHTNESS = 100;
const VCP_BRIGHTNESS = "0x10";
const I2C_BUS = "10";
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

var DdcBrightnessApplet = class DdcBrightnessApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.brightness = STARTUP_BRIGHTNESS;
        this._confirmedBrightness = STARTUP_BRIGHTNESS;
        this._isBusy = false;
        this._targetBrightness = null;
        this._removed = false;
        this._lastScrollStepTime = -Infinity;
        this._lastScrollType = null;
        this._scrollAccum = 0;

        this.set_applet_icon_symbolic_name("display-brightness-symbolic");
        this._updateTooltip();

        this.actor.connect("scroll-event", (actor, event) => this._onScrollEvent(actor, event));

        this._applyBrightness(this.brightness);
        appendHistory("startup", "", this.brightness);
    }

    on_applet_removed_from_panel() {
        this._removed = true;
    }

    _updateTooltip() {
        this.set_applet_tooltip(`Brightness: ${this.brightness}%`);
    }

    _onScrollEvent(actor, event) {
        let direction = event.get_scroll_direction();
        let time = event.get_time();
        let type;

        // A high-resolution wheel sends a smooth event and a discrete event for one notch.
        if (direction === Clutter.ScrollDirection.SMOOTH) {
            let delta = event.get_scroll_delta()[1];
            if (delta === 0)
                return Clutter.EVENT_PROPAGATE;
            if (this._lastScrollType === "wheel" &&
                Math.abs(time - this._lastScrollStepTime) < SCROLL_DEDUPE_MS)
                return Clutter.EVENT_STOP;
            this._scrollAccum += delta;
            if (Math.abs(this._scrollAccum) < 1)
                return Clutter.EVENT_PROPAGATE;
            direction = this._scrollAccum > 0 ? Clutter.ScrollDirection.DOWN : Clutter.ScrollDirection.UP;
            this._scrollAccum = 0;
            type = "smooth";
        } else if (direction === Clutter.ScrollDirection.UP || direction === Clutter.ScrollDirection.DOWN) {
            this._scrollAccum = 0;
            if (this._lastScrollType === "smooth" &&
                Math.abs(time - this._lastScrollStepTime) < SCROLL_DEDUPE_MS)
                return Clutter.EVENT_STOP;
            type = "wheel";
        } else {
            return Clutter.EVENT_PROPAGATE;
        }

        let newBrightness = this.brightness;

        if (direction === Clutter.ScrollDirection.UP) {
            newBrightness = Math.min(100, this.brightness + BRIGHTNESS_STEP);
        } else {
            newBrightness = Math.max(0, this.brightness - BRIGHTNESS_STEP);
        }

        if (newBrightness !== this.brightness) {
            this._lastScrollStepTime = time;
            this._lastScrollType = type;
            appendHistory("scroll", this.brightness, newBrightness);
            this.brightness = newBrightness;
            this._updateTooltip();
            this._applyBrightness(this.brightness);
        }

        return Clutter.EVENT_STOP;
    }

    _applyBrightness(value) {
        if (this._removed)
            return;

        if (this._isBusy) {
            this._targetBrightness = value;
            return;
        }

        this._isBusy = true;
        let argv = [
            "/usr/bin/ddcutil",
            "--bus", I2C_BUS,
            "--sleep-multiplier", ".2",
            "setvcp", VCP_BRIGHTNESS, value.toString()
        ];

        try {
            let proc = new Gio.Subprocess({
                argv: argv,
                flags: Gio.SubprocessFlags.NONE
            });
            proc.init(null);
            proc.wait_async(null, (source, res) => {
                let ok = false;
                try {
                    source.wait_finish(res);
                    ok = source.get_successful();
                    if (!ok)
                        global.logError(`[ddc-brightness@oserna] setvcp ${value} failed (exit ${source.get_exit_status()})`);
                } catch (e) {
                    global.logError(`[ddc-brightness@oserna] setvcp error: ${e.message}`);
                }

                if (this._removed)
                    return;

                this._isBusy = false;
                if (ok) {
                    this._confirmedBrightness = value;
                } else {
                    if (this._targetBrightness === null) {
                        this.brightness = this._confirmedBrightness;
                        this._updateTooltip();
                    }
                }

                if (this._targetBrightness !== null) {
                    let nextValue = this._targetBrightness;
                    this._targetBrightness = null;
                    this._applyBrightness(nextValue);
                }
            });
        } catch (e) {
            this._isBusy = false;
            this._targetBrightness = null;
            this.brightness = this._confirmedBrightness;
            this._updateTooltip();
            global.logError(`[ddc-brightness@oserna] Could not spawn ddcutil: ${e.message}`);
        }
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new DdcBrightnessApplet(metadata, orientation, panel_height, instance_id);
}
