import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="flex items-center">
                  <img src="/images/logo.png" alt="Génie Public Logo" className="h-10 w-10 mr-2" />
                  <span className="text-xl font-bold bg-gradient-genie text-transparent bg-clip-text">
                    GÉNIE PUBLIC
                  </span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className="border-genie-blue text-genie-navy inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard"
                  className="border-transparent text-gray-500 hover:border-genie-blue hover:text-genie-navy inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Nouveau Projet
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-genie-navy bg-white hover:bg-gray-50"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow-inner mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2025 GÉNIE PUBLIC. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
