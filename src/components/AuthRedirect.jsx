import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';

const AuthRedirect = () => {
  const { hasOrganisation, loading } = useOrganisation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading) {
      if (hasOrganisation) {
        navigate('/dashboard/projects');
      } else {
        navigate('/dashboard');
      }
    }
  }, [hasOrganisation, loading, navigate]);
  
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
};

export default AuthRedirect;
