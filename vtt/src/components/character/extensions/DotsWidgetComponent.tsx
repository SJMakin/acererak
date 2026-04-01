import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useState, useEffect, useCallback } from 'react';
import { useShadowState } from './ShadowStateContext';
import './DotsWidget.css';

export function DotsWidgetComponent({
  node,
  updateAttributes,
}: ReactNodeViewProps) {
  const { shadowState: fullState, onUpdateStat } = useShadowState();
  const shadowState = fullState.stats as Record<string, number | string>;
  const [parsedCurrent, setParsedCurrent] = useState<number | null>(null);
  const [parsedMax, setParsedMax] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editCurrent, setEditCurrent] = useState(node.attrs.current);
  const [editMax, setEditMax] = useState(node.attrs.max);

  // Sync edit fields when attrs change externally
  useEffect(() => {
    setEditCurrent(node.attrs.current);
    setEditMax(node.attrs.max);
  }, [node.attrs.current, node.attrs.max]);

  // Parse current value (can be variable name or number)
  useEffect(() => {
    const val = node.attrs.current;
    if (!val) {
      setParsedCurrent(null);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setParsedCurrent(Math.round(num));
    } else if (shadowState[val] !== undefined) {
      const shadowVal = shadowState[val];
      const numVal = typeof shadowVal === 'number' ? shadowVal : parseFloat(String(shadowVal));
      setParsedCurrent(isNaN(numVal) ? null : Math.round(numVal));
    } else {
      setParsedCurrent(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node.attrs is a TipTap mutable ref, not a reactive dependency
  }, [node.attrs.current, shadowState]);

  // Parse max value (can be variable name or number)
  useEffect(() => {
    const val = node.attrs.max;
    if (!val) {
      setParsedMax(null);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setParsedMax(Math.min(10, Math.max(1, Math.round(num))));
    } else if (shadowState[val] !== undefined) {
      const shadowVal = shadowState[val];
      const numVal = typeof shadowVal === 'number' ? shadowVal : parseFloat(String(shadowVal));
      if (isNaN(numVal)) {
        setParsedMax(null);
      } else {
        const clamped = Math.min(10, Math.max(1, Math.round(numVal)));
        setParsedMax(clamped);
      }
    } else {
      setParsedMax(null);
    }
  }, [node.attrs.max, shadowState]);

  const effectiveCurrent = parsedCurrent !== null ? parsedCurrent : 0;
  const effectiveMax = parsedMax !== null ? parsedMax : 5;
  const displayMax = Math.max(1, Math.min(10, effectiveMax));
  const displayCurrent = Math.max(0, Math.min(displayMax, effectiveCurrent));

  const handleDotClick = useCallback(
    (index: number) => {
      if (isEditing) return;
      const currentKey = node.attrs.current;

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
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node.attrs is a TipTap mutable ref
    [displayCurrent, node.attrs.current, shadowState, onUpdateStat, isEditing]
  );

  const handleEdit = useCallback(() => {
    if (!isEditing) {
      setEditCurrent(node.attrs.current);
      setEditMax(node.attrs.max);
      setIsEditing(true);
    }
  }, [isEditing, node.attrs.current, node.attrs.max]);

  const handleSave = useCallback(() => {
    updateAttributes({ current: editCurrent, max: editMax });
    setIsEditing(false);
  }, [editCurrent, editMax, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditCurrent(node.attrs.current);
    setEditMax(node.attrs.max);
    setIsEditing(false);
  }, [node.attrs.current, node.attrs.max]);

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
          <button type="button" className="dots-widget__save-btn" onClick={handleSave}>
            ✓
          </button>
          <button type="button" className="dots-widget__cancel-btn" onClick={handleCancel}>
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
              role="button"
              tabIndex={0}
              aria-label={`Dot ${index + 1} of ${displayMax}`}
            />
          ))}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="dots-widget">
      <div className="dots-widget__container" title={`${displayCurrent}/${displayMax} filled`}>
        <span className="dots-widget__label">{node.attrs.current}/{node.attrs.max}</span>
        <div className="dots-widget__dots">
          {dots.map((index) => (
            <span
              key={index}
              className={`dots-widget__dot ${
                index < displayCurrent ? 'dots-widget__dot--filled' : 'dots-widget__dot--empty'
              }`}
              onClick={() => handleDotClick(index)}
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
          title="Click to edit"
        />
      </div>
    </NodeViewWrapper>
  );
}
