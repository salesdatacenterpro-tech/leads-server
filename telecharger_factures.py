#!/usr/bin/env python3
"""
📂 Téléchargeur de factures REÇUES (fournisseurs & prestataires)
- Uniquement les mails REÇUS (pas ceux envoyés par toi)
- Uniquement les vraies factures avec PDF
- Exclut les factures de Henri (henrri.net)
- Classées par année dans ~/Desktop/Factures/
- Mémorise les mails déjà traités (pas de doublons)
"""

import os
import re
import base64
import json
import logging
from datetime import datetime
from pathlib import Path

BASE_DIR = Path.home() / "Desktop" / "Factures"
BASE_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = BASE_DIR / "factures.log"
DOWNLOADED_IDS_FILE = BASE_DIR / ".downloaded_ids.json"

INVOICE_MUST_HAVE = [
    'facture', 'invoice', 'reçu', 'receipt', 'avoir',
    'note de crédit', 'credit note', 'quittance',
    'avis de paiement', 'confirmation de paiement',
    'your receipt', 'votre facture', 'votre reçu',
    'tax invoice', 'factura', 'rechnung'
]

INVOICE_EXCLUDE = [
    'leads', 'prospect', 'newsletter', 'unsubscribe', 'désinscri',
    'webinar', 'webinaire', 'invitation', 'meeting', 'réunion',
    'update', 'mise à jour', 'news', 'offre', 'promotion', 'promo',
    'password', 'mot de passe', 'connexion', 'login', 'verify',
    'commande de leads', 'achat de leads'
]

# ── Expéditeurs à exclure totalement ─────────────────────────────────────────
EXCLUDED_SENDERS = [
    'henrri.net',  # Factures Henri
]


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE, encoding='utf-8'),
            logging.StreamHandler()
        ]
    )


def load_downloaded_ids():
    if DOWNLOADED_IDS_FILE.exists():
        return set(json.loads(DOWNLOADED_IDS_FILE.read_text()))
    return set()


def save_downloaded_ids(ids):
    DOWNLOADED_IDS_FILE.write_text(json.dumps(list(ids)))


def authenticate_gmail():
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request

    SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
    token_path = Path.home() / ".gmail_factures_token.json"
    creds_path = Path(__file__).parent / "credentials.json"
    creds = None

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
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
    return profile.get('emailAddress', '').lower()


def is_excluded_sender(from_header: str) -> bool:
    """Vérifie si l'expéditeur est dans la liste des exclusions."""
    from_lower = from_header.lower()
    return any(excl in from_lower for excl in EXCLUDED_SENDERS)


def is_sent_by_me(from_header: str, my_email: str) -> bool:
    return my_email in from_header.lower()


def is_real_invoice(subject: str, snippet: str = "") -> bool:
    text = (subject + " " + snippet).lower()
    if any(excl in text for excl in INVOICE_EXCLUDE):
        return False
    return any(kw in text for kw in INVOICE_MUST_HAVE)


def get_year(internal_date: str) -> str:
    try:
        return str(datetime.fromtimestamp(int(internal_date) / 1000).year)
    except Exception:
        return str(datetime.now().year)


def sanitize(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*\n\r\t]', '_', name).strip('. ')
    return name[:80] or "sans_nom"


def download_pdfs(service, msg_id, subject, year):
    msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
    dest = BASE_DIR / year
    dest.mkdir(parents=True, exist_ok=True)
    saved = []

    def walk(parts):
        for part in parts:
            if part.get('parts'):
                walk(part['parts'])
            if part.get('mimeType') == 'application/pdf' and part.get('filename'):
                att_id = part.get('body', {}).get('attachmentId')
                if not att_id:
                    continue
                att = service.users().messages().attachments().get(
                    userId='me', messageId=msg_id, id=att_id).execute()
                data = base64.urlsafe_b64decode(att['data'])
                fname = f"{sanitize(subject)}_{sanitize(part['filename'])}"
                out = dest / fname
                c = 1
                while out.exists():
                    out = dest / f"{out.stem}_{c}{out.suffix}"
                    c += 1
                out.write_bytes(data)
                saved.append(str(out))

    walk(msg.get('payload', {}).get('parts', []))
    return saved


def run():
    setup_logging()
    logging.info("=" * 50)
    logging.info("Démarrage — factures reçues fournisseurs/prestataires (sans Henri)")

    print("\n🔐 Authentification Gmail...")
    creds = authenticate_gmail()
    if not creds:
        return

    from googleapiclient.discovery import build
    service = build('gmail', 'v1', credentials=creds)

    my_email = get_my_email(service)
    print(f"📧 Compte : {my_email}")
    print(f"🚫 Exclusions : tes propres envois + factures Henri (henrri.net)\n")

    done_ids = load_downloaded_ids()
    print(f"📋 {len(done_ids)} mails déjà traités (ignorés)\n")
    print("🔍 Recherche de toutes les factures reçues depuis le début...")

    query = (
        'has:attachment filename:pdf '
        '-in:sent '
        '-from:henrri.net '
        '(subject:facture OR subject:invoice OR subject:reçu OR subject:receipt '
        'OR subject:quittance OR subject:"tax invoice" OR subject:"votre facture" '
        'OR subject:"your receipt")'
    )

    all_msgs = []
    page_token = None
    while True:
        params = {'userId': 'me', 'q': query, 'maxResults': 500}
        if page_token:
            params['pageToken'] = page_token
        result = service.users().messages().list(**params).execute()
        all_msgs.extend(result.get('messages', []))
        page_token = result.get('nextPageToken')
        if not page_token:
            break

    new_msgs = [m for m in all_msgs if m['id'] not in done_ids]
    print(f"📬 {len(all_msgs)} mails trouvés → {len(new_msgs)} nouveaux à traiter\n")

    total = 0
    skipped_sent = 0
    skipped_excluded = 0
    stats = {}

    for i, msg_ref in enumerate(new_msgs):
        msg_id = msg_ref['id']
        meta = service.users().messages().get(
            userId='me', id=msg_id, format='metadata',
            metadataHeaders=['Subject', 'Date', 'From']
        ).execute()

        headers = {h['name']: h['value'] for h in meta.get('payload', {}).get('headers', [])}
        subject = headers.get('Subject', '(sans objet)')
        from_header = headers.get('From', '')
        snippet = meta.get('snippet', '')
        year = get_year(meta.get('internalDate', '0'))

        done_ids.add(msg_id)

        # Ignore mes propres envois
        if is_sent_by_me(from_header, my_email):
            skipped_sent += 1
            continue

        # Ignore les expéditeurs exclus (Henri)
        if is_excluded_sender(from_header):
            skipped_excluded += 1
            logging.info(f"Ignoré (expéditeur exclu) : {from_header[:50]}")
            continue

        # Filtre : vraie facture uniquement
        if not is_real_invoice(subject, snippet):
            continue

        print(f"[{i+1}/{len(new_msgs)}] 📄 {subject[:50]}...")
        print(f"   De : {from_header[:60]}")

        files = download_pdfs(service, msg_id, subject, year)

        if files:
            total += len(files)
            stats[year] = stats.get(year, 0) + len(files)
            for f in files:
                print(f"   ✅ {Path(f).name}")
                logging.info(f"Sauvegardé : {f}")

    save_downloaded_ids(done_ids)

    print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TERMINÉ
   {total} factures fournisseurs/prestataires téléchargées
   {skipped_sent} ignorées (envoyées par toi)
   {skipped_excluded} ignorées (Henri - henrri.net)
📁 {BASE_DIR}

Répartition par année :""")
    for y, c in sorted(stats.items()):
        print(f"   {y}/ → {c} fichier(s)")
    if not stats:
        print("   Aucune nouvelle facture trouvée.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    os.system(f'open "{BASE_DIR}"')


if __name__ == "__main__":
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📂 Factures reçues — Fournisseurs & Prestataires")
    print("   (Henrri.net exclus)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    run()
