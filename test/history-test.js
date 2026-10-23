const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const repo = GLib.get_current_dir();
const base = GLib.getenv("XDG_STATE_HOME");
if (!base)
    throw new Error("XDG_STATE_HOME is not set. Run `make check`.");

const dir = GLib.build_filenamev([base, "ddc-brightness"]);
const file = GLib.build_filenamev([dir, "history.csv"]);

if (GLib.file_test(dir, GLib.FileTest.EXISTS))
    throw new Error(`${dir} exists. Use a fresh XDG_STATE_HOME and run make check.`);

imports.searchPath.unshift(GLib.build_filenamev([repo, "test", "stubs"]));
imports.searchPath.unshift(repo);
const Applet = imports.applet;

function mode(path) {
    let info = Gio.File.new_for_path(path).query_info("unix::mode", Gio.FileQueryInfoFlags.NONE, null);
    return info.get_attribute_uint32("unix::mode") & 0o777;
}

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

Applet.appendHistory("startup", "", 100);
Applet.appendHistory("scroll", 100, 90);

let [ok, data] = GLib.file_get_contents(file);
assert(ok, "History file is missing");
let lines = imports.byteArray.toString(data).trim().split("\n");

assert(lines.length === 2, `Expected 2 lines, got ${lines.length}`);
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4},startup,,100$/.test(lines[0]),
    `Bad startup line: ${lines[0]}`);
assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4},scroll,100,90$/.test(lines[1]),
    `Bad scroll line: ${lines[1]}`);
assert(mode(dir) === 0o700, `Directory mode is ${mode(dir).toString(8)}, expected 700`);
assert(mode(file) === 0o600, `File mode is ${mode(file).toString(8)}, expected 600`);

assert(Applet.latestStepIndex(16 * 60 + 59) === -1, "17:00 step fired early");
assert(Applet.latestStepIndex(17 * 60) === 0, "17:00 step missing");
assert(Applet.latestStepIndex(17 * 60 + 30) === 1, "17:30 step missing");
assert(Applet.latestStepIndex(18 * 60) === 2, "18:00 step missing");
assert(Applet.latestStepIndex(23 * 60 + 59) === 2, "Last step missing");

const applet = Object.create(Applet.DdcBrightnessApplet.prototype);
applet.brightness = 100;
applet._scrollAccum = 0;
applet._lastScrollStepTime = -Infinity;
applet._lastScrollType = null;
applet._applyBrightness = () => {};
applet._updateTooltip = () => {};

function smoothEvent(delta, time) {
    return {
        get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
        get_scroll_delta: () => [0, delta],
        get_time: () => time,
    };
}

function wheelEvent(direction, time) {
    return {
        get_scroll_direction: () => direction,
        get_time: () => time,
    };
}

assert(applet._onScrollEvent(null, smoothEvent(0.5, 1000)) === Clutter.EVENT_PROPAGATE,
    "A partial smooth step must not change Brightness");
assert(applet.brightness === 100, `Partial smooth step changed Brightness to ${applet.brightness}`);
assert(applet._onScrollEvent(null, smoothEvent(0.5, 1020)) === Clutter.EVENT_STOP,
    "A full smooth step must consume the event");
assert(applet.brightness === 90, `Smooth scroll down gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1020)) === Clutter.EVENT_STOP,
    "A duplicate event from the same notch must be consumed");
assert(applet.brightness === 90, `One notch changed Brightness twice to ${applet.brightness}`);

assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1100)) === Clutter.EVENT_STOP,
    "A new wheel notch must consume the event");
assert(applet.brightness === 80, `Second wheel notch gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, smoothEvent(1, 1109)) === Clutter.EVENT_STOP,
    "A smooth event within the dedupe window must be consumed");
assert(applet.brightness === 80, `Duplicate smooth event changed Brightness to ${applet.brightness}`);
assert(applet._onScrollEvent(null, smoothEvent(1, 1110)) === Clutter.EVENT_STOP,
    "A smooth event at the dedupe boundary must step");
assert(applet.brightness === 70, `Boundary smooth event gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1120)) === Clutter.EVENT_STOP,
    "A wheel notch after the dedupe window must step");
assert(applet.brightness === 60, `Wheel notch after the dedupe window gave ${applet.brightness}`);
assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1125)) === Clutter.EVENT_STOP,
    "A second wheel notch within the dedupe window must still step");
assert(applet.brightness === 50, `Fast wheel notch gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.LEFT, 1130)) === Clutter.EVENT_PROPAGATE,
    "Horizontal scroll must propagate");
assert(applet.brightness === 50, `Horizontal scroll changed Brightness to ${applet.brightness}`);

assert(applet._onScrollEvent(null, smoothEvent(0, 1140)) === Clutter.EVENT_PROPAGATE,
    "A smooth event without movement must propagate");
assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1140)) === Clutter.EVENT_STOP,
    "A wheel notch after an empty smooth event must consume the event");
assert(applet.brightness === 40, `Wheel notch after empty smooth event gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, smoothEvent(-0.5, 1160)) === Clutter.EVENT_PROPAGATE,
    "A partial smooth scroll up must not change Brightness");
assert(applet._onScrollEvent(null, smoothEvent(-0.5, 1180)) === Clutter.EVENT_STOP,
    "A full smooth scroll up must consume the event");
assert(applet.brightness === 50, `Smooth scroll up gave ${applet.brightness}`);

assert(applet._onScrollEvent(null, wheelEvent(Clutter.ScrollDirection.DOWN, 1200)) === Clutter.EVENT_STOP,
    "A wheel notch must consume the event");
assert(applet.brightness === 40, `Wheel notch gave ${applet.brightness}`);
assert(applet._onScrollEvent(null, smoothEvent(1, 1200)) === Clutter.EVENT_STOP,
    "A smooth duplicate after a wheel notch must be consumed");
assert(applet.brightness === 40, `Smooth duplicate after a wheel notch gave ${applet.brightness}`);

print("Self-check passed.");
