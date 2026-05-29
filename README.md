# Model C2 AMR Emulator API

Small public API for emulating Model C2 AMR billing usage telemetry.

## Endpoints

- `GET /` returns service links.
- `GET /amrs` returns available AMRs.
- `GET /amrs/:amr_id/usage` returns usage JSON for one AMR.
- `GET /health` returns a simple health response.

Example:

```json
{
  "amr_id": "C2M-000409",
  "amr_mac": "9c:b8:b4:5d:ee:ba",
  "amr_name": "Hammer",
  "distance_traveled": 23460,
  "distance_units": "m",
  "generated_at": "2026-05-11T15:00:44.959Z",
  "schema_version": "billing_usage_v1",
  "status": "navigating",
  "time_operating": 12463467.3,
  "time_operating_units": "s"
}
```

The emulator derives state from the current clock, so values survive service restarts. Each AMR follows a deterministic timeline with:

- `navigating`: distance and operating time increase.
- `idle`: operating time increases, distance pauses.
- `charging`: distance and operating time pause.

Navigation bursts last 15 seconds to 5 minutes, followed by an idle window. Charging happens every 12 to 16 hours and takes 2 to 3 hours. Idle windows are random-looking and range from 30 seconds to 15 minutes.

## Local Run

```bash
npm start
```

Then open:

```text
http://localhost:3000/amrs/C2M-000409/usage
```

## Deploy On Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select the repository.
4. Render will read `render.yaml` and create the web service.
5. After deploy, use:

```text
https://YOUR-RENDER-SERVICE.onrender.com/amrs/C2M-000409/usage
```

You can adjust simulation timing in Render environment variables. AMR identities and starting counters are defined in `src/simulator.js`.
