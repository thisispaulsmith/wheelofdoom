import { useState, useEffect } from 'react';
import { Wheel } from './components/Wheel';
import { EntryList } from './components/EntryList';
import { HistoryTabs } from './components/HistoryTabs';
import { WinnerModal } from './components/WinnerModal';
import { UserProfile } from './components/UserProfile';
import { useEntries } from './hooks/useEntries';
import { useResults } from './hooks/useResults';
import { useSound } from './hooks/useSound';
import { initializeTelemetry, trackEvent, trackException } from './utils/telemetry';
import './App.css';

function App() {
  // Initialize telemetry once on app mount
  useEffect(() => {
    initializeTelemetry();
  }, []);

  const { entries, loading: entriesLoading, addEntry, deleteEntry } = useEntries();
  const { results, loading: resultsLoading, saveResult } = useResults();
  const { playTick, playDrumroll, stopDrumroll, playFanfare } = useSound();

  const [winner, setWinner] = useState(null);
  const [winnerMessage, setWinnerMessage] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStartTime, setSpinStartTime] = useState(null);

  const handleSpinStart = () => {
    setIsSpinning(true);
    setSpinStartTime(Date.now());
    playDrumroll();
  };

  const handleSpinComplete = async (selectedEntry, message) => {
    const spinDuration = spinStartTime ? Date.now() - spinStartTime : null;

    setIsSpinning(false);
    stopDrumroll();
    playFanfare();

    setWinner(selectedEntry);
    setWinnerMessage(message);

    // Save result to backend
    try {
      await saveResult(selectedEntry.name);

      trackEvent('WheelSpun', {
        winner: selectedEntry.name,
        totalEntries: entries.length,
      }, {
        spinDuration: spinDuration,
      });
    } catch (err) {
      console.error('Failed to save result:', err);
      trackException(err, 3, { operation: 'saveResult', winner: selectedEntry.name });
    }
  };

  const handleTick = () => {
    playTick();
  };

  const handleCloseWinner = () => {
    setWinner(null);
    setWinnerMessage('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Wheel of Doom</h1>
        <div className="app-header-right">
          <a
            href="https://github.com/thisispaulsmith/wheelofdoom"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="View source code on GitHub"
          >
            <svg
              className="github-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <UserProfile />
        </div>
      </header>

      <main className="app-main">
        <div className="wheel-section">
          <Wheel
            entries={entries}
            onSpinStart={handleSpinStart}
            onSpinComplete={handleSpinComplete}
            onTick={handleTick}
            disabled={entriesLoading || entries.length === 0}
          />
        </div>

        <aside className="sidebar">
          <EntryList
            entries={entries}
            loading={entriesLoading}
            onAdd={addEntry}
            onDelete={deleteEntry}
          />
          <HistoryTabs results={results} loading={resultsLoading} />
        </aside>
      </main>

      <WinnerModal
        winner={winner}
        message={winnerMessage}
        onClose={handleCloseWinner}
      />
    </div>
  );
}

export default App;
