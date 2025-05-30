import requests
import json
import csv

# === CONFIGURATION ===
API_URL = "https://aides-territoires.beta.gouv.fr/api/perimeters/"
HEADERS = {
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpYXQiOjE3NDgzMjMwODUsImV4cCI6MTc0ODQwOTQ4NSwicm9sZXMiOlsiUk9MRV9VU0VSIl0sInVzZXJuYW1lIjoicGllcnJlLmdyYW5jaGFtcEBiaWdsb3ZlLmFnZW5jeSJ9.Ebx6QtGx-7hjN0AuszAz4YVA3agUJvEkJDbkZ0Z7Au1ks8PSHlxybfQDFV5T8vftvVtj92Ino08T_uKRCjUJSmCPr_DE6G0FeMVLWwzAgURlC3E8A1KUJAIjYa1RxWQhuZo60Nplg2y6NrLRrOrM0j8Cn1L11RW0wk-8CvoX666NsLUdY6UNGv4vlysWHavmftR_wIpYeA3UxffzCDmCChf29bHHlxzolscNqU-LwQS6WVJK1TLLeGioJ7kz4njiCkQJWzOhJsrWZSvbJ-o9rBxsTJE5wcOc4qlB2_cHwAp1sRCFcb76BMtIz84-e8sxONOwrszK22B4fAvyv1RS-Q",  # Remplacez par un token valide
    "Content-Type": "application/json"
}
PARAMS = {
    "scale": "adhoc",
    "page": 1
}

# === FONCTION POUR RÉCUPÉRER TOUTES LES PAGES ===
def fetch_all_adhoc_perimeters():
    all_results = []
    while True:
        print(f"Fetching page {PARAMS['page']}...")
        response = requests.get(API_URL, headers=HEADERS, params=PARAMS)
        response.raise_for_status()
        data = response.json()
        all_results.extend(data["results"])
        if not data.get("next"):
            break
        PARAMS["page"] += 1
    return all_results

# === SAUVEGARDE JSON ===
def save_json(perimeters, filename="adhoc_perimeters.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(perimeters, f, indent=2, ensure_ascii=False)
    print(f"✅ Sauvegardé sous {filename}")

# === SAUVEGARDE CSV (optionnel) ===
def save_csv(perimeters, filename="adhoc_perimeters.csv"):
    fieldnames = ["id", "name", "code", "scale", "contained_in", "slug"]
    with open(filename, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for p in perimeters:
            writer.writerow({key: p.get(key) for key in fieldnames})
    print(f"✅ Sauvegardé sous {filename}")

# === MAIN ===
if __name__ == "__main__":
    perimeters = fetch_all_adhoc_perimeters()
    save_json(perimeters)
    save_csv(perimeters)
