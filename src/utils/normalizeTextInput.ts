export function normalizeTextInput(value: string) {
    return value
        .replace(/^\s+/, "")
        .replace(/\s{2,}/g, " ");
}

export function normalizeNumberInput(value: string): number | "" {
    if (value === "") return "";

    const normalized = value.replace(/^0+(?=\d)/, "");
    const num = Number(normalized);

    return isNaN(num) ? "" : num;
}
