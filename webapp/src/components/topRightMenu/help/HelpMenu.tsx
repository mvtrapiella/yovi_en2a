import { useState } from 'react';
import './HelpMenu-module.css';
import MainMenuHelp from './tabs/MainMenuHelp';
import GameRulesHelp from './tabs/GameRulesHelp';
import AccountHelp from './tabs/AccountHelp';

type Tab = {
  id: string;
  label: string;
  component: React.ReactNode;
};

const tabs: Tab[] = [
  { id: 'mainMenu',   label: 'Main Menu',   component: <MainMenuHelp /> },
  { id: 'account',    label: 'Account',     component: <AccountHelp /> },
  { id: 'gameRules',  label: 'Game Rules',  component: <GameRulesHelp /> },
];

type Props = { onClose: () => void };

export default function HelpMenu({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState('mainMenu');
  const [menuOpen, setMenuOpen] = useState(false);
  const current = tabs.find(t => t.id === activeTab)!;

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  /* Create navigation */
  const NavItems = () => (
    <>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="help-menu-overlay" onClick={onClose}>
      <div className="help-menu-panel" onClick={e => e.stopPropagation()}>
        <button className="help-close-btn" onClick={onClose}>✕</button>

        <nav className="help-sidebar">
            <p>HELP</p>
            <NavItems />
        </nav>

        {/* Mobile */}
        <div className="help-mobile">
            <div className="help-mobile-header">
            <button onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? '✕' : '☰'}
            </button>
            <p>{current.label}</p>
            </div>

            {menuOpen && (
            <nav className="help-mobile-nav">
                <NavItems />
            </nav>
            )}

            <div className="help-content">
            {current.component}
            </div>
        </div>

        {/* Desktop content */}
        <div className="help-content help-desktop-content">
            {current.component}
        </div>
      </div>
    </div>
  );
}