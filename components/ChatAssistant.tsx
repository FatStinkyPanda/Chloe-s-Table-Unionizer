import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Chat } from '@google/genai';
import type { ChatMessage, Match } from '../types';
import { LoadingIcon, XCircleIcon, MagicIcon } from './Icons';
import { toolDeclarations } from '../services/geminiService';

interface ChatAssistantProps {
  chat: Chat | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onToolCall: (toolName: string, args: any) => Promise<{ output: any }>;
  selectedMatchIds: Set<string>;
  onClearSelection: () => void;
  allMatches: Match[];
  pendingMatchesCount: number;
  confirmedMatchesCount: number;
  unmatchedColumnsCount: number;
  lastToolUsed: string | null;
}

const suggestions = [
    "Review current column cards",
    "Match unmatched columns",
    "Auto-apply all AI suggestions",
    "Auto-Process & Match",
    "Fully-Auto: Review, Apply, Match, Repeat, and Download SQL",
];

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  chat, messages, setMessages, isLoading, setIsLoading, onToolCall,
  selectedMatchIds, onClearSelection, allMatches,
  pendingMatchesCount, confirmedMatchesCount, unmatchedColumnsCount,
  lastToolUsed
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);
  
  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }

  const handleSend = async (e: React.FormEvent, messageContent?: string) => {
    e.preventDefault();
    const prompt = messageContent || input;
    if (!prompt.trim() || isLoading || !chat) return;

    addMessage({ role: 'user', content: prompt });
    setInput('');
    setIsLoading(true);

    try {
        // Add context of selected matches if any
        let finalPrompt = prompt;
        if (selectedMatchIds.size > 0) {
            const selectedMatches = allMatches.filter(m => selectedMatchIds.has(m.id));
            const context = `The user has highlighted the following matches:\n` +
                selectedMatches.map(m => `- ${m.finalName}: [${Array.isArray(m.columns) ? m.columns.map(c => c.columnName).join(', ') : ''}]`).join('\n');
            finalPrompt = `${context}\n\nUser's question: ${prompt}`;
        }
        
        let isFinished = false;
        let request: string | { parts: any[] } = finalPrompt;

        while (!isFinished) {
            chat.config.tools = [{ functionDeclarations: toolDeclarations }];
            const messageToSend = typeof request === 'string' ? request : { parts: request.parts };
            const response = await chat.sendMessage({ message: messageToSend });
            const functionCalls = response.functionCalls;

// FIX: The `functionCalls` property can be of type unknown.
// Add an Array.isArray guard to prevent runtime errors when iterating over the response or accessing its .length property.
            if (Array.isArray(functionCalls)) {
                const toolCallResponses = [];
                for (const toolCall of functionCalls) {
                    addMessage({ role: 'assistant', content: `Running command: \`${toolCall.name}\`...` });
                    const toolResult = await onToolCall(toolCall.name, toolCall.args);
                    toolCallResponses.push({ functionResponse: { name: toolCall.name, response: toolResult } });
                }
                request = { parts: toolCallResponses };
            } else {
                addMessage({ role: 'assistant', content: response.text });
                isFinished = true;
            }
        }

    } catch (error) {
      console.error("Chat error:", error);
      addMessage({ role: 'assistant', content: "Sorry, I ran into an issue. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow">
      <div className="p-3 border-b">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="font-semibold text-lg text-gray-800">Chat with Chloe</h3>
                <p className="text-sm text-gray-500">Your AI Data Assistant</p>
            </div>
            {selectedMatchIds.size > 0 && (
                <button onClick={onClearSelection} className="flex items-center text-xs bg-gray-200 text-gray-700 font-semibold py-1 px-2 rounded-md hover:bg-gray-300">
                    <XCircleIcon className="w-4 h-4 mr-1"/>
                    Clear ({selectedMatchIds.size})
                </button>
            )}
        </div>
        {lastToolUsed && (
            <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded-md text-center">
                <p className="text-xs text-indigo-800 font-semibold flex items-center justify-center">
                    <MagicIcon className="w-4 h-4 mr-2 text-indigo-600"/>
                    Chloe used the tool: <span className="font-bold ml-1 font-mono">{lastToolUsed}</span>
                </p>
            </div>
        )}
         <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-blue-50 rounded-md">
                <div className="font-bold text-blue-700 text-lg">{pendingMatchesCount}</div>
                <div className="text-blue-600 font-semibold">PENDING</div>
            </div>
            <div className="p-2 bg-green-50 rounded-md">
                <div className="font-bold text-green-700 text-lg">{confirmedMatchesCount}</div>
                <div className="text-green-600 font-semibold">CONFIRMED</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-md">
                <div className="font-bold text-gray-700 text-lg">{unmatchedColumnsCount}</div>
                <div className="text-gray-600 font-semibold">UNMATCHED</div>
            </div>
        </div>
      </div>
      <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="flex items-center space-x-2 max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                <LoadingIcon className="w-5 h-5" />
                <p className="text-sm italic">Working...</p>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-3 border-t bg-white">
        <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.map(s => (
                <button key={s} onClick={(e) => handleSend(e, s)} disabled={isLoading} className="text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200 disabled:opacity-50">
                    {s}
                </button>
            ))}
        </div>
        <form onSubmit={handleSend} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or select a suggestion..."
            className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="ml-3 px-5 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 disabled:bg-gray-400">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};