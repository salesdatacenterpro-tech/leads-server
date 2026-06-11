#!/usr/bin/env python3
"""
📊 Récapitulatif hebdomadaire des leads envoyés
- Scanne les mails envoyés contenant "leads" dans l'objet
- Extrait le nombre de leads depuis l'objet (ex: "PV : 5 Leads")
- Regroupe par client (destinataire)
- Envoie un récapitulatif par email chaque dimanche soir
"""

import re
import json
import logging
import smtplib
from datetime import datetime, timedelta
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from collections import defaultdict

LOG_FILE = Path.home() / "Desktop" / "leads_recap.log"


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )


def authenticate_gmail():
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request

    SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ]
    token_path = Path.home() / ".gmail_leads_token.json"
    creds_path = Path(__file__).parent / "credentials.json"
    creds = None

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
        else:
            if not creds_path.exists():
                print("❌ credentials.json manquant.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json())

    return creds


def get_my_email(service):
    profile = service.users().getProfile(userId='me').execute()
    return profile.get('emailAddress', '')


def extract_lead_count(subject: str) -> int:
    """
    Extrait le nombre de leads depuis l'objet du mail.
    Exemples supportés :
      "PV : 5 Leads"        → 5
      "Leads x10 - Client"  → 10
      "Envoi 3 leads"       → 3
      "Leads (12)"          → 12
    """
    subject_lower = subject.lower()
    # Cherche un nombre avant ou après "leads"
    patterns = [
        r'(\d+)\s*leads?',       # "5 leads" ou "5lead"
        r'leads?\s*[:\-x]?\s*(\d+)',  # "leads: 5" ou "leads x5"
        r'pv\s*:\s*(\d+)',        # "PV : 5"
        r'\((\d+)\)',             # "(5)"
        r'x\s*(\d+)',             # "x5"
    ]
    for pattern in patterns:
        match = re.search(pattern, subject_lower)
        if match:
            return int(match.group(1))
    return 1  # Si pas de nombre trouvé, compte le mail comme 1 lead


def extract_client_name(to_header: str) -> str:
    """Extrait le nom/email du destinataire."""
    # Format "Nom Prénom <email@domain.com>" ou "email@domain.com"
    match = re.match(r'^"?([^"<]+)"?\s*<([^>]+)>', to_header.strip())
    if match:
        name = match.group(1).strip()
        email = match.group(2).strip()
        return f"{name} ({email})" if name else email
    return to_header.strip()


def get_week_range():
    """Retourne le début et la fin de la semaine en cours (lundi → dimanche)."""
    today = datetime.now()
    start = today - timedelta(days=today.weekday())  # Lundi
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return start, end


def fetch_sent_leads(service, start: datetime, end: datetime):
    """Récupère tous les mails envoyés contenant 'leads' dans l'objet cette semaine."""
    after = int(start.timestamp())
    before = int(end.timestamp())
    query = f'in:sent subject:leads after:{after} before:{before}'

    messages = []
    page_token = None
    while True:
        params = {'userId': 'me', 'q': query, 'maxResults': 500}
        if page_token:
            params['pageToken'] = page_token
        result = service.users().messages().list(**params).execute()
        messages.extend(result.get('messages', []))
        page_token = result.get('nextPageToken')
        if not page_token:
            break

    return messages


def build_recap(service, messages):
    """Construit le récapitulatif : {client: {leads: N, mails: N}}"""
    stats = defaultdict(lambda: {'leads': 0, 'mails': 0, 'details': []})

    for msg_ref in messages:
        meta = service.users().messages().get(
            userId='me', id=msg_ref['id'], format='metadata',
            metadataHeaders=['Subject', 'To', 'Date']
        ).execute()

        headers = {h['name']: h['value'] for h in meta.get('payload', {}).get('headers', [])}
        subject = headers.get('Subject', '')
        to = headers.get('To', 'Inconnu')
        date_str = headers.get('Date', '')

        # Peut avoir plusieurs destinataires
        recipients = [r.strip() for r in to.split(',')]

        lead_count = extract_lead_count(subject)

        for recipient in recipients:
            client = extract_client_name(recipient)
            stats[client]['leads'] += lead_count
            stats[client]['mails'] += 1
            stats[client]['details'].append({
                'subject': subject,
                'leads': lead_count,
                'date': date_str
            })

    return stats


def build_html_email(stats, start: datetime, end: datetime, my_email: str) -> str:
    """Génère le contenu HTML du mail récapitulatif."""
    week_label = f"{start.strftime('%d/%m/%Y')} → {end.strftime('%d/%m/%Y')}"
    total_leads = sum(v['leads'] for v in stats.values())
    total_clients = len(stats)

    rows = ""
    for client, data in sorted(stats.items(), key=lambda x: x[1]['leads'], reverse=True):
        rows += f"""
        <tr>
            <td style="padding:10px 16px; border-bottom:1px solid #f0f0f0;">{client}</td>
            <td style="padding:10px 16px; border-bottom:1px solid #f0f0f0; text-align:center; font-weight:600; color:#1a1a2e;">{data['leads']}</td>
            <td style="padding:10px 16px; border-bottom:1px solid #f0f0f0; text-align:center; color:#666;">{data['mails']}</td>
        </tr>"""

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f7f7f7; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#1a1a2e; padding:28px 32px;">
      <h1 style="color:#fff; margin:0; font-size:20px;">📊 Récapitulatif Leads</h1>
      <p style="color:#aaa; margin:6px 0 0; font-size:14px;">Semaine du {week_label}</p>
    </div>

    <div style="padding:24px 32px; display:flex; gap:16px;">
      <div style="flex:1; background:#f0f4ff; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0; font-size:13px; color:#666;">Total leads envoyés</p>
        <p style="margin:4px 0 0; font-size:32px; font-weight:700; color:#1a1a2e;">{total_leads}</p>
      </div>
      <div style="flex:1; background:#f0fff4; border-radius:8px; padding:16px; text-align:center;">
        <p style="margin:0; font-size:13px; color:#666;">Clients servis</p>
        <p style="margin:4px 0 0; font-size:32px; font-weight:700; color:#1a1a2e;">{total_clients}</p>
      </div>
    </div>

    <div style="padding:0 32px 24px;">
      <h2 style="font-size:15px; color:#333; margin:0 0 12px;">Détail par client</h2>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="background:#f7f7f7;">
            <th style="padding:10px 16px; text-align:left; color:#666; font-weight:500;">Client</th>
            <th style="padding:10px 16px; text-align:center; color:#666; font-weight:500;">Leads</th>
            <th style="padding:10px 16px; text-align:center; color:#666; font-weight:500;">Mails</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>

    <div style="padding:16px 32px; background:#f7f7f7; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#999;">
        Récapitulatif généré automatiquement le {datetime.now().strftime('%d/%m/%Y à %H:%M')}
      </p>
    </div>
  </div>
</body>
</html>"""
    return html


def send_recap_email(service, my_email: str, html_content: str, week_label: str, total_leads: int):
    """Envoie le récapitulatif par Gmail API."""
    import base64

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"📊 Récap leads semaine {week_label} — {total_leads} leads envoyés"
    msg['From'] = my_email
    msg['To'] = my_email

    msg.attach(MIMEText(html_content, 'html'))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(userId='me', body={'raw': raw}).execute()
    print(f"✅ Récapitulatif envoyé à {my_email}")


def run():
    setup_logging()
    logging.info("Démarrage récapitulatif leads")

    print("\n🔐 Authentification Gmail...")
    creds = authenticate_gmail()
    if not creds:
        return

    from googleapiclient.discovery import build
    service = build('gmail', 'v1', credentials=creds)

    my_email = get_my_email(service)
    print(f"📧 Compte : {my_email}")

    start, end = get_week_range()
    week_label = f"{start.strftime('%d/%m')} → {end.strftime('%d/%m/%Y')}"
    print(f"📅 Semaine analysée : {week_label}\n")
    print("🔍 Récupération des mails envoyés avec leads...")

    messages = fetch_sent_leads(service, start, end)
    print(f"📬 {len(messages)} mails trouvés\n")

    if not messages:
        print("Aucun mail avec 'leads' envoyé cette semaine.")
        logging.info("Aucun mail leads trouvé cette semaine.")
        return

    stats = build_recap(service, messages)
    total_leads = sum(v['leads'] for v in stats.values())

    # Affiche le résumé dans le terminal
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📊 RÉCAPITULATIF — {week_label}")
    print(f"   Total leads : {total_leads}")
    print(f"   Clients     : {len(stats)}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    for client, data in sorted(stats.items(), key=lambda x: x[1]['leads'], reverse=True):
        print(f"   {client[:45]:<45} {data['leads']:>4} leads  ({data['mails']} mails)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    html = build_html_email(stats, start, end, my_email)
    send_recap_email(service, my_email, html, week_label, total_leads)
    logging.info(f"Récapitulatif envoyé : {total_leads} leads, {len(stats)} clients")


if __name__ == "__main__":
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Récapitulatif hebdomadaire des leads envoyés")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    run()
