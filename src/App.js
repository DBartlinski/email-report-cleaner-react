import React, { useState } from "react";
import Papa from "papaparse";
import { buildEmailRecord, buildMarkdown } from "./emailProcessor";
import "./App.css";

function App() {
  const [files, setFiles] = useState([]);
  const [startDate, setStartDate] = useState("2025-10-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError(null);
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFiles(Array.from(e.dataTransfer.files));
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateCSV = (headers) => {
    const required = new Set(["Subject", "Body"]);
    const missing = [...required].filter(h => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`Missing required column(s): ${missing.join(", ")}`);
    }
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    setError(null);
    setResults(null);

    if (files.length === 0) {
      setError("Choose at least one Outlook CSV file.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Choose both a start date and an end date.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      setError("The start date must be on or before the end date.");
      return;
    }

    setLoading(true);

    try {
      const allRecords = [];

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".csv")) {
          throw new Error(`${file.name} is not a CSV file.`);
        }

        const text = await file.text();
        const papa = Papa.parse(text, { header: true, skipEmptyLines: true });

        if (papa.errors && papa.errors.length > 0) {
          throw new Error(`A CSV could not be read: ${papa.errors[0].message}`);
        }

        const headers = Object.keys(papa.data[0] || {});
        validateCSV(headers);

        for (const row of papa.data) {
          const record = buildEmailRecord(row);
          allRecords.push(record);
        }
      }

      const { markdown, stats } = buildMarkdown(allRecords, start, end, false);
      const filename = `emails_organized_${startDate}_to_${endDate}.md`;

      setResults({
        markdown,
        stats,
        filename,
        sourceFiles: files.length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!results) return;
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/markdown;charset=utf-8," + encodeURIComponent(results.markdown)
    );
    element.setAttribute("download", results.filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">ER</div>
        <div>
          <h1>Email Report Cleaner</h1>
          <p>Outlook CSV to review-ready Markdown</p>
        </div>
        <span className="local-status">
          <span>✓</span>Browser only
        </span>
        <button
          type="button"
          className="help-button"
          onClick={() => setShowHelp(true)}
        >
          How to export from Outlook
        </button>
      </header>

      {showHelp && (
        <div
          className="modal-backdrop"
          onClick={() => setShowHelp(false)}
          role="presentation"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-help-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="export-help-heading">Export your Outlook inbox to CSV</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowHelp(false)}
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <h3>Outlook desktop app (Windows)</h3>
              <ol>
                <li>Select the folder you want to export (for example, your Inbox).</li>
                <li>Go to <strong>File &gt; Open &amp; Export &gt; Import/Export</strong>.</li>
                <li>Choose <strong>Export to a file</strong>, then click <strong>Next</strong>.</li>
                <li>Select <strong>Comma Separated Values</strong>, then click <strong>Next</strong>.</li>
                <li>Pick the folder to export (Inbox or a subfolder) and click <strong>Next</strong>.</li>
                <li>Choose a save location and file name ending in <strong>.csv</strong>, then click <strong>Next</strong>.</li>
                <li>Click <strong>Finish</strong> to create the CSV file.</li>
              </ol>

              <h3>Outlook on the web (OWA)</h3>
              <p>
                Outlook on the web does not offer a built-in CSV export. Use the desktop
                app above, or open a mailbox rule/export add-in, or forward messages to
                a PST and convert with the desktop client.
              </p>

              <h3>Column requirements for this tool</h3>
              <p>
                The exported CSV must include at least <strong>Subject</strong> and{" "}
                <strong>Body</strong> columns. Exports that also include a{" "}
                <strong>ReceivedTime</strong> column will be sorted and dated more
                accurately; otherwise dates are parsed from "Sent:" text inside the
                message body.
              </p>

              <h3>Tip</h3>
              <p>
                For large mailboxes, export in smaller date-range batches (for example,
                one CSV per month) &mdash; you can upload multiple files at once in this
                tool and they will be merged automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      <main>
        <section className="workspace">
          <div className="section-heading">
            <div>
              <p className="eyebrow">New conversion</p>
              <h2>Build a clean email archive</h2>
            </div>
            <p className="privacy-note">
              Files are processed in your browser and never leave your device.
            </p>
          </div>

          <form onSubmit={handleConvert}>
            <label
              className="drop-zone"
              onDrop={handleDropZone}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={handleFileChange}
                required
              />
              <span className="upload-symbol">↑</span>
              <strong>Drop Outlook CSV files here</strong>
              <span>or choose files from your computer</span>
              <small>
                Standard Outlook exports and ReceivedTime-enhanced exports are supported
              </small>
            </label>

            <div className="file-list">
              {files.length > 0 && (
                <ul>
                  {files.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="controls-band">
              <label>
                <span>Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label>
                <span>End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? "Converting..." : "Clean and convert"}
              </button>
            </div>

            <details className="cleanup-details">
              <summary>Cleanup applied</summary>
              <ul>
                <li>Email addresses and Exchange routing IDs are redacted</li>
                <li>SafeLink tracking, known signatures, and excess spacing are removed</li>
                <li>
                  Quoted reply history is omitted while each message's new content is retained
                </li>
                <li>Undated and out-of-range messages are excluded and counted</li>
              </ul>
            </details>
          </form>
        </section>

        {results && (
          <section className="results">
            <div className="section-heading result-heading">
              <div>
                <p className="eyebrow">Conversion complete</p>
                <h2>Your archive is ready</h2>
              </div>
              <button className="download-button" onClick={handleDownload}>
                Download Markdown
              </button>
            </div>

            <div className="stats">
              <div>
                <strong>{results.stats.included}</strong>
                <span>Included</span>
              </div>
              <div>
                <strong>{results.stats.undated}</strong>
                <span>Undated excluded</span>
              </div>
              <div>
                <strong>{results.stats.out_of_range}</strong>
                <span>Outside range</span>
              </div>
              <div>
                <strong>{results.sourceFiles}</strong>
                <span>Source files</span>
              </div>
            </div>

            <div className="preview-header">
              <h3>Markdown preview</h3>
              <span>{results.filename}</span>
            </div>
            <pre>{results.markdown.substring(0, 2000)}...</pre>
          </section>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </main>

      <footer>Runs in your browser. No data leaves this device.</footer>
    </div>
  );
}

export default App;
