import React, { useState, useCallback, useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import type { ComponentPropsWithoutRef } from 'react';
import { useGame } from '../contexts/GameContext';

interface CharacterSheetProps {
  className?: string;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ className = '' }) => {
  const { characterSheet } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Log when character sheet changes and force update
  useEffect(() => {
    console.log('CharacterSheet component received updated sheet');
    setUpdateCounter(prev => prev + 1);
  }, [characterSheet]);

  const toggleSheet = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

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
          {typeof children === 'string' && children === 'Equipment'
            ? '🎒 '
            : ''}
          {typeof children === 'string' && children === 'Status' ? '✨ ' : ''}
          {typeof children === 'string' && children === 'Notes' ? '📝 ' : ''}
          {children}
        </h2>
      );
    },
    p: (props: ComponentPropsWithoutRef<'p'>) => {
      const children = props.children;
      if (typeof children === 'string') {
        return (
          <p className="character-sheet-text" {...props}>
            {children}
          </p>
        );
      }
      return (
        <p className="character-sheet-text" {...props}>
          {children}
        </p>
      );
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
        aria-label={
          isExpanded ? 'Hide character sheet' : 'Show character sheet'
        }
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
          <ReactMarkdown components={components} key={updateCounter}>
            {characterSheet}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
};

export default CharacterSheet;
