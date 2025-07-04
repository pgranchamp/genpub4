import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganisationProvider } from './contexts/OrganisationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import AuthRedirect from './components/AuthRedirect';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/DashboardHome';
import MyOrganization from './pages/MyOrganization';
import MyProjects from './pages/MyProjects';
import ContactForm from './pages/ContactForm';
import CreateOrganization from './pages/CreateOrganization';
import SubmitProject from './pages/SubmitProject';
import ProjectDetail from './pages/ProjectDetail';
import ProjectAides from './pages/ProjectAides';
import TestAidesTerritoires from './pages/TestAidesTerritoires'; // Importer la page de test
import TestCurl from './pages/TestCurl'; // Importer la nouvelle page de test
import OnboardingPage from './pages/OnboardingPage'; // Importer la nouvelle page
import InvitePage from './pages/InvitePage';
import ForceLogout from './pages/ForceLogout'; // Page de déconnexion forcée
import './App.css';

// Création du routeur avec routes imbriquées
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />
  },
  {
    path: '/auth-redirect',
    element: (
      <ProtectedRoute>
        <AuthRedirect />
      </ProtectedRoute>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardHome />
          },
          {
            path: 'organization',
            element: <MyOrganization />
          },
          {
            path: 'projects',
            element: <MyProjects />
          },
          {
            path: 'contact',
            element: <ContactForm />
          },
          {
            path: 'create-organization',
            element: <CreateOrganization />
          }
        ]
      },
      {
        path: 'projects/new',
        element: <SubmitProject />
      },
      {
        path: 'invite',
        element: <InvitePage />
      },
      {
        path: 'projects/:id',
        element: <ProjectDetail />
      },
      {
        path: 'projects/:projectId/aides', 
        element: <ProjectAides />
      },
      {
        path: 'onboarding', // Route conservée pour le processus post-signup
        element: <OnboardingPage />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  },
  {
    path: '/test-aides', // Nouvelle route pour la page de test
    element: <TestAidesTerritoires />
  },
  {
    path: '/test-curl',
    element: <TestCurl />
  },
  {
    path: '/force-logout',
    element: <ForceLogout />
  }
]);

function App() {
  return (
    <AuthProvider>
      <OrganisationProvider>
        <RouterProvider router={router} />
      </OrganisationProvider>
    </AuthProvider>
  );
}

export default App;
