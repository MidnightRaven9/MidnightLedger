# 🌙 MidnightLedger

Dark-mode budget app for paycheck-to-paycheck planning. Built for split bills, irregular paydays, and tax estimates.

### Live Demo
→ Add your Vercel link here after deploy

---

### Features

- **Flexible Pay Periods** - Biweekly, semi-monthly, or custom dates (Aug 15, Aug 29, Sep 12...)
- **Split Bills** - Assign bills to specific paychecks, split between people (my portion vs total)
- **Tax Estimates** - Quick estimate on checks before they hit
- **Paycheck Allocation** - See available after bills: `$1,450 available • 3 bills assigned`
- **Expenses & Reports** - Track spending per paycheck cycle
- **History** - Past paycheck allocations
- **Local-First** - All data in localStorage, no account needed
- **OLED Dark Theme** - True black #0A0A0A with purple #7C3AED accents, PWA installs as "MidnightLedger"

### Screenshots

| Dash | Bills |
|------|-------|
| Paycheck cards with month badge (AUG 15) | Split bills by paycheck |

### Tech Stack

- React + TypeScript
- Tailwind CSS + shadcn/ui
- Vite
- PWA-ready

### Getting Started

```bash
git clone https://github.com/MidnightRaven9/midnight-ledger.git
cd midnight-ledger
npm install
npm run dev
```

### App Icon

Horizontal gradient fill — purple #7C3AED → #A78BFA on black rounded square with ledger lines.
Files: `/public/icon-512.png`, `/public/icon-192.png`, `/public/apple-touch-icon.png`, `/public/favicon.png`

Manifest sets name to `MidnightLedger` so it installs with correct name and icon on iOS/Android.

### Roadmap

- [x] Dropdown for paycheck bill details
- [x] Month abbreviation badge (AUG 15 not 8/15) - fixes confusion
- [x] WebToApp clipping fix for History cards
- [ ] Recurring expenses
- [ ] CSV bank import
- [ ] Cloud sync toggle

### License

MIT © 2026 Justice Graff

Built in Bismarck, ND
