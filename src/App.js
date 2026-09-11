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
      </header>

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
