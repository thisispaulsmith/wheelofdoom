import { useState, useEffect } from 'react';
import { Wheel } from './components/Wheel';
import { EntryList } from './components/EntryList';
import { HistoryTabs } from './components/HistoryTabs';
import { WinnerModal } from './components/WinnerModal';
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
