import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
import './SuggestionMenu.css';

export interface SuggestionItem {
  label: string;
  description?: string;
  category: 'stat' | 'attribute' | 'derived' | 'resource';
}

export interface SuggestionMenuProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  onClose: () => void;
}

export interface SuggestionMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const STAT_SUGGESTIONS: SuggestionItem[] = [
  // Core Stats (D&D 5e)
  { label: 'HP', description: 'Current hit points', category: 'resource' },
  { label: 'MaxHP', description: 'Maximum hit points', category: 'resource' },
  { label: 'AC', description: 'Armor class', category: 'attribute' },
  { label: 'Strength', description: 'Strength score', category: 'stat' },
  { label: 'Dexterity', description: 'Dexterity score', category: 'stat' },
  { label: 'Constitution', description: 'Constitution score', category: 'stat' },
  { label: 'Intelligence', description: 'Intelligence score', category: 'stat' },
  { label: 'Wisdom', description: 'Wisdom score', category: 'stat' },
  { label: 'Charisma', description: 'Charisma score', category: 'stat' },
  { label: 'Speed', description: 'Movement speed', category: 'attribute' },
  { label: 'Initiative', description: 'Initiative modifier', category: 'derived' },
  { label: 'Proficiency', description: 'Proficiency bonus', category: 'derived' },
  
  // Resources
  { label: 'Slots', description: 'Spell slots remaining', category: 'resource' },
  { label: 'MaxSlots', description: 'Maximum spell slots', category: 'resource' },
  { label: 'SorcPoints', description: 'Sorcery points', category: 'resource' },
  { label: 'BardicInspiration', description: 'Uses remaining', category: 'resource' },
  { label: 'Ki', description: 'Ki points', category: 'resource' },
  { label: 'Rages', description: 'Rages remaining', category: 'resource' },
  { label: 'WildShapes', description: 'Wild Shape uses', category: 'resource' },
  
  // Derived Stats
  { label: 'STR', description: 'Strength modifier', category: 'derived' },
  { label: 'DEX', description: 'Dexterity modifier', category: 'derived' },
  { label: 'CON', description: 'Constitution modifier', category: 'derived' },
  { label: 'INT', description: 'Intelligence modifier', category: 'derived' },
  { label: 'WIS', description: 'Wisdom modifier', category: 'derived' },
  { label: 'CHA', description: 'Charisma modifier', category: 'derived' },
  { label: 'PassivePerception', description: 'Passive perception', category: 'derived' },
  { label: 'PassiveInsight', description: 'Passive insight', category: 'derived' },
  { label: 'PassiveInvestigation', description: 'Passive investigation', category: 'derived' },
  
  // Saving Throws
  { label: 'STR_Save', description: 'Strength saving throw', category: 'derived' },
  { label: 'DEX_Save', description: 'Dexterity saving throw', category: 'derived' },
  { label: 'CON_Save', description: 'Constitution saving throw', category: 'derived' },
  { label: 'INT_Save', description: 'Intelligence saving throw', category: 'derived' },
  { label: 'WIS_Save', description: 'Wisdom saving throw', category: 'derived' },
  { label: 'CHA_Save', description: 'Charisma saving throw', category: 'derived' },
  
  // Skills
  { label: 'Acrobatics', description: 'Acrobatics skill', category: 'derived' },
  { label: 'AnimalHandling', description: 'Animal handling skill', category: 'derived' },
  { label: 'Arcana', description: 'Arcana skill', category: 'derived' },
  { label: 'Athletics', description: 'Athletics skill', category: 'derived' },
  { label: 'Deception', description: 'Deception skill', category: 'derived' },
  { label: 'History', description: 'History skill', category: 'derived' },
  { label: 'Insight', description: 'Insight skill', category: 'derived' },
  { label: 'Intimidation', description: 'Intimidation skill', category: 'derived' },
  { label: 'Investigation', description: 'Investigation skill', category: 'derived' },
  { label: 'Medicine', description: 'Medicine skill', category: 'derived' },
  { label: 'Nature', description: 'Nature skill', category: 'derived' },
  { label: 'Perception', description: 'Perception skill', category: 'derived' },
  { label: 'Performance', description: 'Performance skill', category: 'derived' },
  { label: 'Persuasion', description: 'Persuasion skill', category: 'derived' },
  { label: 'Religion', description: 'Religion skill', category: 'derived' },
  { label: 'SleightOfHand', description: 'Sleight of hand skill', category: 'derived' },
  { label: 'Stealth', description: 'Stealth skill', category: 'derived' },
  { label: 'Survival', description: 'Survival skill', category: 'derived' },
];

export const SuggestionMenu = forwardRef<SuggestionMenuRef, SuggestionMenuProps>(
  ({ items, command, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filter, setFilter] = useState('');

    const filteredItems = items.filter((item) =>
      item.label.toLowerCase().includes(filter.toLowerCase())
    );

    useEffect(() => {
      setSelectedIndex(0);
    }, [filter]);

    const handleKeyDownInternal = useCallback(
      (event: KeyboardEvent): boolean => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredItems[selectedIndex]) {
            command(filteredItems[selectedIndex]);
          }
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return true;
        }
        if (event.key === 'Backspace' && filter === '') {
          event.preventDefault();
          onClose();
          return true;
        }
        return false;
      },
      [filteredItems, selectedIndex, command, onClose, filter]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: handleKeyDownInternal,
    }));

    // Auto-focus on mount
    useEffect(() => {
      const input = document.querySelector(
        '.suggestion-menu__input'
      ) as HTMLInputElement;
      input?.focus();
    }, []);

    const getCategoryIcon = (category: string) => {
      switch (category) {
        case 'stat':
          return '📊';
        case 'attribute':
          return '⚔️';
        case 'derived':
          return '✨';
        case 'resource':
          return '💎';
        default:
          return '📝';
      }
    };

    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'stat':
          return '#f59e0b';
        case 'attribute':
          return '#ef4444';
        case 'derived':
          return '#8b5cf6';
        case 'resource':
          return '#10b981';
        default:
          return '#6b7280';
      }
    };

    return (
      <div className="suggestion-menu">
        <div className="suggestion-menu__header">
          <input
            type="text"
            className="suggestion-menu__input"
            placeholder="Search stats..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                  command(filteredItems[selectedIndex]);
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
              }
            }}
          />
          <span className="suggestion-menu__hint">Use ↑↓ to navigate, Enter to select</span>
        </div>
        
        <div className="suggestion-menu__list">
          {filteredItems.length === 0 ? (
            <div className="suggestion-menu__empty">No matching stats</div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={`suggestion-menu__item ${
                  index === selectedIndex ? 'suggestion-menu__item--selected' : ''
                }`}
                onClick={() => command(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="suggestion-menu__icon">
                  {getCategoryIcon(item.category)}
                </span>
                <div className="suggestion-menu__content">
                  <span
                    className="suggestion-menu__label"
                    style={{ color: getCategoryColor(item.category) }}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="suggestion-menu__description">
                      {item.description}
                    </span>
                  )}
                </div>
                <span className="suggestion-menu__category">{item.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
);

SuggestionMenu.displayName = 'SuggestionMenu';
