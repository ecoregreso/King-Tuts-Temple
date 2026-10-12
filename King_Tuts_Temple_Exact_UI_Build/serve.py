#!/usr/bin/env python3
"""Optional local server for the editable source. No downloads or installs."""
from __future__ import annotations
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            # A browser may close an image request when its tab is closed.
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0, help='0 chooses a free port')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('--port must be between 0 and 65535')
    for name in ('index.html', 'game.js', 'math.js', 'styles.css', 'vendor/pixi-gsap.js', 'spine-data.js', 'spine-character.js', 'beetle-data.js', 'assets/spine/anubis.png'):
        if not (ROOT / name).is_file():
            parser.error(f'Missing {name}. Extract the whole ZIP, or open PLAY.html instead.')
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT)))
    except OSError as exc:
        parser.error(f'Could not start the local server: {exc}')
    url = f'http://127.0.0.1:{server.server_port}/'
    print('\nCrowns of Kemet — Royal Edition: Live Spine\nAll artwork and libraries are already local.', flush=True)
    print(f'PLAY: {url}\nKeep this terminal open. Ctrl+C stops the server.\n', flush=True)
    if not args.no_browser:
        def open_browser():
            try:
                if not webbrowser.open(url, new=2):
                    print(f'Open this address in your browser: {url}', flush=True)
            except Exception as exc:
                print(f'Browser did not open automatically: {exc}\nOpen: {url}', flush=True)
        threading.Timer(0.3, open_browser).start()
    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        print('\nServer stopped.')
    finally:
        server.server_close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
