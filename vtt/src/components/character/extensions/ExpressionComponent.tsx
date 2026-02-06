import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import { Parser } from 'expr-eval';
import type { ShadowState } from '../../../services/shadowStateService';
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
  // Shadow state passed from the editor for reactivity
  shadowState?: ShadowState;
}

export function ExpressionComponent({
  node,
  updateAttributes,
  selected,
  shadowState,
}: ExpressionComponentProps) {
  const { formula } = node.attrs;
  const [result, setResult] = useState<string>('?');
  const [showTooltip, setShowTooltip] = useState(false);
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
    const evalResult = evaluateFormula(formula, shadowState || { stats: {}, projections: {} });
    setResult(evalResult);
  }, [formula, shadowState, evaluateFormula]);

  if (selected) {
    return (
      <NodeViewWrapper className="expression expression--editing">
        <span className="expression__bracket">{'{{'}</span>
        <input
          type="text"
          className="expression__input"
          value={formula}
          onChange={(e) => updateAttributes({ formula: e.target.value })}
          placeholder="formula"
        />
        <span className="expression__bracket">{'}}'}</span>
        <span className="expression__result">= {result}</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className="expression"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="expression__bracket">{'{{'}</span>
      <span className="expression__result">{result}</span>
      <span className="expression__bracket">{'}}'}</span>
      
      {showTooltip && (
        <div className="expression__tooltip">
          <div className="expression__tooltip-formula">{formula}</div>
          <div className="expression__tooltip-label">Computed expression</div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
