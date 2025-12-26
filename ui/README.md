# ATS Checker UI

A lightweight, client-side web interface for the ATS Checker library. Analyze resume compatibility with job descriptions in real-time with visual feedback and detailed insights. 100% runs in your browser—no backend needed.

## Features

- **100% Client-Side**: All analysis runs in your browser (no server required)
- **Real-time Analysis**: Instant ATS compatibility scoring  
- **Visual Breakdown**: Component-wise scoring (Skills, Experience, Keywords, Education)
- **Keyword Matching**: See exactly which keywords match and which are missing
- **Actionable Suggestions**: Get specific recommendations to improve ATS score
- **AI-Powered Suggestions**: Optional OpenAI integration for enhanced recommendations
- **Warnings**: Understand issues like missing sections or keyword stuffing
- **Sample Data**: Quick-load sample resume and job description
- **Security**: All data stays on your device—open-source transparency

## Quick Start

### Prerequisites
- Node.js 18+ (for building)
- Any modern browser

### Installation

```bash
cd packages/ats-checker
npm install
npm run build      # Builds library and copies to ui/public/dist/
```

### Running Locally

**Option 1: Using npx (recommended)**
```bash
npx http-server ui/public -p 3005
```

**Option 2: Using Python**
```bash
cd ui/public
python3 -m http.server 3005
```

**Option 3: Direct browser**
Simply open `ui/public/index.html` directly in your browser (works offline).

The UI will be available at `http://localhost:3005`

## Live Demo

The demo is automatically deployed to GitHub Pages:
- **Live URL**: https://Pranavraut033.github.io/ats-checker/

## Usage

1. **Paste Resume**: Copy your resume text into the resume field
2. **Paste Job Description**: Add the target job description
3. **Load Samples**: Use the "Load Sample" buttons to see example data
4. **Analyze**: Click "Analyze Resume" to get results
5. **Review Results**: See your ATS score, breakdown, matched/missing keywords, and suggestions

## Results Explained

### ATS Score (0-100)
Overall compatibility score based on weighted components:
- **Skills Match** (30%): Coverage of required and preferred skills
- **Experience** (30%): Years of experience and relevant role titles
- **Keywords** (25%): Job description keyword matches
- **Education** (15%): Education requirement match

### Component Breakdown
Each component scored independently, showing your strength in different areas.

### Matched Keywords
Keywords from the job description that appear in your resume (green tags).

### Missing Keywords
Job-relevant keywords not found in your resume - focus areas for improvement (red tags).

### Suggestions
Specific, actionable recommendations based on analysis gaps.
- Without LLM: Rule-based deterministic suggestions
- With LLM: AI-enhanced suggestions using OpenAI (optional)

### Warnings
Issues detected like:
- Missing critical sections (Summary, Experience, Skills, Education)
- Keyword stuffing (overuse of keywords)
- ATS-unfriendly formatting

### Overused Keywords
Keywords appearing more frequently than recommended (yellow tags).

## AI-Powered Suggestions (Optional)

Enable LLM enhancement for smarter suggestions:

1. Enable "AI-Powered Suggestions" toggle
2. Get a free OpenAI API key: https://platform.openai.com/api-keys
3. Paste your API key (password field for security)
4. Run analysis - suggestions will be enhanced by AI

**Security**: Your data stays in your browser. API key only used for OpenAI calls.

## Architecture

```
ui/
├── public/
│   ├── index.html      # Full app (HTML + CSS + JS)
│   └── dist/
│       └── index.mjs   # Bundled ATS Checker library (auto-generated)
└── README.md
```

- **Frontend**: Vanilla HTML/CSS/JavaScript with Tailwind CSS (CDN)
- **Core**: Uses the ATS Checker library as ES module
- **Build**: Static site—no backend or build step needed (except npm run build)
- **Deploy**: Works on any static host (GitHub Pages, Netlify, Vercel, etc.)

## Customization

### Styling
Uses Tailwind CSS via CDN. Modify the `<style>` section in `index.html` to customize the spinner animation. Update Tailwind classes directly in HTML for styling changes.

### Sample Data
Edit the `loadSampleResume()` and `loadSampleJD()` functions in the `<script>` section to change sample data.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Mobile responsive
- Works offline (after initial load)

## Development

### Local Build
```bash
npm run build      # Builds library + copies to ui/public/dist/
```

### Deployment
Push to `main` branch → GitHub Actions automatically deploys to GitHub Pages.

## Future Enhancements

- [ ] File upload for resume/JD  
- [ ] PDF support
- [ ] Historical analysis tracking
- [ ] Export results as PDF
- [ ] Multiple profile support (Data Scientist, Product Manager, etc.)
- [ ] Dark mode
- [ ] Syntax highlighting

## License

MIT

## Support

For issues or questions, visit the [main repository](https://github.com/Pranavraut033/ats-checker).
