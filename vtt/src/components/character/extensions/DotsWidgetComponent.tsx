import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { useShadowState } from './ShadowStateContext';
import './DotsWidget.css';

function parseDotValue(
  value: string,
  shadowState: Record<string, number | string>,
): number | null {
  if (!value) return null;

  const literal = Number(value);
  if (Number.isFinite(literal)) return Math.round(literal);

  const shadowValue = shadowState[value];
  if (shadowValue === undefined) return null;

  const parsed = typeof shadowValue === 'number'
    ? shadowValue
    : Number(shadowValue);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function DotsWidgetComponent({
  node,
  updateAttributes,
}: ReactNodeViewProps) {
  const { shadowState: fullState, onUpdateStat } = useShadowState();
  const shadowState = fullState.stats as Record<string, number | string>;
  const currentAttr = String(node.attrs.current ?? '');
  const maxAttr = String(node.attrs.max ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [editCurrent, setEditCurrent] = useState(currentAttr);
  const [editMax, setEditMax] = useState(maxAttr);

  const parsedCurrent = parseDotValue(currentAttr, shadowState);
  const parsedMax = parseDotValue(maxAttr, shadowState);

  const effectiveCurrent = parsedCurrent !== null ? parsedCurrent : 0;
  const effectiveMax = parsedMax !== null ? parsedMax : 5;
  const displayMax = Math.max(1, Math.min(10, effectiveMax));
  const displayCurrent = Math.max(0, Math.min(displayMax, effectiveCurrent));

  const handleDotClick = useCallback(
    (index: number) => {
      if (isEditing) return;
      const currentKey = currentAttr;

      // Determine new value: clicking an empty dot fills up to that dot
      // Clicking a filled dot empties it and all dots after it
      let newValue: number;
      if (index < displayCurrent) {
        // Clicking a filled dot - empty it and all after
        newValue = index;
      } else {
        // Clicking an empty dot - fill up to and including this one
        newValue = index + 1;
      }

      // Try to update shadow state if using variables
      if (currentKey && shadowState[currentKey] !== undefined && onUpdateStat) {
        onUpdateStat(currentKey, newValue);
      } else {
        updateAttributes({ current: String(newValue) });
      }
    },
    [currentAttr, displayCurrent, isEditing, onUpdateStat, shadowState, updateAttributes]
  );

  const handleEdit = useCallback(() => {
    if (!isEditing) {
      setEditCurrent(currentAttr);
      setEditMax(maxAttr);
      setIsEditing(true);
    }
  }, [currentAttr, isEditing, maxAttr]);

  const handleSave = useCallback(() => {
    updateAttributes({ current: editCurrent, max: editMax });
    setIsEditing(false);
  }, [editCurrent, editMax, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditCurrent(currentAttr);
    setEditMax(maxAttr);
    setIsEditing(false);
  }, [currentAttr, maxAttr]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const dots = Array.from({ length: displayMax }, (_, i) => i);

  if (isEditing) {
    return (
      <NodeViewWrapper className="dots-widget dots-widget--editing">
        <div className="dots-widget__edit-form">
          <label className="dots-widget__edit-label">
            Current:
            <input
              type="text"
              className="dots-widget__edit-input"
              value={editCurrent}
              onChange={(e) => setEditCurrent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </label>
          <label className="dots-widget__edit-label">
            Max:
            <input
              type="text"
              className="dots-widget__edit-input"
              value={editMax}
              onChange={(e) => setEditMax(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <button
            type="button"
            className="dots-widget__save-btn"
            onClick={handleSave}
            aria-label="Save dot tracker settings"
          >
            ✓
          </button>
          <button
            type="button"
            className="dots-widget__cancel-btn"
            onClick={handleCancel}
            aria-label="Cancel editing dot tracker"
          >
            ✕
          </button>
        </div>
        <div className="dots-widget__dots">
          {dots.map((index) => (
            <span
              key={index}
              className={`dots-widget__dot ${
                index < displayCurrent ? 'dots-widget__dot--filled' : 'dots-widget__dot--empty'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="dots-widget">
      <div className="dots-widget__container" title={`${displayCurrent}/${displayMax} filled`}>
        <span className="dots-widget__label">{currentAttr}/{maxAttr}</span>
        <div className="dots-widget__dots">
          {dots.map((index) => (
            <span
              key={index}
              className={`dots-widget__dot ${
                index < displayCurrent ? 'dots-widget__dot--filled' : 'dots-widget__dot--empty'
              }`}
              onClick={() => handleDotClick(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleDotClick(index);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Toggle dot ${index + 1} of ${displayMax}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="dots-widget__edit-trigger"
          onClick={handleEdit}
          aria-label="Edit dot tracker"
          title="Click to edit"
        />
      </div>
    </NodeViewWrapper>
  );
}
