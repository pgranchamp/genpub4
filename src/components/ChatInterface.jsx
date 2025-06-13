import { useState } from 'react';
import { callOnboardingWorkflow, updateProjectAnalysisResults } from '../services';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatInterface = ({ project, onAnalysisComplete }) => {
  const [messages, setMessages] = useState([
    { from: 'bot', text: `La plupart des aides et subventions sont soumises à un projet. Alors si vous en avez un en tête, faites-en une description rapide ci-dessous, je vous montrerai ce que peut vous apporter Génie Public.\n\nOn va d'abord le reformuler en termes administratifs, en extraire des mots clés, des concepts élargis et si cela vous convient, on regarde ensuite ce qui possible. Je vous assure que vous allez gagner un temps fou. Prêt ?` }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationState, setConversationState] = useState('initial_prompt');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const userMessage = { from: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const payload = {
        message: inputValue,
        step: conversationState,
        project_id: project.id,
        organisation_id: project.organisation_id,
        // L'URL ngrok est maintenant lue depuis les variables d'environnement de Vite
        ngrok_tunnel_url: import.meta.env.VITE_NGROK_TUNNEL_URL
      };

      // Le nom du workflow n8n à appeler
      const workflowName = 'project-chatbot'; 

      const response = await callOnboardingWorkflow(workflowName, payload);
      
      // Mettre à jour l'état de la conversation et les messages
      if (response) {
        const botResponse = { from: 'bot', text: response.reply };
        setMessages(prev => [...prev, botResponse]);
        setConversationState(response.next_step);

        if (response.next_step === 'analysis_complete') {
          // Enregistrer les résultats dans la base de données
          await updateProjectAnalysisResults(project.id, response.analysis_result);
          onAnalysisComplete(response.analysis_result);
        }
      }

    } catch (error) {
      console.error("Erreur lors de la communication avec le chatbot:", error);
      const errorResponse = { from: 'bot', text: "Désolé, une erreur est survenue. Veuillez réessayer." };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg max-w-2xl">
      <div className="p-4 h-96 overflow-y-auto flex flex-col space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end ${msg.from === 'user' ? 'justify-end' : ''}`}>
            <div className={`prose px-4 py-2 rounded-lg inline-block ${msg.from === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-end">
            <div className="px-4 py-2 rounded-lg inline-block bg-gray-200 text-gray-800">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Décrivez votre projet ici..."
            className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring focus:border-blue-300"
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isProcessing}
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
