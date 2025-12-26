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
- **Keyword Insights** - Matched and missing keywords with color coding
- **AI Suggestions** - Optional OpenAI-powered recommendations
- **Warnings** - Detection of ATS issues (keyword stuffing, missing sections, etc.)
- **Sample Data** - Pre-loaded examples for quick testing
- **Security** - Full transparency with open-source code

## Usage

1. **Enter Resume** - Paste your resume text
2. **Enter Job Description** - Add the target job posting
3. **Load Samples** - Use sample buttons for quick testing
4. **Analyze** - Click "Analyze Resume" to see results
5. **Review Results** - Check score, breakdown, and recommendations
6. **(Optional) Enable LLM** - Add OpenAI API key for AI-powered suggestions

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

### Suggestions
Actionable advice like:
- "Add 'React' to your skills section"
- "Include more JavaScript experience details"
- "Consider adding a summary section"

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