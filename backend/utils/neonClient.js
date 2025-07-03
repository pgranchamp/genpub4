/* globals process */
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Vérifier si la variable d'environnement est définie
if (!process.env.NEON_DATABASE_URL) {
  throw new Error('La variable d\'environnement NEON_DATABASE_URL est requise.');
}

// Configuration du pool de connexions
// Le client `pg` gère automatiquement le pooling.
// On se connecte via la chaîne de connexion qui inclut les informations SSL pour Neon.
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Nécessaire pour certaines configurations Neon/locales
  },
});

pool.on('connect', () => {
  console.log('Connecté à la base de données Neon.');
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le client de la base de données Neon', err);
  process.exit(-1);
});

/**
 * Exécute une requête SQL sur la base de données Neon.
 * @param {string} text - La requête SQL paramétrée (ex: "SELECT * FROM users WHERE id = $1").
 * @param {Array} params - Les paramètres pour la requête.
 * @returns {Promise<QueryResult>} Le résultat de la requête.
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
