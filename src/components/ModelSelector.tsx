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

const ModelSelector: React.FC = () => {
  const { selectedModel, modelOptions, setSelectedModel, isLoading } =
    useModel();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showJsonOnly, setShowJsonOnly] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  // Handle dropdown and filter toggles
  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleFilters = () => setShowFilters(!showFilters);
  const toggleFreeOnly = () => setShowFreeOnly(!showFreeOnly);
  const toggleJsonOnly = () => setShowJsonOnly(!showJsonOnly);

  // Handle model selection
  const selectModel = (model: ModelOption) => {
    setSelectedModel(model);
    setShowDropdown(false);
  };

  // Filter models based on search and filter options
  const filteredModels = React.useMemo(() => {
    // Apply core filters (json and free)
    return (
      modelOptions
        .filter(
          model =>
            // Always apply JSON filter if enabled
            (!showJsonOnly || model.supportsJson) &&
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
  }, [modelOptions, showFreeOnly, showJsonOnly, searchText]);

  // Handle description expansion/collapse
  const toggleDescription = (modelId: string) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const selector = document.querySelector('.model-selector');
      if (selector && !selector.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="model-selector">
      {/* Current model display/dropdown toggle */}
      <div
        className="model-current"
        onClick={toggleDropdown}
        title={`Current model: ${selectedModel.name}`}
      >
        <div className="model-current-name">
          {selectedModel.name}
          {selectedModel.supportsJson && (
            <span className="model-feature model-feature-json">JSON</span>
          )}
          {selectedModel.isFree && (
            <span className="model-feature model-feature-free">FREE</span>
          )}
        </div>
        <div className="model-dropdown-icon">{showDropdown ? '▲' : '▼'}</div>
      </div>

      {/* Selected model description */}
      {selectedModel.description && !showDropdown && (
        <div className="model-description">
          <span className="model-description-text">
            {truncateText(selectedModel.description, 120)}
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
              placeholder="Search models..."
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
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={showJsonOnly}
                      onChange={toggleJsonOnly}
                    />
                    <span>JSON support only</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Models list */}
          <div className="model-list">
            {isLoading ? (
              <div className="model-loading">Loading models...</div>
            ) : filteredModels.length === 0 ? (
              <div className="model-no-results">No models found</div>
            ) : (
              filteredModels.map(model => (
                <div
                  key={model.id}
                  className={`model-item ${selectedModel.id === model.id ? 'selected' : ''}`}
                >
                  <div
                    className="model-item-header"
                    onClick={() => selectModel(model)}
                  >
                    <div className="model-item-name">
                      <span className="provider-name">{model.provider}</span>
                      <span className="model-name">{model.name}</span>
                      <div className="model-badges">
                        {model.supportsJson && (
                          <span className="model-feature model-feature-json">
                            JSON
                          </span>
                        )}
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

export default ModelSelector;
