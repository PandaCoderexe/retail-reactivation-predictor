import type { ChangeEvent, RefObject } from "react";
import type { DataType, PredictionMode } from "../types";

type ComposerProps = {
  mode: PredictionMode;
  dataType: DataType;
  inputText: string;
  isSending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAddFile: () => void;
  onModeChange: (mode: PredictionMode) => void;
  onDataTypeChange: (dataType: DataType) => void;
  onInputTextChange: (value: string) => void;
  onClearInput: () => void;
  onSubmit: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function Composer({
  mode,
  dataType,
  inputText,
  isSending,
  fileInputRef,
  onAddFile,
  onModeChange,
  onDataTypeChange,
  onInputTextChange,
  onClearInput,
  onSubmit,
  onFileChange,
}: ComposerProps) {
  return (
    <section className="composer">
      <div className="composer-toolbar">
        <button className="plus-button" type="button" title="Add JSON or CSV file" onClick={onAddFile}>
          +
        </button>
        <div className="segmented-control" aria-label="Prediction type">
          <button
            className={mode === "single" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("single")}
          >
            Single
          </button>
          <button
            className={mode === "batch" ? "active" : ""}
            type="button"
            onClick={() => onModeChange("batch")}
          >
            Batch
          </button>
        </div>
        <div className="segmented-control" aria-label="Data type">
          <button
            className={dataType === "json" ? "active" : ""}
            type="button"
            onClick={() => onDataTypeChange("json")}
          >
            JSON
          </button>
          <button
            className={dataType === "csv" ? "active" : ""}
            type="button"
            onClick={() => onDataTypeChange("csv")}
          >
            CSV
          </button>
        </div>
        <span className="service-note">Thank you for choosing our service.</span>
      </div>

      <textarea
        value={inputText}
        onChange={(event) => onInputTextChange(event.target.value)}
        spellCheck={false}
        aria-label="Prediction input"
      />

      <div className="composer-footer">
        <span>Drag a .json or .csv file anywhere into the chat area.</span>
        <div className="composer-actions">
          <button
            className="clear-button"
            type="button"
            onClick={onClearInput}
            title="Delete everything from the data input field"
          >
            Clear data
          </button>
          <button type="button" onClick={onSubmit} disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,text/csv,.json,.csv"
        onChange={onFileChange}
        hidden
      />
    </section>
  );
}
