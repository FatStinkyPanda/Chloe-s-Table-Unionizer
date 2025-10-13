import React from 'react';

interface AISettingsControlProps {
  apiCallDelay: number;
  setApiCallDelay: (delay: number) => void;
  maxRetries: number;
  setMaxRetries: (retries: number) => void;
}

export const AISettingsControl: React.FC<AISettingsControlProps> = ({
  apiCallDelay,
  setApiCallDelay,
  maxRetries,
  setMaxRetries,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-xl font-semibold mb-4">AI Settings</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="api-delay" className="block text-sm font-medium text-gray-700">
            API Call Delay (seconds)
          </label>
          <input
            id="api-delay"
            type="number"
            min="1"
            value={apiCallDelay}
            onChange={(e) => setApiCallDelay(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="max-retries" className="block text-sm font-medium text-gray-700">
            Max Retries on Failure (0 for unlimited)
          </label>
          <input
            id="max-retries"
            type="number"
            min="0"
            value={maxRetries}
            onChange={(e) => setMaxRetries(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
