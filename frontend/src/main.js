import introBgmUrl from "../bgm/leze_clip.mp3";
import professorSelectBgmUrl from "../bgm/PUBG_BGM.mp3";
import officeBgmUrl from "../bgm/miyoeonsiBGM.mp3";
import buttonSfxUrl from "../bgm/button.mp3";
import characterSfxUrl from "../bgm/character.mp3";

const authScreen = document.querySelector(".auth-screen");
const titleScreen = document.querySelector(".title-screen");
const titleImage = document.querySelector(".title-image");
const introScreen = document.querySelector(".intro-screen");
const professorSelectScreen = document.querySelector(".professor-select-screen");
const professorOfficeScreen = document.querySelector(".professor-office-screen");
const assignmentReviewScreen = document.querySelector(".assignment-review-screen");
const previousAssignmentsScreen = document.querySelector(".previous-assignments-screen");
const reviewResultScreen = document.querySelector(".review-result-screen");
const reviewReportScreen = document.querySelector(".review-report-screen");
const courseMaterialScreen = document.querySelector(".course-material-screen");
const lectureAudioScreen = document.querySelector(".lecture-audio-screen");
const chatbotScreen = document.querySelector(".chatbot-screen");
const modalBackdrop = document.querySelector(".modal-backdrop");
const selectionModalBackdrop = document.querySelector(".selection-modal-backdrop");
const selectionToast = document.querySelector(".selection-toast");
const featureModalBackdrop = document.querySelector(".feature-modal-backdrop");
const closedScreen = document.querySelector(".closed-screen");
const menuButtons = [...document.querySelectorAll(".menu-hitbox")];
const authTabs = [...document.querySelectorAll(".auth-tab")];
const authForms = {
  login: document.querySelector("#login-form"),
  signup: document.querySelector("#signup-form"),
};

const introBgm = createLoopingBgm(introBgmUrl);
const professorSelectBgm = createLoopingBgm(professorSelectBgmUrl);
const officeBgm = createLoopingBgm(officeBgmUrl);
const loopingBgmTracks = [introBgm, professorSelectBgm, officeBgm];
let lastHoverSfxTarget = null;

function createLoopingBgm(url) {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.42;
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });
  return audio;
}

function playBgm(track) {
  loopingBgmTracks.forEach((item) => {
    if (item !== track) {
      stopBgm(item);
    }
  });
  if (!track.paused) {
    return;
  }
  track.play().catch(() => {});
}

function stopBgm(track) {
  track.pause();
  track.currentTime = 0;
}

function stopAllBgm() {
  loopingBgmTracks.forEach(stopBgm);
}

function playIntroBgm() {
  playBgm(introBgm);
}

function playProfessorSelectBgm() {
  playBgm(professorSelectBgm);
}

function playOfficeBgm() {
  playBgm(officeBgm);
}

function stopProfessorSelectBgm() {
  stopBgm(professorSelectBgm);
}

function isOfficeFlowVisible() {
  return !professorOfficeScreen.hidden
    || !assignmentReviewScreen.hidden
    || !previousAssignmentsScreen.hidden
    || !reviewResultScreen.hidden
    || !reviewReportScreen.hidden
    || !courseMaterialScreen.hidden
    || !lectureAudioScreen.hidden
    || !chatbotScreen.hidden;
}

function playSfx(url, volume = 0.72) {
  const sfx = new Audio(url);
  sfx.volume = volume;
  sfx.play().catch(() => {});
}

function playHoverTick() {
  playSfx(buttonSfxUrl, 0.55);
}

function playClickSfx() {
  playSfx(buttonSfxUrl, 0.8);
}

function playConfirmSfx() {
  playSfx(characterSfxUrl, 0.85);
}

let selectedMenuIndex = 0;
let selectedProfessorId = "yoon";
let professorSelectionLocked = false;
let transitionTimer;
let professorHoverTimer;
let toastTimer;
let heroRequestId = 0;
let pendingProfessorCustomization = null;
let reviewFile = null;
let materialFile = null;
let audioFile = null;
let typewriterTimer;
let chatbotTypewriterTimer;
let lastReviewComment = "";
let resultProfessorRequestId = 0;
let chatbotHistory = [];
let chatbotHistoryIndex = 0;
let chatbotSuggestedQuestions = [];
let chatbotReturnTarget = "office";
const transparentProfessorImageCache = new Map();
const mainScreenUrl = "/main-screen.jpg";
const accountStorageKey = "assignment-review-accounts";
const sessionStorageKey = "assignment-review-session";
const professorCustomizationStorageKey = "assignment-review-professor-customizations";
const reviewHistoryStorageKey = "assignment-review-history";
const professorAssetModules = import.meta.glob(
  "/assets/professors/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}",
  { eager: true, query: "?url", import: "default" },
);
const professorFullBodyModules = import.meta.glob(
  "/assets/professors_every/*.{png,jpg,jpeg,webp,avif,PNG,JPG,JPEG,WEBP,AVIF}",
  { eager: true, query: "?url", import: "default" },
);

function sortProfessorAssets(assetModules) {
  return Object.entries(assetModules)
  .sort(([pathA], [pathB]) => {
    const numberA = Number(pathA.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
    const numberB = Number(pathB.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
    return numberA - numberB;
  })
  .map(([, url]) => url);
}

const professorAssetUrls = sortProfessorAssets(professorAssetModules);
const professorFullBodyUrls = sortProfessorAssets(professorFullBodyModules);

const professorProfiles = [
  {
    id: "yoon",
    name: "윤하린 교수",
    department: "컴퓨터공학과 · 소프트웨어 논증 연구실",
    difficulty: 5,
    type: "논리 파괴형",
    specialty: "전제와 결론 사이의 논리적 허점을 끝까지 추적합니다.",
    quote: "그 주장을 뒷받침하는 근거가 정확히 어디 있습니까?",
    color: "#63b4ca",
  },
  {
    id: "jung",
    name: "정명숙 교수",
    department: "국어국문학과 · 현대문체 연구실",
    difficulty: 4,
    type: "문법 집착형",
    specialty: "문장 호응, 맞춤법, 인용 형식을 한 글자도 놓치지 않습니다.",
    quote: "문장이 자네보다 더 길을 잃고 있군요.",
    color: "#c77c8b",
  },
  {
    id: "oh",
    name: "오세진 교수",
    department: "경영학과 · 전략분석 연구실",
    difficulty: 4,
    type: "근거 추궁형",
    specialty: "모든 수치의 출처와 현실 적용 가능성을 집요하게 검증합니다.",
    quote: "그래서 이 숫자를 누가, 언제, 어떻게 측정했습니까?",
    color: "#c79a55",
  },
  {
    id: "miller",
    name: "데이비드 밀러 교수",
    department: "영어영문학과 · 비교문학 연구실",
    difficulty: 3,
    type: "맥락 심문형",
    specialty: "텍스트가 놓인 역사적 맥락과 숨은 전제를 차분히 질문합니다.",
    quote: "좋습니다. 그런데 이 문장이 왜 여기 있어야 하죠?",
    color: "#7396c8",
  },
  {
    id: "kang",
    name: "강태준 교수",
    department: "기계공학과 · 정밀설계 연구실",
    difficulty: 5,
    type: "오차 불허형",
    specialty: "계산 과정과 단위, 허용 오차를 한 단계씩 다시 검산합니다.",
    quote: "소수점 하나가 기계를 멈추게 한다는 걸 잊었습니까?",
    color: "#6aa6a0",
  },
  {
    id: "choi",
    name: "최병수 교수",
    department: "사학과 · 동아시아사 연구실",
    difficulty: 4,
    type: "근거 추궁형",
    specialty: "1차 사료의 출처와 해석 시점의 편향을 엄격하게 구분합니다.",
    quote: "해석은 좋습니다. 사료는 어디 있습니까?",
    color: "#b88a58",
  },
  {
    id: "han",
    name: "한예린 교수",
    department: "심리학과 · 인지행동 연구실",
    difficulty: 3,
    type: "가설 해체형",
    specialty: "연구 가설과 측정 도구 사이의 타당성을 예리하게 살핍니다.",
    quote: "그 결과가 정말 가설을 증명한다고 생각하나요?",
    color: "#9b7fc4",
  },
  {
    id: "ryu",
    name: "류성훈 교수",
    department: "법학과 · 공법 연구실",
    difficulty: 5,
    type: "형식 절대주의형",
    specialty: "논증 구조와 인용 규칙, 법적 요건을 예외 없이 적용합니다.",
    quote: "요건 하나가 빠졌습니다. 결론도 함께 무너졌군요.",
    color: "#a96d62",
  },
  {
    id: "lim",
    name: "임도윤 교수",
    department: "교육학과 · 학습설계 연구실",
    difficulty: 2,
    type: "대학원생 양성형",
    specialty: "장점을 먼저 찾은 뒤 스스로 답에 도달하도록 질문을 던집니다.",
    quote: "좋은 출발입니다. 한 단계만 더 깊이 가볼까요?",
    color: "#82a66a",
  },
  {
    id: "baek",
    name: "백창호 교수",
    department: "철학과 · 분석철학 연구실",
    difficulty: 5,
    type: "논리 파괴형",
    specialty: "모호한 개념을 허용하지 않고 모든 명제를 기호처럼 분해합니다.",
    quote: "그 단어의 정의부터 다시 시작합시다.",
    color: "#7589a5",
  },
  {
    id: "seo",
    name: "서진우 교수",
    department: "경제학과 · 계량경제 연구실",
    difficulty: 5,
    type: "수치 검문형",
    specialty: "표본과 변수, 회귀모형의 가정을 숫자로 증명하게 합니다.",
    quote: "유의미하다는 말 말고, 유의수준을 보여주세요.",
    color: "#5f9ba6",
  },
  {
    id: "namgung",
    name: "남궁석 교수",
    department: "건축학과 · 도시공간 연구실",
    difficulty: 4,
    type: "현실 검증형",
    specialty: "도면의 아름다움보다 동선과 구조적 현실성을 먼저 평가합니다.",
    quote: "사람이 실제로 이 공간을 어떻게 사용합니까?",
    color: "#b1815b",
  },
  {
    id: "cha",
    name: "차민재 교수",
    department: "물리학과 · 양자정보 연구실",
    difficulty: 5,
    type: "가정 소거형",
    specialty: "증명에 숨어 있는 가정을 찾아내고 경계조건부터 확인합니다.",
    quote: "그 가정이 깨져도 이 식은 여전히 성립합니까?",
    color: "#638ec5",
  },
  {
    id: "moon",
    name: "문재훈 교수",
    department: "사회학과 · 문화사회 연구실",
    difficulty: 3,
    type: "맥락 심문형",
    specialty: "개인의 사례를 사회 구조와 연결했는지 집중적으로 봅니다.",
    quote: "개인적 경험을 일반화할 근거가 충분한가요?",
    color: "#9d7965",
  },
  {
    id: "ko",
    name: "고상혁 교수",
    department: "화학과 · 유기합성 연구실",
    difficulty: 4,
    type: "재현 집착형",
    specialty: "실험 조건과 절차가 누구에게나 재현 가능한지 검증합니다.",
    quote: "이 조건으로 같은 결과가 다시 나온다고 확신합니까?",
    color: "#6ca48d",
  },
  {
    id: "bae",
    name: "배수지 교수",
    department: "미디어학과 · 디지털서사 연구실",
    difficulty: 3,
    type: "독자 추적형",
    specialty: "콘텐츠의 메시지와 실제 사용자 경험 사이의 간극을 살핍니다.",
    quote: "만든 사람 말고, 보는 사람은 어떻게 느낄까요?",
    color: "#ba789b",
  },
  {
    id: "wilson",
    name: "에마 윌슨 교수",
    department: "국제학과 · 국제개발 연구실",
    difficulty: 4,
    type: "관점 교차형",
    specialty: "하나의 사건을 여러 국가와 이해관계자의 시각에서 검토합니다.",
    quote: "반대편의 관점에서도 같은 결론이 나올까요?",
    color: "#7b91bc",
  },
  {
    id: "woo",
    name: "우도현 교수",
    department: "체육학과 · 스포츠과학 연구실",
    difficulty: 4,
    type: "실전 압박형",
    specialty: "이론을 실제 경기 데이터와 훈련 성과로 증명하게 합니다.",
    quote: "설명은 충분합니다. 이제 기록으로 보여주세요.",
    color: "#628f82",
  },
  {
    id: "brown",
    name: "마커스 브라운 교수",
    department: "정치외교학과 · 국제정치 연구실",
    difficulty: 5,
    type: "반론 선제형",
    specialty: "예상 가능한 모든 반론을 먼저 제시하고 논리를 방어하게 합니다.",
    quote: "가장 강력한 반론부터 직접 답해보십시오.",
    color: "#9f715d",
  },
  {
    id: "yi",
    name: "이서윤 교수",
    department: "디자인학과 · 시각정보 연구실",
    difficulty: 3,
    type: "형식 집착형",
    specialty: "정보 위계와 정렬, 여백의 이유를 시각 언어로 설명하게 합니다.",
    quote: "이 여백은 의도입니까, 아니면 망설임입니까?",
    color: "#b47b86",
  },
  {
    id: "kiro",
    name: "키로 교수",
    department: "AI 유령공학과",
    difficulty: 3,
    type: "유령 조력형",
    specialty: "보이지 않는 빈칸과 사라진 근거를 찾아 논리의 구멍을 메우게 합니다.",
    quote: "안 보이는 부분일수록 더 정확하게 써야 합니다.",
    color: "#8b7cc8",
    featured: true,
    identityLocked: true,
    facePosition: "50% 18%",
    heroPosition: "50% 92%",
  },
];

function createFallbackPortrait(profile) {
  const initial = profile.name.charAt(0);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#252a28"/>
          <stop offset="1" stop-color="${profile.color}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="#141714"/>
      <circle cx="450" cy="350" r="205" fill="url(#g)" opacity=".82"/>
      <path d="M125 1200V880c0-240 145-370 325-370s325 130 325 370v320" fill="url(#g)" opacity=".72"/>
      <text x="450" y="390" text-anchor="middle" fill="#eee5d1" font-size="180" font-family="serif">${initial}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function getTransparentProfessorImage(url) {
  if (transparentProfessorImageCache.has(url)) {
    return transparentProfessorImageCache.get(url);
  }

  const processing = (async () => {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const pixelCount = canvas.width * canvas.height;
    const visited = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let queueStart = 0;
    let queueEnd = 0;

    const isWhiteBackground = (pixelIndex) => {
      const offset = pixelIndex * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      return red > 222 && green > 222 && blue > 222
        && Math.max(red, green, blue) - Math.min(red, green, blue) < 32;
    };

    const enqueue = (pixelIndex) => {
      if (!visited[pixelIndex] && isWhiteBackground(pixelIndex)) {
        visited[pixelIndex] = 1;
        queue[queueEnd] = pixelIndex;
        queueEnd += 1;
      }
    };

    for (let x = 0; x < canvas.width; x += 1) {
      enqueue(x);
      enqueue((canvas.height - 1) * canvas.width + x);
    }
    for (let y = 0; y < canvas.height; y += 1) {
      enqueue(y * canvas.width);
      enqueue(y * canvas.width + canvas.width - 1);
    }

    while (queueStart < queueEnd) {
      const pixelIndex = queue[queueStart];
      queueStart += 1;
      pixels[pixelIndex * 4 + 3] = 0;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      if (x > 0) enqueue(pixelIndex - 1);
      if (x < canvas.width - 1) enqueue(pixelIndex + 1);
      if (y > 0) enqueue(pixelIndex - canvas.width);
      if (y < canvas.height - 1) enqueue(pixelIndex + canvas.width);
    }

    context.putImageData(imageData, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return URL.createObjectURL(blob);
  })().catch(() => url);

  transparentProfessorImageCache.set(url, processing);
  return processing;
}

const defaultProfessorAges = [
  38, 72, 54, 46, 37, 67, 42, 51, 44, 69,
  48, 65, 39, 56, 47, 35, 45, 36, 52, 41,
];
const savedProfessorCustomizations = readProfessorCustomizations();

function findProfessorAsset(assetModules, pattern) {
  return Object.entries(assetModules).find(([path]) => pattern.test(path))?.[1];
}

const kiroPortraitUrl = findProfessorAsset(professorAssetModules, /KIRO/i);
const kiroFullBodyUrl = findProfessorAsset(professorFullBodyModules, /KIRO/i);

professorProfiles.forEach((profile, index) => {
  const customization = savedProfessorCustomizations[profile.id];
  profile.image = professorAssetUrls[index] ?? createFallbackPortrait(profile);
  profile.heroImage = professorFullBodyUrls[index] ?? profile.image;
  profile.facePosition = profile.facePosition ?? "50% 16%";
  profile.heroPosition = profile.heroPosition ?? "50% 100%";
  profile.customized = Boolean(customization);

  if (profile.identityLocked) {
    profile.image = kiroPortraitUrl ?? profile.image;
    profile.heroImage = kiroFullBodyUrl
      ? `${kiroFullBodyUrl}${kiroFullBodyUrl.includes("?") ? "&" : "?"}cutout=2`
      : profile.heroImage;
    profile.age = 1;
    profile.name = "키로 교수";
    profile.department = "AI 유령공학과";
    return;
  }

  profile.age = customization?.age ?? defaultProfessorAges[index];
  profile.name = customization?.name ?? profile.name;
  profile.department = customization?.department ?? profile.department;
});

titleImage.src = mainScreenUrl;
document.documentElement.style.setProperty("--main-screen", `url("${mainScreenUrl}")`);

function readProfessorCustomizations() {
  try {
    return JSON.parse(localStorage.getItem(professorCustomizationStorageKey)) ?? {};
  } catch {
    return {};
  }
}

function saveProfessorCustomization(profile) {
  const customizations = readProfessorCustomizations();
  customizations[profile.id] = {
    name: profile.name,
    age: profile.age,
    department: profile.department,
  };
  localStorage.setItem(professorCustomizationStorageKey, JSON.stringify(customizations));
}

function readAccounts() {
  try {
    return JSON.parse(localStorage.getItem(accountStorageKey)) ?? [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(accountStorageKey, JSON.stringify(accounts));
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setAuthMessage(form, message, success = false) {
  const messageElement = form.querySelector(".auth-message");
  messageElement.textContent = message;
  messageElement.classList.toggle("is-success", success);
}

function showAuthView(view) {
  const isLogin = view === "login";

  authForms.login.hidden = !isLogin;
  authForms.signup.hidden = isLogin;
  authTabs.forEach((tab) => {
    const active = tab.id === `${view}-tab`;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  Object.values(authForms).forEach((form) => setAuthMessage(form, ""));
  requestAnimationFrame(() => {
    document.querySelector(`#${view}-form input`)?.focus({ preventScroll: true });
  });
}

function showAuth() {
  window.clearTimeout(transitionTimer);
  titleScreen.hidden = true;
  introScreen.hidden = true;
  professorSelectScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  chatbotScreen.hidden = true;
  closedScreen.hidden = true;
  modalBackdrop.hidden = true;
  selectionModalBackdrop.hidden = true;
  featureModalBackdrop.hidden = true;
  selectionToast.hidden = true;
  authScreen.hidden = false;
  authScreen.classList.remove("is-leaving");
  playIntroBgm();
  showAuthView("login");
}

function setSession(account) {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify({
    account: account.account,
    name: account.name,
  }));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionStorageKey));
  } catch {
    return null;
  }
}

function updatePlayerName() {
  const session = getSession();
  document.querySelector(".player-name").textContent = session
    ? `${session.name} 학생`
    : "";
}

function enterTitle(account) {
  setSession(account);
  updatePlayerName();
  authScreen.classList.add("is-leaving");
  transitionTimer = window.setTimeout(() => {
    authScreen.hidden = true;
    showTitle();
    menuButtons[0].focus({ preventScroll: true });
  }, 650);
}

function setSelectedMenu(index, focus = false) {
  selectedMenuIndex = (index + menuButtons.length) % menuButtons.length;

  menuButtons.forEach((button, buttonIndex) => {
    const selected = buttonIndex === selectedMenuIndex;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-current", selected ? "true" : "false");
  });

  if (focus) {
    menuButtons[selectedMenuIndex].focus({ preventScroll: true });
  }
}

function initializeProfessorRoster() {
  const professorGrid = document.querySelector(".professor-grid");
  professorGrid.innerHTML = professorProfiles.map((profile, index) => `
    <button
      class="professor-tile${profile.featured ? " professor-tile-featured" : ""}${sessionStorage.getItem("assignment-review-professor") === profile.id ? " is-confirmed" : ""}"
      type="button"
      role="option"
      aria-selected="${profile.id === selectedProfessorId}"
      data-professor-id="${profile.id}"
      style="--professor-accent: ${profile.color}"
    >
      <span class="tile-number">${String(index + 1).padStart(2, "0")}</span>
      <img
        src="${profile.image}"
        alt="${profile.customized ? profile.name : `교수 후보 ${String(index + 1).padStart(2, "0")}`}"
        loading="${index === 0 ? "eager" : "lazy"}"
        decoding="async"
        style="object-position: ${profile.facePosition}"
      />
      <span class="tile-info">
        <strong>${profile.customized ? profile.name.replace(/\s*교수$/, "") : ""}</strong>
      </span>
    </button>
  `).join("");

  professorGrid.querySelectorAll(".professor-tile").forEach((tile) => {
    const professorId = tile.dataset.professorId;

    tile.addEventListener("pointerenter", () => {
      if (professorSelectionLocked) {
        return;
      }
      window.clearTimeout(professorHoverTimer);
      professorHoverTimer = window.setTimeout(() => renderProfessor(professorId), 90);
    });
    tile.addEventListener("focus", () => renderProfessor(professorId));
    tile.addEventListener("click", () => {
      playClickSfx();
      professorSelectionLocked = true;
      window.clearTimeout(professorHoverTimer);
      renderProfessor(professorId);
    });
  });

  professorGrid.addEventListener("keydown", (event) => {
    const currentTile = event.target.closest(".professor-tile");
    if (!currentTile) {
      return;
    }

    const tiles = [...professorGrid.querySelectorAll(".professor-tile")];
    const currentIndex = tiles.indexOf(currentTile);
    const featuredIndex = tiles.findIndex((tile) => tile.classList.contains("professor-tile-featured"));
    const movements = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -4,
      ArrowDown: 4,
    };
    let nextIndex = currentIndex + (movements[event.key] ?? 0);

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tiles.length - 1;
    } else if (
      featuredIndex > 0
      && event.key === "ArrowDown"
      && currentIndex >= featuredIndex - 4
      && currentIndex < featuredIndex
    ) {
      nextIndex = featuredIndex;
    } else if (featuredIndex > 0 && event.key === "ArrowUp" && currentIndex === featuredIndex) {
      nextIndex = featuredIndex - 1;
    } else if (!(event.key in movements)) {
      return;
    }

    event.preventDefault();
    tiles[Math.max(0, Math.min(tiles.length - 1, nextIndex))].focus();
  });
}

function renderProfessor(professorId) {
  const profileIndex = professorProfiles.findIndex((profile) => profile.id === professorId);
  const profile = professorProfiles[profileIndex];
  if (!profile) {
    return;
  }

  selectedProfessorId = professorId;
  professorSelectScreen.style.setProperty("--selected-accent", profile.color);
  document.documentElement.style.setProperty("--selected-accent", profile.color);

  document.querySelectorAll(".professor-tile").forEach((tile) => {
    const selected = tile.dataset.professorId === professorId;
    tile.classList.toggle("is-selected", selected);
    tile.setAttribute("aria-selected", String(selected));
  });

  document.querySelector(".roster-count").textContent =
    `${String(profileIndex + 1).padStart(2, "0")} / ${String(professorProfiles.length).padStart(2, "0")}`;
  document.querySelector(".profile-number").textContent =
    String(profileIndex + 1).padStart(2, "0");
  document.querySelector(".profile-total").textContent =
    `/ ${String(professorProfiles.length).padStart(2, "0")}`;
  const submitButtonText = document.querySelector(".select-professor-button span");
  submitButtonText.textContent =
    sessionStorage.getItem("assignment-review-professor") === professorId
      ? "선택 완료 · 정보 다시 저장하기"
      : "교수 정보 저장하고 선택하기";
  populateProfessorForm(profile);

  const hero = document.querySelector(".professor-hero");
  if (hero.dataset.professorId !== professorId) {
    const requestId = ++heroRequestId;
    const loading = document.querySelector(".hero-loading");
    const preload = new Image();
    hero.classList.add("is-switching");
    loading.hidden = false;
    preload.decoding = "async";
    preload.onload = () => {
      if (requestId !== heroRequestId) {
        return;
      }
      hero.src = profile.heroImage;
      hero.alt = profile.customized
        ? `${profile.name} 전신`
        : `교수 후보 ${String(profileIndex + 1).padStart(2, "0")} 전신`;
      hero.style.objectPosition = profile.heroPosition;
      hero.dataset.professorId = professorId;
      hero.classList.remove("is-switching");
      loading.hidden = true;
    };
    preload.onerror = () => {
      if (requestId !== heroRequestId) {
        return;
      }
      const fallback = createFallbackPortrait(profile);
      hero.src = fallback;
      hero.alt = `교수 후보 ${String(profileIndex + 1).padStart(2, "0")} 임시 이미지`;
      hero.dataset.professorId = professorId;
      hero.classList.remove("is-switching");
      loading.hidden = true;
    };
    preload.src = profile.heroImage;
  }
}

function backToIntro() {
  playIntroBgm();
  professorSelectScreen.hidden = true;
  introScreen.hidden = false;
  requestAnimationFrame(() => {
    introScreen.classList.add("is-visible");
    document.querySelector(".continue-button").focus({ preventScroll: true });
  });
}

function populateProfessorForm(profile, force = false) {
  const form = document.querySelector("#submission-form");
  if (!force && form.dataset.professorId === profile.id) {
    return;
  }

  const nameInput = form.elements.professorName;
  const ageInput = form.elements.professorAge;
  const departmentInput = form.elements.professorDepartment;

  form.dataset.professorId = profile.id;
  form.classList.toggle("is-locked-identity", Boolean(profile.identityLocked));
  [nameInput, ageInput, departmentInput].forEach((input) => {
    input.readOnly = Boolean(profile.identityLocked);
  });

  if (profile.identityLocked) {
    nameInput.value = "키로";
    ageInput.min = "1";
    ageInput.max = "1";
    ageInput.value = "1";
    departmentInput.value = "AI 유령공학과";
    document.querySelector(".submission-message").textContent = "";
    return;
  }

  ageInput.min = "25";
  ageInput.max = "100";
  nameInput.value = profile.customized
    ? profile.name.replace(/\s*교수$/, "")
    : "";
  ageInput.value = profile.customized ? profile.age : "";
  departmentInput.value = profile.customized ? profile.department : "";
  document.querySelector(".submission-message").textContent = "";
}

function openSelectionModal(customization) {
  pendingProfessorCustomization = customization;
  document.querySelector("#selection-modal-title").textContent =
    `${customization.name}로 설정하시겠습니까?`;
  document.querySelector(".selection-modal-copy").textContent =
    `${customization.age}세 · ${customization.department}`;
  selectionModalBackdrop.hidden = false;
  document.querySelector(".professor-confirm").focus({ preventScroll: true });
}

function cancelSelection() {
  selectionModalBackdrop.hidden = true;
  pendingProfessorCustomization = null;
  document.querySelector(".select-professor-button").focus({ preventScroll: true });
}

function showProfessorOffice() {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  if (!profile?.customized) {
    return;
  }

  playOfficeBgm();

  document.querySelector(".office-professor-image").src = profile.heroImage;
  document.querySelector(".office-professor-image").alt = `${profile.name} 전신`;
  document.querySelector(".office-professor-name").textContent = profile.name;
  document.querySelector(".office-professor-age").textContent = `${profile.age}세`;
  document.querySelector(".office-professor-department").textContent = profile.department;

  professorSelectScreen.hidden = true;
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  chatbotScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  const aiFeaturesEnabled = updateAiFeatureAvailability();
  document
    .querySelector(`[data-feature='${aiFeaturesEnabled ? "chat" : "material"}']`)
    .focus({ preventScroll: true });
}

function backToProfessors() {
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  chatbotScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  professorSelectScreen.hidden = false;
  playProfessorSelectBgm();
  renderProfessor(selectedProfessorId);
  document.querySelector(`[data-professor-id="${selectedProfessorId}"]`)
    ?.focus({ preventScroll: true });
}

function confirmSelection() {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  if (!pendingProfessorCustomization) {
    cancelSelection();
    return;
  }

  profile.name = pendingProfessorCustomization.name;
  profile.age = pendingProfessorCustomization.age;
  profile.department = pendingProfessorCustomization.department;
  profile.customized = true;
  saveProfessorCustomization(profile);
  sessionStorage.setItem("assignment-review-professor", selectedProfessorId);
  selectionModalBackdrop.hidden = true;
  const selectedTile = document.querySelector(`[data-professor-id="${selectedProfessorId}"]`);
  document.querySelectorAll(".professor-tile").forEach((tile) => {
    tile.classList.toggle("is-confirmed", tile === selectedTile);
  });
  selectedTile.querySelector(".tile-info strong").textContent = profile.name.replace(/\s*교수$/, "");
  selectedTile.querySelector("img").alt = profile.name;
  document.querySelector(".professor-hero").alt = `${profile.name} 상반신`;
  document.querySelector(".toast-professor-name").textContent = profile.name;
  selectionToast.hidden = false;
  document.querySelector(".select-professor-button span").textContent =
    "선택 완료 · 정보 다시 저장하기";
  populateProfessorForm(profile, true);
  pendingProfessorCustomization = null;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    selectionToast.hidden = true;
  }, 3200);
  showProfessorOffice();
}

function showAssignmentReview() {
  featureModalBackdrop.hidden = true;
  professorOfficeScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  assignmentReviewScreen.hidden = false;
  document.querySelector(".review-prompt-input").focus({ preventScroll: true });
}

function closeAssignmentReview() {
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='review']").focus({ preventScroll: true });
}

function createMockReviewComment(profile, prompt, fileName) {
  const focus = prompt.length > 32 ? `${prompt.slice(0, 32)}…` : prompt;
  return `${fileName}을 확인했습니다. “${focus}”를 기준으로 검토했어요. 전체 구조는 나쁘지 않지만 주장과 근거의 연결이 느슨합니다. 각 문단 첫 문장에 주장을 밝히고 바로 뒤에 출처와 사례를 배치하세요. 결론이 앞선 근거를 정확히 회수하는지도 다시 확인하기 바랍니다.`;
}

function typeReviewComment(comment) {
  const commentElement = document.querySelector(".review-result-comment");
  const cursor = document.querySelector(".typewriter-cursor");
  window.clearTimeout(typewriterTimer);
  commentElement.textContent = "";
  cursor.hidden = false;
  let index = 0;

  function typeNextCharacter() {
    if (index >= comment.length) {
      cursor.hidden = true;
      return;
    }

    commentElement.textContent += comment[index];
    const character = comment[index];
    index += 1;
    const delay = /[.!?。！？]/.test(character) ? 180 : /[,，]/.test(character) ? 85 : 24;
    typewriterTimer = window.setTimeout(typeNextCharacter, delay);
  }

  typeNextCharacter();
}

function showReviewResult(prompt, fileName) {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const professorImage = document.querySelector(".review-result-professor");
  const imageRequestId = ++resultProfessorRequestId;
  professorImage.classList.add("is-processing");
  professorImage.removeAttribute("src");
  professorImage.alt = `${profile.name} 인물 이미지`;
  getTransparentProfessorImage(profile.image).then((transparentImageUrl) => {
    if (imageRequestId !== resultProfessorRequestId) {
      return;
    }
    professorImage.onload = () => professorImage.classList.remove("is-processing");
    professorImage.src = transparentImageUrl;
  });
  document.querySelector(".review-result-professor-name").textContent = profile.name;

  lastReviewComment = createMockReviewComment(profile, prompt, fileName);
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewReportScreen.hidden = true;
  reviewResultScreen.hidden = false;
  requestAnimationFrame(() => {
    typeReviewComment(lastReviewComment);
    document.querySelector("[data-action='open-review-report']").focus({ preventScroll: true });
  });
}

function backToReviewForm() {
  window.clearTimeout(typewriterTimer);
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = false;
  document.querySelector(".review-prompt-input").focus({ preventScroll: true });
}

function openReviewReport() {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const request = JSON.parse(sessionStorage.getItem("assignment-review-request") ?? "{}");
  const requestedAt = request.requestedAt ? new Date(request.requestedAt) : new Date();
  const documentElement = document.querySelector(".review-report-document");
  document.querySelector(".report-document-professor").textContent = profile.name;
  document.querySelector(".report-document-file").textContent =
    request.fileName ?? reviewFile?.name ?? "과제 파일";
  document.querySelector(".report-document-date").textContent =
    requestedAt.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  document.querySelector(".report-document-comment").textContent = lastReviewComment;
  documentElement.scrollTop = 0;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = false;
  documentElement.focus({ preventScroll: true });
}

function closeReviewReport() {
  reviewReportScreen.hidden = true;
  reviewResultScreen.hidden = false;
  document.querySelector("[data-action='open-review-report']").focus({ preventScroll: true });
}

function downloadReviewReport() {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const report = [
    "과제 첨삭 보고서",
    `담당 교수: ${profile.name}`,
    "",
    lastReviewComment,
    "",
    "우선 수정 항목",
    "1. 각 문단의 핵심 주장을 첫 문장에 명확히 제시할 것",
    "2. 주장 직후 신뢰할 수 있는 출처와 구체적 사례를 배치할 것",
    "3. 결론에서 본론의 근거를 빠짐없이 회수할 것",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "과제-첨삭-보고서.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function readReviewHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(reviewHistoryStorageKey) ?? "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveReviewHistory(request) {
  const account = getSession()?.account ?? "guest";
  const history = readReviewHistory();
  history.unshift({ ...request, account });
  localStorage.setItem(reviewHistoryStorageKey, JSON.stringify(history.slice(0, 50)));
}

function openPreviousAssignments() {
  const account = getSession()?.account ?? "guest";
  const history = readReviewHistory()
    .filter((item) => item.account === account && item.professorId === selectedProfessorId)
    .slice(0, 4);
  const slots = [...document.querySelectorAll(".previous-assignment-slots button")];

  slots.forEach((button, index) => {
    const item = history[index];
    button.replaceChildren();
    button.onclick = null;
    button.disabled = !item;
    button.removeAttribute("aria-label");
    if (!item) {
      return;
    }

    const fileName = document.createElement("strong");
    const date = document.createElement("time");
    fileName.className = "previous-slot-file";
    fileName.textContent = item.fileName;
    date.className = "previous-slot-date";
    date.dateTime = item.requestedAt;
    date.textContent = new Date(item.requestedAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    button.append(fileName, date);
    button.setAttribute("aria-label", `${item.fileName} 첨삭 결과 보기`);
    button.onclick = () => {
      sessionStorage.setItem("assignment-review-request", JSON.stringify(item));
      previousAssignmentsScreen.hidden = true;
      showReviewResult(item.prompt, item.fileName);
    };
  });

  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = false;
  (slots.find((button) => !button.disabled)
    ?? document.querySelector(".previous-assignments-close"))
    .focus({ preventScroll: true });
}

function closePreviousAssignments() {
  previousAssignmentsScreen.hidden = true;
  assignmentReviewScreen.hidden = false;
  document.querySelector("[data-action='open-previous-assignments']").focus({ preventScroll: true });
}

function openReviewQuestion() {
  showChatbot("review");
}

function showCourseMaterial() {
  featureModalBackdrop.hidden = true;
  professorOfficeScreen.hidden = true;
  courseMaterialScreen.hidden = false;
  document.querySelector(".material-file-zone").focus({ preventScroll: true });
}

function closeCourseMaterial() {
  courseMaterialScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='material']").focus({ preventScroll: true });
}

function showLectureAudio() {
  featureModalBackdrop.hidden = true;
  professorOfficeScreen.hidden = true;
  lectureAudioScreen.hidden = false;
  document.querySelector(".audio-file-zone").focus({ preventScroll: true });
}

function closeLectureAudio() {
  lectureAudioScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='audio']").focus({ preventScroll: true });
}

function readStoredUpload(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function getSelectedProfessorUploads() {
  const material = readStoredUpload("assignment-review-course-material");
  const audio = readStoredUpload("assignment-review-lecture-audio");
  return {
    material: material?.professorId === selectedProfessorId ? material : null,
    audio: audio?.professorId === selectedProfessorId ? audio : null,
  };
}

function isKnowledgeSourceReady(upload) {
  return Boolean(
    upload
    && upload.uploadedAt
    && (upload.status === undefined || upload.status === "ready"),
  );
}

function updateAiFeatureAvailability() {
  const { material, audio } = getSelectedProfessorUploads();
  const materialReady = isKnowledgeSourceReady(material);
  const audioReady = isKnowledgeSourceReady(audio);
  const enabled = materialReady || audioReady;
  const requirement = document.querySelector(".office-ai-requirement");

  ["chat", "review"].forEach((feature) => {
    const button = document.querySelector(`[data-feature="${feature}"]`);
    button.disabled = !enabled;
    button.setAttribute("aria-disabled", String(!enabled));
    if (enabled) {
      button.removeAttribute("title");
    } else {
      button.title = "강의 자료 또는 강의 음성을 등록하면 AI 기능이 활성화됩니다.";
    }
  });

  requirement.classList.toggle("is-ready", enabled);
  if (materialReady && audioReady) {
    requirement.textContent = "강의 자료와 음성이 연결되어 AI 기능을 사용할 수 있습니다.";
  } else if (materialReady) {
    requirement.textContent = "강의 자료가 연결되어 AI 기능을 사용할 수 있습니다.";
  } else if (audioReady) {
    requirement.textContent = "강의 음성이 연결되어 AI 기능을 사용할 수 있습니다.";
  } else {
    requirement.textContent = "강의 자료 또는 강의 음성을 등록하면 AI 기능이 활성화됩니다.";
  }

  return enabled;
}

function shortenFileName(fileName, maxLength = 24) {
  return fileName.length > maxLength ? `${fileName.slice(0, maxLength)}…` : fileName;
}

function createChatbotSuggestions() {
  const { material, audio } = getSelectedProfessorUploads();

  if (material && audio) {
    return [
      `${shortenFileName(material.fileName)}의 핵심 개념은 무엇인가요?`,
      `${shortenFileName(audio.fileName)}에서 강조한 부분은 무엇인가요?`,
    ];
  }
  if (material) {
    return [
      `${shortenFileName(material.fileName)}의 핵심 내용을 요약해 주세요.`,
      "이 강의 자료를 과제에 어떻게 적용하면 좋을까요?",
    ];
  }
  if (audio) {
    return [
      `${shortenFileName(audio.fileName)}의 핵심 내용을 정리해 주세요.`,
      "이번 강의에서 가장 중요한 시험 포인트는 무엇인가요?",
    ];
  }
  return [
    "이번 과제에서 가장 중요하게 평가하는 기준은 무엇인가요?",
    "제가 자주 놓치는 부분과 보완 방법을 알려 주세요.",
  ];
}

function createChatbotResponse(question) {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const { material, audio } = getSelectedProfessorUploads();
  const sources = [
    material ? `강의 자료 ‘${material.fileName}’` : "",
    audio ? `강의 음성 ‘${audio.fileName}’` : "",
  ].filter(Boolean);
  const sourceText = sources.length
    ? `${sources.join("과 ")}을 기준으로 살펴보면`
    : "현재 등록된 수업 자료가 없으므로 일반적인 평가 기준으로 답하면";

  return `${question}에 대한 답변입니다. ${sourceText}, 핵심 개념을 먼저 한 문장으로 정의하고 그 정의를 뒷받침하는 근거를 구체적으로 제시해야 합니다. 주장만 나열하지 말고 수업에서 다룬 사례와 자신의 분석을 연결하세요. 결론에서는 앞서 사용한 근거가 질문에 정확히 답했는지 다시 검토하기 바랍니다. — ${profile.name}`;
}

function updateChatbotHistoryButtons() {
  const backButton = document.querySelector("[data-action='chatbot-back']");
  const forwardButton = document.querySelector("[data-action='chatbot-forward']");
  backButton.disabled = chatbotHistoryIndex <= 0;
  forwardButton.disabled = chatbotHistoryIndex >= chatbotHistory.length - 1;
}

function typeChatbotAnswer(text, animate = true) {
  const answer = document.querySelector(".chatbot-answer");
  const cursor = document.querySelector(".chatbot-typewriter-cursor");
  window.clearTimeout(chatbotTypewriterTimer);
  answer.textContent = "";
  cursor.classList.remove("is-idle");

  if (!animate) {
    answer.textContent = text;
    cursor.classList.add("is-idle");
    return;
  }

  let index = 0;
  function typeNextCharacter() {
    index += 1;
    answer.textContent = text.slice(0, index);
    if (index < text.length) {
      chatbotTypewriterTimer = window.setTimeout(typeNextCharacter, 18);
      return;
    }
    cursor.classList.add("is-idle");
  }
  typeNextCharacter();
}

function renderChatbotHistory(animate = false) {
  const entry = chatbotHistory[chatbotHistoryIndex];
  if (!entry) {
    return;
  }
  typeChatbotAnswer(entry.answer, animate);
  updateChatbotHistoryButtons();
}

function askChatbotQuestion(question) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    return;
  }

  if (chatbotHistoryIndex < chatbotHistory.length - 1) {
    chatbotHistory = chatbotHistory.slice(0, chatbotHistoryIndex + 1);
  }
  chatbotHistory.push({
    question: normalizedQuestion,
    answer: createChatbotResponse(normalizedQuestion),
  });
  chatbotHistoryIndex = chatbotHistory.length - 1;
  renderChatbotHistory(true);
}

function showChatbot(context = "general") {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const { material, audio } = getSelectedProfessorUploads();
  const linkedSources = [material, audio].filter(Boolean).length;
  const isReviewContext = context === "review";
  const openingAnswer = isReviewContext
    ? `${profile.name}입니다. 방금 전달한 과제 첨삭 결과를 기준으로 답변하겠습니다. 아래 질문을 선택하거나 궁금한 내용을 직접 입력하세요.`
    : linkedSources
      ? `${profile.name}입니다. 업로드된 수업 자료 ${linkedSources}개를 확인했습니다. 아래 예상 질문을 선택하거나 직접 질문하세요.`
      : `${profile.name}입니다. 아직 업로드된 강의 자료나 음성이 없습니다. 일반적인 과제 질문은 답할 수 있으니 아래 항목을 선택하거나 직접 질문하세요.`;

  chatbotReturnTarget = isReviewContext ? "review" : "office";
  chatbotSuggestedQuestions = isReviewContext
    ? [
        "방금 첨삭에서 가장 먼저 고쳐야 할 부분은 무엇인가요?",
        "주장과 근거의 연결을 어떻게 보완하면 좋을까요?",
      ]
    : createChatbotSuggestions();
  document.querySelectorAll(".chatbot-suggestion-text").forEach((element, index) => {
    element.textContent = chatbotSuggestedQuestions[index];
  });
  document.querySelector(".chatbot-professor-image").src = profile.heroImage;
  document.querySelector(".chatbot-professor-image").alt = `${profile.name} 전신`;
  document.querySelector(".chatbot-professor-name").textContent = profile.name;
  document.querySelector(".chatbot-suggestions").classList.remove("is-direct-entry");
  document.querySelector("#chatbot-direct-form").reset();
  document.querySelector("#chatbot-direct-form").hidden = true;

  chatbotHistory = [{ question: "", answer: openingAnswer }];
  chatbotHistoryIndex = 0;
  featureModalBackdrop.hidden = true;
  professorOfficeScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  chatbotScreen.hidden = false;
  renderChatbotHistory(true);
  document.querySelector("[data-chat-suggestion='0']").focus({ preventScroll: true });
}

function closeChatbot() {
  window.clearTimeout(chatbotTypewriterTimer);
  chatbotScreen.hidden = true;
  if (chatbotReturnTarget === "review") {
    professorOfficeScreen.hidden = true;
    reviewResultScreen.hidden = false;
    document.querySelector("[data-action='open-review-question']").focus({ preventScroll: true });
    return;
  }
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='chat']").focus({ preventScroll: true });
}

function openChatbotInput() {
  const directForm = document.querySelector("#chatbot-direct-form");
  document.querySelector(".chatbot-suggestions").classList.add("is-direct-entry");
  directForm.hidden = false;
  directForm.querySelector("input").focus({ preventScroll: true });
}

function moveChatbotHistory(direction) {
  const nextIndex = chatbotHistoryIndex + direction;
  if (nextIndex < 0 || nextIndex >= chatbotHistory.length) {
    return;
  }
  chatbotHistoryIndex = nextIndex;
  renderChatbotHistory(false);
}

function setReviewFile(file) {
  const message = document.querySelector(".review-form-message");
  const status = document.querySelector(".review-file-status");
  const allowedExtensions = [".pdf", ".txt"];
  const extension = file ? `.${file.name.split(".").pop().toLowerCase()}` : "";

  if (!file || !allowedExtensions.includes(extension)) {
    reviewFile = null;
    reviewDropzone.classList.remove("has-file");
    status.textContent = "";
    message.textContent = file ? "PDF 또는 텍스트 파일만 첨부할 수 있습니다." : "";
    return;
  }

  reviewFile = file;
  reviewDropzone.classList.add("has-file");
  status.dataset.fileType = extension.slice(1).toUpperCase();
  status.textContent = file.name;
  message.textContent = "";
}

function openFeature(feature) {
  if (["chat", "review"].includes(feature) && !updateAiFeatureAvailability()) {
    document.querySelector(".office-ai-requirement").textContent =
      "먼저 강의 자료 또는 강의 음성을 등록해 주세요.";
    return;
  }

  const featureHandlers = {
    chat: showChatbot,
    review: showAssignmentReview,
    material: showCourseMaterial,
    audio: showLectureAudio,
  };
  featureHandlers[feature]?.();
}

function closeFeature() {
  featureModalBackdrop.hidden = true;
  const returnTarget = !assignmentReviewScreen.hidden
    ? document.querySelector("[data-action='open-previous-assignments']")
    : reviewResultScreen.hidden
      ? document.querySelector("[data-feature]")
      : document.querySelector("[data-action='open-review-report']");
  returnTarget?.focus({ preventScroll: true });
}

function showTitle() {
  window.clearTimeout(transitionTimer);
  playIntroBgm();
  authScreen.hidden = true;
  introScreen.hidden = true;
  introScreen.classList.remove("is-visible");
  professorSelectScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  chatbotScreen.hidden = true;
  selectionModalBackdrop.hidden = true;
  featureModalBackdrop.hidden = true;
  selectionToast.hidden = true;
  closedScreen.hidden = true;
  titleScreen.hidden = false;
  titleScreen.classList.remove("is-leaving");
  updatePlayerName();
  setSelectedMenu(0);
}

function startGame() {
  if (titleScreen.classList.contains("is-leaving")) {
    return;
  }

  titleScreen.classList.add("is-leaving");
  transitionTimer = window.setTimeout(() => {
    titleScreen.hidden = true;
    introScreen.hidden = false;
    requestAnimationFrame(() => {
      introScreen.classList.add("is-visible");
      document.querySelector(".continue-button").focus({ preventScroll: true });
    });
  }, 850);
}

function continueGame() {
  introScreen.classList.remove("is-visible");
  transitionTimer = window.setTimeout(() => {
    introScreen.hidden = true;
    professorSelectScreen.hidden = false;
    playProfessorSelectBgm();
    renderProfessor(selectedProfessorId);
    document.querySelector(`[data-professor-id="${selectedProfessorId}"]`)
      ?.focus({ preventScroll: true });
  }, 500);
}

function openExitModal() {
  modalBackdrop.hidden = false;
  document.querySelector(".modal-button.cancel").focus({ preventScroll: true });
}

function closeExitModal() {
  modalBackdrop.hidden = true;
  menuButtons[selectedMenuIndex].focus({ preventScroll: true });
}

function exitGame() {
  modalBackdrop.hidden = true;
  stopAllBgm();
  titleScreen.hidden = true;
  introScreen.hidden = true;
  professorSelectScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = true;
  previousAssignmentsScreen.hidden = true;
  reviewResultScreen.hidden = true;
  reviewReportScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  chatbotScreen.hidden = true;
  closedScreen.hidden = false;

  window.close();
  document.querySelector(".closed-screen button").focus({ preventScroll: true });
}

function logout() {
  sessionStorage.removeItem(sessionStorageKey);
  Object.values(authForms).forEach((form) => form.reset());
  showAuth();
}

function handleAction(action) {
  const actions = {
    start: startGame,
    exit: openExitModal,
    continue: continueGame,
    back: showTitle,
    "cancel-exit": closeExitModal,
    "confirm-exit": exitGame,
    reopen: showTitle,
    "show-login": () => showAuthView("login"),
    "show-signup": () => showAuthView("signup"),
    "back-to-intro": backToIntro,
    "back-to-professors": backToProfessors,
    "close-feature": closeFeature,
    "close-review": closeAssignmentReview,
    "back-to-review-form": backToReviewForm,
    "open-review-report": openReviewReport,
    "close-review-report": closeReviewReport,
    "download-review-report": downloadReviewReport,
    "open-review-question": openReviewQuestion,
    "open-previous-assignments": openPreviousAssignments,
    "close-previous-assignments": closePreviousAssignments,
    "close-material": closeCourseMaterial,
    "close-audio": closeLectureAudio,
    "open-chatbot-input": openChatbotInput,
    "chatbot-back": () => moveChatbotHistory(-1),
    "chatbot-forward": () => moveChatbotHistory(1),
    "close-chatbot": closeChatbot,
    "cancel-selection": cancelSelection,
    "confirm-selection": confirmSelection,
    logout,
  };

  actions[action]?.();
}

document.addEventListener("pointerover", (event) => {
  const target = event.target.closest("button");
  if (!target || target.disabled || target === lastHoverSfxTarget) {
    return;
  }

  lastHoverSfxTarget = target;
  playHoverTick();
});

document.addEventListener("pointerout", (event) => {
  const target = event.target.closest("button");
  if (!target || target.contains(event.relatedTarget)) {
    return;
  }

  if (lastHoverSfxTarget === target) {
    lastHoverSfxTarget = null;
  }
});

document.addEventListener("click", (event) => {
  const featureTarget = event.target.closest("[data-feature]");
  if (featureTarget) {
    openFeature(featureTarget.dataset.feature);
    return;
  }

  const suggestionTarget = event.target.closest("[data-chat-suggestion]");
  if (suggestionTarget) {
    const suggestionIndex = Number(suggestionTarget.dataset.chatSuggestion);
    askChatbotQuestion(chatbotSuggestedQuestions[suggestionIndex] ?? "");
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    handleAction(actionTarget.dataset.action);
  }
});

menuButtons.forEach((button, index) => {
  button.addEventListener("pointerenter", () => setSelectedMenu(index));
  button.addEventListener("focus", () => setSelectedMenu(index));
});

const submissionForm = document.querySelector("#submission-form");
submissionForm.addEventListener("input", () => {
  document.querySelector(".submission-message").textContent = "";
});
submissionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const selectedProfile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const rawName = formData.get("professorName").trim();
  const customization = selectedProfile?.identityLocked
    ? {
      name: "키로 교수",
      age: 1,
      department: "AI 유령공학과",
    }
    : {
      name: rawName.endsWith("교수") ? rawName : `${rawName} 교수`,
      age: Number(formData.get("professorAge")),
      department: formData.get("professorDepartment").trim(),
    };

  if (!customization.name || !customization.department) {
    document.querySelector(".submission-message").textContent =
      "교수 이름과 소속 학과를 정확히 입력해 주세요.";
    return;
  }

  if (!selectedProfile?.identityLocked && (customization.age < 25 || customization.age > 100)) {
    document.querySelector(".submission-message").textContent =
      "교수 나이는 25세부터 100세 사이로 입력해 주세요.";
    return;
  }

  document.querySelector(".submission-message").textContent = "";
  playConfirmSfx();
  openSelectionModal(customization);
});

const assignmentReviewForm = document.querySelector("#assignment-review-form");
const reviewDropzone = document.querySelector(".review-dropzone");
const reviewDropInput = document.querySelector(".review-drop-input");

document.querySelectorAll("[data-review-file], .review-drop-input").forEach((input) => {
  input.addEventListener("change", () => setReviewFile(input.files[0]));
});

reviewDropzone.addEventListener("click", () => reviewDropInput.click());
reviewDropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    reviewDropInput.click();
  }
});
["dragenter", "dragover"].forEach((eventName) => {
  reviewDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    reviewDropzone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  reviewDropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    reviewDropzone.classList.remove("is-dragging");
  });
});
reviewDropzone.addEventListener("drop", (event) => {
  setReviewFile(event.dataTransfer.files[0]);
});

assignmentReviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = new FormData(event.currentTarget).get("reviewPrompt").trim();
  const message = document.querySelector(".review-form-message");

  if (!prompt) {
    message.textContent = "첨삭 지시 프롬프트를 입력해 주세요.";
    document.querySelector(".review-prompt-input").focus();
    return;
  }
  if (!reviewFile) {
    message.textContent = "PDF 또는 텍스트 과제 파일을 첨부해 주세요.";
    reviewDropzone.focus();
    return;
  }

  const reviewRequest = {
    professorId: selectedProfessorId,
    prompt,
    fileName: reviewFile.name,
    requestedAt: new Date().toISOString(),
  };
  sessionStorage.setItem("assignment-review-request", JSON.stringify(reviewRequest));
  saveReviewHistory(reviewRequest);
  message.textContent = "";
  showReviewResult(prompt, reviewFile.name);
});

const courseMaterialForm = document.querySelector("#course-material-form");
const materialFileInput = document.querySelector(".material-file-input");
const materialFileZone = document.querySelector(".material-file-zone");

materialFileZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    materialFileInput.click();
  }
});

function setMaterialFile(file) {
  const status = document.querySelector(".material-file-status");
  const message = document.querySelector(".material-form-message");
  const isPdf = Boolean(file) && file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    materialFile = null;
    materialFileZone.classList.remove("has-file");
    status.textContent = "";
    status.removeAttribute("data-file-type");
    status.removeAttribute("title");
    message.textContent = file ? "PDF 파일만 등록할 수 있습니다." : "";
    return;
  }

  materialFile = file;
  materialFileZone.classList.add("has-file");
  status.dataset.fileType = "PDF";
  status.textContent = file.name;
  status.title = file.name;
  message.textContent = "";
}

materialFileInput.addEventListener("change", () => {
  setMaterialFile(materialFileInput.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  materialFileZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    materialFileZone.classList.add("is-dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  materialFileZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    materialFileZone.classList.remove("is-dragging");
  });
});
materialFileZone.addEventListener("drop", (event) => {
  setMaterialFile(event.dataTransfer.files[0]);
});

courseMaterialForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.querySelector(".material-form-message");
  if (!materialFile) {
    message.textContent = "등록할 PDF 강의 파일을 선택해 주세요.";
    materialFileZone.focus();
    return;
  }

  const description = new FormData(event.currentTarget)
    .get("materialDescription")
    .trim();
  sessionStorage.setItem("assignment-review-course-material", JSON.stringify({
    professorId: selectedProfessorId,
    fileName: materialFile.name,
    description,
    status: "ready",
    uploadedAt: new Date().toISOString(),
  }));
  updateAiFeatureAvailability();
  message.textContent = "강의 자료가 등록되어 챗봇과 과제 첨삭이 활성화되었습니다.";
});

const lectureAudioForm = document.querySelector("#lecture-audio-form");
const audioFileInput = document.querySelector(".audio-file-input");
const audioFileZone = document.querySelector(".audio-file-zone");
const allowedAudioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"];

function setAudioFile(file) {
  const status = document.querySelector(".audio-file-status");
  const message = document.querySelector(".audio-form-message");
  const extension = file ? `.${file.name.split(".").pop().toLowerCase()}` : "";
  const isAudioFile = Boolean(file)
    && (file.type.startsWith("audio/") || allowedAudioExtensions.includes(extension));

  if (!isAudioFile) {
    audioFile = null;
    audioFileZone.classList.remove("has-file");
    status.textContent = "";
    status.removeAttribute("data-file-type");
    status.removeAttribute("title");
    message.textContent = file ? "지원되는 음성 파일을 선택해 주세요." : "";
    return;
  }

  audioFile = file;
  audioFileZone.classList.add("has-file");
  status.dataset.fileType = allowedAudioExtensions.includes(extension)
    ? extension.slice(1).toUpperCase()
    : "AUDIO";
  status.textContent = file.name;
  status.title = file.name;
  message.textContent = "";
}

audioFileZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    audioFileInput.click();
  }
});

audioFileInput.addEventListener("change", () => {
  setAudioFile(audioFileInput.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  audioFileZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    audioFileZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  audioFileZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    audioFileZone.classList.remove("is-dragging");
  });
});

audioFileZone.addEventListener("drop", (event) => {
  setAudioFile(event.dataTransfer.files[0]);
});

lectureAudioForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = document.querySelector(".audio-form-message");

  if (!audioFile) {
    message.textContent = "등록할 강의 음성 파일을 선택해 주세요.";
    audioFileZone.focus();
    return;
  }

  sessionStorage.setItem("assignment-review-lecture-audio", JSON.stringify({
    professorId: selectedProfessorId,
    fileName: audioFile.name,
    fileType: audioFile.type,
    fileSize: audioFile.size,
    status: "ready",
    uploadedAt: new Date().toISOString(),
  }));
  updateAiFeatureAvailability();
  message.textContent = "강의 음성이 등록되어 챗봇과 과제 첨삭이 활성화되었습니다.";
});

document.querySelector("#chatbot-direct-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("input");
  const question = input.value.trim();
  if (!question) {
    input.focus();
    return;
  }

  input.value = "";
  form.hidden = true;
  document.querySelector(".chatbot-suggestions").classList.remove("is-direct-entry");
  askChatbotQuestion(question);
});

authForms.login.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const accountId = formData.get("account").trim().toLowerCase();
  const passwordHash = await hashPassword(formData.get("password"));
  const account = readAccounts().find((item) => item.account === accountId);

  if (!account || account.passwordHash !== passwordHash) {
    setAuthMessage(form, "계정 또는 비밀번호가 일치하지 않습니다.");
    return;
  }

  setAuthMessage(form, "확인되었습니다. 연구실 문을 여는 중입니다.", true);
  enterTitle(account);
});

authForms.signup.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = formData.get("name").trim();
  const accountId = formData.get("account").trim().toLowerCase();
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");
  const accounts = readAccounts();

  if (password !== passwordConfirm) {
    setAuthMessage(form, "비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  if (accounts.some((account) => account.account === accountId)) {
    setAuthMessage(form, "이미 수강 명단에 등록된 계정입니다.");
    return;
  }

  const account = {
    name,
    account: accountId,
    passwordHash: await hashPassword(password),
  };

  accounts.push(account);
  saveAccounts(accounts);
  setAuthMessage(form, "등록되었습니다. 연구실 문을 여는 중입니다.", true);
  enterTitle(account);
});

document.addEventListener("keydown", (event) => {
  if (!featureModalBackdrop.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFeature();
    }
    return;
  }

  if (!assignmentReviewScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAssignmentReview();
    }
    return;
  }

  if (!previousAssignmentsScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePreviousAssignments();
    }
    return;
  }

  if (!reviewResultScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      backToReviewForm();
    }
    return;
  }

  if (!reviewReportScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeReviewReport();
    }
    return;
  }

  if (!courseMaterialScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCourseMaterial();
    }
    return;
  }

  if (!lectureAudioScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLectureAudio();
    }
    return;
  }

  if (!chatbotScreen.hidden) {
    const directForm = document.querySelector("#chatbot-direct-form");
    if (event.key === "Escape") {
      event.preventDefault();
      if (!directForm.hidden) {
        directForm.hidden = true;
        directForm.reset();
        document.querySelector(".chatbot-suggestions").classList.remove("is-direct-entry");
        document.querySelector(".chatbot-direct-button").focus({ preventScroll: true });
      } else {
        closeChatbot();
      }
    }
    if (!directForm.hidden) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveChatbotHistory(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveChatbotHistory(1);
    }
    return;
  }

  if (!selectionModalBackdrop.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelSelection();
    }
    return;
  }

  if (!modalBackdrop.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeExitModal();
    }
    return;
  }

  if (!closedScreen.hidden) {
    if (event.key === "Enter") {
      showTitle();
    }
    return;
  }

  if (!titleScreen.hidden && !titleScreen.classList.contains("is-leaving")) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setSelectedMenu(selectedMenuIndex + direction, true);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      menuButtons[selectedMenuIndex].click();
    }
  }

  if (event.key === "Escape" && !professorSelectScreen.hidden) {
    event.preventDefault();
    backToIntro();
    return;
  }

  if (event.key === "Escape" && !professorOfficeScreen.hidden) {
    event.preventDefault();
    backToProfessors();
    return;
  }

  if (event.key === "Escape" && authScreen.hidden && titleScreen.hidden) {
    event.preventDefault();
    showTitle();
  }
});

const savedProfessorId = sessionStorage.getItem("assignment-review-professor");
if (professorProfiles.some((profile) => profile.id === savedProfessorId)) {
  selectedProfessorId = savedProfessorId;
}
initializeProfessorRoster();
renderProfessor(selectedProfessorId);
setSelectedMenu(0);

if (getSession()) {
  showTitle();
} else {
  showAuth();
}

const unlockBgmPlayback = () => {
  if (!professorSelectScreen.hidden) {
    playProfessorSelectBgm();
    return;
  }
  if (isOfficeFlowVisible()) {
    playOfficeBgm();
    return;
  }
  if (!authScreen.hidden || !titleScreen.hidden || !introScreen.hidden) {
    playIntroBgm();
  }
};

["pointerdown", "keydown"].forEach((eventName) => {
  document.addEventListener(eventName, unlockBgmPlayback, { once: true });
});
