# ATS Checker UI

A minimal web-based UI for the ATS Checker library. Analyze resume compatibility with job descriptions in real-time with visual feedback and detailed insights.

## Features

- **Real-time Analysis**: Instant ATS compatibility scoring
- **Visual Breakdown**: Component-wise scoring (Skills, Experience, Keywords, Education)
- **Keyword Matching**: See exactly which keywords match and which are missing
- **Actionable Suggestions**: Get specific recommendations to improve ATS score
- **Warnings**: Understand issues like missing sections or keyword stuffing
- **Sample Data**: Quick-load sample resume and job description
- **LLM Integration**: Optional LLM enhancement for suggestions (experimental)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd packages/ats-checker
npm install
```

### Running the UI

```bash
npm run dev
```

The UI will be available at `http://localhost:3000`

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

### Breakdown
Each component scored independently, showing your strength in different areas.

### Matched Keywords
Keywords from the job description that appear in your resume.

### Missing Keywords
Job-relevant keywords not found in your resume - great focus areas for improvement.

### Suggestions
Specific, actionable recommendations based on analysis gaps.

### Warnings
Issues detected like:
- Missing critical sections (Summary, Experience, Skills, Education)
- Keyword stuffing (overuse of keywords)
- Table-like formatting (ATS-unfriendly)

### Overused Keywords
Keywords appearing more frequently than recommended (may hurt ATS parsing).

## LLM Enhancement (Experimental)

The UI supports optional LLM enhancement for suggestions:

1. Enable "LLM Enhancement" checkbox
2. Provide your API key
3. LLM will refine and enhance the suggestions

Note: This requires backend configuration with an LLM client. Currently, it's a placeholder for future integration.

## Architecture

- **Frontend**: Vanilla JavaScript with modern CSS Grid and Flexbox
- **Backend**: Express.js server
- **Core**: Uses the ats-checker library directly

```
ui/
├── server.ts           # Express server with API endpoints
├── public/
│   └── index.html      # Full UI (HTML + CSS + JS)
└── README.md
```

## API Endpoints

### POST /api/analyze
Analyzes a resume against a job description.

**Request:**
```json
{
  "resume": "Resume text...",
  "jobDescription": "Job description text...",
  "useLLM": false,
  "apiKey": "optional-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "breakdown": {
      "skills": 90,
      "experience": 80,
      "keywords": 85,
      "education": 95
    },
    "matchedKeywords": ["react", "typescript", "node.js", ...],
    "missingKeywords": ["kubernetes", "graphql", ...],
    "suggestions": [...],
    "warnings": [...]
  }
}
```

### GET /api/health
Health check endpoint.

## Customization

### Change Port
Edit `server.ts` and modify the `PORT` constant.

### Styling
All CSS is embedded in `index.html`. Modify the `<style>` section to customize colors and layout.

### Sample Data
Update the `loadSampleResume()` and `loadSampleJD()` functions to change defaults.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Mobile responsive

## Future Enhancements

- [ ] File upload for resume/JD
- [ ] PDF support
- [ ] Historical analysis tracking
- [ ] Export results as PDF
- [ ] Multiple profile support (Data Scientist, Product Manager, etc.)
- [ ] Real LLM integration with multiple providers
- [ ] Dark mode
- [ ] Syntax highlighting for better readability

## License

MIT

## Support

For issues or questions about the ATS Checker library, visit the [main repository](https://github.com/Pranavraut033/resume-builder).
