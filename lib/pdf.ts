'use client';

import { jsPDF } from 'jspdf';
import type { SharedChangeOrder } from './codec';
import { money } from './format';

const INK = [20, 22, 26] as const;
const MUTED = [125, 122, 112] as const;
const LINE = [221, 213, 198] as const;
const ACCENT = [209, 71, 39] as const;

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'change-order';
}

/**
 * A clean, typographic change order. Deliberately plain: it should look like a
 * document a professional service firm sends, not like a SaaS export.
 */
export function buildChangeOrderPdf(order: SharedChangeOrder): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 52;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(order.fromBusiness || order.fromName, margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  if (order.fromEmail) doc.text(order.fromEmail, margin, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setCharSpace(1.6);
  doc.setTextColor(...ACCENT);
  doc.text('CHANGE ORDER', pageWidth - margin, y + 2, { align: 'right' });
  doc.setCharSpace(0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`${order.number} · ${order.issuedAt}`, pageWidth - margin, y + 18, { align: 'right' });

  y += 32;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // parties
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setCharSpace(0.8);
  doc.text('PREPARED FOR', margin, y);
  doc.text('PROJECT', margin + contentWidth / 2, y);
  doc.setCharSpace(0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(order.clientName, margin, y + 14);
  doc.text(order.projectName, margin + contentWidth / 2, y + 14);

  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  if (order.clientEmail) doc.text(order.clientEmail, margin, y + 27);
  if (order.validUntil) doc.text(`Valid until ${order.validUntil}`, margin + contentWidth / 2, y + 27);

  y += 52;

  // title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(order.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const summaryLines = doc.splitTextToSize(order.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 13 + 20;

  // table
  const colDesc = margin;
  const colHours = pageWidth - margin - 200;
  const colRate = pageWidth - margin - 118;
  const colAmount = pageWidth - margin;

  doc.setFillColor(245, 240, 230);
  doc.rect(margin, y - 13, contentWidth, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.6);
  doc.text('DESCRIPTION', colDesc + 8, y + 1);
  doc.text('HOURS', colHours, y + 1, { align: 'right' });
  doc.text('RATE', colRate, y + 1, { align: 'right' });
  doc.text('AMOUNT', colAmount - 8, y + 1, { align: 'right' });
  doc.setCharSpace(0);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const item of order.items) {
    const lines = doc.splitTextToSize(item.d, colHours - colDesc - 18);
    if (y + lines.length * 12 > pageHeight - 210) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(...INK);
    doc.text(lines, colDesc + 8, y);
    doc.setTextColor(...MUTED);
    doc.text(String(item.h), colHours, y, { align: 'right' });
    doc.text(money(item.r, order.currency), colRate, y, { align: 'right' });
    doc.setTextColor(...INK);
    doc.text(money(item.a, order.currency), colAmount - 8, y, { align: 'right' });
    y += Math.max(lines.length, 1) * 12 + 7;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    y += 5;
  }

  y += 6;
  doc.setFillColor(20, 22, 26);
  doc.rect(pageWidth - margin - 220, y, 220, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(246, 241, 232);
  doc.setCharSpace(0.7);
  doc.text('TOTAL ADDITIONAL FEE', pageWidth - margin - 210, y + 15);
  doc.setCharSpace(0);
  doc.setFontSize(15);
  doc.text(money(order.total, order.currency), pageWidth - margin - 10, y + 32, { align: 'right' });
  y += 58;

  // timeline
  if (order.timeline && order.timeline.trim()) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.7);
    doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.setCharSpace(0.7);
    doc.text('TIMELINE IMPACT', margin + 10, y + 13);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const timelineLines = doc.splitTextToSize(order.timeline, contentWidth - 130);
    doc.text(timelineLines, margin + 10, y + 25);
    y += 48;
  }

  // terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(0.7);
  doc.text('TERMS', margin, y);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...MUTED);
  const termLines = doc.splitTextToSize(order.terms.replace(/\s+/g, ' ').trim(), contentWidth);
  doc.text(termLines, margin, y + 12);
  y += 12 + termLines.length * 10.5 + 26;

  if (y > pageHeight - 130) {
    doc.addPage();
    y = margin;
  }

  // approval
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(margin, y + 18, margin + 210, y + 18);
  doc.line(pageWidth - margin - 150, y + 18, pageWidth - margin, y + 18);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Approved by', margin, y + 30);
  doc.text('Date', pageWidth - margin - 150, y + 30);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`Document checksum ${order.checksum} · ${order.v}`, margin, pageHeight - margin + 6);
  doc.text('Generated with Unbilled', pageWidth - margin, pageHeight - margin + 6, { align: 'right' });

  return doc;
}

export function downloadChangeOrderPdf(order: SharedChangeOrder): void {
  const doc = buildChangeOrderPdf(order);
  doc.save(`${order.number}-${slug(order.title)}.pdf`);
}
