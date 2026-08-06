# MidnightLedger

Dark-mode paycheck budget app for different pay period. Built because most budget apps can't handle split bills.

## What it does

- Tracks payaychecks with estimates
- Split bills: shows your share + full total. Ex: Electric $95.50 of $191 split 2 ways
- Tax estimate: enter gross + tax % and it calculates net. My rate is 10.71% from my stub ($671.56 gross - $71.91 tax = $599.65 net)
- Toggle: My Share vs Full Totals
- Bills due per paycheck, left over calc, expense tracker, history, reports
- Saves automatically with localStorage. Export JSON backup. Works offline.

## Tech

React + TypeScript + Tailwind + Vite. No backend, no login, all local.

## Run it

npm install
npm run dev

## Privacy

No tracking. All data stays on your device in localStorage. Factory reset in settings wipes it.

Built by paychecks for my own budget.
MIT License.
