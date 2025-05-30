#!/usr/bin/env python3
"""
Convertisseur JSON vers CSV pour les aides Aides-Territoires
Supporte les fichiers JSON partiels ou mal formatés
"""

import json
import csv
import re
import sys
from pathlib import Path
from html import unescape
import argparse

def clean_html(text):
    """Nettoie le HTML et décode les entités"""
    if not text:
        return ""
    # Décode les entités HTML
    text = unescape(text)
    # Supprime les balises HTML basiques
    text = re.sub(r'<[^>]+>', '', text)
    # Nettoie les espaces multiples
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_list_items(items_list, key='name'):
    """Extrait les éléments d'une liste et les joint par des virgules"""
    if not items_list:
        return ""
    if isinstance(items_list[0], dict):
        return "; ".join([item.get(key, '') for item in items_list])
    else:
        return "; ".join(items_list)

def parse_multiple_json_objects(content):
    """Parse plusieurs objets JSON séparés dans un même fichier"""
    all_results = []
    total_count = 0
    
    # Divise le contenu en objets JSON séparés
    json_objects = []
    brace_count = 0
    current_obj = ""
    
    for char in content:
        current_obj += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and current_obj.strip():
                json_objects.append(current_obj.strip())
                current_obj = ""
    
    # Parse chaque objet JSON
    for obj_str in json_objects:
        try:
            obj = json.loads(obj_str)
            if 'results' in obj:
                all_results.extend(obj['results'])
                total_count += obj.get('count', len(obj['results']))
            elif isinstance(obj, list):
                all_results.extend(obj)
                total_count += len(obj)
            else:
                all_results.append(obj)
                total_count += 1
        except json.JSONDecodeError:
            print(f"⚠️ Objet JSON ignoré (mal formaté): {obj_str[:100]}...")
            continue
    
    return {"results": all_results, "count": total_count}

def fix_json(content):
    """Tente de réparer un JSON mal formaté"""
    content = content.strip()
    
    # Vérifie s'il y a plusieurs objets JSON (erreur "Extra data")
    if '}{' in content:
        print("🔧 Détection de plusieurs objets JSON, traitement séparé...")
        return parse_multiple_json_objects(content)
    
    # Si le contenu ne commence pas par {, essaie de trouver le début
    if not content.startswith('{'):
        match = re.search(r'\{.*', content, re.DOTALL)
        if match:
            content = match.group(0)
    
    # Si le JSON est tronqué, essaie de le compléter
    if not content.endswith('}'):
        # Compte les accolades ouvertes vs fermées
        open_braces = content.count('{')
        close_braces = content.count('}')
        
        # Ajoute les accolades manquantes
        if open_braces > close_braces:
            # Trouve la dernière position valide et ferme proprement
            last_complete = content.rfind('"}')
            if last_complete != -1:
                content = content[:last_complete + 2]
                content += ']}'  # Ferme results et l'objet principal
    
    return content

def parse_json_file(filepath):
    """Parse le fichier JSON en gérant les erreurs"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Première tentative : JSON standard
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON mal formaté: {str(e)}")
            
            # Vérifie si c'est le problème "Extra data" (plusieurs objets JSON)
            if "Extra data" in str(e):
                print("🔧 Détection de plusieurs objets JSON collés...")
                return parse_multiple_json_objects(content)
            
            # Deuxième tentative : réparation automatique
            print("🔧 Tentative de réparation automatique...")
            fixed_content = fix_json(content)
            
            # Si fix_json a retourné un dictionnaire (cas multiples objets)
            if isinstance(fixed_content, dict):
                return fixed_content
            
            try:
                return json.loads(fixed_content)
            except json.JSONDecodeError as e2:
                print(f"❌ Réparation échouée: {e2}")
                
                # Troisième tentative : extraction manuelle des résultats
                print("🔧 Tentative d'extraction manuelle...")
                results_match = re.search(r'"results":\s*\[(.*?)\]', content, re.DOTALL)
                if results_match:
                    results_str = '[' + results_match.group(1) + ']'
                    try:
                        results = json.loads(results_str)
                        return {"results": results, "count": len(results)}
                    except:
                        pass
                
                raise Exception(f"Impossible de parser le fichier JSON: {e}")
    
    except FileNotFoundError:
        raise Exception(f"Fichier non trouvé: {filepath}")

def convert_to_csv(json_data, output_file):
    """Convertit les données JSON en CSV"""
    
    # Extrait les résultats
    if 'results' in json_data:
        aids = json_data['results']
        total_count = json_data.get('count', len(aids))
    else:
        # Si c'est directement une liste
        aids = json_data if isinstance(json_data, list) else [json_data]
        total_count = len(aids)
    
    if not aids:
        raise Exception("Aucune aide trouvée dans le fichier JSON")
    
    print(f"📊 {len(aids)} aides trouvées (total: {total_count})")
    
    # Définit les colonnes CSV
    fieldnames = [
        'id', 'name', 'name_initial', 'short_title', 'slug', 'url',
        'financers', 'instructors', 'programs', 
        'description_clean', 'eligibility_clean',
        'perimeter', 'perimeter_scale',
        'categories', 'targeted_audiences', 'aid_types', 'destinations',
        'is_call_for_project', 'is_charged',
        'start_date', 'predeposit_date', 'submission_deadline',
        'subvention_rate_lower_bound', 'subvention_rate_upper_bound',
        'loan_amount', 'recoverable_advance_amount',
        'contact_clean', 'origin_url', 'application_url'
    ]
    
    # Écrit le CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()
        
        for aid in aids:
            row = {
                'id': aid.get('id', ''),
                'name': aid.get('name', ''),
                'name_initial': aid.get('name_initial', ''),
                'short_title': aid.get('short_title', ''),
                'slug': aid.get('slug', ''),
                'url': aid.get('url', ''),
                'financers': extract_list_items(aid.get('financers', [])),
                'instructors': extract_list_items(aid.get('instructors', [])),
                'programs': extract_list_items(aid.get('programs', [])),
                'description_clean': clean_html(aid.get('description', '')),
                'eligibility_clean': clean_html(aid.get('eligibility', '')),
                'perimeter': aid.get('perimeter', ''),
                'perimeter_scale': aid.get('perimeter_scale', ''),
                'categories': extract_list_items(aid.get('categories', [])),
                'targeted_audiences': extract_list_items(aid.get('targeted_audiences', [])),
                'aid_types': extract_list_items(aid.get('aid_types', [])),
                'destinations': extract_list_items(aid.get('destinations', [])),
                'is_call_for_project': aid.get('is_call_for_project', ''),
                'is_charged': aid.get('is_charged', ''),
                'start_date': aid.get('start_date', ''),
                'predeposit_date': aid.get('predeposit_date', ''),
                'submission_deadline': aid.get('submission_deadline', ''),
                'subvention_rate_lower_bound': aid.get('subvention_rate_lower_bound', ''),
                'subvention_rate_upper_bound': aid.get('subvention_rate_upper_bound', ''),
                'loan_amount': aid.get('loan_amount', ''),
                'recoverable_advance_amount': aid.get('recoverable_advance_amount', ''),
                'contact_clean': clean_html(aid.get('contact', '')),
                'origin_url': aid.get('origin_url', ''),
                'application_url': aid.get('application_url', '')
            }
            writer.writerow(row)
    
    print(f"✅ CSV créé: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Convertit un JSON Aides-Territoires en CSV')
    parser.add_argument('input_file', help='Fichier JSON source')
    parser.add_argument('-o', '--output', help='Fichier CSV de sortie (optionnel)')
    
    args = parser.parse_args()
    
    # Génère le nom de sortie si non spécifié
    if args.output:
        output_file = args.output
    else:
        input_path = Path(args.input_file)
        output_file = input_path.with_suffix('.csv')
    
    try:
        print(f"🔄 Lecture de {args.input_file}...")
        json_data = parse_json_file(args.input_file)
        
        print(f"🔄 Conversion vers {output_file}...")
        convert_to_csv(json_data, output_file)
        
        print("🎉 Conversion terminée avec succès !")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)

if __name__ == '__main__':
    # Si exécuté sans arguments, affiche l'aide
    if len(sys.argv) == 1:
        print("Usage: python script.py fichier.json [-o sortie.csv]")
        print("Exemple: python script.py aides.json")
        sys.exit(1)
    
    main()
