# Web Interface

ats-checker includes a web-based interface for testing and demonstrating the library's capabilities.

## Starting the UI

```bash
npm run dev
```

Opens at `http://localhost:3000`

## Features

The interface provides:

- **Real-time Analysis** - Instant scoring as you type
- **Visual Breakdown** - Component scores for skills, experience, keywords, education
- **Keyword Insights** - Matched and missing keywords with color coding
- **Suggestions** - Specific recommendations for improvement
- **Warnings** - Detection of formatting issues and ATS problems
- **Sample Data** - Pre-loaded examples for testing
- **LLM Toggle** - Optional AI enhancement for suggestions

## Usage

1. **Enter Resume** - Paste your resume text in the left panel
2. **Enter Job Description** - Add the target job posting in the right panel
3. **Load Samples** - Use the sample buttons for quick testing
4. **Analyze** - Click "Analyze Resume" to see results
5. **Review Results** - Check score, breakdown, and recommendations

## Results Display

### ATS Score
Overall compatibility score (0-100) prominently displayed.

### Component Breakdown
Individual scores for:
- **Skills** (30%) - Required and preferred skill coverage
- **Experience** (30%) - Years and role relevance
- **Keywords** (25%) - Job description keyword matches
- **Education** (15%) - Degree and certification matches

### Keywords
- **Matched** - Green tags for keywords found in both documents
- **Missing** - Red tags for important keywords not in resume
- **Overused** - Keywords that appear too frequently

### Suggestions
Actionable advice like:
- "Add 'React' to your skills section"
- "Include more JavaScript experience details"
- "Consider adding a summary section"

### Warnings
Issues detected such as:
- Missing resume sections
- Potential keyword stuffing
- Formatting problems

## API Endpoint

The UI exposes a REST API for programmatic use:

```javascript
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    resume: 'Your resume text',
    jobDescription: 'Job posting text',
    useLLM: false  // optional LLM enhancement
  })
});

const result = await response.json();
console.log(result.data.score);
```

## Technical Details

- **Frontend** - Vanilla HTML/CSS/JavaScript, no frameworks
- **Backend** - Express server with TypeScript
- **Styling** - Responsive design with purple gradient theme
- **Performance** - Sub-second analysis for typical resumes
- **Dependencies** - Only Express for the server

## Use Cases

- **Testing** - Verify library behavior with different inputs
- **Demos** - Showcase ATS analysis capabilities
- **Learning** - Understand how ATS systems work
- **Development** - Debug and iterate on resume optimization