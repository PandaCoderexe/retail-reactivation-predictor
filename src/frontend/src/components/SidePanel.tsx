import type { ModelOption } from "../types";

type SidePanelProps = {
  selectedModel: ModelOption;
};

export function SidePanel({ selectedModel }: SidePanelProps) {
  return (
    <aside className="side-panel">
      <div className="brand-block">
        <div className="brand-mark">R</div>
        <div>
          <h1>Retail Predictor</h1>
          <p>Customer reactivation assistant</p>
        </div>
      </div>

      <section className="terms-section">
        <h2>
          <a className="terms-link" href="/terms.html" target="_blank" rel="noreferrer">
            Terms of Service
          </a>
        </h2>
        <p>
          Predictions are generated from transaction data and should support, not replace,
          business judgment.
        </p>
        <p>Models can make mistakes. Their predictions may not always be correct or complete.</p>
        <p>
          Only upload data you are allowed to process. Uploaded JSON is sent to the local Node
          backend for prediction.
        </p>
      </section>

      <section className="status-section">
        <span>Model</span>
        <strong>{selectedModel.name}</strong>
      </section>
    </aside>
  );
}
