"""Serve the project locally:  python serve.py  ->  http://localhost:8000/web/index.html"""
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", ""): self.send_response(302); self.send_header("Location", "/web/index.html"); self.end_headers(); return
        super().do_GET()
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", 8000), H) as s:
    print("PrediCare running at http://localhost:8000"); s.serve_forever()
