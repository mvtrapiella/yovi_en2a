import React from 'react';
import { useTranslation } from 'react-i18next';
import accountStyles from './AccountSettings.module.css';
import type { SettingsSection } from "./SettingsStrategy";

interface AccountSettingsPanelProps {
  isLoggedIn: boolean;
  username: string;
  navigate: (path: string) => void;
  logout: () => Promise<void>;
}

const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({ isLoggedIn, username, navigate, logout }) => {
  const { t } = useTranslation();

  if (!isLoggedIn) {
    return (
      <div className={accountStyles.accountPanel}>
        <div className={accountStyles.profileCard}>
          <div className={accountStyles.avatarGuest}>?</div>
          <div className={accountStyles.profileInfo}>
            <span className={accountStyles.profileName}>{t('settings.account.guest')}</span>
            <span className={accountStyles.profileStatus}>{t('settings.account.notLoggedIn')}</span>
          </div>
        </div>

        <p className={accountStyles.hint}>
          {t('settings.account.hint')}
        </p>

        <button
          className={accountStyles.primaryBtn}
          onClick={() => navigate('/login')}
        >
          {t('settings.account.logIn')}
        </button>
      </div>
    );
  }

  const initial = username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={accountStyles.accountPanel}>
      <div className={accountStyles.profileCard}>
        <div className={accountStyles.avatar}>{initial}</div>
        <div className={accountStyles.profileInfo}>
          <span className={accountStyles.profileName}>{username}</span>
          <span className={accountStyles.profileBadge}>{t('settings.account.activeSession')}</span>
        </div>
      </div>

      <button
        className={accountStyles.dangerBtn}
        onClick={async () => {
          navigate('/');
          await logout();
        }}
      >
        {t('settings.account.logOut')}
      </button>
    </div>
  );
};

export class AccountSettings implements SettingsSection {
  id = 'account';
  label = 'Account';

  private readonly isLoggedIn: boolean;
  private readonly username: string;
  private readonly navigate: (path: string) => void;
  private readonly logout: () => Promise<void>;

  constructor(
    isLoggedIn: boolean,
    username: string,
    navigate: (path: string) => void,
    logout: () => Promise<void>
  ) {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
    this.navigate = navigate;
    this.logout = logout;
  }

  render() {
    return (
      <AccountSettingsPanel
        isLoggedIn={this.isLoggedIn}
        username={this.username}
        navigate={this.navigate}
        logout={this.logout}
      />
    );
  }
}
