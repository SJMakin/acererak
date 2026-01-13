import { NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import { useState, useEffect, useCallback } from 'react';
import './DotsWidget.css';

interface DotsWidgetComponentProps extends ReactNodeViewProps {
  shadowState?: Record<string, number | string>;
  onUpdateStat?: (key: string, newValue: string | number) => void;
}

export function DotsWidgetComponent({
  node,
  shadowState = {},
  onUpdateStat,
}: DotsWidgetComponentProps) {
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
      setParsedCurrent(Math.round(num));
    } else if (shadowState[val] !== undefined) {
      const shadowVal = shadowState[val];
      const numVal = typeof shadowVal === 'number' ? shadowVal : parseFloat(String(shadowVal));
      setParsedCurrent(isNaN(numVal) ? null : Math.round(numVal));
    } else {
      setParsedCurrent(null);
    }
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
    [displayCurrent, node.attrs.current, shadowState, onUpdateStat]
  );

  const dots = Array.from({ length: displayMax }, (_, i) => i);

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
      </div>
    </NodeViewWrapper>
  );
}
