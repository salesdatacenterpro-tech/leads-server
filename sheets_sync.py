import os, base64, json, gspread
import socket
from google.oauth2.service_account import Credentials
from datetime import datetime, timedelta
from pathlib import Path

SHEET_ID = os.environ.get("SHEET_ID", "12erShSlXNH62KcMwSuKgU38xkqiseprqCR9jMMGtsls")

_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only(host, port, family=0, *args, **kwargs):
    return _orig_getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)
socket.getaddrinfo = _ipv4_only

def get_client():
    b64 = os.environ.get("SERVICE_ACCOUNT_B64")
    if b64:
        info = json.loads(base64.b64decode(b64 + "==").decode())
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
    except gspread.exceptions.WorksheetNotFound:
        ws = sh.add_worksheet(title=sheet_name, rows=1000, cols=7)
        ws.append_row(["Client","Quantite","Departements","Commentaire","Date","ID","Semaine"])
    return ws

def save_order_to_sheets(order):
    try:
        gc = get_client()
        ws = get_week_sheet(gc)
        now = datetime.now()
        ws.append_row([
            order.get("client",""),
            order.get("quantity",""),
            ", ".join(sorted(order.get("departments",[]))),
            order.get("comments",""),
            order.get("received_at", now.strftime("%d/%m/%Y a %H:%M")),
            order.get("id",""),
            now.strftime("S%W-%Y")
        ])
        return True
    except Exception as e:
        print("Erreur sheets:", e)
        return False

if __name__ == "__main__":
    print("Test...")
    if save_order_to_sheets({"client":"Test Railway","quantity":1,"departments":["75"],"id":"test"}):
        print("OK!")
    else:
        print("ERREUR")
