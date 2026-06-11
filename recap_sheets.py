#!/usr/bin/env python3
import json, base64
from datetime import datetime, timedelta
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SHEET_ID = "12erShSlXNH62KcMwSuKgU38xkqiseprqCR9jMMGtsls"
MY_EMAIL = "sales.datacenterpro@gmail.com"

def get_sheets():
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    creds = Credentials.from_service_account_file(
        str(Path.home() / "Desktop" / "service_account.json"),
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
    return build("sheets", "v4", credentials=creds)

def get_gmail():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    tp = Path.home() / ".gmail_leads_token.json"
    creds = Credentials.from_authorized_user_file(str(tp))
    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        tp.write_text(creds.to_json())
    return build("gmail", "v1", credentials=creds)

def get_week_orders():
    svc = get_sheets()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID, range="Commandes!A:G"
    ).execute()
    rows = result.get("values", [])
    if len(rows) <= 1:
        return []
    now = datetime.now()
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0)
    orders = []
    for row in rows[1:]:
        if len(row) < 5:
            continue
        try:
            dt = datetime.strptime(row[4], "%d/%m/%Y a %H:%M")
            if dt >= monday:
                orders.append({"client": row[0], "quantity": int(row[1]) if str(row[1]).isdigit() else 0, "departments": row[2] if len(row) > 2 else "", "received_at": row[4]})
        except Exception:
            continue
    return orders

def send_recap():
    print("Lecture Google Sheets...")
    orders = get_week_orders()
    print(str(len(orders)) + " commandes trouvees")
    now = datetime.now()
    monday = now - timedelta(days=now.weekday())
    wk = monday.strftime("%d/%m") + " au " + (monday + timedelta(days=6)).strftime("%d/%m/%Y")
    total = sum(o["quantity"] for o in orders)
    rows = ""
    for o in sorted(orders, key=lambda x: x["quantity"], reverse=True):
        rows += "<tr><td style='padding:10px'>" + o["client"] + "</td><td style='padding:10px;text-align:center;font-weight:700'>" + str(o["quantity"]) + "</td><td style='padding:10px;font-size:12px;color:#666'>" + o["departments"] + "</td><td style='padding:10px;font-size:11px;color:#888'>" + o["received_at"] + "</td></tr>"
    html = "<html><body style='font-family:Arial;background:#f7f7f7;padding:20px'><div style='max-width:650px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden'><div style='background:#1a1a2e;padding:28px'><h1 style='color:#fff;font-size:20px;margin:0'>Recap commandes leads</h1><p style='color:#aaa;margin:6px 0 0'>Semaine du " + wk + "</p></div><div style='padding:20px;display:flex;gap:12px'><div style='flex:1;background:#f0f4ff;border-radius:8px;padding:14px;text-align:center'><p style='margin:0;font-size:12px;color:#666'>Total leads</p><p style='margin:4px 0 0;font-size:30px;font-weight:700'>" + str(total) + "</p></div><div style='flex:1;background:#f0fff4;border-radius:8px;padding:14px;text-align:center'><p style='margin:0;font-size:12px;color:#666'>Clients</p><p style='margin:4px 0 0;font-size:30px;font-weight:700'>" + str(len(orders)) + "</p></div></div><div style='padding:0 20px 20px'><table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr style='background:#f7f7f7'><th style='padding:10px;text-align:left;color:#888'>Client</th><th style='padding:10px;text-align:center;color:#888'>Qte</th><th style='padding:10px;text-align:left;color:#888'>Depts</th><th style='padding:10px;text-align:left;color:#888'>Recu le</th></tr></thead><tbody>" + rows + "</tbody></table></div></div></body></html>"
    svc = get_gmail()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Recap leads " + wk + " - " + str(total) + " leads / " + str(len(orders)) + " clients"
    msg["From"] = MY_EMAIL
    msg["To"] = MY_EMAIL
    msg.attach(MIMEText(html, "html"))
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    svc.users().messages().send(userId="me", body={"raw": raw}).execute()
    print("Recap envoye ! " + str(total) + " leads / " + str(len(orders)) + " clients")

if __name__ == "__main__":
    send_recap()
