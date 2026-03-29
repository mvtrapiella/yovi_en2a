import { useEffect, useState } from "react";
import type { RankingElementGlobal } from "../rankingElements/RankingElementGlobal";
import { RankingElementTime } from "../rankingElements/RankingElementTime";
import RankingTable from "../RankingTableGlobal";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const GlobalRanking = () => {
  const [data, setData] = useState<RankingElementGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/game/bestTimes`)
      .then(res => res.json())
      .then(resData => {
        const mappedData: RankingElementGlobal[] = resData.rankings.map((score: any, index: number) => {
          const m = Math.floor(score.best_time / 60).toString().padStart(2, '0');
          const s = (score.best_time % 60).toString().padStart(2, '0');
          return new RankingElementTime(index + 1, score.username || score.playerid, `${m}:${s}`);
        });
        setData(mappedData);
      })
      .catch(err => console.error("Error fetching global rankings:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Cargando Leaderboard...</div>;

  return <RankingTable data={data} title="World Leaderboard (Top 20)" />;
};
