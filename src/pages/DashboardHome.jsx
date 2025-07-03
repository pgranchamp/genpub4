import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects } from '../services/projectService'; 
import ProjectCard from '../components/ProjectCard';

const DashboardHome = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userProjects = await getProjects();
        setProjects(userProjects || []);
      } catch (err) {
        console.error("Erreur lors de la récupération des projets:", err);
        setError("Impossible de charger vos projets.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div>Chargement de votre tableau de bord...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Bienvenue, {user?.first_name || 'Utilisateur'} !
      </h1>

      {projects.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-lg text-gray-600">Voici vos projets en cours.</p>
            <Link
              to="/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Créer un nouveau projet
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Commencez votre aventure avec Génie Public</h2>
          <p className="text-gray-600 mb-6">
            Vous n'avez pas encore de projet. Créez-en un dès maintenant pour découvrir les aides et subventions auxquelles vous êtes éligible.
          </p>
          <Link
            to="/projects/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Créer mon premier projet
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
