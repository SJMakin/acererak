import React, { useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGame } from '../contexts/GameContext';
import {
  StoryNode as StoryNodeType,
  ChoiceNode as ChoiceNodeType,
  isStoryNode,
  isChoiceNode,
} from '../types';

const StoryNode: React.FC<NodeProps<StoryNodeType>> = ({ data, selected }) => (
  <div
    style={{
      padding: '15px',
      borderRadius: '8px',
      background: selected ? '#3d4758' : '#2d3748',
      color: 'white',
      border: `2px solid ${selected ? '#63b3ed' : '#4a5568'}`,
      width: '250px',
      boxShadow: selected
        ? '0 0 15px rgba(99,179,237,0.3)'
        : '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.2s ease-in-out',
    }}
  >
    <Handle type="target" position={Position.Top} />
    <div style={{ fontSize: '0.8em', textAlign: 'left', opacity: 0.9 }}>
      {data.summary || data.content?.slice(0, 100) + '...'}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const ChoiceNode: React.FC<NodeProps<ChoiceNodeType>> = ({
  data,
  selected,
}) => (
  <div
    style={{
      padding: '12px',
      borderRadius: '6px',
      background: selected ? '#5a6578' : '#4a5568',
      color: 'white',
      border: `2px solid ${selected ? '#63b3ed' : '#718096'}`,
      width: '200px',
      cursor: 'pointer',
      boxShadow: selected
        ? '0 0 15px rgba(99,179,237,0.3)'
        : '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease-in-out',
      transform: selected ? 'scale(1.05)' : 'scale(1)',
      opacity: selected ? 1 : 0.9,
    }}
  >
    <Handle type="target" position={Position.Top} />
    <div style={{ fontSize: '0.75em', padding: '4px', textAlign: 'center' }}>
      {data.text}
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const nodeTypes = {
  story: StoryNode,
  choice: ChoiceNode,
};

const GameGraph: React.FC = () => {
  const { graphData, currentStoryNode, chooseOption, loadStoryNode } =
    useGame();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const { nodes, edges } = useMemo(
    () => ({
      nodes: graphData.nodes.map(node => {
        const baseNode = {
          ...node,
          data: { ...node.data },
        };

        if (isStoryNode(node)) {
          return {
            ...baseNode,
            data: {
              ...baseNode.data,
              content: node.content,
              summary: node.summary,
            },
          };
        } else if (isChoiceNode(node)) {
          return {
            ...baseNode,
            data: {
              ...baseNode.data,
              text: node.text,
            },
          };
        }
        return baseNode;
      }),
      edges: graphData.edges,
    }),
    [graphData]
  );

  useEffect(() => {
    // Center view whenever nodes change
    const timer = setTimeout(() => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.fitView({
          padding: 0.2,
          duration: 800,
          minZoom: 0.4,
          maxZoom: 1.2,
        });

        // Scroll to the most recent node
        if (nodes.length > 0) {
          const lastNode = nodes[nodes.length - 1];
          reactFlowInstance.current.setCenter(
            lastNode.position.x,
            lastNode.position.y,
            { duration: 1000, zoom: 0.8 }
          );
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [nodes, currentStoryNode]);

  return (
    <div style={{ width: '100%', height: '700px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          const typedNode = graphData.nodes.find(n => n.id === node.id);
          if (typedNode) {
            if (isChoiceNode(typedNode)) {
              chooseOption(typedNode.id);
            } else if (isStoryNode(typedNode)) {
              loadStoryNode(typedNode.id);
            }
          }
        }}
        fitView
        fitViewOptions={{
          padding: 0.5,
          duration: 800,
          minZoom: 0.4,
          maxZoom: 1.5,
        }}
        onInit={(instance: ReactFlowInstance) => {
          reactFlowInstance.current = instance;
        }}
        minZoom={0.2}
        maxZoom={2.0}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: {
            stroke: '#718096',
            strokeWidth: 2,
            opacity: 0.8,
          },
          animated: true as const,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#718096',
          },
        }}
        snapToGrid={true}
        snapGrid={[20, 20]}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        panOnScroll={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GameGraph;
