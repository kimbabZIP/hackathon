import { FFmpeg } from "@ffmpeg/ffmpeg";
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

const CLIP_SECONDS = 5 * 60;
const TARGET_BITRATE = "96k";
const MAX_PROXY_UPLOAD_BYTES = 4 * 1024 * 1024;

let ffmpeg = null;
let ffmpegLoadPromise = null;

function abortError() {
  return new DOMException("요청이 취소되었습니다.", "AbortError");
}

function assertNotAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function resetFfmpeg() {
  ffmpeg?.terminate();
  ffmpeg = null;
  ffmpegLoadPromise = null;
}

async function getFfmpeg(signal) {
  assertNotAborted(signal);
  if (!ffmpeg) ffmpeg = new FFmpeg();
  if (!ffmpeg.loaded) {
    ffmpegLoadPromise ||= ffmpeg.load({ coreURL, wasmURL }, { signal });
    try {
      await ffmpegLoadPromise;
    } catch (error) {
      resetFfmpeg();
      throw error;
    }
  }
  assertNotAborted(signal);
  return ffmpeg;
}

function readAudioDuration(file, signal) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (duration = null) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", handleAbort);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    const handleAbort = () => finish(null);

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      finish(Number.isFinite(audio.duration) ? audio.duration : null);
    }, { once: true });
    audio.addEventListener("error", () => finish(null), { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });
    audio.src = objectUrl;
  });
}

function outputName(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, "").slice(0, 80) || "lecture";
  return `${baseName}-first-5-minutes.mp3`;
}

export async function prepareAudioForUpload(file, { signal, onStatus } = {}) {
  assertNotAborted(signal);
  const duration = await readAudioDuration(file, signal);
  assertNotAborted(signal);

  if (file.size <= MAX_PROXY_UPLOAD_BYTES && duration !== null && duration <= CLIP_SECONDS) {
    onStatus?.("음성 파일 크기를 확인했습니다. 서버로 전송합니다…");
    return { file, processed: false, originalSize: file.size };
  }

  onStatus?.("음성 변환기를 준비하고 있습니다…");
  const engine = await getFfmpeg(signal);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const extension = file.name.match(/\.[a-z0-9]{1,8}$/i)?.[0].toLowerCase() || ".audio";
  const inputPath = `input-${token}${extension}`;
  const outputPath = `output-${token}.mp3`;
  const handleProgress = ({ progress }) => {
    if (!Number.isFinite(progress)) return;
    const percentage = Math.max(1, Math.min(99, Math.round(progress * 100)));
    onStatus?.(`앞 5분을 96kbps MP3로 변환하고 있습니다… ${percentage}%`);
  };

  engine.on("progress", handleProgress);
  try {
    onStatus?.("원본 음성을 브라우저 변환기에 불러오고 있습니다…");
    const inputBytes = new Uint8Array(await file.arrayBuffer());
    assertNotAborted(signal);
    await engine.writeFile(inputPath, inputBytes, { signal });
    onStatus?.("앞 5분을 96kbps MP3로 변환하고 있습니다…");
    const exitCode = await engine.exec(
      [
        "-i", inputPath,
        "-t", String(CLIP_SECONDS),
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "libmp3lame",
        "-b:a", TARGET_BITRATE,
        outputPath,
      ],
      -1,
      { signal },
    );
    if (exitCode !== 0) throw new Error(`브라우저 음성 변환이 종료 코드 ${exitCode}로 실패했습니다.`);

    const outputBytes = await engine.readFile(outputPath, "binary", { signal });
    const processedFile = new File([outputBytes], outputName(file.name), { type: "audio/mpeg" });
    if (processedFile.size > MAX_PROXY_UPLOAD_BYTES) {
      throw new Error("변환된 음성이 4MB를 초과했습니다. 더 짧은 음성 파일을 선택해 주세요.");
    }
    onStatus?.("음성 변환이 끝났습니다. 서버로 전송합니다…");
    return { file: processedFile, processed: true, originalSize: file.size };
  } catch (error) {
    if (signal?.aborted) {
      resetFfmpeg();
      throw abortError();
    }
    throw error;
  } finally {
    engine.off("progress", handleProgress);
    if (engine.loaded) {
      await engine.deleteFile(inputPath).catch(() => {});
      await engine.deleteFile(outputPath).catch(() => {});
    }
  }
}

export const audioUploadLimits = {
  clipSeconds: CLIP_SECONDS,
  maxProxyUploadBytes: MAX_PROXY_UPLOAD_BYTES,
};
