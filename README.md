# Fractal Bootcamp Website

A clean, modern landing page for Fractal Bootcamp's AI Engineering program.

## Quick Start - Push to GitHub

1. **Create a new repo on GitHub:**
   - Go to https://github.com/new
   - Name it something like `fractal-bootcamp` or `fractal-tech-site`
   - Make it **public** (required for GitHub Pages)
   - Don't initialize with README, .gitignore, or license

2. **Initialize and push from your terminal:**

```bash
# Navigate to this directory
cd fractal-bootcamp

# Initialize git repo
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit: Fractal Bootcamp landing page"

# Add your GitHub repo as remote (replace YOUR-USERNAME and YOUR-REPO)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Push to GitHub
git push -u origin main
```

If you get an error about 'main' not existing, use:
```bash
git branch -M main
git push -u origin main
```

3. **Enable GitHub Pages:**
   - Go to your repo on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

## What's Included

- ✅ Fully responsive single-page design
- ✅ Hero section with CTAs
- ✅ Stats display
- ✅ Partner logos
- ✅ Cohort information
- ✅ Feature highlights
- ✅ Testimonials
- ✅ FAQ section
- ✅ Footer with links

## Tech Stack

- Pure HTML + CSS (no build step required)
- Embedded styles for easy deployment
- Mobile-responsive design

## Customization

All content and styling is in `index.html`. To customize:

1. Update text content in the HTML
2. Modify CSS variables in the `:root` section for colors
3. Adjust section content as needed

## Notes

- The linked pages (outcomes.html, team.html, etc.) are referenced but not included
- Add those pages as needed following the same design system
- Consider adding images/photos for testimonials and team

## Questions?

Reach out to the Fractal Tech team for updates or changes.
