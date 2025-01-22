import React, { useState, useCallback } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import type { ComponentPropsWithoutRef } from 'react';
import { useGame } from '../contexts/GameContext';

interface CharacterSheetProps {
  className?: string;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ className = '' }) => {
  const { characterSheet } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSheet = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Format stats text with icons and better layout
  const formatStatsText = (text: string) => {
    if (text.includes('HP:') || text.includes('AC:') || text.includes('Str:')) {
      const stats = text.split(' ');
      return (
        <div className="stats-grid">
          {stats.map((stat, index) => {
            if (stat.includes(':')) {
              const [label, value] = stat.split(':');
              return (
                <div key={index} className="stat-item">
                  <span className="stat-label">{label}:</span>
                  <span className="stat-value">{value}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return text;
  };

  // Custom components for ReactMarkdown
  const components: Components = {
    h1: (props: ComponentPropsWithoutRef<'h1'>) => (
      <h1 className="character-sheet-title" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<'h2'>) => {
      const children = props.children;
      return (
        <h2 className="character-sheet-section" {...props}>
          {typeof children === 'string' && children === 'Stats' ? '⚔️ ' : ''}
          {typeof children === 'string' && children === 'Equipment' ? '🎒 ' : ''}
          {typeof children === 'string' && children === 'Status' ? '✨ ' : ''}
          {typeof children === 'string' && children === 'Notes' ? '📝 ' : ''}
          {children}
        </h2>
      );
    },
    p: (props: ComponentPropsWithoutRef<'p'>) => {
      const children = props.children;
      if (typeof children === 'string') {
        return <p className="character-sheet-text" {...props}>{formatStatsText(children)}</p>;
      }
      return <p className="character-sheet-text" {...props}>{children}</p>;
    },
    ul: (props: ComponentPropsWithoutRef<'ul'>) => (
      <ul className="character-sheet-list" {...props} />
    ),
    li: (props: ComponentPropsWithoutRef<'li'>) => (
      <li className="character-sheet-item" {...props} />
    ),
  };

  return (
    <>
      <button 
        className="character-sheet-toggle"
        onClick={toggleSheet}
        aria-label={isExpanded ? 'Hide character sheet' : 'Show character sheet'}
        aria-expanded={isExpanded}
      >
        {isExpanded ? '✕' : '📝'}
      </button>
      
      <div 
        className={`character-sheet ${isExpanded ? 'expanded' : ''} ${className}`}
        role="complementary"
        aria-label="Character Sheet"
      >
        <div className="character-sheet-content">
          <ReactMarkdown components={components}>
            {characterSheet}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
};

export default CharacterSheet;