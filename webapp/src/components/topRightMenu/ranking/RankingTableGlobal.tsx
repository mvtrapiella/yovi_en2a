import React from 'react';
import styles from './RankingTableGlobal.module.css';
import type { RankingElementGlobal } from "./rankingElements/RankingElementGlobal";
import Pagination, { usePagination } from './Pagination';

const RankingTableGlobal: React.FC<{ data: RankingElementGlobal[], title: string }> = ({ data, title }) => {
  const { currentPage, setCurrentPage, totalPages, pageData, visiblePages } = usePagination(data);

  // Extract the dynamic metric name from the first item (e.g., "TIME", "ELO", "WINS").
  // If the data is empty, we default to 'RESULT'.
  const dynamicMetricName = data.length > 0 ? data[0].metricName : 'RESULT';

  return (
    <div className={styles.rankingContainer}>
      <h3 className={styles.rankingSubtitle}>{title}</h3>

      {/* Static Header: This stays fixed at the top */}
      <div className={styles.rankingHeaderRow}>
        <span>POS</span>
        <span>PLAYER 1</span>
        {/* Dynamic column name based on data */}
        <span>{dynamicMetricName}</span>
      </div>

      {/* Page rows */}
      <div className={styles.rankingList}>
        {pageData.map((item) => {
          const positionHighlight = styles[`pos-${item.position}`] || '';

          return (
            <div
              key={item.position}
              className={`${styles.rankingItem} ${positionHighlight}`}
            >
              {/* Left Column: Position (#1, #2, etc.) */}
              <span className={styles.rankPos}>#{item.position}</span>

              {/* Middle Column: Player Name with truncation support */}
              <span className={styles.rankName}>{item.player1Name}</span>

              {/* Right Column: The actual score or time metric */}
              <span className={styles.rankTime}>{item.metric}</span>
            </div>
          );
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        visiblePages={visiblePages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default RankingTableGlobal;