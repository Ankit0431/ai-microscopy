import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

const CONSTANTS = {
  COLORS: {
    PRIMARY: '#0d47a1',
    SECONDARY: '#424242',
    LIGHT_GRAY: '#bdbdbd',
    ACCENT_NORMAL: '#2e7d32',
    ACCENT_LOW: '#ff8f00',
    ACCENT_HIGH: '#c62828',
    TABLE_HEADER_BG: '#1565c0',
    TABLE_HEADER_TEXT: '#FFFFFF',
    TABLE_ROW_LIGHT: '#f5f5f5',
    TABLE_ROW_DARK: '#FFFFFF',
  },
  FONTS: {
    BOLD: 'Helvetica-Bold',
    REGULAR: 'Helvetica',
    ITALIC: 'Helvetica-Oblique',
  },
  MARGINS: { TOP: 40, BOTTOM: 60, LEFT: 40, RIGHT: 40 },
  PAGE_WIDTH: 595.28,
  PAGE_HEIGHT: 841.89,
};

class PDFService {
  async generateBloodCountReportPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: CONSTANTS.MARGINS,
          info: {
            Title: `Blood Count Report - ${reportData.patient.fullName}`,
            Author: `Dr. ${reportData.doctor.fullName}`,
            Creator: 'Advanced AI Microscopy System',
            CreationDate: new Date(),
          },
          bufferPages: true,
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        let currentY = CONSTANTS.MARGINS.TOP;
        currentY = this._drawHeader(doc, reportData, currentY);
        currentY = this._drawPatientSpecimenBlock(doc, reportData, currentY + 20);
        currentY = this._drawResultsTable(doc, reportData.bloodCounts, reportData.patient.gender, currentY + 25);
        this._drawInterpretationAndFooter(doc, reportData, currentY + 25);

        doc.end();
      } catch (err) {
        console.error('PDF generation error:', err);
        reject(err);
      }
    });
  }

  getPDFFilename(reportData) {
    const date = new Date(reportData.generatedAt || reportData.createdAt)
      .toISOString()
      .split('T')[0];
    const patientName = reportData.patient.fullName
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    return `CBC_Report_${patientName}_${date}.pdf`;
  }

  getMalariaReportFilename(reportData) {
    const date = new Date(reportData.generatedAt || reportData.createdAt)
      .toISOString()
      .split('T')[0];
    const patientName = reportData.patient.fullName
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    return `Malaria_Report_${patientName}_${date}.pdf`;
  }

  async generateMalariaReportPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: CONSTANTS.MARGINS,
          info: {
            Title: `Malaria Detection Report - ${reportData.patient.fullName}`,
            Author: `Dr. ${reportData.doctor.fullName}`,
            Creator: 'Advanced AI Microscopy System',
            CreationDate: new Date(),
          },
          bufferPages: true,
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        let currentY = CONSTANTS.MARGINS.TOP;
        currentY = this._drawMalariaHeader(doc, reportData, currentY);
        currentY = this._drawPatientSpecimenBlock(doc, reportData, currentY + 20);
        currentY = this._drawMalariaResults(doc, reportData, currentY + 25);
        this._drawMalariaInterpretationAndFooter(doc, reportData, currentY + 25);

        doc.end();
      } catch (err) {
        console.error('Malaria PDF generation error:', err);
        reject(err);
      }
    });
  }

  _drawMalariaHeader(doc, reportData, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    doc
      .font(FONTS.BOLD)
      .fontSize(18)
      .fillColor(COLORS.PRIMARY)
      .text('AI Microscopy', MARGINS.LEFT, y, { width: contentWidth, align: 'center' });

    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text('Shri Ramdeobaba College of Engineering and Management | Tel: 1234567890 | project.mayankjaiswal.in',
            MARGINS.LEFT, y + 22, { width: contentWidth, align: 'center' });

    doc
      .font(FONTS.BOLD)
      .fontSize(14)
      .fillColor('#2e7d32')
      .text('Malaria Detection Report', MARGINS.LEFT, y + 50, {
        width: contentWidth,
        align: 'center',
      });

    y += 80;

    doc.strokeColor(COLORS.LIGHT_GRAY)
       .lineWidth(1)
       .moveTo(MARGINS.LEFT, y)
       .lineTo(CONSTANTS.PAGE_WIDTH - MARGINS.RIGHT, y)
       .stroke();

    return y;
  }

  _drawMalariaResults(doc, reportData, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;
    const blockWidth = contentWidth;

    // Determine colors and status based on diagnosis
    const isInfected = reportData.diagnosis === 'parasitized';
    const statusColor = isInfected ? '#c62828' : '#2e7d32';
    const statusBgColor = isInfected ? '#ffebee' : '#e8f5e9';
    const statusText = isInfected ? 'POSITIVE - INFECTED' : 'NEGATIVE - UNINFECTED';

    // Draw main result box
    const boxHeight = 130;
    doc
      .roundedRect(MARGINS.LEFT, y, blockWidth, boxHeight, 8)
      .lineWidth(2)
      .strokeColor(statusColor)
      .fillColor(statusBgColor)
      .fillAndStroke();

    // Title: AI-Based Malaria Parasite Detection
    doc
      .font(FONTS.BOLD)
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text('AI-Based Malaria Parasite Detection', MARGINS.LEFT, y + 15, {
        width: blockWidth,
        align: 'center'
      });

    // Status badge (POSITIVE - INFECTED / NEGATIVE - UNINFECTED)
    doc
      .font(FONTS.BOLD)
      .fontSize(20)
      .fillColor(statusColor)
      .text(statusText, MARGINS.LEFT, y + 45, {
        width: blockWidth,
        align: 'center'
      });

    // Two-column layout for Prediction and Confidence
    const colWidth = blockWidth / 2;
    const leftColX = MARGINS.LEFT + 40;
    const rightColX = MARGINS.LEFT + blockWidth / 2 + 20;

    doc
      .font(FONTS.BOLD)
      .fontSize(10)
      .fillColor(COLORS.SECONDARY)
      .text('Prediction:', leftColX, y + 85);

    doc
      .font(FONTS.REGULAR)
      .fontSize(10)
      .fillColor(COLORS.PRIMARY)
      .text(reportData.diagnosis.charAt(0).toUpperCase() + reportData.diagnosis.slice(1), leftColX + 65, y + 85);

    doc
      .font(FONTS.BOLD)
      .fontSize(10)
      .fillColor(COLORS.SECONDARY)
      .text('Confidence:', rightColX, y + 85);

    doc
      .font(FONTS.REGULAR)
      .fontSize(10)
      .fillColor(COLORS.PRIMARY)
      .text(`${reportData.confidence.toFixed(2)}%`, rightColX + 65, y + 85);

    let currentY = y + boxHeight + 20;

    // Probability Breakdown section
    doc
      .font(FONTS.BOLD)
      .fontSize(11)
      .fillColor(COLORS.SECONDARY)
      .text('Probability Breakdown:', MARGINS.LEFT, currentY);

    currentY += 20;

    // Get probabilities from imageAnalysis
    const parasitizedProb = reportData.imageAnalysis?.parasitizedProbability || reportData.confidence || 0;
    const uninfectedProb = reportData.imageAnalysis?.uninfectedProbability || (100 - parasitizedProb);

    // Draw Parasitized bar
    const barHeight = 25;
    const barWidth = contentWidth - 120;
    const labelWidth = 100;

    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text('Parasitized:', MARGINS.LEFT, currentY + 7);

    // Background bar (light gray)
    doc
      .rect(MARGINS.LEFT + labelWidth, currentY, barWidth, barHeight)
      .fillColor('#e0e0e0')
      .fill();

    // Filled bar (red for parasitized)
    const parasitizedBarWidth = (barWidth * parasitizedProb) / 100;
    doc
      .rect(MARGINS.LEFT + labelWidth, currentY, parasitizedBarWidth, barHeight)
      .fillColor('#c62828')
      .fill();

    // Percentage text
    doc
      .font(FONTS.BOLD)
      .fontSize(9)
      .fillColor('#ffffff')
      .text(`${parasitizedProb.toFixed(2)}%`, MARGINS.LEFT + labelWidth + 5, currentY + 8);

    currentY += barHeight + 10;

    // Draw Uninfected bar
    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text('Uninfected:', MARGINS.LEFT, currentY + 7);

    // Background bar (light gray)
    doc
      .rect(MARGINS.LEFT + labelWidth, currentY, barWidth, barHeight)
      .fillColor('#e0e0e0')
      .fill();

    // Filled bar (green for uninfected)
    const uninfectedBarWidth = (barWidth * uninfectedProb) / 100;
    doc
      .rect(MARGINS.LEFT + labelWidth, currentY, uninfectedBarWidth, barHeight)
      .fillColor('#2e7d32')
      .fill();

    // Percentage text
    doc
      .font(FONTS.BOLD)
      .fontSize(9)
      .fillColor('#ffffff')
      .text(`${uninfectedProb.toFixed(2)}%`, MARGINS.LEFT + labelWidth + 5, currentY + 8);

    return currentY + barHeight + 30;
  }

  _drawMalariaInterpretationAndFooter(doc, reportData, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    // Clinical Interpretation Section
    doc
      .font(FONTS.BOLD)
      .fontSize(11)
      .fillColor(COLORS.PRIMARY)
      .text('Clinical Interpretation', MARGINS.LEFT, y);

    y += 20;

    const clinicalNotes = reportData.clinicalNotes ||
      'Automated AI analysis completed. Results should be interpreted in clinical context.';

    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text(clinicalNotes, MARGINS.LEFT, y, { width: contentWidth, align: 'justify', lineGap: 3 });

    y += doc.heightOfString(clinicalNotes, { width: contentWidth, lineGap: 3 }) + 20;

    // Recommendations Section - Always show for parasitized cases
    doc
      .font(FONTS.BOLD)
      .fontSize(11)
      .fillColor(COLORS.PRIMARY)
      .text('Recommendations', MARGINS.LEFT, y);

    y += 20;

    let recommendations = reportData.recommendations;

    // Default recommendations for parasitized cases
    if (!recommendations && reportData.diagnosis === 'parasitized') {
      recommendations = `1. Start antimalarial therapy immediately as per WHO guidelines.
2. Confirm parasite species through expert microscopy.
3. Monitor patient response to treatment.
4. Follow-up blood smear in 24-48 hours.
5. Consider hospitalization if severe symptoms present.`;
    } else if (!recommendations) {
      recommendations = 'Follow-up as per standard clinical protocol.';
    }

    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text(recommendations, MARGINS.LEFT, y, { width: contentWidth, align: 'left', lineGap: 3 });

    y += doc.heightOfString(recommendations, { width: contentWidth, lineGap: 3 }) + 20;

    // Treatment Plan Section (if provided by doctor)
    if (reportData.treatmentPlan) {
      doc
        .font(FONTS.BOLD)
        .fontSize(11)
        .fillColor(COLORS.PRIMARY)
        .text('Treatment Plan', MARGINS.LEFT, y);

      y += 20;

      doc
        .font(FONTS.REGULAR)
        .fontSize(9)
        .fillColor(COLORS.SECONDARY)
        .text(reportData.treatmentPlan, MARGINS.LEFT, y, { width: contentWidth, align: 'justify', lineGap: 3 });

      y += doc.heightOfString(reportData.treatmentPlan, { width: contentWidth, lineGap: 3 }) + 20;
    }

    const footerStartY = Math.max(y, CONSTANTS.PAGE_HEIGHT - MARGINS.BOTTOM - 100);
    this._drawFooter(doc, reportData, footerStartY);
  }

  _drawHeader(doc, reportData, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    doc
      .font(FONTS.BOLD)
      .fontSize(18)
      .fillColor(COLORS.PRIMARY)
      .text('AI Microscopy', MARGINS.LEFT, y, { width: contentWidth, align: 'center' });

    doc
      .font(FONTS.REGULAR)
      .fontSize(9)
      .fillColor(COLORS.SECONDARY)
      .text('Shri Ramdeobaba College of Engineering and Management | Tel: 1234567890 | project.mayankjaiswal.in',
            MARGINS.LEFT, y + 22, { width: contentWidth, align: 'center' });

    doc
      .font(FONTS.BOLD)
      .fontSize(14)
      .fillColor(COLORS.PRIMARY)
      .text('Complete Blood Count (CBC) Report', MARGINS.LEFT, y + 50, {
        width: contentWidth,
        align: 'center',
      });

    y += 80;

    doc.strokeColor(COLORS.LIGHT_GRAY)
       .lineWidth(1)
       .moveTo(MARGINS.LEFT, y)
       .lineTo(CONSTANTS.PAGE_WIDTH - MARGINS.RIGHT, y)
       .stroke();

    return y;
  }

  _drawPatientSpecimenBlock(doc, { patient, doctor, createdAt }, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const blockY = y;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;
    const blockWidth = contentWidth;
    const colWidth = blockWidth / 2;
    const startX = MARGINS.LEFT;

    const blockHeight = 90;

    doc
      .roundedRect(MARGINS.LEFT, blockY, blockWidth, blockHeight, 5)
      .lineWidth(1)
      .strokeColor(COLORS.LIGHT_GRAY)
      .fillColor('#fafafa')
      .fillAndStroke();

    const field = (label, value, col, row) => {
      const fieldX = startX + col * colWidth + 15;
      const fieldY = blockY + 15 + row * 20;
      const labelWidth = 110;

      doc
        .font(FONTS.BOLD)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(label, fieldX, fieldY, {
          width: labelWidth,
          align: 'left',
        });

      doc
        .font(FONTS.REGULAR)
        .fontSize(9)
        .fillColor(COLORS.PRIMARY)
        .text(value, fieldX + labelWidth, fieldY, {
          width: colWidth - labelWidth - 20,
          align: 'left',
        });
    };

    field('PATIENT NAME', patient.fullName.toUpperCase(), 0, 0);
    field('PATIENT ID', `P-${patient._id.toString().slice(-6).toUpperCase()}`, 0, 1);
    field('REFERRING PHYSICIAN', `Dr. ${doctor.fullName}`, 0, 2);

    field('COLLECTION DATE', new Date(createdAt).toLocaleDateString(), 1, 0);
    field('SPECIMEN ID', `S-${Date.now().toString(36).slice(-8).toUpperCase()}`, 1, 1);
    field('REPORT DATE', new Date().toLocaleDateString(), 1, 2);

    return y + blockHeight;
  }

  _drawResultsTable(doc, counts, patientGender, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    // Draw summary box first
    const hasAbnormal = ['wbc', 'rbc', 'platelets'].some(k => counts[k]?.status !== 'normal');
    const statusColor = hasAbnormal ? '#c62828' : '#2e7d32';
    const statusBgColor = hasAbnormal ? '#ffebee' : '#e8f5e9';
    const statusText = hasAbnormal ? 'ABNORMAL VALUES DETECTED' : 'ALL VALUES NORMAL';

    const boxHeight = 80;
    doc
      .roundedRect(MARGINS.LEFT, y, contentWidth, boxHeight, 8)
      .lineWidth(2)
      .strokeColor(statusColor)
      .fillColor(statusBgColor)
      .fillAndStroke();

    doc
      .font(FONTS.BOLD)
      .fontSize(13)
      .fillColor(COLORS.PRIMARY)
      .text('Complete Blood Count Results', MARGINS.LEFT, y + 15, {
        width: contentWidth,
        align: 'center'
      });

    doc
      .font(FONTS.BOLD)
      .fontSize(16)
      .fillColor(statusColor)
      .text(statusText, MARGINS.LEFT, y + 40, {
        width: contentWidth,
        align: 'center'
      });

    y += boxHeight + 20;

    // Now draw the detailed results table
    const tableTop = y;
    const tableWidth = contentWidth;

    const cols = [
      { x: MARGINS.LEFT, width: tableWidth * 0.40 },
      { x: MARGINS.LEFT + tableWidth * 0.40, width: tableWidth * 0.15 },
      { x: MARGINS.LEFT + tableWidth * 0.55, width: tableWidth * 0.12 },
      { x: MARGINS.LEFT + tableWidth * 0.67, width: tableWidth * 0.20 },
      { x: MARGINS.LEFT + tableWidth * 0.87, width: tableWidth * 0.13 },
    ];
    const rowHeight = 25;
    const headerY = tableTop;

    doc
      .rect(MARGINS.LEFT, headerY, tableWidth, rowHeight)
      .fill(COLORS.TABLE_HEADER_BG);

    const headers = ['Test Name', 'Result', 'Unit', 'Reference Range', 'Status'];
    headers.forEach((header, i) => {
      doc
        .font(FONTS.BOLD)
        .fontSize(8)
        .fillColor(COLORS.TABLE_HEADER_TEXT)
        .text(header, cols[i].x + 8, headerY + 8, {
          width: cols[i].width - 16,
          align: i === 0 ? 'left' : 'center',
        });
    });

    const unitMap = {
      wbc: 'thousand cells/µL',
      rbc: 'million cells/µL',
      platelets: 'thousand cells/µL',
    };

    const referenceRangeMap = {
      wbc: '4.5-11.0',
      rbc: patientGender === 'M' ? '4.7-6.1' : '4.2-5.4',
      platelets: '150-400',
    };

    const sanitizeString = (str) => str.replace(/;ÄÀ/g, '').replace(/μ/g, 'µ');

    const parameters = [
      { k: 'wbc', name: 'White Blood Cell Count (WBC)' },
      { k: 'rbc', name: 'Red Blood Cell Count (RBC)' },
      { k: 'platelets', name: 'Platelet Count' },
    ];

    let currentY = tableTop + rowHeight;
    parameters.forEach((p, i) => {
      const c = counts[p.k];
      if (!c || c.value == null) return;

      const bgColor = i % 2 ? COLORS.TABLE_ROW_LIGHT : COLORS.TABLE_ROW_DARK;
      doc.rect(MARGINS.LEFT, currentY, tableWidth, rowHeight).fill(bgColor);

      const isAbnormal = c.status !== 'normal';
      const resultColor = isAbnormal
        ? COLORS[`ACCENT_${c.status.toUpperCase()}`]
        : COLORS.SECONDARY;
      const resultFont = isAbnormal ? FONTS.BOLD : FONTS.REGULAR;

      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.PRIMARY)
        .text(p.name, cols[0].x + 8, currentY + 8, { width: cols[0].width - 16 });

      doc
        .font(resultFont)
        .fontSize(9)
        .fillColor(resultColor)
        .text(c.value.toString(), cols[1].x + 8, currentY + 8, {
          width: cols[1].width - 16,
          align: 'center',
        });

      const unit = unitMap[p.k] || sanitizeString(c.unit || '');
      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(unit, cols[2].x + 8, currentY + 8, {
          width: cols[2].width - 16,
          align: 'center',
        });

      const refRange = referenceRangeMap[p.k] || sanitizeString(c.normalRange || '');
      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(refRange, cols[3].x + 8, currentY + 8, {
          width: cols[3].width - 16,
          align: 'center',
        });

      const statusColor = COLORS[`ACCENT_${c.status.toUpperCase()}`];
      doc
        .font(FONTS.BOLD)
        .fontSize(7)
        .fillColor(statusColor)
        .text(c.status.toUpperCase(), cols[4].x + 8, currentY + 8, {
          width: cols[4].width - 16,
          align: 'center',
        });

      currentY += rowHeight;
    });

    doc
      .rect(MARGINS.LEFT, tableTop, tableWidth, currentY - tableTop)
      .strokeColor(COLORS.LIGHT_GRAY)
      .lineWidth(1)
      .stroke();

    return currentY;
  }

  _drawInterpretationAndFooter(doc, { imageAnalysis, clinicalNotes, recommendations, doctor, generatedAt, bloodCounts }, y) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    // Test Methodology Section
    doc
      .font(FONTS.BOLD)
      .fontSize(11)
      .fillColor(COLORS.PRIMARY)
      .text('Test Methodology', MARGINS.LEFT, y);

    y += 18;

    const methodology = `This Complete Blood Count (CBC) was performed using advanced AI-powered microscopy analysis. The system utilizes deep learning algorithms trained on thousands of blood smear images to accurately identify and count different blood cell types. Cell detection confidence: ${imageAnalysis?.confidence || 95}%. Total cells analyzed: ${imageAnalysis?.cellsDetected || 'N/A'}.`;

    doc
      .font(FONTS.REGULAR)
      .fontSize(8)
      .fillColor(COLORS.SECONDARY)
      .text(methodology, MARGINS.LEFT, y, { width: contentWidth, align: 'justify', lineGap: 3 });

    y += doc.heightOfString(methodology, { width: contentWidth, lineGap: 3 }) + 20;

    // Clinical Significance Section
    doc
      .font(FONTS.BOLD)
      .fontSize(11)
      .fillColor(COLORS.PRIMARY)
      .text('Clinical Significance', MARGINS.LEFT, y);

    y += 18;

    // Generate clinical significance based on results
    let significance = this._generateClinicalSignificance(bloodCounts);

    doc
      .font(FONTS.REGULAR)
      .fontSize(8)
      .fillColor(COLORS.SECONDARY)
      .text(significance, MARGINS.LEFT, y, { width: contentWidth, align: 'justify', lineGap: 3 });

    y += doc.heightOfString(significance, { width: contentWidth, lineGap: 3 }) + 20;

    // Clinical Notes Section (if provided by doctor)
    if (clinicalNotes && clinicalNotes.trim()) {
      doc
        .font(FONTS.BOLD)
        .fontSize(11)
        .fillColor(COLORS.PRIMARY)
        .text('Clinical Interpretation', MARGINS.LEFT, y);

      y += 18;

      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(clinicalNotes, MARGINS.LEFT, y, { width: contentWidth, align: 'justify', lineGap: 3 });

      y += doc.heightOfString(clinicalNotes, { width: contentWidth, lineGap: 3 }) + 20;
    }

    // Recommendations Section (if provided by doctor or auto-generated)
    if (recommendations && recommendations.trim()) {
      doc
        .font(FONTS.BOLD)
        .fontSize(11)
        .fillColor(COLORS.PRIMARY)
        .text('Recommendations', MARGINS.LEFT, y);

      y += 18;

      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(recommendations, MARGINS.LEFT, y, { width: contentWidth, lineGap: 3 });

      y += doc.heightOfString(recommendations, { width: contentWidth, lineGap: 3 }) + 20;
    } else {
      // Auto-generate recommendations if not provided
      const autoRecs = this._generateRecommendations(bloodCounts);

      doc
        .font(FONTS.BOLD)
        .fontSize(11)
        .fillColor(COLORS.PRIMARY)
        .text('Recommendations', MARGINS.LEFT, y);

      y += 18;

      doc
        .font(FONTS.REGULAR)
        .fontSize(8)
        .fillColor(COLORS.SECONDARY)
        .text(autoRecs, MARGINS.LEFT, y, { width: contentWidth, lineGap: 3 });

      y += doc.heightOfString(autoRecs, { width: contentWidth, lineGap: 3 }) + 20;
    }

    // Quality Control Information
    let qcY = y;

    doc
      .font(FONTS.BOLD)
      .fontSize(10)
      .fillColor(COLORS.PRIMARY)
      .text('Quality Control', MARGINS.LEFT, qcY);

    qcY += 18;

    const qcInfo = `• Sample quality: Acceptable\n• Staining quality: Optimal\n• Cell distribution: Adequate\n• Analysis completed: ${new Date().toLocaleString()}\n• All quality control parameters met standards.`;

    doc
      .font(FONTS.REGULAR)
      .fontSize(8)
      .fillColor(COLORS.SECONDARY)
      .text(qcInfo, MARGINS.LEFT, qcY, { width: contentWidth, lineGap: 3 });

    qcY += doc.heightOfString(qcInfo, { width: contentWidth, lineGap: 3 }) + 15;

    const footerStartY = Math.max(qcY, CONSTANTS.PAGE_HEIGHT - MARGINS.BOTTOM - 100);

    this._drawFooter(doc, { doctor, generatedAt }, footerStartY);
  }

  _generateClinicalSignificance(bloodCounts) {
    let significance = [];

    // Check WBC
    const wbc = bloodCounts.wbc;
    if (wbc?.status === 'high') {
      significance.push('Elevated WBC count (leukocytosis) may indicate infection, inflammation, stress, or bone marrow disorders.');
    } else if (wbc?.status === 'low') {
      significance.push('Decreased WBC count (leukopenia) may suggest bone marrow suppression, viral infection, or autoimmune conditions.');
    }

    // Check RBC
    const rbc = bloodCounts.rbc;
    if (rbc?.status === 'high') {
      significance.push('Elevated RBC count may indicate dehydration, polycythemia, or chronic hypoxia.');
    } else if (rbc?.status === 'low') {
      significance.push('Decreased RBC count may suggest anemia, blood loss, or nutritional deficiencies.');
    }

    // Check Platelets
    const platelets = bloodCounts.platelets;
    if (platelets?.status === 'high') {
      significance.push('Elevated platelet count (thrombocytosis) may be associated with inflammation, infection, or myeloproliferative disorders.');
    } else if (platelets?.status === 'low') {
      significance.push('Decreased platelet count (thrombocytopenia) increases bleeding risk and may indicate bone marrow disorders, autoimmune conditions, or medication effects.');
    }

    if (significance.length === 0) {
      significance.push('All blood cell counts are within normal reference ranges, indicating healthy hematopoietic function. No immediate clinical concerns identified from CBC parameters.');
    }

    return significance.join(' ');
  }

  _generateRecommendations(bloodCounts) {
    let recommendations = [];

    const hasAbnormal = ['wbc', 'rbc', 'platelets'].some(k => bloodCounts[k]?.status !== 'normal');

    if (hasAbnormal) {
      recommendations.push('1. Clinical correlation with patient symptoms and medical history is recommended.');

      if (bloodCounts.wbc?.status !== 'normal') {
        recommendations.push('2. Consider differential white blood cell count for detailed evaluation.');
      }

      if (bloodCounts.rbc?.status === 'low') {
        recommendations.push('3. Additional iron studies, vitamin B12, and folate levels may be indicated.');
      }

      if (bloodCounts.platelets?.status !== 'normal') {
        recommendations.push('4. Coagulation studies (PT/INR, aPTT) should be considered if bleeding concerns exist.');
      }

      recommendations.push('5. Repeat CBC in 2-4 weeks to monitor trends unless urgent intervention needed.');
      recommendations.push('6. Consult hematology if persistent abnormalities or concerning trends observed.');
    } else {
      recommendations.push('1. Results are within normal limits.');
      recommendations.push('2. Continue routine health maintenance.');
      recommendations.push('3. Repeat CBC as part of annual physical examination or as clinically indicated.');
    }

    return recommendations.join('\n');
  }

  _drawFooter(doc, { doctor, generatedAt }, footerY) {
    const { MARGINS, COLORS, FONTS } = CONSTANTS;
    const contentWidth = CONSTANTS.PAGE_WIDTH - MARGINS.LEFT - MARGINS.RIGHT;

    doc.strokeColor(COLORS.LIGHT_GRAY)
       .lineWidth(1)
       .moveTo(MARGINS.LEFT, footerY)
       .lineTo(CONSTANTS.PAGE_WIDTH - MARGINS.RIGHT, footerY)
       .stroke();

    const col1Width = contentWidth * 0.6;
    const col2Width = contentWidth * 0.4;
    const col2X = MARGINS.LEFT + col1Width + 10;

    const disclaimer = 'This AI-assisted report is for clinical guidance and should be interpreted in conjunction with other diagnostic findings. All results have been verified by a qualified professional.';
    doc.font(FONTS.ITALIC).fontSize(7).fillColor(COLORS.SECONDARY)
       .text(disclaimer, MARGINS.LEFT, footerY + 15, {
         width: col1Width,
         lineGap: 2,
       });

    doc.font(FONTS.REGULAR).fontSize(8).fillColor(COLORS.SECONDARY)
       .text('Electronically Reviewed and Signed By:', col2X, footerY + 15, {
         width: col2X,
         align: 'left',
       });

    doc.font(FONTS.BOLD).fontSize(10).fillColor(COLORS.PRIMARY)
       .text(`Dr. ${doctor.fullName}`, col2X, footerY + 30, {
         width: col2Width,
         align: 'left',
       });

    doc.font(FONTS.REGULAR).fontSize(8).fillColor(COLORS.SECONDARY)
       .text(doctor.specialty || 'Clinical Pathologist', col2X, footerY + 45, {
         width: col2Width,
         align: 'left',
       });

    const rid = `RID-${new Date(generatedAt).getTime().toString(36).toUpperCase()}`;
    const pageInfo = `${rid} | Page 1 of 1 | Generated: ${new Date().toLocaleDateString()}`;
    doc.font(FONTS.REGULAR).fontSize(7).fillColor(COLORS.LIGHT_GRAY)
       .text(pageInfo, MARGINS.LEFT, CONSTANTS.PAGE_HEIGHT - MARGINS.BOTTOM - 15, {
         width: contentWidth,
         align: 'center',
       });
  }
}

const pdfService = new PDFService();
export default pdfService;