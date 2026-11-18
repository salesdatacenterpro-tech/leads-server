import os, base64, json, gspread
import socket
from google.oauth2.service_account import Credentials
from datetime import datetime, timedelta
from pathlib import Path

SHEET_ID = os.environ.get("SHEET_ID", "12erShSlXNH62KcMwSuKgU38xkqiseprqCR9jMMGtsls")
HEADERS = ["Client", "Quantite", "Departements", "Commentaire", "Date", "ID", "Semaine", "Type"]

_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, *args, **kwargs):
    return _orig_getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = _ipv4_only

def get_client():
    b64 = os.environ.get("SERVICE_ACCOUNT_B64")
    if b64:
        import zlib
        try:
            decoded = base64.b64decode(b64 + "==")
            try:
                info = json.loads(decoded.decode("utf-8"))
            except Exception:
                info = json.loads(zlib.decompress(decoded).decode("utf-8"))
        except Exception as ex:
            print("decode error:", ex)
            info = json.load(open(str(Path.home() / "Desktop" / "service_account.json")))
    else:
        info = json.load(open(str(Path.home() / "Desktop" / "service_account.json")))
    creds = Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return gspread.authorize(creds)

def get_week_sheet(gc):
    now = datetime.now()
    monday = now - timedelta(days=now.weekday())
    sheet_name = "Semaine " + monday.strftime("%d/%m")
    sh = gc.open_by_key(SHEET_ID)
    try:
        ws = sh.worksheet(sheet_name)
        # Anciens onglets a 7 colonnes : on ajoute la colonne Type une seule fois
        if ws.col_count < len(HEADERS):
            ws.add_cols(len(HEADERS) - ws.col_count)
            ws.update_cell(1, len(HEADERS), "Type")
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title=sheet_name, rows=1000, cols=len(HEADERS))
        ws.append_row(HEADERS)
    return ws

def read_all_tabs(gc):
    """Lit tous les onglets en 2 requetes seulement (au lieu d'une par onglet)."""
    sh = gc.open_by_key(SHEET_ID)
    worksheets = sh.worksheets()
    if not worksheets:
        return sh, []
    ranges = ["'" + ws.title.replace("'", "''") + "'" for ws in worksheets]
    res = sh.values_batch_get(ranges)
    out = []
    for ws, vr in zip(worksheets, res.get("valueRanges", [])):
        out.append((ws, vr.get("values", [])))
    return sh, out

def save_order_to_sheets(order):
    try:
        gc = get_client()
        ws = get_week_sheet(gc)
        now = datetime.now()
        ws.append_row([
            order.get("client", ""),
            order.get("quantity", ""),
            ", ".join(sorted(order.get("departments", []))),
            order.get("comments", ""),
            order.get("received_at", now.strftime("%d/%m/%Y a %H:%M")),
            order.get("id", ""),
            now.strftime("S%W-%Y"),
            order.get("type", "PV"),
        ], table_range="A1")
        return True
    except Exception as e:
        print("Erreur sheets:", e)
        return False

if __name__ == "__main__":
    print("Test...")
    if save_order_to_sheets({"client": "Test Railway", "quantity": 1, "departments": ["75"], "id": "test", "type": "PV"}):
        print("OK!")
    else:
        print("ERREUR")
