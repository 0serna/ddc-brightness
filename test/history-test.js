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
applet._applyBrightness = () => {};
applet._updateTooltip = () => {};

function smoothEvent(delta) {
    return {
        get_scroll_direction: () => Clutter.ScrollDirection.SMOOTH,
        get_scroll_delta: () => [0, delta],
    };
}

assert(applet._onScrollEvent(null, smoothEvent(0.5)) === Clutter.EVENT_PROPAGATE,
    "A partial smooth step must not change Brightness");
assert(applet.brightness === 100, `Partial smooth step changed Brightness to ${applet.brightness}`);
assert(applet._onScrollEvent(null, smoothEvent(0.5)) === Clutter.EVENT_STOP,
    "A full smooth step must consume the event");
assert(applet.brightness === 90, `Smooth scroll down gave ${applet.brightness}`);
assert(applet._onScrollEvent(null, smoothEvent(-1)) === Clutter.EVENT_STOP,
    "Smooth scroll up must consume the event");
assert(applet.brightness === 100, `Smooth scroll up gave ${applet.brightness}`);

print("Self-check passed.");
