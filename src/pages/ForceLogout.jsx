import { useEffect } from 'react';
import { forceSignOut } from '../services/authService';

const ForceLogout = () => {
  useEffect(() => {
    const performForceLogout = async () => {
      console.log('🚨 Page ForceLogout - Déconnexion forcée en cours...');
      
      try {
        await forceSignOut();
        console.log('✅ Page ForceLogout - Déconnexion forcée terminée');
        
        // Rediriger vers la page de connexion
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        
      } catch (error) {
        console.error('❌ Page ForceLogout - Erreur:', error);
        // Rediriger quand même
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };
    
    performForceLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Déconnexion en cours...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Nettoyage de la session en cours
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForceLogout;
