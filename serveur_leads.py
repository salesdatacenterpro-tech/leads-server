#!/usr/bin/env python3
import socket as _socket
_orig = _socket.getaddrinfo
def _ipv4_only(h, p, f=0, *a, **k): return _orig(h, p, _socket.AF_INET, *a, **k)
_socket.getaddrinfo = _ipv4_only

import json, base64, logging, time, sys, os, html as _html, threading as _th
from datetime import datetime, timedelta
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

sys.path.insert(0, str(Path(__file__).parent))

BASE_DIR = Path.home() / "Desktop" / "LeadsCommandes"
BASE_DIR.mkdir(parents=True, exist_ok=True)
ORDERS_FILE = BASE_DIR / "commandes.json"
LOG_FILE = BASE_DIR / "server.log"
FORM_FILE = Path(__file__).parent / "formulaire_leads.html"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s',
    handlers=[logging.FileHandler(LOG_FILE, encoding='utf-8'), logging.StreamHandler()])

TYPES = ["PV", "PAC", "ITE"]
TYPE_NAMES = {"PV": "Panneaux solaires", "PAC": "Pompe a chaleur", "ITE": "Isolation exterieure"}
TYPE_COLORS = {"PV": "#F5A623", "PAC": "#2f80ed", "ITE": "#27ae60"}
ALL_DEPTS = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","21","22","23","24","25","26","27","28","29","2A","2B","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","78","79","80","81","82","83","84","85","86","87","88","89","90","91","92","93","94","95"]

def norm_type(t):
    t = str(t or '').strip().upper()
    return t if t in TYPES else 'PV'   # anciennes commandes sans type = PV

def esc(s):
    return _html.escape(str(s), quote=True)

# ---------------------------------------------------------------- Email
def send_email(subject, html):
    def _send():
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            from googleapiclient.discovery import build
            SCOPES = ['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly']
            b64 = os.environ.get("GMAIL_TOKEN_B64")
            if b64:
                token_data = json.loads(base64.b64decode(b64).decode())
                tp = Path("/tmp/.gmail_leads_token.json")
                tp.write_text(json.dumps(token_data))
            else:
                tp = Path.home() / ".gmail_leads_token.json"
            creds = Credentials.from_authorized_user_file(str(tp), SCOPES)
            if not creds.valid and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                tp.write_text(creds.to_json())
            svc = build('gmail', 'v1', credentials=creds)
            me = svc.users().getProfile(userId='me').execute()['emailAddress']
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject; msg['From'] = me; msg['To'] = me
            msg.attach(MIMEText(html, 'html'))
            raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
            svc.users().messages().send(userId='me', body={'raw': raw}).execute()
            logging.info('Email: ' + subject)
        except Exception as e:
            logging.error('Email error: ' + str(e))
    _th.Thread(target=_send, daemon=True).start()

def alert(o):
    t = o.get('type', 'PV')
    c = esc(o.get('client', '')); q = str(o.get('quantity', ''))
    d = ', '.join(sorted(o.get('departments', [])))
    com = esc(o.get('comments', ''))
    html = ('<div style="font-family:Arial;padding:20px"><h2>Nouvelle commande ' + t + '</h2>'
        '<p><b>Type:</b> ' + t + ' - ' + TYPE_NAMES[t] + '</p>'
        '<p><b>Client:</b> ' + c + '</p><p><b>Quantite:</b> ' + q + ' leads</p>'
        '<p><b>Departements:</b> ' + d + '</p>'
        + ('<p><b>Commentaire:</b> ' + com + '</p>' if com else '') + '</div>')
    send_email('Commande leads ' + t + ' - ' + str(o.get('client', '')) + ' - ' + q + ' leads', html)

# ---------------------------------------------------------------- Stockage local (secours)
_file_lock = _th.Lock()

def load_orders():
    try:
        if ORDERS_FILE.exists():
            return json.loads(ORDERS_FILE.read_text(encoding='utf-8'))
    except Exception as e:
        logging.error('load_orders: ' + str(e))
    return []

def write_orders(orders):
    ORDERS_FILE.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding='utf-8')

# ---------------------------------------------------------------- Lecture Google Sheets (avec cache)
CACHE_TTL = 300
_cache = {'orders': None, 'time': 0}
_cache_lock = _th.Lock()

def _parse_row(row):
    if len(row) < 5: return None
    try:
        dt = datetime.strptime(row[4].strip(), "%d/%m/%Y a %H:%M")
    except Exception:
        return None
    qty = str(row[1]).strip()
    return {
        "client": row[0],
        "quantity": int(qty) if qty.isdigit() else 0,
        "departments": [d.strip() for d in row[2].split(",") if d.strip()] if row[2] else [],
        "comments": row[3] if len(row) > 3 else "",
        "received_at": row[4].strip(),
        "id": row[5] if len(row) > 5 else "",
        "type": norm_type(row[7] if len(row) > 7 else ""),
        "_dt": dt,
    }

def get_all_sheet_orders():
    """Toutes les commandes du Sheet. 2 requetes Google max toutes les 5 min."""
    with _cache_lock:
        if _cache['orders'] is not None and time.time() - _cache['time'] < CACHE_TTL:
            return _cache['orders']
    try:
        from sheets_sync import get_client, read_all_tabs
        _, tabs = read_all_tabs(get_client())
        orders = []
        for ws, rows in tabs:
            for row in rows[1:]:
                o = _parse_row(row)
                if o: orders.append(o)
        with _cache_lock:
            _cache['orders'] = orders; _cache['time'] = time.time()
        return orders
    except Exception as e:
        logging.error('Sheets read error: ' + str(e))
        with _cache_lock:
            if _cache['orders'] is not None:
                _cache['time'] = time.time() - CACHE_TTL + 60  # reessaie dans 1 min
            return _cache['orders']

def _local_with_dt():
    out = []
    for o in load_orders():
        try:
            o = dict(o); o['_dt'] = datetime.strptime(o.get('received_at', ''), '%d/%m/%Y a %H:%M')
            o['type'] = norm_type(o.get('type'))
            out.append(o)
        except Exception:
            pass
    return out

def all_orders():
    s = get_all_sheet_orders()
    return s if s is not None else _local_with_dt()

def week_bounds(semaine=None):
    now = datetime.now()
    target = now
    if semaine:
        try: target = datetime.strptime(semaine, '%Y-%m-%d')
        except Exception: target = now
    monday = (target - timedelta(days=target.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return monday, monday + timedelta(days=7)

def orders_for_week(semaine=None, typ=None):
    monday, next_monday = week_bounds(semaine)
    res = [o for o in all_orders() if monday <= o['_dt'] < next_monday]
    if typ: res = [o for o in res if o['type'] == typ]
    return res

def get_week_orders():
    return [{k: v for k, v in o.items() if k != '_dt'} for o in orders_for_week()]

# ---------------------------------------------------------------- Enregistrement / suppression
_recent = {}
_recent_lock = _th.Lock()

def save_order(order):
    order['type'] = norm_type(order.get('type'))
    try: order['quantity'] = int(order.get('quantity', 0))
    except Exception: order['quantity'] = 0
    order['departments'] = [str(d) for d in order.get('departments', [])]
    key = str(order.get('client', '')).strip().lower() + '|' + str(order['quantity']) + '|' + order['type']
    now = time.time()
    with _recent_lock:
        if now - _recent.get(key, 0) < 10:
            logging.info('Doublon ignore: ' + key)
            return
        _recent[key] = now
    order['received_at'] = datetime.now().strftime('%d/%m/%Y a %H:%M')
    order['id'] = str(int(datetime.now().timestamp() * 1000))
    with _file_lock:
        orders = load_orders(); orders.append(order); write_orders(orders)
    logging.info('Commande ' + order['type'] + ': ' + str(order.get('client')) + ' ' + str(order['quantity']))
    # Visible tout de suite dans le dashboard, sans relire le Sheet
    with _cache_lock:
        if _cache['orders'] is not None:
            o = dict(order); o['_dt'] = datetime.strptime(order['received_at'], '%d/%m/%Y a %H:%M')
            _cache['orders'] = _cache['orders'] + [o]
    alert(order)
    try:
        from sheets_sync import save_order_to_sheets
        _th.Thread(target=save_order_to_sheets, args=(dict(order),), daemon=True).start()
    except Exception as e:
        logging.error('Sheets error: ' + str(e))

def delete_order(oid):
    with _file_lock:
        orders = load_orders()
        new_orders = [o for o in orders if str(o.get('id', '')) != oid and str(o.get('received_at', '')) != oid]
        if len(new_orders) < len(orders): write_orders(new_orders)
    with _cache_lock:
        if _cache['orders'] is not None:
            _cache['orders'] = [o for o in _cache['orders'] if str(o.get('id', '')) != oid and o.get('received_at') != oid]
    try:
        from sheets_sync import get_client, read_all_tabs
        _, tabs = read_all_tabs(get_client())
        for ws, rows in tabs:
            for i, row in enumerate(rows):
                if i > 0 and ((len(row) > 5 and row[5] == oid) or (len(row) > 4 and row[4] == oid)):
                    ws.delete_rows(i + 1)
                    return True
    except Exception as e:
        logging.error('Delete sheets error: ' + str(e))
    return True

# ---------------------------------------------------------------- Dashboard
def build_dashboard(semaine=None, typ='PV'):
    typ = norm_type(typ)
    now = datetime.now()
    monday, next_monday = week_bounds(semaine)
    sunday = next_monday - timedelta(days=1)
    wk = monday.strftime('%d/%m') + ' au ' + sunday.strftime('%d/%m/%Y')
    is_current = monday.date() == week_bounds()[0].date()
    sem_str = monday.strftime('%Y-%m-%d')
    week_all = orders_for_week(semaine)
    orders = [o for o in week_all if o['type'] == typ]
    total = sum(o.get('quantity', 0) for o in orders)
    color = TYPE_COLORS[typ]

    def link(t=None, s=None):
        q = 'type=' + (t or typ)
        if s: q += '&semaine=' + s
        return '/dashboard?' + q

    tabs = ''
    for t in TYPES:
        lst = [o for o in week_all if o['type'] == t]
        n = sum(o.get('quantity', 0) for o in lst)
        active = t == typ
        tabs += ('<a href="' + link(t, sem_str if semaine else None) + '" class="tab' + (' on' if active else '') + '" '
                 'style="' + ('background:' + TYPE_COLORS[t] + ';border-color:' + TYPE_COLORS[t] + ';color:#fff' if active else '') + '">'
                 '<b>' + t + '</b><span>' + str(len(lst)) + ' cmd · ' + str(n) + ' leads</span></a>')

    dept_map = {}
    for o in orders:
        for d in o.get('departments', []):
            dept_map.setdefault(d, []).append(str(o.get('client', '?')))

    histo = {}
    for o in all_orders():
        if o['type'] != typ: continue
        for d in o.get('departments', []):
            histo.setdefault(d, [])
            c = str(o.get('client', ''))
            if c and c not in histo[d]: histo[d].append(c)

    rows = ''
    for o in sorted(orders, key=lambda x: x['_dt'], reverse=True):
        oid = str(o.get('id', '') or o.get('received_at', ''))
        client = str(o.get('client', ''))
        qty = str(o.get('quantity', ''))
        rows += (
            '<tr>'
            '<td style="font-weight:500">' + esc(client) + '</td>'
            '<td style="text-align:center;font-weight:700;font-size:13px">' + qty + '</td>'
            '<td style="font-size:10px;color:#555">' + esc(', '.join(sorted(o.get('departments', [])))) + '</td>'
            '<td style="font-size:10px;color:#888">' + esc(o.get('received_at', '')) + '</td>'
            '<td style="white-space:nowrap">'
            '<button class="b del" data-id="' + esc(oid) + '" onclick="delO(this)">Suppr</button>'
            '<button class="b dup" data-client="' + esc(client) + '" data-qty="' + qty + '" data-depts="' + esc(','.join(o.get('departments', []))) + '" onclick="dupO(this)">Dupli</button>'
            '</td></tr>')
    if not orders:
        rows = '<tr><td colspan="5" style="padding:24px;text-align:center;color:#aaa">Aucune commande ' + typ + ' cette semaine</td></tr>'

    libres = ''.join('<div class="lib" onclick="showHisto(\'' + d + '\')">' + d + '</div>' for d in ALL_DEPTS if d not in dept_map)
    nav = '<a href="' + link(None, (monday - timedelta(days=7)).strftime('%Y-%m-%d')) + '">← Precedente</a>'
    if not is_current:
        nav += '<a href="' + link(None, (monday + timedelta(days=7)).strftime('%Y-%m-%d')) + '">Suivante →</a>'
        nav += '<a href="' + link(None, None) + '">Actuelle</a>'

    return (
        '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        '<meta http-equiv="refresh" content="30"><title>Dashboard ' + typ + '</title>'
        '<style>'
        '*{box-sizing:border-box;margin:0;padding:0}'
        'body{font-family:-apple-system,sans-serif;background:#f5f5f7;padding:16px}'
        '.hd{background:#1a1a2e;border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}'
        '.hd h1{color:#fff;font-size:16px;font-weight:600}.hd p{color:#888;font-size:11px;margin-top:2px}'
        '.nav a{color:#fff;text-decoration:none;background:rgba(255,255,255,0.15);padding:5px 10px;border-radius:7px;font-size:11px;margin-left:6px}'
        '.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}'
        '.tab{background:#fff;border:2px solid #e5e5e5;border-radius:10px;padding:10px;text-align:center;text-decoration:none;color:#1a1a2e}'
        '.tab b{display:block;font-size:17px}.tab span{display:block;font-size:11px;opacity:.75;margin-top:2px}'
        '.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}'
        '.stat{background:#fff;border-radius:10px;padding:12px;text-align:center;border:1px solid #eee;border-top:3px solid ' + color + '}'
        '.sn{font-size:24px;font-weight:700;color:#1a1a2e}.sl{font-size:11px;color:#888;margin-top:2px}'
        '.card{background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden;margin-bottom:12px}'
        '.chd{padding:10px 14px;font-size:13px;font-weight:600;color:#333;border-bottom:1px solid #f0f0f0}'
        'table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}'
        'th{padding:8px 10px;text-align:left;color:#888;font-weight:500;font-size:11px;background:#f7f7f7}'
        'td{padding:8px 10px;border-bottom:1px solid #f0f0f0;word-wrap:break-word}'
        '.b{border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer;margin-right:3px}'
        '.del{background:#fff0f0;border:1px solid #fcc;color:#c00}.dup{background:#f0f4ff;border:1px solid #c0d0ff;color:#333}'
        '.lib{background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:6px 10px;font-size:11px;font-weight:700;cursor:pointer}'
        '.leg{display:flex;gap:12px;padding:8px 14px;background:#fafafa;border-top:1px solid #f0f0f0}'
        '.li{display:flex;align-items:center;gap:4px;font-size:11px;color:#555}.ld{width:10px;height:10px;border-radius:50%}'
        '#search{width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:9px;font-size:13px;outline:none}'
        '#tip{position:fixed;background:#1a1a2e;color:#fff;padding:7px 11px;border-radius:8px;font-size:11px;pointer-events:none;display:none;z-index:1000;line-height:1.5}'
        '</style></head><body>'
        '<div class="hd"><div><h1>Dashboard commandes leads ' + typ + '</h1><p>Semaine du ' + wk + '</p></div>'
        '<div class="nav">' + nav + '</div></div>'
        '<div class="tabs">' + tabs + '</div>'
        '<div class="stats">'
        '<div class="stat"><div class="sn">' + str(len(orders)) + '</div><div class="sl">Commandes ' + typ + '</div></div>'
        '<div class="stat"><div class="sn">' + str(total) + '</div><div class="sl">Leads ' + typ + '</div></div>'
        '<div class="stat"><div class="sn">' + str(len(dept_map)) + '</div><div class="sl">Departements pris</div></div>'
        '</div>'
        '<div class="card"><div class="chd">Carte des departements - ' + typ + ' (' + TYPE_NAMES[typ] + ')</div>'
        '<div style="padding:6px;background:#f0f4f8"><svg id="fsvg" xmlns="http://www.w3.org/2000/svg" width="100%" height="380" style="display:block"></svg></div>'
        '<div class="leg"><div class="li"><div class="ld" style="background:#86c98e"></div>Libre</div>'
        '<div class="li"><div class="ld" style="background:#ef5350"></div>1 client</div>'
        '<div class="li"><div class="ld" style="background:#9C27B0"></div>Plusieurs</div></div></div>'
        '<div class="card"><div class="chd">Departements disponibles ' + typ + ' cette semaine (' + str(len(ALL_DEPTS) - len([d for d in ALL_DEPTS if d in dept_map])) + ')</div>'
        '<div style="padding:14px"><div style="display:flex;flex-wrap:wrap;gap:6px">' + libres + '</div>'
        '<div id="histo-box" style="display:none;margin-top:12px;background:#f9f9f9;border-radius:8px;padding:12px;font-size:12px"></div>'
        '</div></div>'
        '<div class="card"><div class="chd">Commandes ' + typ + '</div>'
        '<div style="padding:10px 14px;border-bottom:1px solid #f0f0f0"><input id="search" placeholder="Rechercher un client..." oninput="filterTable()"></div>'
        '<table><thead><tr><th style="width:20%">Client</th><th style="width:8%">Qte</th><th style="width:27%">Depts</th>'
        '<th style="width:22%">Recu le</th><th style="width:23%">Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        '<div id="tip"></div>'
        '<p style="text-align:center;font-size:10px;color:#bbb;margin-top:10px">' + now.strftime('%d/%m/%Y %H:%M:%S') + '</p>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>'
        '<script>'
        'var TYPE=' + json.dumps(typ) + ';'
        'var D=' + json.dumps(dept_map, ensure_ascii=False) + ';'
        'var HISTO=' + json.dumps(histo, ensure_ascii=False) + ';'
        '(function(){'
        'var svg=document.getElementById("fsvg");var tip=document.getElementById("tip");'
        'var w=svg.parentElement.clientWidth-12;var h=380;'
        'd3.json("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson").then(function(geo){'
        'var proj=d3.geoConicConformal().parallels([44,49]).rotate([-3,0]);'
        'proj.fitExtent([[8,8],[w-8,h-8]],geo);'
        'var path=d3.geoPath().projection(proj);'
        'var sel=d3.select("#fsvg");sel.attr("viewBox","0 0 "+w+" "+h);'
        'sel.selectAll("path").data(geo.features).enter().append("path").attr("d",path)'
        '.attr("fill",function(d){var cl=D[d.properties.code]||[];return cl.length===0?"#86c98e":cl.length===1?"#ef5350":"#9C27B0";})'
        '.attr("stroke","#fff").attr("stroke-width","0.8").style("cursor","pointer")'
        '.on("mousemove",function(event,d){var c=d.properties.code;var cl=D[c]||[];'
        'tip.innerHTML="<b>"+c+" - "+d.properties.nom+"</b><br>"+(cl.length===0?TYPE+" disponible":cl.join(", "));'
        'tip.style.display="block";tip.style.left=(event.clientX+14)+"px";tip.style.top=(event.clientY-14)+"px";})'
        '.on("mouseleave",function(){tip.style.display="none";});'
        'sel.selectAll("text").data(geo.features).enter().append("text")'
        '.attr("x",function(d){return path.centroid(d)[0];}).attr("y",function(d){return path.centroid(d)[1]+3;})'
        '.attr("text-anchor","middle").attr("fill","#fff").attr("font-size","7").attr("font-weight","bold").attr("pointer-events","none")'
        '.text(function(d){return d.properties.code;});'
        '});})();'
        'function showHisto(d){var box=document.getElementById("histo-box");var cl=HISTO[d]||[];'
        'box.innerHTML=cl.length===0?"<b>Dept "+d+"</b> - Aucun historique "+TYPE:"<b>Dept "+d+" - Anciens clients "+TYPE+" :</b> "+cl.join(", ");'
        'box.style.display="block";}'
        'function filterTable(){var q=document.getElementById("search").value.toLowerCase();'
        'document.querySelectorAll("tbody tr").forEach(function(r){r.style.display=r.textContent.toLowerCase().includes(q)?"":"none";});}'
        'function delO(btn){if(!confirm("Supprimer ?"))return;fetch("/api/delete/"+encodeURIComponent(btn.getAttribute("data-id")),{method:"POST"})'
        '.then(function(r){return r.json();}).then(function(d){if(d.ok)location.reload();else alert("Erreur");});}'
        'function dupO(btn){var client=btn.getAttribute("data-client");var qty=btn.getAttribute("data-qty");'
        'var depts=btn.getAttribute("data-depts").split(",").filter(function(x){return x;});'
        'var newQty=window.prompt("Commande "+TYPE+" de "+client+" - Modifiez la quantite:",qty);'
        'if(newQty===null||newQty==="")return;newQty=parseInt(newQty);if(isNaN(newQty)||newQty<1){alert("Quantite invalide");return;}'
        'fetch("/api/order",{method:"POST",headers:{"Content-Type":"application/json"},'
        'body:JSON.stringify({type:TYPE,client:client,quantity:newQty,departments:depts,comments:"Dupliquee"})})'
        '.then(function(r){return r.json();}).then(function(d){if(d.ok)location.reload();else alert("Erreur");});}'
        '</script></body></html>'
    )

# ---------------------------------------------------------------- Recap
def build_recap_html(orders, wk):
    total = sum(o.get('quantity', 0) for o in orders)
    by_type = {t: sum(o.get('quantity', 0) for o in orders if o.get('type') == t) for t in TYPES}
    rows = ''
    for o in sorted(orders, key=lambda x: (TYPES.index(norm_type(x.get('type'))), -x.get('quantity', 0))):
        depts = ', '.join(sorted(o.get('departments', [])))[:60]
        rows += ('<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:700">' + norm_type(o.get('type')) + '</td>'
            '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">' + esc(o.get('client', '')) + '</td>'
            '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700">' + str(o.get('quantity', '')) + '</td>'
            '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666">' + depts + '</td></tr>')
    return ('<html><head><meta charset="utf-8"></head><body style="font-family:Arial;background:#f7f7f7;padding:20px">'
        '<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">'
        '<div style="background:#1a1a2e;padding:24px 28px"><h1 style="color:#fff;font-size:18px">Recap leads</h1>'
        '<p style="color:#aaa;font-size:13px">Semaine du ' + wk + '</p></div>'
        '<div style="padding:20px 28px"><table style="width:100%;border-collapse:collapse;font-size:13px">'
        '<thead><tr style="background:#f7f7f7"><th style="padding:10px;text-align:left;color:#888">Type</th>'
        '<th style="padding:10px;text-align:left;color:#888">Client</th>'
        '<th style="padding:10px;text-align:center;color:#888">Qte</th>'
        '<th style="padding:10px;text-align:left;color:#888">Depts</th></tr></thead>'
        '<tbody>' + rows + '</tbody></table></div>'
        '<div style="padding:14px 28px;background:#f7f7f7"><p style="font-size:11px;color:#999">'
        'Total: ' + str(total) + ' leads / ' + str(len(orders)) + ' commandes - '
        + ' / '.join(t + ': ' + str(by_type[t]) for t in TYPES) + '</p></div>'
        '</div></body></html>')

def send_recap_email():
    orders = get_week_orders()
    if not orders: return
    monday, _ = week_bounds()
    wk = monday.strftime('%d/%m') + ' au ' + (monday + timedelta(days=6)).strftime('%d/%m/%Y')
    total = sum(o.get('quantity', 0) for o in orders)
    send_email('Recap leads ' + wk + ' - ' + str(total) + ' leads', build_recap_html(orders, wk))

# ---------------------------------------------------------------- Serveur HTTP
class Handler(BaseHTTPRequestHandler):
    def log_message(self, f, *a): pass

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        path = parsed.path
        try:
            if path in ('/', '/formulaire'):
                c = FORM_FILE.read_bytes() if FORM_FILE.exists() else b'<h1>Formulaire introuvable</h1>'
                self._r(200, 'text/html; charset=utf-8', c)
            elif path == '/dashboard':
                sem = qs.get('semaine', [None])[0]
                typ = qs.get('type', ['PV'])[0]
                self._r(200, 'text/html; charset=utf-8', build_dashboard(sem, typ).encode('utf-8'))
            elif path == '/commandes':
                self._r(200, 'application/json', json.dumps(get_week_orders(), ensure_ascii=False).encode())
            elif path == '/recap':
                monday, _ = week_bounds()
                wk = monday.strftime('%d/%m') + ' au ' + (monday + timedelta(days=6)).strftime('%d/%m/%Y')
                self._r(200, 'text/html; charset=utf-8', build_recap_html(get_week_orders(), wk).encode('utf-8'))
            else:
                self._r(404, 'text/plain', b'Not found')
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            logging.exception('GET error')
            try: self._r(500, 'text/plain; charset=utf-8', ('Erreur: ' + str(e)).encode())
            except Exception: pass

    def do_POST(self):
        from urllib.parse import unquote
        try:
            if self.path == '/api/order':
                n = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(n)
                try:
                    save_order(json.loads(body))
                    self._r(200, 'application/json', b'{"ok":true}')
                except Exception as e:
                    logging.error(str(e))
                    self._r(400, 'application/json', b'{"ok":false}')
            elif self.path.startswith('/api/delete/'):
                oid = unquote(self.path.replace('/api/delete/', '')).strip()
                ok = delete_order(oid)
                self._r(200, 'application/json', b'{"ok":true}' if ok else b'{"ok":false}')
            else:
                self._r(404, 'text/plain', b'Not found')
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        for h, v in [('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'), ('Access-Control-Allow-Headers', 'Content-Type')]:
            self.send_header(h, v)
        self.end_headers()

    def _r(self, code, ct, body):
        self.send_response(code)
        self.send_header('Content-Type', ct)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

def run_server():
    port = int(os.environ.get('PORT', 8080))
    s = ThreadingHTTPServer(('', port), Handler)
    print('=' * 51)
    print('Serveur de commandes leads demarre ! (PV / PAC / ITE)')
    print('=' * 51)
    print('Formulaire clients : http://localhost:' + str(port) + '/')
    print('Dashboard          : http://localhost:' + str(port) + '/dashboard')
    print('Recap de la semaine: http://localhost:' + str(port) + '/recap')
    print('Appuie sur Ctrl+C pour arreter.')
    print('=' * 51)
    try: s.serve_forever()
    except KeyboardInterrupt: print('\nServeur arrete.')

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--send-recap':
        send_recap_email()
    else:
        run_server()
