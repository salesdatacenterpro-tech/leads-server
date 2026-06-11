#!/usr/bin/env python3
import json, base64, logging, threading as _th
from datetime import datetime, timedelta
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

BASE_DIR = Path.home() / "Desktop" / "LeadsCommandes"
BASE_DIR.mkdir(parents=True, exist_ok=True)
ORDERS_FILE = BASE_DIR / "commandes.json"
LOG_FILE = BASE_DIR / "server.log"
FORM_FILE = Path(__file__).parent / "formulaire_leads.html"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s',
    handlers=[logging.FileHandler(LOG_FILE, encoding='utf-8'), logging.StreamHandler()])

def send_email(subject, html):
    def _send():
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            from googleapiclient.discovery import build
            SCOPES = ['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly']
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

def load_orders():
    if ORDERS_FILE.exists():
        return json.loads(ORDERS_FILE.read_text(encoding='utf-8'))
    return []

_lock = _th.Lock()
_seen = set()

def save_order(order):
    key = str(order.get('client','')) + str(order.get('quantity',''))
    with _lock:
        if key in _seen:
            logging.info('Doublon ignore: ' + key)
            return
        _seen.add(key)
    try:
        orders = load_orders()
        order['received_at'] = datetime.now().strftime('%d/%m/%Y a %H:%M')
        order['id'] = str(int(datetime.now().timestamp() * 1000))
        orders.append(order)
        ORDERS_FILE.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding='utf-8')
        logging.info('Commande: ' + str(order.get('client')) + ' ' + str(order.get('quantity')))
        _th.Thread(target=alert, args=(order,), daemon=True).start()
        try:
            import sys
            sys.path.insert(0, str(Path(__file__).parent))
            from sheets_sync import save_order_to_sheets
            _th.Thread(target=save_order_to_sheets, args=(dict(order),), daemon=True).start()
        except Exception as e:
            logging.error('Sheets error: ' + str(e))
    finally:
        import time; time.sleep(10)
        with _lock: _seen.discard(key)

def delete_order(oid):
    orders = load_orders()
    new = [o for o in orders if str(o.get('id','')) != oid and str(o.get('received_at','')) != oid]
    if len(new) == len(orders): return False
    ORDERS_FILE.write_text(json.dumps(new, ensure_ascii=False, indent=2), encoding='utf-8')
    return True

def alert(o):
    c = str(o.get('client','')); q = str(o.get('quantity',''))
    d = ', '.join(sorted(o.get('departments',[])))
    html = ('<div style="font-family:Arial;padding:20px"><h2>Nouvelle commande</h2>'
        '<p><b>Client:</b> '+c+'</p><p><b>Quantite:</b> '+q+' leads</p>'
        '<p><b>Departements:</b> '+d+'</p></div>')
    send_email('Commande leads - '+c+' - '+q+' leads', html)

def get_week_orders():
    orders = load_orders()
    now = datetime.now()
    monday = (now - timedelta(days=now.weekday())).replace(hour=0,minute=0,second=0,microsecond=0)
    result = []
    for o in orders:
        try:
            dt = datetime.strptime(o.get('received_at',''), '%d/%m/%Y a %H:%M')
            if dt >= monday:
                result.append(o)
        except:
            result.append(o)
    return result

DEPT_POS = {
    "59":[33,5],"62":[27,6],"02":[42,11],"08":[51,9],"57":[59,9],"67":[65,11],"68":[66,17],
    "76":[26,10],"80":[33,13],"60":[37,16],"95":[34,20],"77":[40,21],"10":[46,23],"52":[54,21],
    "51":[44,17],"55":[56,16],"54":[61,15],"88":[63,19],"70":[61,23],"90":[67,23],"25":[66,26],
    "14":[19,15],"50":[14,14],"61":[23,19],"27":[29,18],"28":[33,23],"78":[33,21],"75":[36,21],
    "91":[36,23],"92":[35,21],"93":[37,21],"94":[37,22],"45":[39,25],"89":[44,26],"21":[53,27],
    "71":[52,32],"39":[61,29],"01":[61,33],"73":[64,34],"74":[65,31],"69":[58,33],"38":[62,37],
    "72":[27,23],"53":[22,22],"35":[18,22],"29":[8,22],"22":[13,21],"56":[13,26],"49":[24,27],
    "44":[19,28],"85":[21,33],"79":[25,31],"86":[28,31],"37":[28,27],"36":[31,31],"41":[34,27],
    "18":[38,29],"58":[44,29],"03":[45,33],"23":[38,34],"87":[34,35],"19":[36,38],"15":[42,39],
    "63":[44,36],"42":[53,34],"43":[49,38],"07":[53,39],"26":[58,39],"05":[65,39],"04":[63,41],
    "06":[67,42],"83":[63,45],"13":[57,45],"84":[59,42],"30":[53,42],"34":[49,44],"48":[49,40],
    "12":[45,41],"81":[45,44],"11":[45,47],"09":[38,48],"31":[36,46],"32":[32,44],"65":[31,48],
    "64":[25,45],"40":[23,41],"33":[22,37],"47":[30,40],"24":[29,37],"16":[25,34],"17":[21,34],
    "66":[43,50],"82":[37,43],"46":[40,40],"2B":[75,47],"2A":[74,51],
}

def build_dashboard(semaine=None):
    all_orders = load_orders()
    now = datetime.now()
    if semaine:
        try:
            target = datetime.strptime(semaine, '%Y-%m-%d')
        except:
            target = now
        monday = (target - timedelta(days=target.weekday())).replace(hour=0,minute=0,second=0,microsecond=0)
    else:
        monday = (now - timedelta(days=now.weekday())).replace(hour=0,minute=0,second=0,microsecond=0)
    sunday = monday + timedelta(days=6, hours=23, minutes=59)
    wk = monday.strftime('%d/%m') + ' au ' + sunday.strftime('%d/%m/%Y')
    prev_monday = monday - timedelta(days=7)
    next_monday = monday + timedelta(days=7)
    is_current = not semaine or monday.date() == (now - timedelta(days=now.weekday())).date()

    orders = []
    for o in all_orders:
        try:
            dt = datetime.strptime(o.get('received_at',''), '%d/%m/%Y a %H:%M')
            if monday <= dt <= sunday:
                orders.append(o)
        except:
            pass

    total = sum(o.get('quantity',0) for o in orders)
    dept_map = {}
    for o in orders:
        for d in o.get('departments',[]):
            dept_map.setdefault(d,[]).append(o.get('client','?'))

    rows = ''
    for o in sorted(orders, key=lambda x: x.get('received_at',''), reverse=True):
        oid = str(o.get('id','') or o.get('received_at',''))
        client = str(o.get('client',''))
        qty = str(o.get('quantity',''))
        depts = ','.join(o.get('departments',[]))
        rows += (
            '<tr style="border-bottom:1px solid #f0f0f0">'
            '<td style="padding:8px 10px;font-weight:500;font-size:12px">'+client+'</td>'
            '<td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px">'+qty+'</td>'
            '<td style="padding:8px 10px;font-size:10px;color:#555">'+', '.join(sorted(o.get('departments',[])))+'</td>'
            '<td style="padding:8px 10px;font-size:10px;color:#888">'+str(o.get('received_at',''))+'</td>'
            '<td style="padding:8px 10px;white-space:nowrap">'
            '<button data-id="'+oid+'" onclick="delO(this)" style="background:#fff0f0;border:1px solid #fcc;color:#c00;border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer;margin-right:3px">Suppr</button>'
            '<button data-client="'+client+'" data-qty="'+qty+'" data-depts="'+depts+'" onclick="dupO(this)" style="background:#f0f4ff;border:1px solid #c0d0ff;color:#333;border-radius:5px;padding:3px 7px;font-size:11px;cursor:pointer">Dupli</button>'
            '</td></tr>'
        )
    if not orders:
        rows = '<tr><td colspan="5" style="padding:24px;text-align:center;color:#aaa">Aucune commande</td></tr>'

    dept_json = json.dumps(dept_map, ensure_ascii=False)
    pos_json = json.dumps(DEPT_POS, ensure_ascii=False)

    return (
        '<!DOCTYPE html><html><head><meta charset="UTF-8">'
        '<meta http-equiv="refresh" content="30"><title>Dashboard</title>'
        '<style>'
        '*{box-sizing:border-box;margin:0;padding:0}'
        'body{font-family:-apple-system,sans-serif;background:#f5f5f7;padding:16px}'
        '.hd{background:#1a1a2e;border-radius:12px;padding:16px 20px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}'
        '.hd h1{color:#fff;font-size:16px;font-weight:600}.hd p{color:#888;font-size:11px;margin-top:2px}'
        '.nav a{color:#fff;text-decoration:none;background:rgba(255,255,255,0.15);padding:5px 10px;border-radius:7px;font-size:11px;margin-left:6px}'
        '.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}'
        '.stat{background:#fff;border-radius:10px;padding:12px;text-align:center;border:1px solid #eee}'
        '.sn{font-size:24px;font-weight:700;color:#1a1a2e}.sl{font-size:11px;color:#888;margin-top:2px}'
        '.card{background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden;margin-bottom:14px}'
        '.chd{padding:10px 14px;font-size:13px;font-weight:600;color:#333;border-bottom:1px solid #f0f0f0}'
        'table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}'
        'th{padding:8px 10px;text-align:left;color:#888;font-weight:500;font-size:11px;background:#f7f7f7}'
        '.leg{display:flex;gap:12px;padding:8px 14px;background:#fafafa;border-top:1px solid #f0f0f0}'
        '.li{display:flex;align-items:center;gap:4px;font-size:11px;color:#555}'
        '.ld{width:10px;height:10px;border-radius:50%}'
        '#tip{position:fixed;background:#1a1a2e;color:#fff;padding:7px 11px;border-radius:8px;font-size:11px;pointer-events:none;display:none;z-index:1000;line-height:1.5}'
        '</style></head><body>'
        '<div class="hd">'
        '<div><h1>Dashboard commandes leads</h1><p>Semaine du '+wk+'</p></div>'
        '<div class="nav">'
        '<a href="/dashboard?semaine='+prev_monday.strftime('%Y-%m-%d')+'">← Precedente</a>'
        +('<a href="/dashboard?semaine='+next_monday.strftime('%Y-%m-%d')+'">Suivante →</a>' if not is_current else '')
        +('<a href="/dashboard">Actuelle</a>' if semaine else '')
        +'</div></div>'
        '<div class="stats">'
        '<div class="stat"><div class="sn">'+str(len(orders))+'</div><div class="sl">Clients</div></div>'
        '<div class="stat"><div class="sn">'+str(total)+'</div><div class="sl">Leads</div></div>'
        '<div class="stat"><div class="sn">'+str(len(all_orders))+'</div><div class="sl">Historique</div></div>'
        '</div>'
        '<div class="card"><div class="chd">Carte des departements</div>'
        '<div style="padding:6px;background:#f0f4f8">'
        '<svg id="fsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="100%" height="380" style="display:block"></svg>'
        '</div>'
        '<div class="leg">'
        '<div class="li"><div class="ld" style="background:#4CAF50"></div>Libre</div>'
        '<div class="li"><div class="ld" style="background:#ef5350"></div>1 client</div>'
        '<div class="li"><div class="ld" style="background:#9C27B0"></div>Plusieurs</div>'
        '</div></div>'
        '<div class="card"><div class="chd">Commandes</div>'
        '<table><thead><tr>'
        '<th style="width:20%">Client</th>'
        '<th style="width:8%">Qte</th>'
        '<th style="width:27%">Depts</th>'
        '<th style="width:22%">Recu le</th>'
        '<th style="width:23%">Actions</th>'
        '</tr></thead><tbody>'+rows+'</tbody></table></div>'
        '<div id="tip"></div>'
        '<p style="text-align:center;font-size:10px;color:#bbb;margin-top:10px">'+now.strftime('%d/%m/%Y %H:%M:%S')+'</p>'
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>'
        '<script>'
        '(function(){'
        'var D='+dept_json+';var P='+pos_json+';'
        'var svg=document.getElementById("fsvg");'
        'var tip=document.getElementById("tip");'
        'var w=svg.parentElement.clientWidth-12;var h=380;'
        'var proj=d3.geoConicConformal().center([2.454,46.279]).parallels([44,49]).rotate([-2.454,0]).scale(2400).translate([w/2,h/2]);'
        'var path=d3.geoPath().projection(proj);'
        'd3.json("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson").then(function(geo){'
        'var sel=d3.select("#fsvg");sel.attr("viewBox","0 0 "+w+" "+h);'
        'sel.selectAll("path").data(geo.features).enter().append("path")'
        '.attr("d",path)'
        '.attr("fill",function(d){var c=d.properties.code;var cl=D[c]||[];return cl.length===0?"#86c98e":cl.length===1?"#ef5350":"#9C27B0";})'
        '.attr("stroke","#fff").attr("stroke-width","0.8")'
        '.attr("opacity",function(d){return (D[d.properties.code]||[]).length>0?1:0.75;})'
        '.style("cursor","pointer")'
        '.on("mousemove",function(event,d){'
        'var c=d.properties.code;var n=d.properties.nom;var cl=D[c]||[];'
        'var h2="<b>"+c+" - "+n+"</b>";h2+=cl.length===0?"<br>Disponible":"<br>"+cl.join(", ");'
        'tip.innerHTML=h2;tip.style.display="block";'
        'tip.style.left=(event.clientX+14)+"px";tip.style.top=(event.clientY-14)+"px";'
        '}).on("mouseleave",function(){tip.style.display="none";});'
        'sel.selectAll("text").data(geo.features).enter().append("text")'
        '.attr("x",function(d){return path.centroid(d)[0];})'
        '.attr("y",function(d){return path.centroid(d)[1]+3;})'
        '.attr("text-anchor","middle").attr("fill","#fff").attr("font-size","7")'
        '.attr("font-weight","bold").attr("pointer-events","none")'
        '.text(function(d){return d.properties.code;});'
        '});'
        '})();'
        'function delO(btn){if(!confirm("Supprimer ?"))return;'
        'fetch("/api/delete/"+btn.getAttribute("data-id"),{method:"POST"})'
        '.then(function(r){return r.json();})'
        '.then(function(d){if(d.ok)location.reload();else alert("Erreur");});}'
        'function dupO(btn){'
        'var client=btn.getAttribute("data-client");'
        'var qty=btn.getAttribute("data-qty");'
        'var depts=btn.getAttribute("data-depts").split(",").filter(function(x){return x;});'
        'if(!confirm("Dupliquer la commande de "+client+" pour cette semaine ?"))return;'
        'fetch("/api/order",{method:"POST",headers:{"Content-Type":"application/json"},'
        'body:JSON.stringify({client:client,quantity:parseInt(qty),departments:depts,comments:"Dupliquee"})})'
        '.then(function(r){return r.json();})'
        '.then(function(d){if(d.ok)location.reload();else alert("Erreur");});}'
        '</script></body></html>'
    )

def build_recap_html(orders, wk):
    total = sum(o.get('quantity',0) for o in orders)
    rows = ''
    for o in sorted(orders, key=lambda x: x.get('quantity',0), reverse=True):
        depts = ', '.join(sorted(o.get('departments',[])))[:60]
        rows += ('<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0">'+str(o.get('client',''))+'</td>'
            '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700">'+str(o.get('quantity',''))+'</td>'
            '<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666">'+depts+'</td></tr>')
    return ('<html><head><meta charset="utf-8"></head><body style="font-family:Arial;background:#f7f7f7;padding:20px">'
        '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">'
        '<div style="background:#1a1a2e;padding:24px 28px"><h1 style="color:#fff;font-size:18px">Recap leads</h1>'
        '<p style="color:#aaa;font-size:13px">Semaine du '+wk+'</p></div>'
        '<div style="padding:20px 28px"><table style="width:100%;border-collapse:collapse;font-size:13px">'
        '<thead><tr style="background:#f7f7f7"><th style="padding:10px;text-align:left;color:#888">Client</th>'
        '<th style="padding:10px;text-align:center;color:#888">Qte</th>'
        '<th style="padding:10px;text-align:left;color:#888">Depts</th></tr></thead>'
        '<tbody>'+rows+'</tbody></table></div>'
        '<div style="padding:14px 28px;background:#f7f7f7"><p style="font-size:11px;color:#999">'
        'Total: '+str(total)+' leads / '+str(len(orders))+' clients</p></div>'
        '</div></body></html>')

def send_recap_email():
    orders = get_week_orders()
    if not orders: return
    now = datetime.now()
    monday = now - timedelta(days=now.weekday())
    wk = monday.strftime('%d/%m') + ' au ' + (monday+timedelta(days=6)).strftime('%d/%m/%Y')
    total = sum(o.get('quantity',0) for o in orders)
    send_email('Recap leads '+wk+' - '+str(total)+' leads', build_recap_html(orders, wk))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, f, *a): pass

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        path = parsed.path
        if path in ('/', '/formulaire'):
            c = FORM_FILE.read_bytes() if FORM_FILE.exists() else b'<h1>Formulaire introuvable</h1>'
            self._r(200, 'text/html; charset=utf-8', c)
        elif path == '/dashboard':
            sem = qs.get('semaine', [None])[0]
            self._r(200, 'text/html; charset=utf-8', build_dashboard(sem).encode('utf-8'))
        elif path == '/commandes':
            self._r(200, 'application/json', json.dumps(get_week_orders(), ensure_ascii=False).encode())
        elif path == '/recap':
            now = datetime.now(); monday = now - timedelta(days=now.weekday())
            wk = monday.strftime('%d/%m')+' au '+(monday+timedelta(days=6)).strftime('%d/%m/%Y')
            self._r(200, 'text/html; charset=utf-8', build_recap_html(get_week_orders(), wk).encode('utf-8'))
        else:
            self._r(404, 'text/plain', b'Not found')

    def do_POST(self):
        if self.path == '/api/order':
            n = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(n)
            try:
                order = json.loads(body)
                save_order(order)
                self._r(200, 'application/json', b'{"ok":true}')
            except Exception as e:
                logging.error(str(e))
                self._r(400, 'application/json', b'{"ok":false}')
        elif self.path.startswith('/api/delete/'):
            oid = self.path.replace('/api/delete/', '').strip()
            ok = delete_order(oid)
            self._r(200, 'application/json', b'{"ok":true}' if ok else b'{"ok":false}')

    def do_OPTIONS(self):
        self.send_response(200)
        for h, v in [('Access-Control-Allow-Origin','*'),('Access-Control-Allow-Methods','GET,POST,OPTIONS'),('Access-Control-Allow-Headers','Content-Type')]:
            self.send_header(h, v)
        self.end_headers()

    def _r(self, code, ct, body):
        self.send_response(code)
        self.send_header('Content-Type', ct)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

def run_server():
    s = HTTPServer(('', 8080), Handler)
    print('='*51)
    print('Serveur de commandes leads demarre !')
    print('='*51)
    print('Formulaire clients : http://localhost:8080/')
    print('Dashboard          : http://localhost:8080/dashboard')
    print('Recap de la semaine: http://localhost:8080/recap')
    print('Commandes sauvegardees : ' + str(ORDERS_FILE))
    print('Appuie sur Ctrl+C pour arreter.')
    print('='*51)
    try: s.serve_forever()
    except KeyboardInterrupt: print('\nServeur arrete.')

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--send-recap':
        send_recap_email()
    else:
        run_server()
