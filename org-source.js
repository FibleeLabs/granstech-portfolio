/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GransTech  —  Organisation Chart  |  Data Source Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  HOW TO USE GOOGLE SHEETS (RECOMMENDED FOR EASY SHARING & LIVE EDITS):
 *  ─────────────────────────────────────────────────────────────────────
 *  1. Create a new sheet at https://sheets.google.com
 *  2. Go to File → Import → Upload → select "org-hierarchy.csv" (from this project folder)
 *  3. Click "Share" (top right) → Change General access to:
 *     "Anyone with the link can view"
 *  4. Copy the link from your browser or click "Copy link", and paste it below:
 *
 *     const ORG_DATA_SOURCE = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?usp=sharing';
 *
 *  That's it!
 *  - Anyone you invite can edit names, roles, reporting hierarchy, and photo URLs in Google Sheets.
 *  - The website detects changes and updates live in the background without refreshing!
 *  - Clients browsing the portfolio never see any controls or Google branding.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ← PASTE YOUR GOOGLE SHEET LINK HERE (or keep './org-hierarchy.csv' / './org-hierarchy.xlsx' for local testing):
const ORG_DATA_SOURCE = 'https://docs.google.com/spreadsheets/d/1xeiqNQjP07x9qkSk1vGsHFAkofavmlk-YznFOp17K8w/edit?usp=sharing';

// ← Live auto-sync interval in seconds (e.g. 30 = re-check every 30 seconds):
const ORG_REFRESH_INTERVAL = 30;
