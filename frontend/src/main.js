import {
  analyzeLectureAudio,
  getCurrentUser,
  getLectureMaterials,
  getProfessors,
  gradeAssignment,
  loginUser,
  logoutUser,
  registerUser,
  saveProfessor,
  ScholarlyApiError,
  sendProfessorChat,
  uploadLectureMaterial,
} from "./api.js";

const authScreen = document.querySelector(".auth-screen");
const titleScreen = document.querySelector(".title-screen");
const titleImage = document.querySelector(".title-image");
const introScreen = document.querySelector(".intro-screen");
const professorSelectScreen = document.querySelector(".professor-select-screen");
const professorOfficeScreen = document.querySelector(".professor-office-screen");
const assignmentReviewScreen = document.querySelector(".assignment-review-screen");
const reviewResultScreen = document.querySelector(".review-result-screen");
const courseMaterialScreen = document.querySelector(".course-material-screen");
const lectureAudioScreen = document.querySelector(".lecture-audio-screen");
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

let selectedMenuIndex = 0;
let selectedProfessorId = "yoon";
let transitionTimer;
let professorHoverTimer;
let toastTimer;
let heroRequestId = 0;
let pendingProfessorCustomization = null;
let reviewFile = null;
let materialFile = null;
let audioFile = null;
let typewriterTimer;
let lastReviewComment = "";
let lastReviewReport = null;
let resultProfessorRequestId = 0;
let currentUser = null;
let featureRequestController = null;
const transparentProfessorImageCache = new Map();
const serverProfessors = new Map();
const professorChatHistories = new Map();
const professorLectureMaterials = new Map();
const professorPersonaProfiles = new Map();
const mainScreenUrl = "/main-screen.jpg";
const sessionStorageKey = "assignment-review-session";
const professorCustomizationStoragePrefix = "assignment-review-professor-customizations";
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
const professorBaseProfiles = professorProfiles.map((profile, index) => ({
  name: profile.name,
  department: profile.department,
  age: defaultProfessorAges[index],
}));
const savedProfessorCustomizations = readProfessorCustomizations();

professorProfiles.forEach((profile, index) => {
  const customization = savedProfessorCustomizations[profile.id];
  profile.image = professorAssetUrls[index] ?? createFallbackPortrait(profile);
  profile.heroImage = professorFullBodyUrls[index] ?? profile.image;
  profile.facePosition = profile.facePosition ?? "50% 16%";
  profile.heroPosition = profile.heroPosition ?? "50% 100%";
  profile.customized = Boolean(customization);
  profile.age = customization?.age ?? defaultProfessorAges[index];
  profile.name = customization?.name ?? profile.name;
  profile.department = customization?.department ?? profile.department;
});

titleImage.src = mainScreenUrl;
document.documentElement.style.setProperty("--main-screen", `url("${mainScreenUrl}")`);

function readProfessorCustomizations() {
  try {
    const owner = currentUser?.id ?? "anonymous";
    return JSON.parse(
      localStorage.getItem(`${professorCustomizationStoragePrefix}:${owner}`),
    ) ?? {};
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
  const owner = currentUser?.id ?? "anonymous";
  localStorage.setItem(
    `${professorCustomizationStoragePrefix}:${owner}`,
    JSON.stringify(customizations),
  );
}

function apiErrorText(error, fallback) {
  return error instanceof ScholarlyApiError ? error.message : fallback;
}

function beginFeatureRequest() {
  featureRequestController?.abort();
  featureRequestController = new AbortController();
  return featureRequestController;
}

function selectedProfessor() {
  return professorProfiles.find((item) => item.id === selectedProfessorId);
}

function selectedServerProfessor() {
  return serverProfessors.get(selectedProfessorId) ?? null;
}

function currentProfessorPersona(profile) {
  const analyzed = professorPersonaProfiles.get(profile.id);
  const analyzedDna = analyzed?.dna ?? {};
  return {
    professor_name: profile.name,
    department: profile.department,
    subject: profile.specialty,
    summary_bio:
      analyzed?.summary_bio ||
      `${profile.type}. ${profile.specialty} 대표 발언: ${profile.quote}`,
    tone_description:
      analyzedDna.tone_description ||
      analyzed?.tone_description ||
      "엄격하지만 근거를 분명하게 설명하는 지도 교수의 어조",
    sentence_endings:
      analyzedDna.sentence_endings || analyzed?.sentence_endings || ["입니다", "하세요", "봅시다"],
    filler_words: analyzedDna.filler_words || analyzed?.filler_words || [],
  };
}

async function hydrateServerProfessors() {
  const records = await getProfessors();
  const localCustomizations = readProfessorCustomizations();
  professorProfiles.forEach((profile, index) => {
    const base = professorBaseProfiles[index];
    const local = localCustomizations[profile.id];
    profile.name = local?.name ?? base.name;
    profile.age = local?.age ?? base.age;
    profile.department = local?.department ?? base.department;
    profile.customized = Boolean(local);
  });
  serverProfessors.clear();
  records.forEach((record) => {
    if (!record.template_id) return;
    serverProfessors.set(record.template_id, record);
    const profile = professorProfiles.find((item) => item.id === record.template_id);
    if (!profile) return;
    profile.name = record.name;
    profile.age = record.age ?? profile.age;
    profile.department = record.department;
    profile.customized = true;
    if (record.persona_profile) {
      professorPersonaProfiles.set(profile.id, record.persona_profile);
    }
  });
  initializeProfessorRoster();
  renderProfessor(selectedProfessorId);
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
  reviewResultScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  closedScreen.hidden = true;
  modalBackdrop.hidden = true;
  selectionModalBackdrop.hidden = true;
  featureModalBackdrop.hidden = true;
  selectionToast.hidden = true;
  authScreen.hidden = false;
  authScreen.classList.remove("is-leaving");
  showAuthView("login");
}

function setSession(user) {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify({
    account: user.login_id,
    name: user.display_name,
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

function enterTitle(user, animate = true) {
  currentUser = user;
  setSession(user);
  updatePlayerName();
  if (!animate) {
    authScreen.hidden = true;
    showTitle();
    return;
  }
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
      class="professor-tile${sessionStorage.getItem("assignment-review-professor") === profile.id ? " is-confirmed" : ""}"
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
      window.clearTimeout(professorHoverTimer);
      professorHoverTimer = window.setTimeout(() => renderProfessor(professorId), 90);
    });
    tile.addEventListener("focus", () => renderProfessor(professorId));
    tile.addEventListener("click", () => renderProfessor(professorId));
  });

  professorGrid.addEventListener("keydown", (event) => {
    const currentTile = event.target.closest(".professor-tile");
    if (!currentTile) {
      return;
    }

    const tiles = [...professorGrid.querySelectorAll(".professor-tile")];
    const currentIndex = tiles.indexOf(currentTile);
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

  form.dataset.professorId = profile.id;
  form.elements.professorName.value = profile.customized
    ? profile.name.replace(/\s*교수$/, "")
    : "";
  form.elements.professorAge.value = profile.customized ? profile.age : "";
  form.elements.professorDepartment.value = profile.customized ? profile.department : "";
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

  document.querySelector(".office-professor-image").src = profile.heroImage;
  document.querySelector(".office-professor-image").alt = `${profile.name} 전신`;
  document.querySelector(".office-professor-name").textContent = profile.name;
  document.querySelector(".office-professor-age").textContent = `${profile.age}세`;
  document.querySelector(".office-professor-department").textContent = profile.department;

  professorSelectScreen.hidden = true;
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='chat']").focus({ preventScroll: true });
}

function backToProfessors() {
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  professorSelectScreen.hidden = false;
  renderProfessor(selectedProfessorId);
  document.querySelector(`[data-professor-id="${selectedProfessorId}"]`)
    ?.focus({ preventScroll: true });
}

async function confirmSelection() {
  const profile = selectedProfessor();
  if (!pendingProfessorCustomization) {
    cancelSelection();
    return;
  }

  const customization = pendingProfessorCustomization;
  const confirmButton = document.querySelector(".professor-confirm");
  const modalCopy = document.querySelector(".selection-modal-copy");
  confirmButton.disabled = true;
  modalCopy.textContent = "교수 프로필을 서버에 저장하고 있습니다…";

  try {
    const record = await saveProfessor({
      template_id: profile.id,
      name: customization.name,
      age: customization.age,
      department: customization.department,
      lab_name: null,
      specialty: profile.specialty,
      personality_type: profile.type,
      traits: profile.specialty,
      representative_quote: profile.quote,
      difficulty: profile.difficulty,
      make_active: true,
    });
    serverProfessors.set(profile.id, record);
  } catch (error) {
    modalCopy.textContent = apiErrorText(error, "교수 프로필 저장에 실패했습니다.");
    confirmButton.disabled = false;
    return;
  }

  profile.name = customization.name;
  profile.age = customization.age;
  profile.department = customization.department;
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
  confirmButton.disabled = false;
  showProfessorOffice();
}

const uploadFeatureSettings = {
  audio: {
    title: "강의 음성 업로드",
    guide: "녹음된 강의 음성 파일을 등록해 주세요.",
    accept: "audio/*",
    button: "강의 음성 등록하기",
  },
};

function showAssignmentReview() {
  featureModalBackdrop.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = false;
  document.querySelector(".review-prompt-input").focus({ preventScroll: true });
}

function closeAssignmentReview() {
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = true;
  professorOfficeScreen.hidden = false;
  document.querySelector("[data-feature='review']").focus({ preventScroll: true });
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

function showReviewResult(prompt, fileName, report) {
  const profile = selectedProfessor();
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

  lastReviewReport = report;
  lastReviewComment = report.summary;
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = false;
  requestAnimationFrame(() => {
    typeReviewComment(lastReviewComment);
    document.querySelector("[data-action='open-review-report']").focus({ preventScroll: true });
  });
}

function backToReviewForm() {
  window.clearTimeout(typewriterTimer);
  reviewResultScreen.hidden = true;
  featureModalBackdrop.hidden = true;
  assignmentReviewScreen.hidden = false;
  document.querySelector(".review-prompt-input").focus({ preventScroll: true });
}

function openReviewReport() {
  const profile = selectedProfessor();
  const request = JSON.parse(sessionStorage.getItem("assignment-review-request") ?? "{}");
  const title = document.querySelector("#feature-modal-title");
  const content = document.querySelector(".feature-modal-content");
  const report = lastReviewReport;
  if (!report) return;
  title.textContent = "과제 첨삭 보고서";
  content.innerHTML = `
    <article class="review-report">
      <div class="report-meta">
        <span>담당 교수</span><strong class="report-professor"></strong>
        <span>과제 파일</span><strong class="report-file"></strong>
        <span>평가 결과</span><strong class="report-grade"></strong>
        <span>분석 엔진</span><strong class="report-engine"></strong>
      </div>
      <section>
        <h3>종합 의견</h3>
        <p class="report-comment"></p>
      </section>
      <section>
        <h3>우선 수정 항목</h3>
        <ol class="report-priorities"></ol>
      </section>
      <button class="report-download-button" type="button">텍스트 보고서 저장</button>
    </article>
  `;
  content.querySelector(".report-professor").textContent = profile.name;
  content.querySelector(".report-file").textContent = request.fileName ?? reviewFile?.name ?? "과제 파일";
  content.querySelector(".report-grade").textContent = `${report.grade} · ${report.total_score}점`;
  content.querySelector(".report-engine").textContent = report.engine;
  content.querySelector(".report-comment").textContent = lastReviewComment;
  const priorityList = content.querySelector(".report-priorities");
  report.priorities.forEach((priority) => {
    const item = document.createElement("li");
    item.textContent = priority;
    priorityList.append(item);
  });
  content.querySelector(".report-download-button").addEventListener("click", downloadReviewReport);
  featureModalBackdrop.hidden = false;
  content.querySelector(".report-download-button").focus({ preventScroll: true });
}

function downloadReviewReport() {
  const profile = selectedProfessor();
  const reportData = lastReviewReport;
  if (!reportData) return;
  const report = [
    "과제 첨삭 보고서",
    `담당 교수: ${profile.name}`,
    `평가: ${reportData.grade} · ${reportData.total_score}점`,
    `분석 엔진: ${reportData.engine}`,
    "",
    lastReviewComment,
    "",
    "우선 수정 항목",
    ...reportData.priorities.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "과제-첨삭-보고서.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function openReviewQuestion() {
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const title = document.querySelector("#feature-modal-title");
  const content = document.querySelector(".feature-modal-content");
  title.textContent = "첨삭 내용 질문하기";
  content.innerHTML = `
    <div class="chat-workspace">
      <div class="chat-log" aria-live="polite">
        <div class="chat-message professor-message"></div>
      </div>
      <form class="chat-form">
        <label class="sr-only" for="review-question-input">첨삭 내용 질문</label>
        <textarea id="review-question-input" rows="2" maxlength="500" placeholder="첨삭 내용에 관해 질문하세요" required></textarea>
        <button type="submit">전송</button>
        <p class="chat-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  `;
  content.querySelector(".professor-message").textContent =
    `${profile.name}입니다. 방금 전달한 첨삭 내용 중 이해되지 않는 부분을 질문하세요.`;
  content.querySelector(".chat-form").addEventListener("submit", handleChatSubmit);
  featureModalBackdrop.hidden = false;
  content.querySelector("textarea").focus({ preventScroll: true });
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
  if (feature === "review") {
    showAssignmentReview();
    return;
  }
  if (feature === "material") {
    showCourseMaterial();
    return;
  }
  if (feature === "audio") {
    showLectureAudio();
    return;
  }

  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const title = document.querySelector("#feature-modal-title");
  const content = document.querySelector(".feature-modal-content");

  if (feature === "chat") {
    title.textContent = "교수 챗봇";
    content.innerHTML = `
      <div class="chat-workspace">
        <div class="chat-log" aria-live="polite">
          <div class="chat-message professor-message"></div>
        </div>
        <form class="chat-form">
          <label class="sr-only" for="chat-input">교수에게 보낼 메시지</label>
          <textarea id="chat-input" rows="2" maxlength="500" placeholder="교수에게 질문을 입력하세요" required></textarea>
          <button type="submit">전송</button>
          <p class="chat-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    `;
    content.querySelector(".professor-message").textContent =
      `${profile.name}입니다. 과제에 관해 궁금한 점을 질문하세요.`;
    content.querySelector(".chat-form").addEventListener("submit", handleChatSubmit);
  } else {
    const settings = uploadFeatureSettings[feature];
    if (!settings) {
      return;
    }
    title.textContent = settings.title;
    content.innerHTML = `
      <form class="feature-upload-form">
        <p class="upload-guide"></p>
        <label class="upload-dropzone" tabindex="0">
          <input type="file" accept="${settings.accept}" required />
          <strong>파일 선택</strong>
          <span>파일을 클릭해서 불러오세요</span>
        </label>
        <p class="upload-file-name" role="status">선택된 파일이 없습니다.</p>
        <button class="feature-submit-button" type="submit" disabled></button>
        <p class="feature-result" role="status" aria-live="polite"></p>
      </form>
    `;
    content.querySelector(".upload-guide").textContent = settings.guide;
    content.querySelector(".feature-submit-button").textContent = settings.button;
    setupUploadForm(content.querySelector(".feature-upload-form"), settings.title);
  }

  featureModalBackdrop.hidden = false;
  requestAnimationFrame(() => {
    content.querySelector("textarea, .upload-dropzone, button")?.focus({ preventScroll: true });
  });
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("textarea");
  const submitButton = form.querySelector("button[type='submit']");
  const status = form.querySelector(".chat-status");
  const chatLog = form.closest(".chat-workspace").querySelector(".chat-log");
  const profile = selectedProfessor();
  const serverProfile = selectedServerProfessor();
  const message = input.value.trim();
  if (!message) return;
  if (!serverProfile) {
    status.textContent = "먼저 교수 선택 화면에서 교수 정보를 저장해 주세요.";
    return;
  }

  const history = professorChatHistories.get(profile.id) || [];
  const userMessage = document.createElement("div");
  userMessage.className = "chat-message user-message";
  userMessage.textContent = message;
  chatLog.append(userMessage);
  history.push({ role: "student", content: message });
  professorChatHistories.set(profile.id, history);
  input.value = "";
  chatLog.scrollTop = chatLog.scrollHeight;
  input.disabled = true;
  submitButton.disabled = true;
  status.textContent = "IntentRouter → AcademicBrainAgent → PersonaStylizerAgent 실행 중…";
  status.classList.remove("is-error");
  const controller = beginFeatureRequest();

  try {
    const result = await sendProfessorChat({
      professorId: serverProfile.id,
      message,
      history: history.slice(0, -1),
      persona: currentProfessorPersona(profile),
      signal: controller.signal,
    });
    if (!form.isConnected) return;
    const response = document.createElement("div");
    response.className = "chat-message professor-message";
    response.textContent = result.reply;
    chatLog.append(response);
    history.push({ role: "professor", content: result.reply });
    const materialCount = result.context_sources?.length ?? 0;
    status.textContent = materialCount
      ? `답변 완료 · 강의자료 ${materialCount}개 참고`
      : result.caution || "답변 생성이 완료되었습니다.";
    chatLog.scrollTop = chatLog.scrollHeight;
  } catch (error) {
    if (!form.isConnected) return;
    status.textContent = apiErrorText(error, "교수 대화 요청에 실패했습니다.");
    status.classList.add("is-error");
  } finally {
    if (form.isConnected) {
      input.disabled = false;
      submitButton.disabled = false;
      input.focus({ preventScroll: true });
    }
  }
}

function setupUploadForm(form, featureTitle) {
  const input = form.querySelector("input[type='file']");
  const fileName = form.querySelector(".upload-file-name");
  const submitButton = form.querySelector(".feature-submit-button");
  const result = form.querySelector(".feature-result");

  input.addEventListener("change", () => {
    const file = input.files[0];
    fileName.textContent = file ? file.name : "선택된 파일이 없습니다.";
    submitButton.disabled = !file;
    result.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.files[0]) {
      return;
    }
    result.textContent = `${featureTitle} 준비가 완료되었습니다. 백엔드 연결 후 서버에 저장됩니다.`;
  });
}

function closeFeature() {
  featureRequestController?.abort();
  featureRequestController = null;
  featureModalBackdrop.hidden = true;
  const returnTarget = reviewResultScreen.hidden
    ? document.querySelector("[data-feature]")
    : document.querySelector("[data-action='open-review-report']");
  returnTarget?.focus({ preventScroll: true });
}

function showTitle() {
  window.clearTimeout(transitionTimer);
  authScreen.hidden = true;
  introScreen.hidden = true;
  introScreen.classList.remove("is-visible");
  professorSelectScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
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
  titleScreen.hidden = true;
  introScreen.hidden = true;
  professorSelectScreen.hidden = true;
  professorOfficeScreen.hidden = true;
  assignmentReviewScreen.hidden = true;
  reviewResultScreen.hidden = true;
  courseMaterialScreen.hidden = true;
  lectureAudioScreen.hidden = true;
  closedScreen.hidden = false;

  window.close();
  document.querySelector(".closed-screen button").focus({ preventScroll: true });
}

async function logout() {
  try {
    await logoutUser();
  } catch {
    // 쿠키가 이미 만료된 경우에도 로컬 화면은 로그인으로 되돌립니다.
  } finally {
    currentUser = null;
    serverProfessors.clear();
    professorChatHistories.clear();
    professorLectureMaterials.clear();
    professorPersonaProfiles.clear();
    sessionStorage.removeItem(sessionStorageKey);
    sessionStorage.removeItem("assignment-review-professor");
    Object.values(authForms).forEach((form) => form.reset());
    showAuth();
  }
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
    "open-review-question": openReviewQuestion,
    "close-material": closeCourseMaterial,
    "close-audio": closeLectureAudio,
    "cancel-selection": cancelSelection,
    "confirm-selection": confirmSelection,
    logout,
  };

  actions[action]?.();
}

document.addEventListener("click", (event) => {
  const featureTarget = event.target.closest("[data-feature]");
  if (featureTarget) {
    openFeature(featureTarget.dataset.feature);
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
  const rawName = formData.get("professorName").trim();
  const customization = {
    name: rawName.endsWith("교수") ? rawName : `${rawName} 교수`,
    age: Number(formData.get("professorAge")),
    department: formData.get("professorDepartment").trim(),
  };

  if (!rawName || !customization.department) {
    document.querySelector(".submission-message").textContent =
      "교수 이름과 소속 학과를 정확히 입력해 주세요.";
    return;
  }

  if (customization.age < 25 || customization.age > 100) {
    document.querySelector(".submission-message").textContent =
      "교수 나이는 25세부터 100세 사이로 입력해 주세요.";
    return;
  }

  document.querySelector(".submission-message").textContent = "";
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

assignmentReviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = new FormData(event.currentTarget).get("reviewPrompt").trim();
  const message = document.querySelector(".review-form-message");
  const submitButton = document.querySelector(".review-start-button");
  const serverProfile = selectedServerProfessor();

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
  if (!serverProfile) {
    message.textContent = "먼저 교수 선택 화면에서 교수 정보를 저장해 주세요.";
    return;
  }

  submitButton.disabled = true;
  message.textContent = "최신 강의자료를 불러와 과제 첨삭을 진행하고 있습니다…";
  const controller = beginFeatureRequest();
  try {
    const materials = await getLectureMaterials(serverProfile.id, controller.signal);
    professorLectureMaterials.set(selectedProfessorId, materials);
    if (!materials.length) {
      throw new ScholarlyApiError(
        "저장된 강의자료가 없습니다. 먼저 강의 자료 PDF를 업로드해 주세요.",
        422,
      );
    }
    const report = await gradeAssignment({
      lectureText: materials[0].summary,
      assignmentText: prompt,
      submissionFile: reviewFile,
      signal: controller.signal,
    });
    sessionStorage.setItem("assignment-review-request", JSON.stringify({
      professorId: serverProfile.id,
      prompt,
      fileName: reviewFile.name,
      materialId: materials[0].id,
      requestedAt: new Date().toISOString(),
    }));
    message.textContent = "";
    showReviewResult(prompt, reviewFile.name, report);
  } catch (error) {
    message.textContent = apiErrorText(error, "과제 첨삭 요청에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
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

courseMaterialForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector(".material-form-message");
  const submitButton = document.querySelector(".material-submit-button");
  const serverProfile = selectedServerProfessor();
  if (!materialFile) {
    message.textContent = "등록할 PDF 강의 파일을 선택해 주세요.";
    materialFileZone.focus();
    return;
  }
  if (!serverProfile) {
    message.textContent = "먼저 교수 선택 화면에서 교수 정보를 저장해 주세요.";
    return;
  }

  const description = new FormData(event.currentTarget)
    .get("materialDescription")
    .trim();
  const title = description.split(/\r?\n/, 1)[0].slice(0, 200)
    || materialFile.name.replace(/\.pdf$/i, "");
  submitButton.disabled = true;
  message.textContent = "PDF 추출·청킹·요약·저장 중입니다…";
  const controller = beginFeatureRequest();
  try {
    const material = await uploadLectureMaterial({
      professorId: serverProfile.id,
      title,
      file: materialFile,
      signal: controller.signal,
    });
    const existing = professorLectureMaterials.get(selectedProfessorId) || [];
    professorLectureMaterials.set(
      selectedProfessorId,
      [material, ...existing.filter((item) => item.id !== material.id)],
    );
    sessionStorage.setItem("assignment-review-course-material", JSON.stringify({
      professorId: serverProfile.id,
      materialId: material.id,
      fileName: material.file_name,
      description,
      uploadedAt: material.created_at,
    }));
    message.textContent = material.cache_hit
      ? "이전에 요약한 PDF라 저장된 결과를 불러왔습니다."
      : "PDF 요약과 저장이 완료되었습니다.";

    document.querySelector("#feature-modal-title").textContent = "강의 자료 요약 결과";
    const content = document.querySelector(".feature-modal-content");
    content.innerHTML = `
      <article class="pipeline-result">
        <p class="result-meta"></p>
        <h3>전체 요약</h3>
        <pre class="result-transcript"></pre>
      </article>
    `;
    content.querySelector(".result-meta").textContent =
      `${material.title} · ${material.total_pages}페이지 · ${material.engine}`;
    content.querySelector(".result-transcript").textContent = material.summary;
    featureModalBackdrop.hidden = false;
  } catch (error) {
    message.textContent = apiErrorText(error, "강의자료 업로드에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
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

lectureAudioForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector(".audio-form-message");
  const submitButton = document.querySelector(".audio-submit-button");
  const profile = selectedProfessor();
  const serverProfile = selectedServerProfessor();

  if (!audioFile) {
    message.textContent = "등록할 강의 음성 파일을 선택해 주세요.";
    audioFileZone.focus();
    return;
  }
  if (!serverProfile) {
    message.textContent = "먼저 교수 선택 화면에서 교수 정보를 저장해 주세요.";
    return;
  }

  submitButton.disabled = true;
  message.textContent =
    "고정 음성 전문을 확인하고, 없으면 업로드한 음성을 STT·LLM으로 분석하고 있습니다…";
  const controller = beginFeatureRequest();
  try {
    const analysis = await analyzeLectureAudio({
      professorId: serverProfile.id,
      professorName: profile.name,
      department: profile.department,
      subject: profile.specialty,
      file: audioFile,
      signal: controller.signal,
    });
    professorPersonaProfiles.set(profile.id, analysis.persona_profile);
    serverProfessors.set(profile.id, {
      ...serverProfile,
      persona_profile: analysis.persona_profile,
    });
    sessionStorage.setItem("assignment-review-lecture-audio", JSON.stringify({
      professorId: serverProfile.id,
      fileName: analysis.uploaded_audio_name,
      fileType: audioFile.type,
      fileSize: analysis.uploaded_audio_size,
      uploadedAt: analysis.extracted_at,
    }));
    message.textContent = analysis.source_file_name === "transcript.txt"
      ? "고정 음성 전문을 사용한 교수 말투 특징 추출이 완료되었습니다."
      : "음성 STT, 강의 요약, 교수 말투 특징 추출이 완료되었습니다.";

    document.querySelector("#feature-modal-title").textContent = "강의 음성 분석 결과";
    const content = document.querySelector(".feature-modal-content");
    content.innerHTML = `
      <article class="pipeline-result">
        <p class="result-meta"></p>
        <h3>강의 요약</h3>
        <pre class="result-summary"></pre>
        <h3>추출된 특징</h3>
        <pre class="result-features"></pre>
        <h3>사용한 음성 전문</h3>
        <pre class="result-transcript"></pre>
      </article>
    `;
    content.querySelector(".result-meta").textContent =
      `${analysis.source_file_name} · ${analysis.character_count}자 · ${analysis.engine}`;
    content.querySelector(".result-summary").textContent = analysis.summary;
    content.querySelector(".result-features").textContent =
      JSON.stringify(analysis.persona_profile, null, 2);
    content.querySelector(".result-transcript").textContent =
      analysis.professor_transcript;
    featureModalBackdrop.hidden = false;
  } catch (error) {
    message.textContent = apiErrorText(error, "강의 음성 분석에 실패했습니다.");
  } finally {
    submitButton.disabled = false;
  }
});

authForms.login.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const accountId = formData.get("account").trim().toLowerCase();
  const password = formData.get("password");
  const submitButton = form.querySelector(".auth-submit");
  submitButton.disabled = true;
  setAuthMessage(form, "서버에서 계정을 확인하고 있습니다…", true);

  try {
    const user = await loginUser({ loginId: accountId, password });
    currentUser = user;
    await hydrateServerProfessors();
    setAuthMessage(form, "확인되었습니다. 연구실 문을 여는 중입니다.", true);
    enterTitle(user);
  } catch (error) {
    setAuthMessage(form, apiErrorText(error, "로그인에 실패했습니다."));
  } finally {
    submitButton.disabled = false;
  }
});

authForms.signup.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = formData.get("name").trim();
  const accountId = formData.get("account").trim().toLowerCase();
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");
  const submitButton = form.querySelector(".auth-submit");

  if (password !== passwordConfirm) {
    setAuthMessage(form, "비밀번호 확인이 일치하지 않습니다.");
    return;
  }
  if (password.length < 8) {
    setAuthMessage(form, "비밀번호를 8자 이상 입력해 주세요.");
    return;
  }

  submitButton.disabled = true;
  setAuthMessage(form, "수강 명단에 계정을 등록하고 있습니다…", true);
  try {
    const user = await registerUser({
      loginId: accountId,
      password,
      displayName: name,
      email: accountId.includes("@") ? accountId : null,
    });
    currentUser = user;
    serverProfessors.clear();
    setAuthMessage(form, "등록되었습니다. 연구실 문을 여는 중입니다.", true);
    enterTitle(user);
  } catch (error) {
    setAuthMessage(form, apiErrorText(error, "회원가입에 실패했습니다."));
  } finally {
    submitButton.disabled = false;
  }
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

  if (!reviewResultScreen.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      backToReviewForm();
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

async function bootstrapAuth() {
  try {
    const user = await getCurrentUser();
    currentUser = user;
    await hydrateServerProfessors();
    enterTitle(user, false);
  } catch (error) {
    sessionStorage.removeItem(sessionStorageKey);
    showAuth();
    if (error instanceof ScholarlyApiError && error.status !== 401) {
      setAuthMessage(
        authForms.login,
        apiErrorText(error, "로그인 서버 상태를 확인하지 못했습니다."),
      );
    }
  }
}

void bootstrapAuth();
