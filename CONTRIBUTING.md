# Contributing

Thanks for your interest in MidnightLedger.

## Getting set up

Requires Node.js 20 or newer.

```bash
git clone https://github.com/MidnightRaven9/MidnightLedger.git
cd MidnightLedger
npm install
npm run dev
```

The development server runs at `http://127.0.0.1:3000`. Before opening a pull
request, run:

```bash
npm run lint
npm run build
```

## Making a change

1. Fork the repository and create a branch: `git checkout -b feature/short-description`
2. Make your change with focused commits.
3. Push the branch and open a pull request.

Keep pull requests small and describe what changed and why. Link any related
issue in the description.

## Reporting bugs and requesting features

Use the [bug report](https://github.com/MidnightRaven9/MidnightLedger/issues/new?template=bug_report.md)
or [feature request](https://github.com/MidnightRaven9/MidnightLedger/issues/new?template=feature_request.md)
template. Include your device or browser, reproduction steps, and a screenshot
where useful.

Security issues must be reported privately — see [SECURITY.md](SECURITY.md).

## Code style

- React 19 with TypeScript; keep components small and typed.
- The interface uses near-black `#101012` surfaces and a `#a855f7` accent.
- The app must stay offline: do not add network calls, analytics or remote assets.
- Keep "why" comments where logic is non-obvious; avoid comments that restate code.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
