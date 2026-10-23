# Smart Traffic Controller System

B.Tech mini-project prototype for direction-wise adaptive traffic control.

## Run locally

Extract the ZIP, open CMD in the project folder, then run:

```bash
npm install
npm start
```

Open `http://localhost:5173`.

## Pages

1. **Control Centre** — the supplied city image is used full-screen. The supplied road/car video is inside a bordered rectangular frame and small vehicles move along the bottom.
2. **Traffic History** — the supplied road/traffic image is the background. Successful detections are stored locally with time, road, direction, vehicle count, lane count and source.
3. **Live Detection** — four direction-wise Road A/B/C/D portals. Each portal supports live camera, video upload and photo upload, with 2/3/4 lane selection. Vehicle counts feed the adaptive signal panel showing current opening lane, next opening lane and signal duration. A moving 4-road prototype runs below.

## Vehicle detection

The browser uses TensorFlow.js + COCO-SSD loaded from jsDelivr. It detects common road vehicles: **car, bus, truck and motorcycle**. Uploaded photos are analyzed once; uploaded videos and live camera feeds are sampled repeatedly. Detection boxes, confidence and counts are shown on the road portal.

An internet connection is required in the browser when the TensorFlow.js/COCO-SSD model is first loaded. The project itself has no runtime npm dependency, so `npm install` is simple and Render can run it with the included Node server.

## Render

`render.yaml` is included.

- Build command: `npm install`
- Start command: `npm start`
- Runtime: Node
- The server automatically uses Render's `PORT` environment variable.


Updated assets:
- Page 1 background uses the supplied traffic-light image with a subtle blur.
- Page 3 uses the four supplied direction demo videos (A/B/C/D) with runtime vehicle-detection overlays; the previous single demo video is removed.
- The lower prototype is CSS/HTML animated only; no static prototype photo is pasted behind it.
