UUID = ddc-brightness@oserna
APPLET_DIR = $(HOME)/.local/share/cinnamon/applets/$(UUID)
SRC_DIR = $(CURDIR)

.PHONY: all install enable disable reload restart uninstall status

all: install

install:
	@mkdir -p $(HOME)/.local/share/cinnamon/applets
	@if [ -L "$(APPLET_DIR)" ] || [ -e "$(APPLET_DIR)" ]; then \
		rm -rf "$(APPLET_DIR)"; \
	fi
	@ln -s "$(SRC_DIR)" "$(APPLET_DIR)"
	@echo "Symlink installed: $(APPLET_DIR) -> $(SRC_DIR)"

uninstall: disable
	@if [ -L "$(APPLET_DIR)" ] || [ -e "$(APPLET_DIR)" ]; then \
		rm -rf "$(APPLET_DIR)"; \
		echo "Removed $(APPLET_DIR)"; \
	fi

enable: install
	@python3 $(SRC_DIR)/manage-panel.py enable $(UUID)

disable:
	@python3 $(SRC_DIR)/manage-panel.py disable $(UUID)

reload:
	@if command -v cinnamon-dbus-command >/dev/null 2>&1; then \
		cinnamon-dbus-command ReloadXlet $(UUID) APPLET; \
		echo "Applet $(UUID) reloaded via cinnamon-dbus-command."; \
	else \
		gdbus call --session --dest org.Cinnamon --object-path /org/Cinnamon --method org.Cinnamon.ReloadXlet "$(UUID)" "APPLET"; \
		echo "Applet $(UUID) reloaded via gdbus."; \
	fi

restart:
	@if command -v cinnamon-dbus-command >/dev/null 2>&1; then \
		cinnamon-dbus-command RestartCinnamon 1; \
		echo "Cinnamon restarted via cinnamon-dbus-command."; \
	else \
		gdbus call --session --dest org.Cinnamon --object-path /org/Cinnamon --method org.Cinnamon.RestartCinnamon true; \
		echo "Cinnamon restarted via gdbus."; \
	fi

status:
	@echo "=== Status for $(UUID) ==="
	@echo "Symlink:" && ls -ld "$(APPLET_DIR)" 2>/dev/null || echo "Not installed"
	@echo "Panel:"
	@gsettings get org.cinnamon enabled-applets | grep -o "[^']*$(UUID)[^']*" || echo "Not enabled in panel"
