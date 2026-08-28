function findFeedbackRange(source, original) {
  const needle = original?.trim();
  if (!needle) return null;
  const directIndex = source.indexOf(needle);
  if (directIndex >= 0) {
    return { start: directIndex, end: directIndex + needle.length };
  }

  const escapedParts = needle
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escapedParts.length) return null;
  try {
    const match = new RegExp(escapedParts.join("\\s+"), "iu").exec(source);
    return match ? { start: match.index, end: match.index + match[0].length } : null;
  } catch {
    return null;
  }
}

export function renderAnnotatedText({ source, lineEdits, container, onSelect }) {
  const candidates = (lineEdits || [])
    .map((edit, editIndex) => ({ edit, editIndex, range: findFeedbackRange(source, edit.original) }))
    .filter((item) => item.range)
    .sort((a, b) => a.range.start - b.range.start
      || (b.range.end - b.range.start) - (a.range.end - a.range.start));
  const ranges = [];
  let occupiedUntil = -1;
  candidates.forEach((candidate) => {
    if (candidate.range.start >= occupiedUntil) {
      ranges.push(candidate);
      occupiedUntil = candidate.range.end;
    }
  });

  container.replaceChildren();
  let cursor = 0;
  ranges.forEach(({ editIndex, range }, annotationIndex) => {
    if (range.start > cursor) {
      container.append(document.createTextNode(source.slice(cursor, range.start)));
    }
    const annotation = document.createElement("button");
    annotation.type = "button";
    annotation.className = "submission-annotation";
    annotation.dataset.editIndex = String(editIndex);
    annotation.setAttribute("aria-pressed", "false");
    annotation.setAttribute("aria-label", `피드백 ${annotationIndex + 1}: ${source.slice(range.start, range.end)}`);
    annotation.title = "클릭하여 피드백 이유와 강의자료 근거 보기";
    annotation.textContent = source.slice(range.start, range.end);
    annotation.addEventListener("click", () => onSelect(editIndex));
    container.append(annotation);
    cursor = range.end;
  });
  if (cursor < source.length) {
    container.append(document.createTextNode(source.slice(cursor)));
  }

  return {
    matchedEditIndices: ranges.map((item) => item.editIndex),
    unmatchedCount: Math.max(0, (lineEdits || []).length - ranges.length),
  };
}
