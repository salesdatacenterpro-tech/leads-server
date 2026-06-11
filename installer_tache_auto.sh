#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Installe la tâche automatique : chaque lundi à 8h
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PYTHON="$HOME/Desktop/factures_env/bin/python3"
SCRIPT="$HOME/Desktop/telecharger_factures.py"
LOG="$HOME/Desktop/Factures/factures.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰  Installation tâche automatique hebdomadaire"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "$SCRIPT" ]; then
    echo "❌ Script non trouvé : $SCRIPT"
    exit 1
fi

if [ ! -f "$PYTHON" ]; then
    echo "❌ Environnement Python non trouvé."
    exit 1
fi

# Supprime l'ancienne tâche si elle existe, puis ajoute la nouvelle
CRON_JOB="0 8 * * 1 $PYTHON $SCRIPT >> $LOG 2>&1"
(crontab -l 2>/dev/null | grep -v "telecharger_factures"; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ Tâche installée avec succès !"
echo ""
echo "   📅 Fréquence : chaque lundi à 8h00"
echo "   📁 Destination : ~/Desktop/Factures/ANNEE/"
echo "   📋 Logs : ~/Desktop/Factures/factures.log"
echo ""
echo "Pour vérifier : crontab -l"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
