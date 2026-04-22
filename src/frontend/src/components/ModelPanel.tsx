import type { ModelKey, ModelOption } from "../types";

type ModelPanelProps = {
  modelOptions: ModelOption[];
  selectedModel: ModelKey;
  onClose: () => void;
  onSelectModel: (model: ModelKey) => void;
};

export function ModelPanel({ modelOptions, selectedModel, onClose, onSelectModel }: ModelPanelProps) {
  return (
    <div className="model-panel-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="model-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="model-panel-header">
          <div>
            <h2>Choose Model</h2>
            <p>Select the model used for the next prediction request.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="model-list">
          {modelOptions.map((modelOption) => (
            <button
              className={`model-option ${selectedModel === modelOption.key ? "selected" : ""}`}
              key={modelOption.key}
              type="button"
              onClick={() => onSelectModel(modelOption.key)}
            >
              <span>{modelOption.name}</span>
              <small>{modelOption.description}</small>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
