#!/usr/bin/env python3
import sys
import subprocess
import ast

def get_applets():
    out = subprocess.check_output(["gsettings", "get", "org.cinnamon", "enabled-applets"]).decode().strip()
    return ast.literal_eval(out)

def set_applets(applets):
    subprocess.check_call(["gsettings", "set", "org.cinnamon", "enabled-applets", str(applets)])

def enable(uuid):
    applets = get_applets()
    if any(uuid in item for item in applets):
        print("Applet is already enabled.")
        return
    max_id = max([int(x.split(":")[-1]) for x in applets if x.split(":")[-1].isdigit()] or [0])
    new_entry = f"panel1:right:14:{uuid}:{max_id + 1}"
    applets.append(new_entry)
    set_applets(applets)
    print("Enabled applet in Cinnamon:", new_entry)

def disable(uuid):
    applets = get_applets()
    new_applets = [x for x in applets if uuid not in x]
    if len(new_applets) != len(applets):
        set_applets(new_applets)
        print("Disabled applet in Cinnamon.")
    else:
        print("Applet was not enabled.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(1)
    action, uuid = sys.argv[1], sys.argv[2]
    if action == "enable":
        enable(uuid)
    elif action == "disable":
        disable(uuid)
