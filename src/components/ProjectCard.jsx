import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProjectCard = ({ project }) => {
  // Utiliser le résumé s'il existe, sinon tronquer la description
  const summary = project.summary || (project.description ? `${project.description.substring(0, 100)}...` : 'Pas de description.');

  return (
    <Link 
      to={`/projects/${project.id}`} 
      className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 transition-colors duration-200"
    >
      <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900 truncate">
        {project.title || 'Projet sans titre'}
      </h5>
      <p className="font-normal text-gray-700 text-sm">
        {summary}
      </p>
      <div className="mt-4">
        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
          {project.status || 'N/A'}
        </span>
      </div>
    </Link>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    summary: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

export default ProjectCard;
