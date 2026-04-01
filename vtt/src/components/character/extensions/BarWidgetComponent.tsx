import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useState, useEffect, useCallback } from 'react';
import { useShadowState } from './ShadowStateContext';
import './BarWidget.css';

export function BarWidgetComponent({
  node,
}: ReactNodeViewProps) {
  const { shadowState: fullState, onUpdateStat } = useShadowState();
  const shadowState = fullState.stats as Record<string, number | string>;
  const [showControls, setShowControls] = useState(false);
  const [parsedCurrent, setParsedCurrent] = useState<number | null>(null);
  const [parsedMax, setParsedMax] = useState<number | null>(null);

  // Parse current value (can be variable name or number)
  useEffect(() => {
    const val = node.attrs.current;
    if (!val) {
      setParsedCurrent(null);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setParsedCurrent(num);
    } else if (shadowState[val] !== undefined) {
      const shadowVal = shadowState[val];
      setParsedCurrent(typeof shadowVal === 'number' ? shadowVal : parseFloat(String(shadowVal)) || null);
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
      setParsedMax(num);
    } else if (shadowState[val] !== undefined) {
      const shadowVal = shadowState[val];
      setParsedMax(typeof shadowVal === 'number' ? shadowVal : parseFloat(String(shadowVal)) || null);
    } else {
      setParsedMax(null);
    }
  }, [node.attrs.max, shadowState]);

  // Use parsed values or fall back to defaults
  const effectiveCurrent = parsedCurrent !== null ? parsedCurrent : 0;
  const effectiveMax = parsedMax !== null ? parsedMax : 100;

  const percentage = effectiveMax > 0 ? Math.max(0, Math.min(100, (effectiveCurrent / effectiveMax) * 100)) : 0;

  const getBarColor = () => {
    if (percentage > 50) return 'var(--bar-green, #22c55e)';
    if (percentage > 25) return 'var(--bar-yellow, #eab308)';
    return 'var(--bar-red, #ef4444)';
  };

  const handleIncrement = useCallback(() => {
    const newValue = effectiveCurrent + 1;
    const currentKey = node.attrs.current;

    // Try to update shadow state if using variables
    if (currentKey && shadowState[currentKey] !== undefined && onUpdateStat) {
      onUpdateStat(currentKey, newValue);
    }
    setShowControls(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node.attrs is a TipTap mutable ref
  }, [effectiveCurrent, node.attrs.current, shadowState, onUpdateStat]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(0, effectiveCurrent - 1);
    const currentKey = node.attrs.current;

    // Try to update shadow state if using variables
    if (currentKey && shadowState[currentKey] !== undefined && onUpdateStat) {
      onUpdateStat(currentKey, newValue);
    }
    setShowControls(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node.attrs is a TipTap mutable ref
  }, [effectiveCurrent, node.attrs.current, shadowState, onUpdateStat]);

  return (
    <NodeViewWrapper className="bar-widget">
      <div
        className="bar-widget__container"
        onClick={() => setShowControls(!showControls)}
      >
        <div className="bar-widget__bar-container">
          <div
            className="bar-widget__bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getBarColor(),
            }}
          />
          <div className="bar-widget__label">
            {node.attrs.current}/{node.attrs.max}
          </div>
        </div>
        <div className="bar-widget__percentage">
          {effectiveMax > 0 ? Math.round(percentage) : 0}%
        </div>
      </div>

      {showControls && (
        <div className="bar-widget__controls">
          <button
            className="bar-widget__button bar-widget__button--minus"
            onClick={handleDecrement}
            title="Decrease"
          >
            −
          </button>
          <span className="bar-widget__value">
            {effectiveCurrent} / {effectiveMax}
          </span>
          <button
            className="bar-widget__button bar-widget__button--plus"
            onClick={handleIncrement}
            title="Increase"
          >
            +
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
