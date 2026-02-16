import { useState } from 'react';
import { Statistics } from './Statistics';
import { Results } from './Results';
import './HistoryTabs.css';

export function HistoryTabs({ results, loading }) {
  const [activeTab, setActiveTab] = useState('statistics');

  return (
    <div className="history-tabs">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
          aria-selected={activeTab === 'statistics'}
          role="tab"
        >
          Statistics
        </button>
        <button
          className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
          aria-selected={activeTab === 'results'}
          role="tab"
        >
          Recent Results
        </button>
      </div>

      <div className="tabs-content" role="tabpanel">
        {activeTab === 'statistics' ? (
          <Statistics results={results} loading={loading} />
        ) : (
          <Results results={results} loading={loading} />
        )}
      </div>
    </div>
  );
}
