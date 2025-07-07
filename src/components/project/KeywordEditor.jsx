import { useState } from 'react';
import PropTypes from 'prop-types';

const KeywordEditor = ({ keywords = [], onChange }) => {
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = () => {
    const trimmedKeyword = newKeyword.trim();
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      onChange([...keywords, trimmedKeyword]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove) => {
    onChange(keywords.filter(k => k !== keywordToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">🏷️ Mots-clés thématiques</h3>
        <span className="text-sm text-gray-500">{keywords.length} mot{keywords.length !== 1 ? 's' : ''}-clé{keywords.length !== 1 ? 's' : ''}</span>
      </div>
      
      {/* Mots-clés existants */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600 focus:outline-none focus:bg-indigo-200 focus:text-indigo-600"
                aria-label={`Supprimer le mot-clé ${keyword}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Ajout de nouveau mot-clé */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ajouter un mot-clé..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={addKeyword}
          disabled={!newKeyword.trim() || keywords.includes(newKeyword.trim())}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ➕ Ajouter
        </button>
      </div>

      {/* Message d'aide */}
      <p className="text-sm text-gray-500">
        Appuyez sur Entrée ou cliquez sur "Ajouter" pour ajouter un mot-clé. Cliquez sur ❌ pour supprimer.
      </p>
    </div>
  );
};

KeywordEditor.propTypes = {
  keywords: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};

export default KeywordEditor;
