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
let resultProfessorRequestId = 0;
const transparentProfessorImageCache = new Map();
const mainScreenUrl = "/main-screen.jpg";
const accountStorageKey = "assignment-review-accounts";
const sessionStorageKey = "assignment-review-session";
const professorCustomizationStorageKey = "assignment-review-professor-customizations";
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
  const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
  const request = JSON.parse(sessionStorage.getItem("assignment-review-request") ?? "{}");
  const title = document.querySelector("#feature-modal-title");
  const content = document.querySelector(".feature-modal-content");
  title.textContent = "과제 첨삭 보고서";
  content.innerHTML = `
    <article class="review-report">
      <div class="report-meta">
        <span>담당 교수</span><strong class="report-professor"></strong>
        <span>과제 파일</span><strong class="report-file"></strong>
      </div>
      <section>
        <h3>종합 의견</h3>
        <p class="report-comment"></p>
      </section>
      <section>
        <h3>우선 수정 항목</h3>
        <ol>
          <li>각 문단의 핵심 주장을 첫 문장에 명확히 제시할 것</li>
          <li>주장 직후 신뢰할 수 있는 출처와 구체적 사례를 배치할 것</li>
          <li>결론에서 본론의 근거를 빠짐없이 회수할 것</li>
        </ol>
      </section>
      <button class="report-download-button" type="button">텍스트 보고서 저장</button>
    </article>
  `;
  content.querySelector(".report-professor").textContent = profile.name;
  content.querySelector(".report-file").textContent = request.fileName ?? reviewFile?.name ?? "과제 파일";
  content.querySelector(".report-comment").textContent = lastReviewComment;
  content.querySelector(".report-download-button").addEventListener("click", downloadReviewReport);
  featureModalBackdrop.hidden = false;
  content.querySelector(".report-download-button").focus({ preventScroll: true });
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

function handleChatSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("textarea");
  const chatLog = form.closest(".chat-workspace").querySelector(".chat-log");
  const userMessage = document.createElement("div");
  userMessage.className = "chat-message user-message";
  userMessage.textContent = input.value.trim();
  chatLog.append(userMessage);
  input.value = "";
  chatLog.scrollTop = chatLog.scrollHeight;

  window.setTimeout(() => {
    const profile = professorProfiles.find((item) => item.id === selectedProfessorId);
    const response = document.createElement("div");
    response.className = "chat-message professor-message";
    response.textContent =
      `${profile.name}: 질문을 확인했습니다. 백엔드가 연결되면 과제와 강의 자료를 바탕으로 답변하겠습니다.`;
    chatLog.append(response);
    chatLog.scrollTop = chatLog.scrollHeight;
  }, 450);
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

  sessionStorage.setItem("assignment-review-request", JSON.stringify({
    professorId: selectedProfessorId,
    prompt,
    fileName: reviewFile.name,
    requestedAt: new Date().toISOString(),
  }));
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
    uploadedAt: new Date().toISOString(),
  }));
  message.textContent = "강의 자료 등록 준비가 완료되었습니다. 백엔드 연결 후 서버에 저장됩니다.";
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
    uploadedAt: new Date().toISOString(),
  }));
  message.textContent = "강의 음성 등록 준비가 완료되었습니다. 백엔드 연결 후 서버에 저장됩니다.";
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

if (getSession()) {
  showTitle();
} else {
  showAuth();
}
