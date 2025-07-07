import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import KeywordEditor from './KeywordEditor';
import CategorySelector from './CategorySelector';

const EditProjectForm = ({ project, categories, onSave, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    reformulation: '',
    keywords: [],
    id_categories_aides_territoire: []
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialiser le formulaire avec les données du projet
  useEffect(() => {
    if (project) {
      const initialData = {
        title: project.title || '',
        reformulation: project.reformulation || '',
        keywords: Array.isArray(project.keywords) 
          ? project.keywords 
          : (typeof project.keywords === 'string' ? JSON.parse(project.keywords || '[]') : []),
        id_categories_aides_territoire: Array.isArray(project.id_categories_aides_territoire)
          ? project.id_categories_aides_territoire
          : (typeof project.id_categories_aides_territoire === 'string' 
              ? JSON.parse(project.id_categories_aides_territoire || '[]') 
              : [])
      };
      setFormData(initialData);
    }
  }, [project]);

  // Détecter les changements
  useEffect(() => {
    if (!project) return;
    
    const originalData = {
      title: project.title || '',
      reformulation: project.reformulation || '',
      keywords: Array.isArray(project.keywords) 
        ? project.keywords 
        : (typeof project.keywords === 'string' ? JSON.parse(project.keywords || '[]') : []),
      id_categories_aides_territoire: Array.isArray(project.id_categories_aides_territoire)
        ? project.id_categories_aides_territoire
        : (typeof project.id_categories_aides_territoire === 'string' 
            ? JSON.parse(project.id_categories_aides_territoire || '[]') 
            : [])
    };

    const hasChanged = 
      formData.title !== originalData.title ||
      formData.reformulation !== originalData.reformulation ||
      JSON.stringify(formData.keywords.sort()) !== JSON.stringify(originalData.keywords.sort()) ||
      JSON.stringify(formData.id_categories_aides_territoire.sort()) !== JSON.stringify(originalData.id_categories_aides_territoire.sort());

    setHasChanges(hasChanged);
  }, [formData, project]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    if (formData.id_categories_aides_territoire.length > 8) {
      newErrors.categories = 'Maximum 8 catégories autorisées';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Préparer les données pour l'envoi
    const dataToSave = {
      ...formData,
      keywords: JSON.stringify(formData.keywords),
      id_categories_aides_territoire: JSON.stringify(formData.id_categories_aides_territoire)
    };

    onSave(dataToSave);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* En-tête */}
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">✏️ Édition du projet</h1>
          <p className="text-gray-600">Modifiez les informations de votre projet ci-dessous.</p>
          
          {hasChanges && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Vous avez des modifications non sauvegardées.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Titre du projet */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-lg font-medium text-gray-900 mb-2">
                📝 Titre du projet
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Entrez le titre de votre projet..."
              />
              {errors.title && (
                <p className="mt-2 text-sm text-red-600">{errors.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Reformulation */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="reformulation" className="block text-lg font-medium text-gray-900 mb-2">
                📄 Reformulation administrative
              </label>
              <textarea
                id="reformulation"
                rows={6}
                value={formData.reformulation}
                onChange={(e) => handleInputChange('reformulation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Décrivez votre projet de manière administrative et détaillée..."
              />
              <p className="mt-2 text-sm text-gray-500">
                Cette reformulation sera utilisée pour identifier les aides les plus pertinentes.
              </p>
            </div>
          </div>
        </div>

        {/* Mots-clés */}
        <div className="bg-white shadow rounded-lg p-6">
          <KeywordEditor
            keywords={formData.keywords}
            onChange={(keywords) => handleInputChange('keywords', keywords)}
          />
        </div>

        {/* Catégories */}
        <div className="bg-white shadow rounded-lg p-6">
          <CategorySelector
            categories={categories}
            selectedCategoryIds={formData.id_categories_aides_territoire}
            onChange={(categoryIds) => handleInputChange('id_categories_aides_territoire', categoryIds)}
          />
          {errors.categories && (
            <p className="mt-2 text-sm text-red-600">{errors.categories}</p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                loading || !hasChanges
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sauvegarde...
                </div>
              ) : (
                'Sauvegarder les modifications'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

EditProjectForm.propTypes = {
  project: PropTypes.object.isRequired,
  categories: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default EditProjectForm;
