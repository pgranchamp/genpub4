#!/bin/bash

# CONFIGURATION
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDc5MjE4NTMsImV4cCI6MTc0ODAwODI1Mywicm9sZXMiOlsiUk9MRV9VU0VSIl0sInVzZXJuYW1lIjoicGllcnJlLmdyYW5jaGFtcEBiaWdsb3ZlLmFnZW5jeSJ9.YtTJIdMNvKgUG3s2X--EI9C8tRXOIeVAfKOc8dUd02qKeiREcgzQWdaN3B-dFU2N02-7wRay-O0Du-VcDZXWGW2pVGeW8ynrqAcvzkDLdzA2OEoM-rLWZ_pZ-U3Pm3bevwnCE9j0XhnTZ8XwfP7fUp0o2pMmg_mU7Y_TWcvIHBQLtLTpZc4lD3mZgbaSGpA73raljP9Vvltc5oCE0a5K4cuLCYR3c9LC8sFyieciyOOxK9iRtJuyJbpxukmND_C922TR8Wgm2VEabgxmSSRuUVG4QE-39htyrAByDf9KWjM72Skxhti0rN4ZlTIoxwI1N_UmIdrafv-hS6SYAgmwlQ"
BASE_URL="https://aides-territoires.beta.gouv.fr/api/backer-groups/"
OUTPUT_FILE="all_group_backers.json"

# Initialisation
PAGE=1
HAS_NEXT=true
TMP_FILE="tmp_backers.json"

echo "🟡 DÉBUT DU SCRIPT"
echo "📡 Endpoint : $BASE_URL"
echo "🔐 Token : ${#TOKEN} caractères"

echo "[" > $OUTPUT_FILE
FIRST=true

while $HAS_NEXT; do
  echo "➡️  Requête page $PAGE..."

  curl -s \
    -X GET "${BASE_URL}?page=$PAGE" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" > $TMP_FILE

  if jq -e .results $TMP_FILE > /dev/null; then
    echo "✅ Données trouvées pour la page $PAGE."

    if $FIRST; then
      jq '.results[]' $TMP_FILE >> $OUTPUT_FILE
      FIRST=false
    else
      echo "," >> $OUTPUT_FILE
      jq '.results[]' $TMP_FILE >> $OUTPUT_FILE
    fi

  else
    echo "❌ Erreur : la réponse ne contient pas '.results'."
    echo "🔎 Contenu brut de la réponse :"
    cat $TMP_FILE
    echo "]" >> $OUTPUT_FILE
    exit 1
  fi

  # Vérifier s’il y a une page suivante
  NEXT=$(jq -r '.next' $TMP_FILE)
  if [ "$NEXT" != "null" ]; then
    ((PAGE++))
  else
    HAS_NEXT=false
  fi
done

echo "]" >> $OUTPUT_FILE
rm $TMP_FILE

echo "✅ Groupe de backers récupérés et enregistrés dans $OUTPUT_FILE"