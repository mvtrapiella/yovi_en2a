import React from 'react';
import { useTranslation } from 'react-i18next';
import baseStyles from './SettingsSection.module.css';
import type { SettingsSection } from './SettingsStrategy';

const LANGUAGES = [
  { code: 'en', labelKey: 'settings.language.en' },
  { code: 'es', labelKey: 'settings.language.es' },
] as const;

const LanguageSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className={baseStyles.tabPanel}>
      <h3>{t('settings.language.selectLanguage')}</h3>
      <div className={baseStyles.controlGroup}>
        {LANGUAGES.map(({ code, labelKey }) => (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '0.5rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: i18n.language === code ? 'bold' : 'normal',
              background: i18n.language === code ? 'var(--primary-color, #4da3ff)' : 'transparent',
              color: i18n.language === code ? '#fff' : 'inherit',
              border: '1px solid var(--primary-color, #4da3ff)',
              borderRadius: '4px',
            }}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
};

export class LanguageSettings implements SettingsSection {
  id = 'language';
  label = 'Language';

  render() {
    return <LanguageSettingsPanel />;
  }
}
