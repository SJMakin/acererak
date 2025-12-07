/**
 * ImageCard - Displays AI-generated images with prompt
 */

import React from 'react';

import type { ImageMessage } from '../../../types';

import './cards.css';

interface ImageCardProps {
  message: ImageMessage;
}

const ImageCard: React.FC<ImageCardProps> = ({ message }) => {
  const { prompt, url, loading, error } = message;

  return (
    <div className="chat-card image-card">
      <div className="chat-card-header">
        <div className="chat-card-title">
          <span className="chat-card-title-icon">🎨</span>
          <span>Image</span>
        </div>
      </div>

      <div className="image-prompt">"{prompt}"</div>

      <div className="image-container">
        {loading && (
          <div className="image-loading">
            <div className="loading-spinner" />
          </div>
        )}
        {error && <div className="image-error">{error}</div>}
        {url && !loading && !error && (
          <img src={url} alt={prompt} loading="lazy" />
        )}
      </div>
    </div>
  );
};

export default ImageCard;