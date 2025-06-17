import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../services';

/**
 * Composant pour afficher la liste des projets de l'utilisateur
 */
const MyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await getProjects();
        setProjects(projectsData);
        setError(null);
      } catch (err) {
        console.error('Erreur lors de la récupération des projets:', err);
        setError('Impossible de charger vos projets. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Composant pour afficher un projet
  const ProjectCard = ({ project }) => {
    const getStatusInfo = (status) => {
      switch (status) {
        case 'reformule':
          return { text: 'À reformuler', className: 'bg-yellow-100 text-yellow-800' };
        case 'analyzed':
          return { text: 'Analysé', className: 'bg-blue-100 text-blue-800' };
        case 'aides_identifiees':
          return { text: 'Aides identifiées', className: 'bg-green-100 text-green-800' };
        default:
          return { text: 'Inconnu', className: 'bg-gray-100 text-gray-800' };
      }
    };

    const statusInfo = getStatusInfo(project.status);
    const reformulationExtrait = (project.reformulation || project.description || '').split(' ').slice(0, 60).join(' ');
    const needsTruncation = (project.reformulation || project.description || '').split(' ').length > 60;

    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6 flex flex-col">
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-genie-navy mb-2 font-inter">{project.title}</h3>
            <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-700 italic">{reformulationExtrait}{needsTruncation ? '...' : ''}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
          <Link 
            to={`/projects/${project.id}`} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-inter"
          >
            Voir le projet
          </Link>
          
          {project.status === 'aides_identifiees' ? (
            <Link 
              to={`/projects/${project.id}/aides`} 
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-inter"
            >
              Accéder aux aides
            </Link>
          ) : (
            <Link 
              to={`/projects/${project.id}/aides`} 
              className="px-4 py-2 bg-genie-purple text-white rounded-md hover:bg-genie-purple/90 focus:outline-none focus:ring-2 focus:ring-genie-purple focus:ring-offset-2 font-inter"
            >
              Explorer les aides
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-genie-navy font-inter">Mes Projets</h1>
        <Link 
          to="/invite" 
          className="px-5 py-2.5 bg-gradient-genie text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-genie-blue focus:ring-offset-2 font-inter"
        >
          Nouveau projet
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-genie-blue"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-gray-100 p-8 rounded-lg text-center">
          <h2 className="text-xl font-medium text-genie-navy mb-4 font-inter">Vous n'avez pas encore de projets</h2>
          <p className="text-gray-600 mb-6">Commencez par décrire votre projet et laissez Génie Public vous aider à trouver des financements.</p>
          <Link 
            to="/invite" 
            className="px-5 py-2.5 bg-gradient-genie text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-genie-blue focus:ring-offset-2 font-inter"
          >
            Créer mon premier projet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProjects;
