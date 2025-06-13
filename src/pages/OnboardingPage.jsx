import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useNavigate } from 'react-router-dom';
import { callOnboardingWorkflow, getOrganisationStatus } from '../services';

const OnboardingPage = () => {
  const { user } = useAuth();
  const { organisation, refreshOrganisation } = useOrganisation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatActive, setIsChatActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState('onboarding-zero');
  
  const messagesEndRef = useRef(null);
  const handleSendMessageRef = useRef();
  const sessionId = useRef(user?.id || `session_${Date.now()}`);
  const hasInitiated = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isTyping) {
      scrollToBottom();
    }
  }, [messages, isTyping, scrollToBottom]);

  const typeMessage = useCallback((fullText, onComplete, actions = []) => {
    setIsTyping(true);
    setIsChatActive(false);
    setMessages(prev => [...prev, { sender: 'ia', text: '' }]);
    
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < fullText.length) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessageIndex = newMessages.length - 1;
          const updatedLastMessage = { ...newMessages[lastMessageIndex], text: fullText.substring(0, i + 1) };
          newMessages[lastMessageIndex] = updatedLastMessage;
          return newMessages;
        });
        i++;
      } else {
        clearInterval(intervalId);
        setIsTyping(false);
        setIsChatActive(true);
        if (actions.length > 0) {
          setMessages(prev => [...prev, { sender: 'ia', actions }]);
        }
        if (onComplete) onComplete();
      }
    }, 20);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleWorkflowResponse = useCallback((data) => {
    console.log('[OnboardingPage] Réponse reçue:', data);
  
    const responseText = data?.response;
    const nextAction = data?.next_action;
    const actions = data?.actions || [];
  
    const handleNextAction = async () => {
      if (nextAction === 'switch_to_onboarding_chat') {
        console.log("Bascule vers le workflow 'onboarding-chat'");
        setCurrentWorkflow('onboarding-chat');
        
        // Forcer le rechargement de la page pour garantir des données fraîches.
        // C'est une solution de contournement en attendant de trouver la cause du problème de state.
        window.location.reload();

      } else if (nextAction === 'onboarding-end') {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    };
  
    if (responseText) {
      typeMessage(responseText, handleNextAction, actions);
    } else {
      handleNextAction();
    }
  }, [typeMessage, navigate]);
  
  const handleSendMessage = useCallback(async (messageOverride = null, isSilent = false, organisationData = null) => {
    const messageToSend = messageOverride !== null ? messageOverride : inputValue;
    if (messageToSend.trim() === '' && !isSilent) return;
  
    if (!isSilent) {
      setMessages(prev => [...prev, { sender: 'user', text: messageToSend }]);
      setInputValue('');
    }
  
    setIsChatActive(false);
    setIsTyping(true);
  
    try {
      let workflowToCall = currentWorkflow;
      // Cette vérification est redondante si on met à jour le state, mais c'est une sécurité
      if (messageToSend === 'switch_to_onboarding_chat') {
        workflowToCall = 'onboarding-chat';
        setCurrentWorkflow('onboarding-chat');
      }
  
      const payload = {
        sessionId: sessionId.current,
        userMessage: messageToSend,
        userContext: {
          firstName: user?.first_name,
          organisationName: organisation?.name,
        },
        // Utilise les données fraîches si elles sont passées, sinon celles du contexte
        fullOrganisationData: organisationData || organisation 
      };
      
      const data = await callOnboardingWorkflow(workflowToCall, payload);
      handleWorkflowResponse(data);
  
    } catch (error) {
      console.error(error);
      typeMessage("Oups, une erreur technique est survenue. Veuillez réessayer.", () => setIsChatActive(true));
      setIsTyping(false);
    }
  }, [inputValue, currentWorkflow, user, organisation, handleWorkflowResponse]);

  handleSendMessageRef.current = handleSendMessage;

  useEffect(() => {
    if (user && organisation && !hasInitiated.current) {
      hasInitiated.current = true;
      handleSendMessageRef.current('start_onboarding_zero', true);
    }
  }, [user, organisation]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col w-full">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-xl font-semibold text-gray-800">Génie Public - Bienvenue</h1>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-lg px-4 py-2 rounded-lg shadow ${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'}`} style={{ textAlign: 'left' }}>
                  {msg.text && <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>}
                  {msg.actions && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(action.actionId, true)}
                          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-full text-sm hover:bg-gray-300"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-lg px-4 py-2 rounded-lg shadow bg-white text-gray-500">
                  <i>Génie Public est en train d'écrire...</i>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="bg-white p-4 shadow-inner">
          <div className="flex items-center">
            <input
              type="text"
              className="flex-1 border rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={isChatActive ? "Votre message..." : "L'assistant est en train d'écrire..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={!isChatActive}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!isChatActive}
              className="ml-4 bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OnboardingPage;
