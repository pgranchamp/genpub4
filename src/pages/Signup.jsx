import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { signup as apiSignup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('association');
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();

  // Si l'utilisateur est déjà connecté, rediriger vers le dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation des champs
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      setLoading(false);
      return;
    }

    if (!orgName.trim()) {
      setError('Le nom de l\'organisation est requis.');
      setLoading(false);
      return;
    }

    try {
      // Préparer les données de l'organisation
      const organisationData = {
        name: orgName,
        type: orgType,
        siret: siret.trim() || null, // Si le SIRET est vide, on envoie null
        address: null // Ajout du champ address même s'il est null
      };

      // Appel à l'API pour créer un compte et une organisation
      const userData = await apiSignup(email, password, name, organisationData);
      
      // Mise à jour du contexte d'authentification
      await signup(userData);
      
      // Redirection vers le dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Erreur d\'inscription:', err);
      setError('Erreur lors de la création du compte. Cet email est peut-être déjà utilisé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            GÉNIE PUBLIC
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Créez votre compte
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">Nom complet</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">Adresse email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirmer le mot de passe</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Informations sur votre organisation</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
                  Nom de l'organisation
                </label>
                <input
                  id="org-name"
                  name="org-name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Nom de votre organisation"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="siret" className="block text-sm font-medium text-gray-700">
                  Numéro SIRET (optionnel)
                </label>
                <input
                  id="siret"
                  name="siret"
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Numéro SIRET (14 chiffres)"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  maxLength={14}
                  pattern="[0-9]*"
                  title="Le SIRET doit contenir uniquement des chiffres"
                />
              </div>
              <div>
                <label htmlFor="org-type" className="block text-sm font-medium text-gray-700">
                  Type d'organisation
                </label>
                <select
                  id="org-type"
                  name="org-type"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                >
                  <option value="association">Association</option>
                  <option value="entreprise">Entreprise</option>
                  <option value="collectivite">Collectivité</option>
                  <option value="personnel">Personnel</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Création en cours...' : 'Créer un compte'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
