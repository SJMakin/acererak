import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Parser } from 'expr-eval';
import type { ShadowState } from '../../../services/shadowStateService';
import { useShadowState } from './ShadowStateContext';
import './Expression.css';

interface ExpressionComponentProps {
  node: {
    attrs: {
      formula: string;
    };
  };
  updateAttributes: (attrs: { formula?: string }) => void;
  selected: boolean;
  extension: {
    name: string;
  };
}

export function ExpressionComponent({
  node,
  updateAttributes,
}: ExpressionComponentProps) {
  const { shadowState } = useShadowState();
  const { formula } = node.attrs;
  const [result, setResult] = useState<string>('?');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormula, setEditFormula] = useState(formula);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const evaluateFormula = useCallback((formulaText: string, context: ShadowState): string => {
    if (!formulaText.trim()) {
      return '?';
    }

    try {
      // Sandbox: only allow safe operations
      const parser = new Parser();
      const expr = parser.parse(formulaText);

      // Prepare variables from shadow state
      const variables: Record<string, number> = {};
      for (const [key, value] of Object.entries(context.stats)) {
        if (typeof value === 'number') {
          variables[key] = value;
        } else if (typeof value === 'string') {
          // Try to parse string values as numbers
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            variables[key] = parsed;
          }
        }
      }

      const evalResult = expr.evaluate(variables);

      // Format result
      if (typeof evalResult === 'number') {
        // Round to reasonable precision
        if (Number.isInteger(evalResult)) {
          return evalResult.toString();
        }
        return evalResult.toFixed(2).replace(/\.?0+$/, '');
      }
      return String(evalResult);
    } catch {
      return 'Error';
    }
  }, []);

  useEffect(() => {
    const evalResult = evaluateFormula(formula, shadowState);
    setResult(evalResult);
  }, [formula, shadowState, evaluateFormula]);

  // Sync editFormula when formula changes externally
  useEffect(() => {
    setEditFormula(formula);
  }, [formula]);

  const handleEdit = useCallback(() => {
    if (!isEditing) {
      setEditFormula(formula);
      setIsEditing(true);
    }
  }, [isEditing, formula]);

  const handleSave = useCallback(() => {
    updateAttributes({ formula: editFormula });
    setIsEditing(false);
  }, [editFormula, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditFormula(formula);
    setIsEditing(false);
  }, [formula]);

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

  const handleMouseEnter = useCallback(() => {
    if (isEditing) return;
    setShowTooltip(true);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isEditing]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  if (isEditing) {
    return (
      <NodeViewWrapper className="expression expression--editing">
        <span className="expression__bracket">{'{{'}</span>
        <input
          type="text"
          className="expression__input"
          value={editFormula}
          onChange={(e) => setEditFormula(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="formula"
          autoFocus
        />
        <span className="expression__bracket">{'}}'}</span>
        <span className="expression__result">= {result}</span>
        <button type="button" className="expression__save-btn" onClick={handleSave}>
          ✓
        </button>
        <button type="button" className="expression__cancel-btn" onClick={handleCancel}>
          ✕
        </button>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="expression"
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="expression__bracket">{'{{'}</span>
      <span className="expression__result">{result}</span>
      <span className="expression__bracket">{'}}'}</span>

      <button
        type="button"
        className="expression__edit-trigger"
        onClick={handleEdit}
        title="Click to edit"
      />

      {showTooltip && tooltipPos && (
        <div
          className="expression__tooltip"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          <div className="expression__tooltip-formula">{formula}</div>
          <div className="expression__tooltip-label">Computed expression</div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
