const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return timeFormatter.format(new Date(value));
}

export function formatPercentage(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "%0";
  }

  return `%${Math.round(value)}`;
}

export function healthConditionLabel(condition: string) {
  const labels: Record<string, string> = {
    DIABETES: "Diyabet",
    HYPERTENSION: "Hipertansiyon",
    HEART_DISEASE: "Kalp Hastaligi",
    DEMENTIA: "Demans",
    PHYSICAL_ISSUE: "Fiziksel Destek Ihtiyaci",
    OTHER: "Diger",
  };

  return labels[condition] || condition;
}

export function localDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export function bytesToMb(value?: number | null) {
  if (!value) {
    return "-";
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
