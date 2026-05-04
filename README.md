# Check-it

Check-it is a small single-page web app that reminds you to check your posture during a daily work window. It runs in the browser, uses [React](https://react.dev/) for the UI, and [Vite](https://vite.dev/) only as the development server and build tool (no React Router, Redux, or other app frameworks).

Repository: [https://github.com/BrentonJScott/check-it](https://github.com/BrentonJScott/check-it)

## Features

- **Daily window**: Set a start time and end time (for example 8:00 to 16:00). Reminders only run inside that window each day.
- **Interval from when you start**: When you press **Start reminders** inside the window, the first reminder fires after one full interval from that moment (not aligned to the clock). Later reminders repeat every interval until the end of the window.
- **Next day**: After the window ends, reminders pause. When the next day’s window begins, scheduling picks up again automatically (as long as reminders are still running and the tab stays open).
- **Countdown**: Shows time until the next reminder while the schedule is active.
- **Browser notifications**: Optional permission-based notifications when a reminder fires.
- **Acknowledgment dialog**: When a reminder fires, a modal blocks the page until you dismiss it. An alert sound repeats until you acknowledge.
- **Posture videos**: Each reminder advances to a different short embedded clip (playback does not start automatically; you press play on the video).

## Requirements

- [Node.js](https://nodejs.org/) (current LTS is a good choice)
- npm (comes with Node)

## Getting started

Clone the repository, install dependencies, and start the dev server:

```bash
git clone https://github.com/BrentonJScott/check-it.git
cd check-it
npm install
npm run start
```

Then open the URL Vite prints (usually [http://localhost:5173/](http://localhost:5173/)).

## Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the Vite dev server with hot reload. |
| `npm run build` | Produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally for a quick smoke test. |

## Project layout

- `index.html` — HTML shell and root mount point.
- `src/main.jsx` — React entry (renders `App`).
- `src/App.jsx` — Reminder logic, notifications, dialog, and video rotation.
- `src/styles.css` — App styles.

## Browser notes

- **Notifications** require permission and generally need a secure context (HTTPS or localhost).
- **Audio** for the repeating alert may require a user gesture in some browsers; interacting with the page (for example starting reminders) usually satisfies that.

## License

ISC (see `package.json`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes and report issues.
