// AITabs/BIMIntelligenceTab.tsx
import React from 'react';
import BIMIntelligence from '../BIMIntelligence';
import { Message } from '../../services/aiAssistantService';

interface BIMIntelligenceTabProps {
  selectedElement?: any;
  modelData?: any;
  elementsData?: any;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setActiveTab: (tab: string) => void;
  aiAgent?: any;
  onActionExecuted: (action: string, result: any) => void;
}

const BIMIntelligenceTab: React.FC<BIMIntelligenceTabProps> = ({
  selectedElement,
  elementsData,
  isLoading,
  setIsLoading,
  messages,
  setMessages,
  setActiveTab,
  aiAgent,
  onActionExecuted
}) => {
  return (
    <BIMIntelligence
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      selectedElement={selectedElement}
      elementsData={elementsData}
      aiAgent={aiAgent}
      onActionExecuted={onActionExecuted}
      setMessages={setMessages}
      setActiveTab={setActiveTab}
    />
  );
};

export default BIMIntelligenceTab;