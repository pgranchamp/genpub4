import json
import csv

def flatten_value(value):
    """
    Convertit une valeur pour l'écriture CSV.
    Les listes sont jointes par '; '.
    Les listes d'objets avec une clé 'name' sont jointes par leurs noms.
    Les booléens sont convertis en chaînes.
    Les valeurs None deviennent des chaînes vides.
    """
    if isinstance(value, list):
        if not value:
            return ""
        # Vérifier si c'est une liste d'objets avec une clé 'name' (comme financers_full, aid_types_full)
        if all(isinstance(item, dict) and 'name' in item for item in value):
            return "; ".join(str(item.get('name', '')) if item else '' for item in value)
        # Sinon, joindre les éléments (en s'assurant qu'ils sont des chaînes)
        return "; ".join(str(v) if v is not None else "" for v in value)
    elif isinstance(value, bool):
        return str(value)
    elif value is None:
        return ""
    return str(value)

def convert_json_to_csv(json_file_path, csv_file_path):
    """
    Convertit un fichier JSON d'aides en fichier CSV.
    """
    raw_json_content = None
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f_json:
            raw_json_content = f_json.read()
    except FileNotFoundError:
        print(f"Erreur : Le fichier JSON '{json_file_path}' n'a pas été trouvé.")
        return
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier JSON '{json_file_path}': {e}")
        return

    # Tentative de correction des erreurs JSON courantes (ex: virgules finales)
    # Cela ne gérera pas toutes les malformations, mais peut aider pour certains cas.
    # Attention: cette approche est basique et peut ne pas fonctionner pour des JSON complexes ou très corrompus.
    import re
    # Supprimer les virgules avant une accolade fermante '}' ou un crochet fermant ']'
    cleaned_json_content = re.sub(r',\s*([\}\]])', r'\1', raw_json_content)
    
    # Tentative de suppression des virgules finales dans les listes/objets multilignes
    # Exemple: [ "a", "b", ] -> [ "a", "b" ]
    # { "a":1, "b":2, } -> { "a":1, "b":2 }
    # Cela est plus complexe avec regex et peut avoir des effets de bord.
    # Une approche plus simple est de laisser json.loads tenter et d'afficher une erreur claire.

    try:
        data = json.loads(cleaned_json_content)
    except json.JSONDecodeError as e:
        print(f"Erreur : Impossible de décoder le JSON du fichier '{json_file_path}'.")
        print(f"Détail de l'erreur de parsing JSON : {e}")
        print("Le JSON pourrait être mal formé (ex: syntaxe incorrecte, fichier tronqué).")
        print("Le script a tenté une correction basique (suppression de virgules finales), mais cela n'a peut-être pas suffi.")
        print("Veuillez vérifier la validité du fichier JSON. Vous pouvez utiliser un validateur JSON en ligne.")
        return

    results = data.get('results')
    if not results or not isinstance(results, list):
        print("Erreur : La clé 'results' est manquante ou n'est pas une liste dans le fichier JSON.")
        return

    if not results:
        print("Aucune aide trouvée dans le fichier JSON.")
        return

    # Utiliser les clés du premier objet comme en-têtes CSV
    # S'assurer d'avoir un ordre cohérent des colonnes
    # Prendre l'union de toutes les clés de tous les objets pour être exhaustif
    all_keys = set()
    for item in results:
        all_keys.update(item.keys())
    
    # Donner un ordre défini aux clés pour les colonnes CSV
    # On peut utiliser la liste fournie par l'utilisateur si elle est disponible et pertinente
    # ou simplement trier les clés pour la cohérence.
    # Pour cet exemple, nous allons trier les clés par ordre alphabétique.
    # Idéalement, utiliser une liste prédéfinie si l'ordre est important.
    # fieldnames = sorted(list(all_keys))

    # Utiliser la liste de champs fournie par l'utilisateur pour garantir l'ordre et l'exhaustivité souhaitée
    # Si un champ listé ici n'est pas dans un item JSON, il apparaîtra comme une colonne vide pour cet item.
    # Si un item JSON a des clés supplémentaires non listées ici, elles seront ignorées.
    fieldnames = [
        'id', 'name', 'name_initial', 'short_title', 'slug', 'url',
        'financers', 'instructors', 'programs', 
        'description', 'eligibility', # description_clean et eligibility_clean n'étaient pas dans le JSON fourni
        'perimeter', 'perimeter_scale',
        'categories', 'targeted_audiences', 'aid_types', 'destinations',
        'is_call_for_project', 'is_charged',
        'start_date', 'predeposit_date', 'submission_deadline',
        'subvention_rate_lower_bound', 'subvention_rate_upper_bound', 'subvention_comment',
        'loan_amount', 'recoverable_advance_amount',
        'contact', 'recurrence', 'project_examples', # contact_clean n'était pas dans le JSON fourni
        'origin_url', 'application_url',
        'import_data_url', 'import_data_mention', 'import_share_licence', # Ajoutés depuis la liste utilisateur
        'date_created', 'date_updated', 'project_references', 'european_aid', 'is_live', # Ajoutés depuis la liste utilisateur
        # Les champs _full sont complexes et gérés par flatten_value, pas besoin de les lister explicitement ici
        # si on veut toutes les clés du JSON, on peut revenir à `sorted(list(all_keys))`
        # ou ajouter 'financers_full', 'instructors_full', 'aid_types_full' à cette liste.
        # Pour l'instant, on se base sur les clés simples et flatten_value gère les listes/objets.
    ]
    
    # S'assurer que toutes les clés des fieldnames existent, sinon DictWriter lèvera une erreur
    # On va plutôt filtrer les fieldnames pour ne garder que ceux présents dans all_keys
    # ou s'assurer que get() est utilisé avec une valeur par défaut pour les clés manquantes.
    # L'approche avec item.get(key) dans la boucle est déjà robuste à cela.
    # Cependant, pour DictWriter, tous les fieldnames doivent être valides.
    # On va donc prendre l'intersection ou s'assurer que les clés sont bien celles attendues.
    # Pour plus de robustesse, on peut utiliser les `all_keys` comme fieldnames,
    # et si un ordre spécifique est requis, il faut le définir manuellement et s'assurer de sa validité.
    # Pour cet exemple, nous allons utiliser une liste fixe de fieldnames et le DictWriter
    # ignorera les champs du JSON non listés ici, et mettra des valeurs vides pour les champs listés mais absents du JSON.
    # Pour être plus précis, on va utiliser les clés du premier item comme base, puis ajouter les autres.
    # Mais la liste fournie par l'utilisateur est une meilleure source de vérité pour les colonnes souhaitées.

    # On va s'assurer que les fieldnames utilisés par DictWriter sont ceux qui existent réellement dans les données
    # ou ceux que l'on veut absolument voir (quitte à ce qu'ils soient vides).
    # La liste fournie par l'utilisateur est une bonne base.

    try:
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as f_csv:
            # Utiliser extrasaction='ignore' pour ignorer les champs du JSON non dans fieldnames
            # et restval='' pour mettre une chaîne vide pour les champs dans fieldnames mais absents du JSON
            writer = csv.DictWriter(f_csv, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL, extrasaction='ignore', restval='')
            writer.writeheader()

            for item in results:
                # Préparer la ligne pour l'écriture, en aplatissant les valeurs complexes
                row_to_write = {}
                for key_in_item in item: # Itérer sur les clés de l'item JSON actuel
                    if key_in_item in fieldnames: # Si la clé est dans nos colonnes CSV souhaitées
                         row_to_write[key_in_item] = flatten_value(item.get(key_in_item))
                    # Les clés de l'item non présentes dans fieldnames seront ignorées par extrasaction='ignore'
                
                # S'assurer que toutes les colonnes fieldnames sont présentes, même si vides
                for fn_key in fieldnames:
                    if fn_key not in row_to_write:
                        row_to_write[fn_key] = '' # Valeur par défaut pour les colonnes manquantes

                writer.writerow(row_to_write)
        print(f"Conversion réussie. Fichier CSV sauvegardé sous : {csv_file_path}")
    except IOError:
        print(f"Erreur : Impossible d'écrire dans le fichier CSV '{csv_file_path}'.")

if __name__ == '__main__':
    # Définir les chemins des fichiers d'entrée et de sortie
    # Le script s'attend à être exécuté depuis le répertoire 'extras'
    # ou que les chemins soient ajustés en conséquence.
    json_input_path = 'aides.json'
    csv_output_path = 'aides_converted.csv' # Nom différent pour éviter d'écraser le précédent

    print(f"Début de la conversion de '{json_input_path}' en '{csv_output_path}'...")
    # Appeler la fonction de conversion
    convert_json_to_csv(json_input_path, csv_output_path)

    print("\nInstructions pour exécuter le script:")
    print(f"1. Assurez-vous que le fichier '{json_input_path}' est dans le même répertoire que ce script, ou ajustez le chemin.")
    print(f"2. Ouvrez un terminal dans le répertoire '{json_input_path.rsplit('/', 1)[0] if '/' in json_input_path else '.'}'.")
    print(f"3. Exécutez la commande : python convert_aides_to_csv.py")
    print(f"4. Le fichier CSV '{csv_output_path}' sera généré dans ce même répertoire.")
