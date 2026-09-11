# Email Report Cleaner — React Edition

Convert Outlook CSV exports to clean, review-ready Markdown files. **100% browser-based, no server required.**

## Features

- ✅ **Runs entirely in your browser** — Files processed locally, never uploaded
- ✅ **Instant conversion** — No server, no delays
- ✅ **Same powerful cleanup** — Email redaction, signature removal, quoted history stripping
- ✅ **Deploy to GitHub Pages** — Free hosting, automatic updates

## Usage

### Online Version (GitHub Pages)
Visit: **[email-report-cleaner-react.dbartlinski.com](https://DBartlinski.github.io/email-report-cleaner-react)**

1. Upload your Outlook CSV file(s)
2. Set date range
3. Click "Clean and convert"
4. Download the Markdown file

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## What Gets Cleaned

- ✂️ Email addresses redacted to `[redacted-email]`
- ✂️ Exchange routing IDs removed
- ✂️ SafeLink tracking URLs stripped
- ✂️ Known signatures/disclaimers removed
- ✂️ Quoted reply history omitted (new content preserved)
- ✂️ Excess whitespace normalized
- ✂️ Out-of-range and undated messages excluded

## Exporting from Outlook

1. Open Outlook
2. Select folder to export
3. **File** → **Open & Export** → **Import/Export**
4. Choose **Export to a file** → **Comma Separated Values (.csv)**
5. Save the file
6. Upload to this tool

## Technology

- **Framework:** React 18
- **CSV Parsing:** PapaParse
- **Deployment:** GitHub Pages + gh-pages

## Project Structure

```
src/
├── App.js              # Main React component
├── App.css             # Styling (matches Flask version)
├── emailProcessor.js   # Core email processing logic
├── index.js            # Entry point
public/
├── index.html          # HTML template
package.json            # Dependencies & scripts
```

## GitHub Pages Setup

This repo is configured to deploy to GitHub Pages automatically.

**To deploy your own fork:**

1. Fork this repository
2. Update `"homepage"` in `package.json`:
   ```json
   "homepage": "https://YOUR-USERNAME.github.io/email-report-cleaner-react"
   ```
3. Create a GitHub Personal Access Token:
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Scopes: `repo` + `workflows`
4. Add the token as a secret in your repo:
   - Repo Settings → Secrets and variables → Actions
   - Create `GITHUB_TOKEN` with your access token value
5. Push to `main` branch
6. GitHub Actions will automatically build and deploy

Your app will be live at: `https://YOUR-USERNAME.github.io/email-report-cleaner-react`

## Privacy

✅ **100% Local Processing** — Files are processed entirely in your browser. No data is uploaded to any server.

## Differences from Flask Version

| Feature | Flask (Python) | React (Browser) |
|---------|----------------|-----------------|
| Deployment | Render.com (requires server) | GitHub Pages (free, serverless) |
| Processing | Python backend | JavaScript |
| Installation | Python + pip required | Works in any browser |
| Cost | Free tier available | Always free |
| Speed | Slight server latency | Instant local processing |

Both versions clean your emails the same way. Use Flask if you want a powerful local app. Use React for instant browser-based processing.

## License

MIT — Feel free to use and modify.

## Support

Issues? Questions? Create an issue on GitHub.

---

**Related:** See the [Flask version](https://github.com/DBartlinski/email-report-cleaner) for a local desktop app.
