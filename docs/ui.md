# Web Interface

ATS Checker includes a web-based demo for testing and demonstrating the library's capabilities. The interface runs entirely in your browser—no backend server needed.

## 🚀 Live Demo

The interactive demo is hosted on GitHub Pages:

- **URL**: `https://Pranavraut033.github.io/ats-checker/index.html`
- **Updates**: Automatically deployed when you push to `main`
- **Privacy**: 100% client-side processing—data never leaves your browser

## Starting Locally

To test the demo on your local machine:

```bash
npm run build      # Build library and copy to UI dist folder
```

Then choose one of these options:

**Using npx http-server (recommended):**

```bash
npx http-server ui/public -p 3005
```

**Using Python:**

```bash
cd ui/public && python3 -m http.server 3005
```

**Direct in browser:**
Open `ui/public/index.html` directly (works offline after build).

Visit `http://localhost:3005`

## Features

The interface provides:

- **Real-time Analysis** - Instant ATS scoring in your browser
- **Visual Breakdown** - Component scores for skills, experience, keywords, education
- **Keyword Insights** - Matched and missing keywords with color coding, plus a category breakdown (technical, tool, concept, soft, marketing, domain)
- **Achievement Strength** - Strong vs weak experience-bullet count, based on verb + quantified-impact detection
- **Language Requirements** - Required spoken languages (CEFR or fluency level) matched against the resume's stated proficiency
- **AI Suggestions** - Optional OpenAI-powered recommendations
- **Warnings** - Detection of ATS issues (keyword stuffing, missing sections, etc.)
- **Sample Data** - Pre-loaded examples for quick testing
- **Security** - Full transparency with open-source code

## Usage

1. **Enter Resume** - Paste your resume text, or click **Upload PDF** to extract it from a PDF file
2. **Enter Job Description** - Add the target job posting
3. **Load Samples** - Use sample buttons for quick testing
4. **Analyze** - Click "Analyze Resume" to see results
5. **Review Results** - Check score, breakdown, and recommendations
6. **(Optional) Enable LLM** - Add OpenAI API key for AI-powered suggestions

### PDF Upload

Click **Upload PDF** to load a resume directly from a `.pdf` file. Extraction runs in the browser via `pdfjs-dist` — no server involved.

- **Single-column and two-column layouts** are handled automatically. The extractor uses glyph x/y coordinates to detect column boundaries, so section headers in a two-column resume don't merge with sidebar content.
- **Scanned / image PDFs** have no text layer and will extract as near-empty. A warning surfaces in the results and a suggestion advises exporting as single-column PDF or pasting plain text instead.

## Results Display

### ATS Score

Overall compatibility score (0-100) with color-coded indicator:

- 🟢 **75+**: Strong match
- 🟡 **50-74**: Moderate match
- 🔴 **<50**: Needs improvement

### Component Breakdown

Individual scores for:

- **Skills** (30%) - Required and preferred skill coverage
- **Experience** (30%) - Years and role relevance
- **Keywords** (25%) - Job description keyword matches
- **Education** (15%) - Degree and certification matches

### Keywords

- **Matched** - Green tags for keywords found in both documents
- **Missing** - Red tags for important keywords to add
- **Overused** - Yellow tags for keywords appearing too frequently
- **By Category** - The same matched/missing keywords regrouped into technical, tool, concept, soft, marketing, and domain panels (categories with no keywords are hidden)

### Achievement Strength

A green/red bar showing the ratio of strong to weak experience bullets, where "strong" means a bullet pairs an impact verb (built, led, optimized, ...) with a quantified result (a number, `%`, `$`, or `k+`/`m+`).

### Language Requirements

Required languages (parsed from the JD as CEFR codes or words like "fluent"/"native") shown against what the resume states — green for met/exceeded, red for missing or below the required level.

### Suggestions

Actionable advice like:

- "Add 'React' to your skills section"
- "Include more JavaScript experience details"
- "Consider adding a summary section"
- "Replace "js" with "JavaScript" to match the job description's wording"
- "Strengthen "Worked with Node.js" — add scope/metrics, e.g. ..."
- "Mention your proficiency in: german (b2)"

AI-powered suggestions are enhanced when LLM is enabled.

### Warnings

Issues detected such as:

- Missing resume sections (Summary, Education, etc.)
- Potential keyword stuffing
- Formatting problems

## AI-Powered Suggestions (Optional)

Enable LLM enhancement for AI-generated suggestions:

1. Get a free OpenAI API key: https://platform.openai.com/api-keys
2. Enable "AI-Powered Suggestions" toggle in the UI
3. Paste your API key (password field for security)
4. Run analysis as normal

**Security Note:**

- Your data stays in your browser—API key is only used for OpenAI calls
- Use a test/development key with limited permissions
- Never share your production API key

## Technical Details

- **Architecture** - 100% client-side using ES modules
- **Styling** - Tailwind CSS via CDN
- **Build** - Static HTML + bundled library (dist/index.mjs)
- **Deployment** - GitHub Pages (automatic on push)
- **Performance** - Sub-second analysis for typical resumes
- **Dependencies** - Zero at runtime (library is deterministic)

## Deployment

The UI deploys automatically when you push to `main`:

```bash
npm run build      # Builds library and copies to ui/public/dist/
git push origin main
```

GitHub Actions workflow:

1. Builds the library (`tsup`)
2. Copies UI files and library to `pages/` directory
3. Deploys to GitHub Pages
4. Available at your repository's GitHub Pages URL
