import React, { useState } from 'react';

import type { ModelOption } from '../contexts/ModelContext';
import { useModel } from '../contexts/ModelContext';
import './ModelSelector.css';

// Maximum description length before truncating
const MAX_DESCRIPTION_LENGTH = 100;

// Truncate long text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const ImageModelSelector: React.FC = () => {
  const {
    selectedImageModel,
    imageModelOptions,
    setSelectedImageModel,
    isLoading,
  } = useModel();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Handle dropdown and filter toggles
  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleFilters = () => setShowFilters(!showFilters);
  const toggleFreeOnly = () => setShowFreeOnly(!showFreeOnly);

  // Handle model selection
  const selectModel = (model: ModelOption) => {
    setSelectedImageModel(model);
    setShowDropdown(false);
  };

  // Filter models based on search and filter options
  const filteredModels = React.useMemo(() => {
    return (
      imageModelOptions
        .filter(
          model =>
            // Apply free filter if enabled
            (!showFreeOnly || model.isFree) &&
            // Apply search filter if text is entered
            (searchText === '' ||
              model.name.toLowerCase().includes(searchText.toLowerCase()) ||
              model.provider.toLowerCase().includes(searchText.toLowerCase()))
        )
        // Sort by release rank (newest first)
        .sort((a, b) => b.releaseRank - a.releaseRank)
    );
  }, [imageModelOptions, showFreeOnly, searchText]);

  // Handle description expansion/collapse
  const toggleDescription = (modelId: string) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const selector = document.querySelector('.image-model-selector');
      if (selector && !selector.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show message if no image models available yet
  if (imageModelOptions.length === 0 && !isLoading) {
    return (
      <div className="model-selector image-model-selector">
        <div className="model-info-message">
          <p>No image generation models available.</p>
          <p style={{ fontSize: '0.9em', opacity: 0.7 }}>
            Image models will appear here once loaded from OpenRouter.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state if no model selected yet
  if (!selectedImageModel) {
    return (
      <div className="model-selector image-model-selector">
        <div className="model-info-message">
          {isLoading ? (
            <p>Loading image models...</p>
          ) : (
            <p>Selecting default image model...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="model-selector image-model-selector">
      {/* Current model display/dropdown toggle */}
      <div
        className="model-current"
        onClick={toggleDropdown}
        title={`Current image model: ${selectedImageModel.name}`}
      >
        <div className="model-current-name">
          {selectedImageModel.name}
          {selectedImageModel.isFree && (
            <span className="model-feature model-feature-free">FREE</span>
          )}
        </div>
        <div className="model-dropdown-icon">{showDropdown ? '▲' : '▼'}</div>
      </div>

      {/* Selected model description */}
      {selectedImageModel.description && !showDropdown && (
        <div className="model-description">
          <span className="model-description-text">
            {truncateText(selectedImageModel.description, 120)}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="model-dropdown">
          {/* Search and filters */}
          <div className="model-search-filters">
            <input
              type="text"
              className="model-search"
              placeholder="Search image models..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />

            <div className="model-filters">
              <button
                className="filter-toggle"
                onClick={toggleFilters}
                title="Toggle filters"
              >
                <span>⚙️</span>
              </button>

              {showFilters && (
                <div className="filter-options">
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={showFreeOnly}
                      onChange={toggleFreeOnly}
                    />
                    <span>Free models only</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Models list */}
          <div className="model-list">
            {isLoading ? (
              <div className="model-loading">Loading image models...</div>
            ) : filteredModels.length === 0 ? (
              <div className="model-no-results">No image models found</div>
            ) : (
              filteredModels.map(model => (
                <div
                  key={model.id}
                  className={`model-item ${selectedImageModel.id === model.id ? 'selected' : ''}`}
                >
                  <div
                    className="model-item-header"
                    onClick={() => selectModel(model)}
                  >
                    <div className="model-item-name">
                      <span className="provider-name">{model.provider}</span>
                      <span className="model-name">{model.name}</span>
                      <div className="model-badges">
                        {model.isFree && (
                          <span className="model-feature model-feature-free">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {model.description && (
                    <div className="model-item-description">
                      <div
                        className="description-content"
                        onClick={() => toggleDescription(model.id)}
                      >
                        {expandedModelId === model.id
                          ? model.description
                          : truncateText(
                              model.description,
                              MAX_DESCRIPTION_LENGTH
                            )}
                      </div>
                      {model.description.length > MAX_DESCRIPTION_LENGTH && (
                        <button
                          className="description-toggle"
                          onClick={() => toggleDescription(model.id)}
                        >
                          {expandedModelId === model.id
                            ? 'Show less'
                            : 'Show more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageModelSelector;
