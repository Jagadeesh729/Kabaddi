package com.kabaddi.kabaddi.service;

import com.kabaddi.kabaddi.dto.ScoreCard;
import com.kabaddi.kabaddi.dto.TeamStats;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExportService {

    public ByteArrayInputStream generateMatchExcel(ScoreCard match) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Match Scorecard");

            // Styles
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle labelStyle = createLabelStyle(workbook);

            int rowIdx = 0;

            // 1. Header Section
            Row titleRow = sheet.createRow(rowIdx++);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(match.getMatchName() + " - Match Report");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 4));

            rowIdx++; // Spacer

            // 2. Match Info
            rowIdx = createInfoRow(sheet, rowIdx, "Venue:", match.getLocation(), labelStyle, dataStyle);
            rowIdx = createInfoRow(sheet, rowIdx, "Date:",
                    match.getCreatedAt() != null ? match.getCreatedAt().toString() : "N/A", labelStyle, dataStyle);
            rowIdx = createInfoRow(sheet, rowIdx, "Status:", match.getStatus().toString(), labelStyle, dataStyle);

            rowIdx++; // Spacer

            // 3. Match Summary Section
            Row summaryHeader = sheet.createRow(rowIdx++);
            createCell(summaryHeader, 0, "Team 1", headerStyle);
            createCell(summaryHeader, 1, "Score", headerStyle);
            createCell(summaryHeader, 3, "Team 2", headerStyle); // Spaced out
            createCell(summaryHeader, 4, "Score", headerStyle);

            Row summaryData = sheet.createRow(rowIdx++);
            createCell(summaryData, 0, match.getTeam1Name(), dataStyle);
            createCell(summaryData, 1, match.getTeam1Score(), titleStyle); // Highlight score
            createCell(summaryData, 3, match.getTeam2Name(), dataStyle);
            createCell(summaryData, 4, match.getTeam2Score(), titleStyle); // Highlight score

            rowIdx += 2; // Section spacing

            // 4. Player Stats Tables
            // Team 1
            rowIdx = createSectionHeader(sheet, rowIdx, match.getTeam1Name() + " Squad", headerStyle);
            rowIdx = createPlayerStatsTable(sheet, rowIdx, match.getTeam1() != null ? match.getTeam1() : List.of(),
                    headerStyle, dataStyle);

            rowIdx++; // Spacer

            // Team 2
            rowIdx = createSectionHeader(sheet, rowIdx, match.getTeam2Name() + " Squad", headerStyle);
            rowIdx = createPlayerStatsTable(sheet, rowIdx, match.getTeam2() != null ? match.getTeam2() : List.of(),
                    headerStyle, dataStyle);

            rowIdx++; // Spacer

            // 5. Footer
            Row footerRow = sheet.createRow(rowIdx);
            org.apache.poi.ss.usermodel.Cell footerCell = footerRow.createCell(0);
            footerCell.setCellValue("Generated on " + java.time.LocalDate.now() + " | System-generated match report");
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx, rowIdx, 0, 4));

            // Auto-size columns
            for (int i = 0; i < 5; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    private int createInfoRow(Sheet sheet, int rowIdx, String label, Object value, CellStyle labelStyle,
            CellStyle valueStyle) {
        Row row = sheet.createRow(rowIdx);
        createCell(row, 0, label, labelStyle);
        createCell(row, 1, value, valueStyle);
        // Merge value cells for better readability
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx, rowIdx, 1, 3));
        return rowIdx + 1;
    }

    private int createSectionHeader(Sheet sheet, int rowIdx, String title, CellStyle style) {
        Row row = sheet.createRow(rowIdx++);
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(0);
        cell.setCellValue(title);
        cell.setCellStyle(style);
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 4));
        return rowIdx;
    }

    private int createPlayerStatsTable(Sheet sheet, int rowIdx, List<TeamStats> players, CellStyle headerStyle,
            CellStyle dataStyle) {
        // Headers
        Row headerRow = sheet.createRow(rowIdx++);
        String[] headers = { "Player Name", "Raid Points", "Tackle Points", "Total Points" }; // 4 columns
        for (int i = 0; i < headers.length; i++) {
            createCell(headerRow, i, headers[i], headerStyle);
        }

        // Data
        for (TeamStats player : players) {
            Row row = sheet.createRow(rowIdx++);
            createCell(row, 0, player.getPlayerName(), dataStyle);
            createCell(row, 1, player.getRaidPoints() != null ? player.getRaidPoints() : 0, dataStyle);
            createCell(row, 2, player.getTacklePoints() != null ? player.getTacklePoints() : 0, dataStyle);
            int total = (player.getRaidPoints() != null ? player.getRaidPoints() : 0) +
                    (player.getTacklePoints() != null ? player.getTacklePoints() : 0);
            createCell(row, 3, total, dataStyle);
        }
        return rowIdx;
    }

    private void createCell(Row row, int col, Object value, CellStyle style) {
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(col);
        if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else {
            cell.setCellValue(value.toString());
        }
        cell.setCellStyle(style);
    }

    // --- Style Helpers (POI) ---

    private CellStyle createTitleStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        style.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        setBorder(style);
        return style;
    }

    private CellStyle createDataStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        setBorder(style);
        style.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        return style;
    }

    private CellStyle createLabelStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        return style;
    }

    private void setBorder(CellStyle style) {
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
    }

    // --- PDF Generation ---

    public ByteArrayInputStream generateMatchPdf(ScoreCard match) {
        Document document = new Document();
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            com.lowagie.text.Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12,
                    java.awt.Color.WHITE);
            com.lowagie.text.Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            com.lowagie.text.Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            com.lowagie.text.Font scoreFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, java.awt.Color.BLUE);

            // 1. Header Section
            Paragraph title = new Paragraph(match.getMatchName() + " - Match Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // 2. Match Info
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[] { 1, 3 });

            addInfoRow(infoTable, "Venue:", match.getLocation(), labelFont, normalFont);
            addInfoRow(infoTable, "Date:", match.getCreatedAt() != null ? match.getCreatedAt().toString() : "N/A",
                    labelFont, normalFont);
            addInfoRow(infoTable, "Status:", match.getStatus().toString(), labelFont, normalFont);

            document.add(infoTable);
            document.add(new Paragraph("\n"));

            // 3. Match Summary
            PdfPTable summaryTable = new PdfPTable(4);
            summaryTable.setWidthPercentage(100);
            summaryTable.getDefaultCell().setBorder(0);

            // Headers
            addSummaryHeader(summaryTable, "Team 1", labelFont);
            addSummaryHeader(summaryTable, "Score", labelFont);
            addSummaryHeader(summaryTable, "Team 2", labelFont);
            addSummaryHeader(summaryTable, "Score", labelFont);

            // Data
            addSummaryCell(summaryTable, match.getTeam1Name(), normalFont);
            addSummaryCell(summaryTable, String.valueOf(match.getTeam1Score()), scoreFont);
            addSummaryCell(summaryTable, match.getTeam2Name(), normalFont);
            addSummaryCell(summaryTable, String.valueOf(match.getTeam2Score()), scoreFont);

            document.add(summaryTable);
            document.add(new Paragraph("\n"));
            document.add(new Paragraph("\n"));

            // 4. Team 1 Stats
            document.add(new Paragraph(match.getTeam1Name() + " Squad", labelFont));
            document.add(new Paragraph("\n"));
            document.add(createPdfPlayerTable(match.getTeam1() != null ? match.getTeam1() : List.of(), headerFont,
                    normalFont));

            document.add(new Paragraph("\n"));

            // 5. Team 2 Stats
            document.add(new Paragraph(match.getTeam2Name() + " Squad", labelFont));
            document.add(new Paragraph("\n"));
            document.add(createPdfPlayerTable(match.getTeam2() != null ? match.getTeam2() : List.of(), headerFont,
                    normalFont));

            document.add(new Paragraph("\n\n"));

            // 6. Footer
            Paragraph footer = new Paragraph(
                    "Generated on " + java.time.LocalDate.now() + " | System-generated match report",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    private void addInfoRow(PdfPTable table, String label, String value, com.lowagie.text.Font labelFont,
            com.lowagie.text.Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(0);
        labelCell.setPaddingBottom(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(0);
        valueCell.setPaddingBottom(5);
        table.addCell(valueCell);
    }

    private void addSummaryHeader(PdfPTable table, String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorder(0);
        cell.setPadding(5);
        cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        table.addCell(cell);
    }

    private void addSummaryCell(PdfPTable table, String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorder(0);
        cell.setPadding(10);
        table.addCell(cell);
    }

    private PdfPTable createPdfPlayerTable(List<TeamStats> players, com.lowagie.text.Font headerFont,
            com.lowagie.text.Font normalFont) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 3, 1.5f, 1.5f, 1.5f });

        addTableHeader(table, "Player Name", headerFont);
        addTableHeader(table, "Raid Points", headerFont);
        addTableHeader(table, "Tackle Points", headerFont);
        addTableHeader(table, "Total Points", headerFont);

        for (TeamStats player : players) {
            addTableCell(table, player.getPlayerName(), normalFont);
            addTableCell(table, String.valueOf(player.getRaidPoints() != null ? player.getRaidPoints() : 0),
                    normalFont);
            addTableCell(table, String.valueOf(player.getTacklePoints() != null ? player.getTacklePoints() : 0),
                    normalFont);
            int total = (player.getRaidPoints() != null ? player.getRaidPoints() : 0) +
                    (player.getTacklePoints() != null ? player.getTacklePoints() : 0);
            addTableCell(table, String.valueOf(total), normalFont);
        }
        return table;
    }

    private void addTableHeader(PdfPTable table, String headerTitle, com.lowagie.text.Font font) {
        PdfPCell header = new PdfPCell();
        header.setBackgroundColor(java.awt.Color.DARK_GRAY);
        header.setBorderWidth(1);
        header.setPadding(6);
        header.setHorizontalAlignment(Element.ALIGN_CENTER);
        header.setPhrase(new Phrase(headerTitle, font));
        table.addCell(header);
    }

    private void addTableCell(PdfPTable table, String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }
}
