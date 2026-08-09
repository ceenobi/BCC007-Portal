import { clsx, type ClassValue } from "clsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { twMerge } from "tailwind-merge";
import type { PaymentData, TransferData } from "~/types";

export const BCC_LOGO_URL =
  "https://res.cloudinary.com/ceenobi/image/upload/e_background_removal/q_auto:best/v1785307622/bcc007portal/Gemini_Generated_Image_s6h7lfs6h7lfs6h7_pfzmnk.png";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateInviteCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "INV";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getTimeOfDay = () => {
  const currentHour = new Date().getHours();

  if (currentHour >= 5 && currentHour < 12) {
    return `☀️ `;
  } else if (currentHour >= 12 && currentHour < 18) {
    return `🌤️ `;
  } else {
    return `🌙 `;
  }
};

export const formatMeta = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const generateTicketId = () => {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString()
    .slice(-4);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(6, "0");
  return `TK-${timestamp}-${random}`;
};

export function formatEventDate(date: Date | string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatEventTime(time?: string) {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes ?? 0).padStart(2, "0")} ${period}`;
}

export function getInitials(name?: string) {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatMoney(
  amount: number,
  display: "symbol" | "narrowSymbol" | "code" | "name" = "symbol",
) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: display,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatPaymentDate(date: Date | string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const receiptInvoice = async (payment: PaymentData) => {
  if (!payment || payment.paymentStatus !== "completed") return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  const createdAt = payment.createdAt
    ? new Date(payment.createdAt as any)
    : new Date();
  const paymentDate = Number.isNaN(createdAt.getTime())
    ? new Date()
    : createdAt;

  const humanPaymentType = payment.paymentType
    ? payment.paymentType.replace(/_/g, " ")
    : "N/A";
  const reference = payment.reference || "N/A";
  const memberName = payment.userId?.name;
  const memberEmail = payment.userId?.email;

  // Load the BCC007 logo and place it in the header.
  let titleX = marginX;
  try {
    const logoRes = await fetch(BCC_LOGO_URL);
    const logoBlob = await logoRes.blob();
    const logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read logo"));
      reader.readAsDataURL(logoBlob);
    });
    doc.addImage(logoDataUrl, "PNG", marginX, 34, 26, 26);
    titleX = marginX + 34;
  } catch (error) {
    console.error("Failed to load receipt logo:", error);
  }

  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("BCC007 Team Payments", titleX, 58);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("Payment Receipt", titleX, 76);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${paymentDate.toLocaleDateString("en-GB")}`, pageWidth - marginX, 64, {
    align: "right",
  });
  doc.text(`Reference: ${reference}`, pageWidth - marginX, 80, {
    align: "right",
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 92, pageWidth - marginX, 92);

  let infoY = 114;
  if (memberName) {
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Member: ${memberName}`, marginX, infoY);
    infoY += 16;
  }
  if (memberEmail) {
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Email: ${memberEmail}`, marginX, infoY);
    infoY += 16;
  }

  const detailsRows: Array<[string, string]> = [
    ["Payment Type", humanPaymentType],
    ["Amount", formatMoney(payment.amount, "code")],
    ["Payment Date", paymentDate.toLocaleString("en-GB")],
    ["Recurring", payment.isRecurring ? "Yes" : "No"],
  ];
  if (payment.note) detailsRows.push(["Note", payment.note]);

  autoTable(doc, {
    head: [["Field", "Value"]],
    body: detailsRows,
    startY: infoY + 10,
    theme: "striped",
    headStyles: {
      fillColor: [0, 62, 125],
      halign: "left",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: marginX, right: marginX },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 260;
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `Total Paid: ${formatMoney(payment.amount, "code")}`,
    pageWidth - marginX,
    finalY + 30,
    { align: "right" },
  );

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Thank you for your payment. This receipt is system-generated.",
    marginX,
    pageHeight - 40,
  );

  doc.save(`receipt-${reference}.pdf`);
};

export const transferReceiptInvoice = async (transfer: TransferData) => {
  if (!transfer || transfer.status !== "success") return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  const createdAt = transfer.createdAt
    ? new Date(transfer.createdAt as any)
    : new Date();
  const transferDate = Number.isNaN(createdAt.getTime())
    ? new Date()
    : createdAt;

  const reference = transfer.reference || "N/A";
  const userId = transfer.userId as unknown as
    | { name?: string; email?: string }
    | string;
  const recipientName =
    typeof userId === "object" && userId?.name ? userId.name : "Member";
  const recipientEmail =
    typeof userId === "object" && userId?.email ? userId.email : "";

  // Load the BCC007 logo and place it in the header.
  let titleX = marginX;
  try {
    const logoRes = await fetch(BCC_LOGO_URL);
    const logoBlob = await logoRes.blob();
    const logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read logo"));
      reader.readAsDataURL(logoBlob);
    });
    doc.addImage(logoDataUrl, "PNG", marginX, 34, 26, 26);
    titleX = marginX + 34;
  } catch (error) {
    console.error("Failed to load receipt logo:", error);
  }

  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("BCC007 Team Transfers", titleX, 58);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("Transfer Receipt", titleX, 76);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Date: ${transferDate.toLocaleDateString("en-GB")}`,
    pageWidth - marginX,
    64,
    { align: "right" },
  );
  doc.text(`Reference: ${reference}`, pageWidth - marginX, 80, {
    align: "right",
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, 92, pageWidth - marginX, 92);

  let infoY = 114;
  if (recipientName) {
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Recipient: ${recipientName}`, marginX, infoY);
    infoY += 16;
  }
  if (recipientEmail) {
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(`Email: ${recipientEmail}`, marginX, infoY);
    infoY += 16;
  }

  const detailsRows: Array<[string, string]> = [
    ["Amount", formatMoney(transfer.amount, "code")],
    ["Fee", formatMoney(transfer.fee ?? 0, "code")],
    ["Transfer Date", transferDate.toLocaleString("en-GB")],
    ["Status", "Successful"],
  ];
  if (transfer.reason) detailsRows.push(["Reason", transfer.reason]);
  if (transfer.transferCode) detailsRows.push(["Transfer Code", transfer.transferCode]);

  autoTable(doc, {
    head: [["Field", "Value"]],
    body: detailsRows,
    startY: infoY + 10,
    theme: "striped",
    headStyles: {
      fillColor: [0, 62, 125],
      halign: "left",
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: "linebreak",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: marginX, right: marginX },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 260;
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `Total Sent: ${formatMoney(transfer.amount, "code")}`,
    pageWidth - marginX,
    finalY + 30,
    { align: "right" },
  );

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Thank you for using BCC007. This receipt is system-generated.",
    marginX,
    pageHeight - 40,
  );

  doc.save(`transfer-receipt-${reference}.pdf`);
};

export const REPORT_PERIODS = ["all", "1w", "1m", "6m", "1y"] as const;
export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
export const toStartOfDay = (value: string) =>
  isDateOnly(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
export const toEndOfDay = (value: string) =>
  isDateOnly(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
