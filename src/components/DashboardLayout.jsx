import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold text-indigo-600">GÉNIE PUBLIC</h2>
        </div>
        <nav className="mt-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
            end
          >
            Tableau de bord
          </NavLink>
          <NavLink
            to="/dashboard/organization"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            Mon Organisation
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            Mes Projets
          </NavLink>
          <NavLink
            to="/dashboard/contact"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            Contact
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 mt-4 text-gray-700 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
