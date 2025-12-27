import { format, parseISO } from "date-fns";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  local: string | null;
}

/**
 * Generates an ICS file content for a single event
 */
export const generateICSContent = (evento: Evento): string => {
  const formatDateForICS = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeText = (text: string | null) => {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const now = new Date();
  const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sistema RH//Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.id}@sistema-rh.local`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatDateForICS(evento.data_inicio)}`,
    `DTEND:${formatDateForICS(evento.data_fim)}`,
    `SUMMARY:${escapeText(evento.titulo)}`,
  ];

  if (evento.descricao) {
    lines.push(`DESCRIPTION:${escapeText(evento.descricao)}`);
  }

  if (evento.local) {
    lines.push(`LOCATION:${escapeText(evento.local)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
};

/**
 * Downloads an ICS file for a single event
 */
export const downloadEventAsICS = (evento: Evento) => {
  const content = generateICSContent(evento);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${evento.titulo.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates an ICS file content for multiple events
 */
export const generateMultipleEventsICS = (eventos: Evento[]): string => {
  const formatDateForICS = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeText = (text: string | null) => {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const now = new Date();
  const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sistema RH//Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  eventos.forEach((evento) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${evento.id}@sistema-rh.local`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatDateForICS(evento.data_inicio)}`,
      `DTEND:${formatDateForICS(evento.data_fim)}`,
      `SUMMARY:${escapeText(evento.titulo)}`
    );

    if (evento.descricao) {
      lines.push(`DESCRIPTION:${escapeText(evento.descricao)}`);
    }

    if (evento.local) {
      lines.push(`LOCATION:${escapeText(evento.local)}`);
    }

    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
};

/**
 * Downloads an ICS file containing multiple events
 */
export const downloadMultipleEventsAsICS = (eventos: Evento[], filename = "eventos") => {
  const content = generateMultipleEventsICS(eventos);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
