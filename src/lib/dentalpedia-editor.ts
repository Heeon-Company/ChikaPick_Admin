export type DentalpediaEditorSelection = {
  end: number;
  start: number;
};

type DentalpediaPendingImage = {
  fileName: string;
  token: string;
};

export function insertDentalpediaEditorText(
  value: string,
  selection: DentalpediaEditorSelection,
  insertion: string,
  maxLength = 50_000,
) {
  const start = Math.max(0, Math.min(selection.start, value.length));
  const end = Math.max(start, Math.min(selection.end, value.length));
  const available = Math.max(0, maxLength - (value.length - (end - start)));
  const acceptedInsertion = insertion.slice(0, available);
  const nextValue = `${value.slice(0, start)}${acceptedInsertion}${value.slice(end)}`;
  const caret = start + acceptedInsertion.length;
  return {
    selection: { end: caret, start: caret },
    value: nextValue,
  };
}

export function insertDentalpediaImages(
  markdown: string,
  selection: DentalpediaEditorSelection,
  images: DentalpediaPendingImage[],
) {
  const start = Math.max(0, Math.min(selection.start, markdown.length));
  const end = Math.max(start, Math.min(selection.end, markdown.length));
  const before = markdown.slice(0, start);
  const after = markdown.slice(end);
  const leadingBreak = before && !before.endsWith("\n\n")
    ? before.endsWith("\n")
      ? "\n"
      : "\n\n"
    : "";
  const trailingBreak = after && !after.startsWith("\n\n")
    ? after.startsWith("\n")
      ? "\n"
      : "\n\n"
    : "";
  const imageMarkdown = images
    .map(
      (image) =>
        `![${safeDentalpediaMarkdownAlt(image.fileName)}](${dentalpediaLocalImageUrl(image.token)})`,
    )
    .join("\n\n");
  return insertDentalpediaEditorText(
    markdown,
    { end, start },
    `${leadingBreak}${imageMarkdown}${trailingBreak}`,
  );
}

export function resolveDentalpediaLocalImages(
  markdown: string,
  images: Array<{ objectUrl: string; token: string }>,
) {
  return images.reduce(
    (resolved, image) =>
      resolved.replaceAll(dentalpediaLocalImageUrl(image.token), image.objectUrl),
    markdown,
  );
}

export function dentalpediaLocalImageUrl(token: string) {
  return `dentalpedia-local://${token}`;
}

export function dentalpediaMarkdownImageUrls(markdown: string) {
  return [
    ...markdown.matchAll(/!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g),
  ].map((match) => match[1]);
}

function safeDentalpediaMarkdownAlt(value: string) {
  return value.replace(/[\[\]]/g, "");
}
