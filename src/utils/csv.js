export function parseCsv(csv) {
  const rows = [];

  let row = [];
  let field = "";

  let insideQuotes = false;

  const input = String(csv ?? "")
    .replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (insideQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
        continue;
      }

      if (char === '"') {
        insideQuotes = false;
        continue;
      }

      field += char;
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);

      rows.push(
        row.map(value => value.trim())
      );

      row = [];
      field = "";

      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (
    field.length > 0 ||
    row.length > 0
  ) {
    row.push(field);

    rows.push(
      row.map(value => value.trim())
    );
  }

  return rows;
}
