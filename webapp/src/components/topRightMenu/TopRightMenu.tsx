import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TopRightMenu.module.css';
import '../../styles/layout/TopRightMenuLayout.css';
import MenuButtons from '../generalComponents/MenuButtons.tsx';
import helpIcon from '../../assets/help_icon.svg';
import rankingIcon from '../../assets/ranking_icon.svg';
import volumeUnmuteIcon from '../../assets/volume_unmute_icon.svg';
import volumeMuteIcon from '../../assets/volume_mute_icon.svg';
import configIcon from '../../assets/settings_icon.svg';
import userIcon from '../../assets/user_icon.svg';
import languageIcon from '../../assets/language_icon.svg';

import SettingsMenu from './settings/Settings.tsx';
import Ranking from './ranking/Ranking.tsx';
import UserMenu from './user/UserMenu.tsx';
import HelpMenu from './help/HelpMenu';
import { useAudio } from '../../contexts/AudioContext';

type MenuType = 'settings' | 'rankings' | 'help' | 'user' | null;

const SUPPORTED_LANGS = ['en', 'es'] as const;

const TopRightMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isMuted, toggleMute } = useAudio();
  const [activeMenu, setActiveMenu] = useState<MenuType>(null);

  const closeMenu = () => setActiveMenu(null);

  const cycleLanguage = () => {
    const current = SUPPORTED_LANGS.indexOf(i18n.language as typeof SUPPORTED_LANGS[number]);
    const next = SUPPORTED_LANGS[(current + 1) % SUPPORTED_LANGS.length];
    i18n.changeLanguage(next);
  };

  return (
    <div className={styles.topRightMenu}>
      <MenuButtons
        label={t('topRightMenu.help')}
        onClick={() => setActiveMenu('help')}
        img={helpIcon}
      />

      <MenuButtons
        label={t('topRightMenu.rankings')}
        onClick={() => setActiveMenu('rankings')}
        img={rankingIcon}
      />

      <MenuButtons
        label={t('topRightMenu.volume')}
        onClick={toggleMute}
        img={isMuted ? volumeMuteIcon : volumeUnmuteIcon}
      />

      <MenuButtons
        label={t('topRightMenu.settings')}
        onClick={() => setActiveMenu('settings')}
        img={configIcon}
      />

      <MenuButtons
        label={t('topRightMenu.user')}
        onClick={() => setActiveMenu('user')}
        img={userIcon}
      />

      <div className={styles.languageBtn}>
        <MenuButtons
          label={t('topRightMenu.language')}
          onClick={cycleLanguage}
          img={languageIcon}
        />
        <span className={styles.langBadge}>{i18n.language.toUpperCase()}</span>
      </div>

      {activeMenu === 'settings' && (
        <SettingsMenu onClose={closeMenu} />
      )}

      {activeMenu === 'rankings' && (
        <Ranking onClose={closeMenu} />
      )}

      {activeMenu === 'user' && (
        <UserMenu onClose={closeMenu} />
      )}

      {activeMenu === 'help' && (
        <HelpMenu onClose={closeMenu} />
      )}
    </div>
  );
};

export default TopRightMenu;
