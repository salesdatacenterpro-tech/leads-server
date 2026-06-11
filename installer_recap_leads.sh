#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Installe la tâche automatique : chaque dimanche à 19h
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PYTHON="$HOME/Desktop/factures_env/bin/python3"
SCRIPT="$HOME/Desktop/recap_leads.py"
LOG="$HOME/Desktop/leads_recap.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰  Installation récap leads — chaque dimanche à 19h"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$SCRIPT" ]; then
    echo "❌ Script non trouvé : $SCRIPT"
    exit 1
fi

CRON_JOB="0 19 * * 0 $PYTHON $SCRIPT >> $LOG 2>&1"
(crontab -l 2>/dev/null | grep -v "recap_leads"; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ Tâche installée !"
echo ""
echo "   📅 Chaque dimanche à 19h00"
echo "   📧 Récap envoyé sur ton Gmail"
echo "   📋 Logs : ~/Desktop/leads_recap.log"
echo ""
echo "Pour vérifier : crontab -l"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
