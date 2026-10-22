const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const repo = GLib.get_current_dir();
const base = GLib.getenv("XDG_STATE_HOME");
if (!base)
    throw new Error("XDG_STATE_HOME is not set. Run `make check`.");

const dir = GLib.build_filenamev([base, "ddc-brightness"]);
const file = GLib.build_filenamev([dir, "history.csv"]);

GLib.mkdir_with_parents(dir, 0o755);
GLib.chmod(dir, 0o755);
GLib.file_set_contents(file, "");
GLib.chmod(file, 0o644);

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

print("History self-check passed.");
