(() => {
  const CLIP_SOURCE = "/toys/network23/headroom.png";
  const CLIP_DURATION = 1320;
  // Painted at half the 128px screen and upscaled by the embed's pixelated rendering, so each
  // speck of snow is a chunky 2x2 block rather than a single CSS pixel.
  const RESOLUTION = 64;
  const FRAME_INTERVAL = 1000 / 10;

  const root = window.toy && window.toy.element;

  if (!root) {
    return;
  }

  const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");

  const canvas = document.createElement("canvas");
  canvas.width = RESOLUTION;
  canvas.height = RESOLUTION;

  const context = canvas.getContext("2d");
  const frame = context.createImageData(RESOLUTION, RESOLUTION);
  // Little-endian byte order packs each pixel as 0xAABBGGRR.
  const pixels = new Uint32Array(frame.data.buffer);

  let animation = 0;
  let painted = -Infinity;

  const snow = (now = performance.now()) => {
    if (now - painted >= FRAME_INTERVAL) {
      for (let pixel = 0; pixel < pixels.length; pixel += 1) {
        pixels[pixel] = Math.random() < 0.5 ? 0xff111111 : 0xffeeeeee;
      }

      context.putImageData(frame, 0, 0);
      painted = now;
    }

    if (!stillness.matches) {
      animation = requestAnimationFrame(snow);
    }
  };

  const broadcast = document.createElement("img");
  broadcast.alt = "";
  broadcast.style.display = "none";
  broadcast.style.width = "100%";
  broadcast.style.height = "100%";
  broadcast.style.imageRendering = "pixelated";

  root.append(canvas, broadcast);
  snow();

  // headroom.png loops forever on its own, so playing it "once" means holding the bytes and
  // minting a fresh object URL per play: a reused URL resumes mid-loop instead of restarting.
  const clip = fetch(CLIP_SOURCE)
    .then((response) => response.blob())
    .catch(() => null);

  let playing = false;
  let clipUrl = null;

  const play = async () => {
    if (playing) {
      return;
    }

    playing = true;

    const bytes = await clip;

    if (!bytes) {
      playing = false;
      return;
    }

    if (clipUrl) {
      URL.revokeObjectURL(clipUrl);
    }

    clipUrl = URL.createObjectURL(bytes);
    broadcast.src = clipUrl;
    await broadcast.decode().catch(() => {});

    cancelAnimationFrame(animation);
    canvas.style.display = "none";
    broadcast.style.display = "block";

    setTimeout(() => {
      broadcast.style.display = "none";
      canvas.style.display = "block";
      snow();
      playing = false;
    }, CLIP_DURATION);
  };

  root.addEventListener("click", play);
})();
