import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SettingsSection.module.css';
import type { SettingsSection } from "./SettingsStrategy";

const GameSettingsPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.tabPanel}>
      <h3>{t('settings.game.preferences')}</h3>

      <div className={`${styles.controlGroup} ${styles.checkbox}`}>
        <label htmlFor="show-hints">{t('settings.game.showHints')}</label>
        <input id="show-hints" type="checkbox" defaultChecked />
      </div>
      <div className={`${styles.controlGroup} ${styles.checkbox}`}>
        <label htmlFor="confirm-moves">{t('settings.game.confirmMoves')}</label>
        <input id="confirm-moves" type="checkbox" />
      </div>
    </div>
  );
};

export class GameSettings implements SettingsSection {
  id = 'game';
  label = 'Game';

  render() {
    return <GameSettingsPanel />;
  }
}
