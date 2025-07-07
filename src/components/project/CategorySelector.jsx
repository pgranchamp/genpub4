import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

const CategorySelector = ({ categories = [], selectedCategoryIds = [], onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  
  const MAX_CATEGORIES = 8;

  // Filtrer les catégories selon le terme de recherche
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    
    return categories.map(group => ({
      ...group,
      categories: group.categories.filter(cat => 
        cat.categorie.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.categories.length > 0);
  }, [categories, searchTerm]);

  // Obtenir les noms des catégories sélectionnées
  const selectedCategoryNames = useMemo(() => {
    const allCategories = categories.flatMap(group => group.categories);
    return selectedCategoryIds.map(id => {
      const found = allCategories.find(cat => cat.id === id);
      return found ? found.categorie : `ID ${id}`;
    });
  }, [categories, selectedCategoryIds]);

  const canSelectMore = selectedCategoryIds.length < MAX_CATEGORIES;

  const handleCategoryToggle = (categoryId) => {
    if (selectedCategoryIds.includes(categoryId)) {
      // Désélectionner
      onChange(selectedCategoryIds.filter(id => id !== categoryId));
    } else if (canSelectMore) {
      // Sélectionner seulement si limite pas atteinte
      onChange([...selectedCategoryIds, categoryId]);
    }
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const removeSelectedCategory = (categoryId) => {
    onChange(selectedCategoryIds.filter(id => id !== categoryId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">📂 Catégories d'aides</h3>
        <span className={`text-sm font-medium ${selectedCategoryIds.length >= MAX_CATEGORIES ? 'text-red-600' : 'text-gray-500'}`}>
          {selectedCategoryIds.length}/{MAX_CATEGORIES} catégories
        </span>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Rechercher dans les catégories..."
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Message de limite atteinte */}
      {selectedCategoryIds.length >= MAX_CATEGORIES && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Limite de {MAX_CATEGORIES} catégories atteinte. Supprimez une catégorie pour en ajouter une nouvelle.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Catégories sélectionnées */}
      {selectedCategoryIds.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-green-800 mb-3">✅ Catégories sélectionnées ({selectedCategoryIds.length}) :</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategoryNames.map((name, index) => (
              <span
                key={selectedCategoryIds[index]}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeSelectedCategory(selectedCategoryIds[index])}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600 focus:outline-none focus:bg-green-200 focus:text-green-600"
                  aria-label={`Supprimer la catégorie ${name}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Groupes de catégories */}
      <div className="space-y-2">
        {filteredCategories.map((group) => {
          const isExpanded = expandedGroups[group.groupe] || searchTerm.trim();
          const selectedInGroup = group.categories.filter(cat => selectedCategoryIds.includes(cat.id)).length;
          
          return (
            <div key={group.groupe} className="border border-gray-200 rounded-md">
              <button
                type="button"
                onClick={() => toggleGroup(group.groupe)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{group.groupe}</span>
                  {selectedInGroup > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {selectedInGroup}
                    </span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {group.categories.map((category) => {
                    const isSelected = selectedCategoryIds.includes(category.id);
                    const isDisabled = !isSelected && !canSelectMore;
                    
                    return (
                      <label
                        key={category.id}
                        className={`flex items-center space-x-3 p-2 rounded hover:bg-gray-50 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCategoryToggle(category.id)}
                          disabled={isDisabled}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className={`text-sm ${isSelected ? 'font-medium text-indigo-900' : 'text-gray-700'}`}>
                          {category.categorie}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Message si aucun résultat */}
      {searchTerm.trim() && filteredCategories.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune catégorie trouvée pour "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

CategorySelector.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.shape({
    groupe: PropTypes.string.isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      categorie: PropTypes.string.isRequired,
    })).isRequired,
  })),
  selectedCategoryIds: PropTypes.arrayOf(PropTypes.number),
  onChange: PropTypes.func.isRequired,
};

export default CategorySelector;
