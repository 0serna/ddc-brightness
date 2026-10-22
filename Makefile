UUID = ddc-brightness@oserna
APPLET_DIR = $(HOME)/.local/share/cinnamon/applets/$(UUID)
SRC_DIR = $(CURDIR)
MAIN_WORKTREE := $(patsubst %/.git,%,$(shell git rev-parse --path-format=absolute --git-common-dir))

.PHONY: all install update-main enable disable reload restart uninstall status check

all: install

install:
	@mkdir -p $(HOME)/.local/share/cinnamon/applets
	@if [ -L "$(APPLET_DIR)" ] || [ -e "$(APPLET_DIR)" ]; then \
		rm -rf "$(APPLET_DIR)"; \
	fi
	@ln -s "$(SRC_DIR)" "$(APPLET_DIR)"
	@echo "Symlink installed: $(APPLET_DIR) -> $(SRC_DIR)"

update-main:
	@test "$$(git -C "$(MAIN_WORKTREE)" branch --show-current)" = "main" || { echo "Main worktree is not on main: $(MAIN_WORKTREE)"; exit 1; }
	git -C "$(MAIN_WORKTREE)" pull --ff-only
	make -C "$(MAIN_WORKTREE)" install reload

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

check:
	@tmp=$$(mktemp -d); \
	XDG_STATE_HOME=$$tmp cjs test/history-test.js; \
	status=$$?; \
	rm -rf $$tmp; \
	exit $$status
