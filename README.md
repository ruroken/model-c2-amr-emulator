# Model C2 AMR Emulator API

Small public API for emulating Model C2 AMR billing usage telemetry.

## Endpoints

- `GET /` returns the current AMR usage JSON.
- `GET /usage` returns the same AMR usage JSON.
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
  "time_operating": 12463467.3,
  "time_operating_units": "s"
}
```

The emulator derives distance and operating time from the current clock, so values keep increasing over time and survive service restarts.

## Local Run

```bash
npm start
```

Then open:

```text
http://localhost:3000/usage
```

## Deploy On Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select the repository.
4. Render will read `render.yaml` and create the web service.
5. After deploy, use:

```text
https://YOUR-RENDER-SERVICE.onrender.com/usage
```

You can adjust the AMR identity and initial counters in the Render environment variables.
