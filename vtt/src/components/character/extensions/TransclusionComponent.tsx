import { NodeViewWrapper } from '@tiptap/react';
import { useSnippetStore } from '../../../stores/snippetStore';
import { useState } from 'react';
import './Transclusion.css';

interface TransclusionComponentProps {
  node: {
    attrs: {
      snippetName: string;
    };
  };
  updateAttributes: (attrs: { snippetName: string }) => void;
  readOnly?: boolean;
}

export function TransclusionComponent({
  node,
  readOnly = false,
}: TransclusionComponentProps) {
  const { getSnippetByName, snippets } = useSnippetStore();
  const [showOriginal, setShowOriginal] = useState(false);
  const snippet = getSnippetByName(node.attrs.snippetName);

  const handleClick = () => {
    if (!readOnly) {
      setShowOriginal(!showOriginal);
    }
  };

  const renderSnippetContent = (contentJson: string) => {
    try {
      const doc = JSON.parse(contentJson);
      return renderDocument(doc);
    } catch {
      return <p className="transclusion-error">Error rendering snippet content</p>;
    }
  };

  interface TipTapNode {
    type: string;
    content?: TipTapNode[];
    attrs?: Record<string, unknown>;
    text?: string;
    marks?: { type: string }[];
  }

  const renderDocument = (doc: { type: string; content?: TipTapNode[] }): React.ReactNode => {
    if (doc.type === 'doc' && doc.content) {
      return (
        <>
          {doc.content.map((node, index) => renderNode(node, index))}
        </>
      );
    }
    return null;
  };

  const renderNode = (node: TipTapNode, index: number): React.ReactNode => {
    switch (node.type) {
      case 'paragraph':
        return (
          <p key={index}>
            {node.content?.map((child, i) => renderNode(child, i))}
          </p>
        );
      case 'heading': {
        const level = (node.attrs?.level as number) || 2;
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag key={index}>
            {node.content?.map((child, i) => renderNode(child, i))}
          </HeadingTag>
        );
      }
      case 'text': {
        const text = node.text || '';
        if (node.marks) {
          return (
            <span key={index}>
              {node.marks.map((mark, i) => {
                if (mark.type === 'bold') return <strong key={i}>{text}</strong>;
                if (mark.type === 'italic') return <em key={i}>{text}</em>;
                if (mark.type === 'strike') return <s key={i}>{text}</s>;
                if (mark.type === 'code') return <code key={i}>{text}</code>;
                return text;
              })}
            </span>
          );
        }
        return <span key={index}>{text}</span>;
      }
      default:
        return null;
    }
  };

  return (
    <NodeViewWrapper className="transclusion">
      {snippet ? (
        <div className="transclusion__content" onClick={handleClick}>
          <div className="transclusion__header">
            <span className="transclusion__icon">📎</span>
            <span className="transclusion__name">{snippet.name}</span>
            <span className={`transclusion__category transclusion__category--${snippet.category}`}>
              {snippet.category}
            </span>
          </div>
          <div className="transclusion__body">
            {renderSnippetContent(snippet.content)}
          </div>
          {!readOnly && showOriginal && (
            <div className="transclusion__original">
              <p className="transclusion__hint">Original snippet: {snippet.name}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="transclusion transclusion--missing">
          <div className="transclusion__header">
            <span className="transclusion__icon">⚠️</span>
            <span className="transclusion__name">Missing Snippet</span>
          </div>
          <div className="transclusion__body">
            <p>Snippet "{node.attrs.snippetName}" not found.</p>
            <p className="transclusion__hint">Available snippets: {snippets.map(s => s.name).join(', ')}</p>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
