import { useEffect, useState } from "react";
import { RankingElementTime } from "../rankingElements/RankingElementTime";
import type { RankingElementGlobal } from "../rankingElements/RankingElementGlobal";
import RankingTable from "../RankingTableGlobal";
import styles from './GlobalRanking.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GLOBAL_SUBTABS = [
  { id: 'time',  label: 'Time'  },
  { id: 'wins',  label: 'Wins'  },
  { id: 'loses', label: 'Loses' },
] as const;

type SubTabId = typeof GLOBAL_SUBTABS[number]['id'];

interface RawScore {
  playerid: string;
  username: string;
  total_matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  elo: number;
  best_time: number;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const mapToDisplayData = (scores: RawScore[], subTab: SubTabId): RankingElementGlobal[] => {
  let sorted: RawScore[];

  switch (subTab) {
    case 'time':
      sorted = [...scores].sort((a, b) => a.best_time - b.best_time);
      break;
    case 'wins':
      sorted = [...scores].sort((a, b) => b.wins - a.wins);
      break;
    case 'loses':
      sorted = [...scores].sort((a, b) => b.losses - a.losses);
      break;
  }

  return sorted.map((score, index) => {
    const name = score.username || score.playerid;
    switch (subTab) {
      case 'wins':
        return { position: index + 1, player1Name: name, metric: String(score.wins),   metricName: 'WINS'  };
      case 'loses':
        return { position: index + 1, player1Name: name, metric: String(score.losses), metricName: 'LOSES' };
      default: // time
        return new RankingElementTime(index + 1, name, formatTime(score.best_time));
    }
  });
};

const getTitle = (subTab: SubTabId): string => {
  switch (subTab) {
    case 'time':  return 'Fastest Games — Best Time (Top 20)';
    case 'wins':  return 'Most Wins — World Top 20';
    case 'loses': return 'Most Losses — World';
  }
};

export const GlobalRanking = () => {
  const [rawScores, setRawScores] = useState<RawScore[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('time');

  useEffect(() => {
    fetch(`${API_URL}/game/bestTimes`)
      .then(res => res.json())
      .then(resData => setRawScores(resData.rankings ?? []))
      .catch(err => console.error("Error fetching global rankings:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loadingContainer}>Loading leaderboard...</div>;

  const displayed = mapToDisplayData(rawScores, activeSubTab);

  return (
    <div className={styles.globalContainer}>
      <nav className={styles.subMenu}>
        {GLOBAL_SUBTABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.subTabBtn} ${activeSubTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.subContent}>
        <RankingTable data={displayed} title={getTitle(activeSubTab)} />
      </div>
    </div>
  );
};
