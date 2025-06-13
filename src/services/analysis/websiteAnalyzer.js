/**
 * Service d'analyse de contenu de site web via l'API OpenAI.
 */

import { callOpenAI } from '../api/openai.js';

/**
 * Analyse le contenu d'un site web pour en extraire des informations sur l'organisation.
 * @param {string} websiteUrl - L'URL du site web à analyser.
 * @returns {Promise<Object>} Un objet contenant les activités de l'organisation.
 * @throws {Error} Si l'analyse échoue.
 */
export const analyzeOrganizationWebsite = async (websiteUrl) => {
  console.log(`[analyzeOrganizationWebsite] Début de l'analyse du site web: ${websiteUrl}`);
  if (!websiteUrl) {
    console.warn('[analyzeOrganizationWebsite] URL du site web non fournie.');
    return { activites_organisation: null, error: "URL non fournie" };
  }

  try {
    // Étape 1: Récupérer le contenu textuel du site web via une route proxy backend
    // Cette route proxy devra être créée dans le backend (ex: /api/proxy/fetch-website-content)
    // Elle prendra une URL en paramètre et retournera le contenu textuel de la page.
    console.log(`[analyzeOrganizationWebsite] Récupération du contenu pour ${websiteUrl} via le proxy...`);
    
    // TODO: Remplacer par un appel réel à fetchWithAuth vers la future route proxy
    // const proxyResponse = await fetchWithAuth(`/api/proxy/fetch-website-content?url=${encodeURIComponent(websiteUrl)}`);
    // if (!proxyResponse.success || !proxyResponse.data || !proxyResponse.data.textContent) {
    //   console.error('[analyzeOrganizationWebsite] Erreur lors de la récupération du contenu du site via le proxy:', proxyResponse.error);
    //   throw new Error(proxyResponse.error || "Impossible de récupérer le contenu du site web.");
    // }
    // const websiteTextContent = proxyResponse.data.textContent;
    
    // Pour l'instant, simulons la récupération du contenu pour permettre le développement du prompt.
    // REMPLACER CECI PAR L'APPEL RÉEL QUAND LE PROXY SERA PRÊT
    await new Promise(resolve => setTimeout(resolve, 50)); // Simule une latence réseau
    const websiteTextContent = "Contenu textuel simulé du site web : L'organisation XYZ est spécialisée dans le développement de solutions logicielles pour le secteur de l'éducation et de la formation professionnelle. Nous proposons des plateformes e-learning innovantes et des outils pédagogiques interactifs. Notre mission est de rendre l'apprentissage accessible à tous. Secteurs d'activité : EdTech, Formation continue. Publics cibles : Étudiants, professionnels en reconversion, établissements d'enseignement.";
    console.log(`[analyzeOrganizationWebsite] Contenu textuel (simulé) récupéré (premiers 200 caractères): ${websiteTextContent.substring(0, 200)}...`);


    if (!websiteTextContent || websiteTextContent.trim().length < 50) { // Seuil arbitraire pour un contenu minimal
        console.warn('[analyzeOrganizationWebsite] Contenu textuel du site web trop court ou vide.');
        return { activites_organisation: "Analyse impossible : contenu du site web insuffisant ou non récupérable.", error: "Contenu insuffisant" };
    }
    
    // Tronquer le contenu si trop long pour l'API OpenAI (ex: 15000 caractères ~ 4k tokens)
    const MAX_CONTENT_LENGTH = 15000;
    const truncatedContent = websiteTextContent.length > MAX_CONTENT_LENGTH 
      ? websiteTextContent.substring(0, MAX_CONTENT_LENGTH)
      : websiteTextContent;

    // Étape 2: Envoyer le contenu textuel à GPT-4o pour analyse
    const systemMessage = `Tu es un analyste expert capable d'extraire des informations clés sur une organisation à partir du contenu textuel de son site web.
Concentre-toi sur l'identification des activités principales, du secteur d'activité, de la mission et des publics cibles.
Ignore les mentions légales triviales, les menus de navigation, les pieds de page génériques, sauf s'ils contiennent des informations pertinentes sur les activités.`;

    const userMessageContent = `Voici le contenu textuel extrait du site web d'une organisation :
---
${truncatedContent}
---
Ta mission :
1. Lis attentivement le texte fourni.
2. Identifie et résume en 1 à 3 phrases concises les activités principales de cette organisation. Mets l'accent sur ce qu'elle FAIT concrètement.
3. Si possible, identifie le secteur d'activité principal (ex: Santé, Éducation, Numérique, Industrie, Service Public, ESS, etc.).
4. Si possible, identifie la mission principale ou la raison d'être de l'organisation.
5. Si possible, identifie les principaux types de publics ou clients ciblés par l'organisation.

Retourne UNIQUEMENT un objet JSON valide avec les clés suivantes :
  - "activites_principales": (string) Un résumé des activités principales.
  - "secteur_activite": (string) Le secteur d'activité principal identifié, ou "Non spécifié" si non identifiable.
  - "mission": (string) La mission principale, ou "Non spécifiée" si non identifiable.
  - "publics_cibles": (string) Les publics cibles principaux, ou "Non spécifiés" si non identifiables.

Si le texte ne permet pas d'identifier clairement une information, utilise "Information non disponible à partir du texte fourni" pour le champ concerné.
Sois concis et factuel.

Exemple de format de réponse attendu :
{
  "activites_principales": "L'organisation développe des logiciels éducatifs et propose des formations en ligne pour les professionnels.",
  "secteur_activite": "Éducation et Technologie (EdTech)",
  "mission": "Rendre l'apprentissage accessible et innovant pour tous.",
  "publics_cibles": "Étudiants, professionnels, établissements d'enseignement."
}`;

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessageContent }
    ];

    const openAIResponse = await callOpenAI(messages, "gpt-4o", 0.3);
    const content = openAIResponse.choices[0].message.content;
    console.log(`[analyzeOrganizationWebsite] Réponse brute de l'IA: ${content.substring(0, 300)}...`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonString);
      
      // Nous pourrions vouloir stocker l'objet complet ou juste une synthèse.
      // Pour l'instant, nous allons formater une chaîne pour `activites_organisation`
      // qui sera stockée dans la base de données.
      let activitesSummary = `Activités: ${parsedResponse.activites_principales || 'Non spécifiées'}.`;
      if (parsedResponse.secteur_activite && parsedResponse.secteur_activite !== "Non spécifié") {
        activitesSummary += ` Secteur: ${parsedResponse.secteur_activite}.`;
      }
      if (parsedResponse.mission && parsedResponse.mission !== "Non spécifiée") {
        activitesSummary += ` Mission: ${parsedResponse.mission}.`;
      }
      if (parsedResponse.publics_cibles && parsedResponse.publics_cibles !== "Non spécifiés") {
        activitesSummary += ` Publics: ${parsedResponse.publics_cibles}.`;
      }
      
      console.log('[analyzeOrganizationWebsite] Analyse terminée avec succès.');
      return { activites_organisation: activitesSummary.trim(), full_analysis: parsedResponse };
    } else {
      console.warn('[analyzeOrganizationWebsite] Aucune structure JSON valide trouvée dans la réponse IA:', content);
      throw new Error("Format de réponse IA invalide pour l'analyse du site web.");
    }

  } catch (error) {
    console.error('[analyzeOrganizationWebsite] Erreur lors de l\'analyse du site web:', error);
    // Retourner un objet d'erreur spécifique ou relancer l'erreur selon la gestion souhaitée
    return { activites_organisation: null, error: error.message, full_analysis: null };
  }
};
