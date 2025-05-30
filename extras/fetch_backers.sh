#!/bin/bash

# CONFIGURATION
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDc5MTUwMzMsImV4cCI6MTc0ODAwMTQzMywicm9sZXMiOlsiUk9MRV9VU0VSIl0sInVzZXJuYW1lIjoicGllcnJlLmdyYW5jaGFtcEBiaWdsb3ZlLmFnZW5jeSJ9.2ct6QXkPmfq5Z3UsRyqQY1rpCUbOZ3L9X7Q6u_6hmBZLgX5a__SO-VVamFVjB1vWGNM93UMvrpFsXTGCX70ktD82dTWXwNA1y0mw5iQwDxTLNc7sTICNrirkwgpKzs2y5Tfd_91YIe52hEgHe-w8icQ_Y1y8JSoi98Z79Mm7jquXM25gWv3q1WaKFYJC5SvXhK9AiRadKHWFBvtQJ034u0-I5XhL5myEBsxkcuRkOl9XJylFq3n9slYEeImqM4G8tFrjoIHpf7Y-ZkRkQBdHClQ8FyHdDAv8YypPUtoaPzac0UlU3tJGzeLR8UEYpcxIL4XqhMUCqQ6LiMyqjggF-g"
BASE_URL="https://aides-territoires.beta.gouv.fr/api/backers/"
OUTPUT_FILE="all_backers.json"

# Initialisation
PAGE=1
HAS_NEXT=true
TMP_FILE="tmp_backers.json"

echo "[" > $OUTPUT_FILE

while $HAS_NEXT; do
  echo "Fetching page $PAGE..."
  
  curl -s -X GET "${BASE_URL}?page=$PAGE" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" > $TMP_FILE

  # Extraire les résultats de la page courante
  jq '.results' $TMP_FILE >> $OUTPUT_FILE

  # Vérifier s’il y a une page suivante
  NEXT=$(jq -r '.next' $TMP_FILE)
  if [ "$NEXT" != "null" ]; then
    echo "," >> $OUTPUT_FILE
    ((PAGE++))
  else
    HAS_NEXT=false
  fi
done

echo "]" >> $OUTPUT_FILE
rm $TMP_FILE

echo "✅ Backers récupérés et enregistrés dans $OUTPUT_FILE"
