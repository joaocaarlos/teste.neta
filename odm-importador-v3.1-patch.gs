/**
 * ODM IMPORTADOR v3.1 - PATCH PARA PDFs LEGADOS FIAT / STELLANTIS
 *
 * Este arquivo foi preparado para ser colado por partes no seu Apps Script atual.
 * Ele faz 2 coisas principais:
 * 1. Integra a pasta fixa do Drive:
 *    https://drive.google.com/drive/folders/1E2qY0RzsMU1FoptLtQ10Jw8gobuzwM4B?usp=drive_link
 * 2. Melhora a leitura do PDF legado escaneado:
 *    "Fiat Group Automobiles SpA - Product Descriptor - OdM and Part change Card -"
 *
 * COMO APLICAR:
 * 1. No objeto CONFIG do seu script atual, adicione as chaves abaixo.
 * 2. Substitua as funções indicadas pelas versões deste patch.
 * 3. Adicione as novas funções auxiliares.
 */

// ─────────────────────────────────────────────────────────────
// 1) ADICIONE ESTAS CHAVES DENTRO DO OBJETO CONFIG
// ─────────────────────────────────────────────────────────────

/*
  INTEGRATED_FOLDER_URL : 'https://drive.google.com/drive/folders/1E2qY0RzsMU1FoptLtQ10Jw8gobuzwM4B?usp=drive_link',
  INTEGRATED_FOLDER_ID  : '1E2qY0RzsMU1FoptLtQ10Jw8gobuzwM4B',
  OCR_LANGS             : ['en', 'pt', 'it', ''],
*/

/*
  E também expanda DOC_SEPARATORS com estas entradas:

  'Product Descriptor - OdM and Part change Card -',
  'Product Descriptor - OdM and part change Card -',
  'Fiat Group Automobiles SpA',
*/


// ─────────────────────────────────────────────────────────────
// 2) SUBSTITUA onOpen() POR ESTA VERSÃO
// ─────────────────────────────────────────────────────────────

function onOpen() {
  ensureDefaultFolderConfigured_();

  SpreadsheetApp.getUi()
    .createMenu('⚙️ ODM Importador')
    .addItem('📄 Importar arquivo (link ou ID)',     'promptImportSingleFile')
    .addItem('📁 Importar pasta do Drive',           'promptImportFolder')
    .addItem('🚗 Importar pasta Fiat/Stellantis',    'importFromIntegratedFolder')
    .addSeparator()
    .addItem('📁 Definir pasta padrão',              'promptConfigureFolder')
    .addItem('📁 Importar da pasta padrão',          'importFromSavedFolder')
    .addSeparator()
    .addItem('🔍 DRY-RUN: simular sem gravar',       'promptDryRun')
    .addItem('👁️ Pré-visualizar arquivo',            'promptPreviewSingleFile')
    .addSeparator()
    .addItem('✅ Validar / criar cabeçalhos',        'validateOrCreateHeaders')
    .addItem('🔄 Limpar arquivos processados',       'clearProcessedIds')
    .addItem('📋 Abrir LOG',                         'openLog')
    .addToUi();
}


// ─────────────────────────────────────────────────────────────
// 3) ADICIONE ESTAS NOVAS FUNÇÕES
// ─────────────────────────────────────────────────────────────

function ensureDefaultFolderConfigured_() {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty(CONFIG.PROP_FOLDER_ID);

  if (saved || !CONFIG.INTEGRATED_FOLDER_ID) return;

  try {
    DriveApp.getFolderById(CONFIG.INTEGRATED_FOLDER_ID).getName();
    props.setProperty(CONFIG.PROP_FOLDER_ID, CONFIG.INTEGRATED_FOLDER_ID);
  } catch (err) {
    writeLog_('AVISO', 'SISTEMA', 'Pasta integrada não pôde ser validada: ' + err.message, '');
  }
}

function importFromIntegratedFolder() {
  if (!CONFIG.INTEGRATED_FOLDER_ID) {
    SpreadsheetApp.getUi().alert('❌ INTEGRATED_FOLDER_ID não configurado no CONFIG.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(CONFIG.PROP_FOLDER_ID, CONFIG.INTEGRATED_FOLDER_ID);
  runFolderImport_(CONFIG.INTEGRATED_FOLDER_ID, false);
}

function normalizeLegacyOcrText_(text) {
  return String(text || '')
    .replace(/\bMode1\b/g, 'Model')
    .replace(/\bModeI\b/g, 'Model')
    .replace(/\b0bject\b/g, 'Object')
    .replace(/\b0dM\b/g, 'OdM')
    .replace(/\b0DM\b/g, 'ODM')
    .replace(/\b0f\b/g, 'Of')
    .replace(/\bWliERE\b/g, 'WHERE')
    .replace(/\bREcrs:ER\b/g, 'REGISTER')
    .replace(/[|]/g, 'I');
}

function normalizeOcrDigits_(value) {
  return String(value || '')
    .replace(/[Oo]/g, '0')
    .replace(/[Ss]/g, '5')
    .replace(/[Il]/g, '1')
    .replace(/B/g, '8');
}

function scoreOcrText_(text) {
  const src = String(text || '');
  const low = src.toLowerCase();
  let score = 0;

  score += Math.min(6, Math.floor(low.length / 250));

  [
    'fiat group automobiles',
    'product descriptor',
    'part change card',
    'model',
    'odm',
    'object',
    'reason',
    'where',
    'implementation'
  ].forEach(function(term) {
    if (low.indexOf(term) !== -1) score += 2;
  });

  if (/(?:model|mode1)\s*:?\s*[0-9]{4}/i.test(src)) score += 4;
  if (/\bodm\s*:?\s*[0-9o]{4,6}/i.test(src)) score += 4;
  if (/\bwhere\s*:?\s*[0-9]{4}\/[0-9]{4}/i.test(src)) score += 3;
  if (/\b[0-9]{8,13}\b/.test(src)) score += 3;

  const brokenChars = (src.match(/[�□]/g) || []).length;
  score -= Math.min(3, brokenChars);

  return score;
}

function extractTextFromPdfSinglePass_(blob, lang) {
  let tempDoc;
  try {
    const options = { ocr: true };
    if (lang) options.ocrLanguage = lang;

    tempDoc = Drive.Files.insert(
      { title: '__ODM_OCR_TEMP__', mimeType: MimeType.GOOGLE_DOCS },
      blob,
      options
    );

    const text = DocumentApp.openById(tempDoc.id).getBody().getText();
    return normalizeLegacyOcrText_(text);
  } finally {
    if (tempDoc && tempDoc.id) {
      try { DriveApp.getFileById(tempDoc.id).setTrashed(true); } catch (_) {}
    }
  }
}

function extractLabeledBlock_(text, startPattern, endPatterns) {
  const lines = String(text || '').split('\n');
  const startRe = new RegExp('^\\s*(?:' + startPattern + ')\\s*[:\\-]?\\s*(.*)$', 'i');
  const endRe = endPatterns && endPatterns.length
    ? new RegExp('^\\s*(?:' + endPatterns.join('|') + ')\\s*[:\\-]?(?:\\s|$)', 'i')
    : null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(startRe);
    if (!match) continue;

    const collected = [];
    const inline = cleanFieldText_(match[1]);
    if (inline && inline !== ':' && inline !== '-') {
      collected.push(inline);
    }

    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      if (endRe && endRe.test(raw)) break;

      const value = raw.replace(/^\s*[:\-]+\s*/, '').trim();
      if (!value) {
        if (collected.length && !(lines[j + 1] || '').trim()) break;
        continue;
      }

      collected.push(value);
    }

    return cleanFieldText_(collected.join(' '));
  }

  return '';
}


// ─────────────────────────────────────────────────────────────
// 4) SUBSTITUA extractTextFromPdfWithOcr_() POR ESTA VERSÃO
// ─────────────────────────────────────────────────────────────

function extractTextFromPdfWithOcr_(fileId) {
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const langs = Array.from(new Set((CONFIG.OCR_LANGS || ['en', 'pt', 'it', '']).map(function(v) {
    return String(v || '');
  })));

  let best = null;
  let lastError = null;

  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];

    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const text  = extractTextFromPdfSinglePass_(blob, lang);
        const score = scoreOcrText_(text);

        writeLog_(
          'INFO',
          fileId,
          'OCR [' + (lang || 'auto') + '] tentativa ' + attempt + ' score=' + score,
          text.slice(0, 180)
        );

        if (!best || score > best.score || (score === best.score && text.length > best.text.length)) {
          best = { text: text, score: score, lang: (lang || 'auto') };
        }

        // Se o OCR já ficou forte o bastante, não gasta quota em novas passagens.
        if (best.score >= 14) return best.text;
        break;
      } catch (e) {
        lastError = e;
        writeLog_(
          'AVISO',
          fileId,
          'OCR [' + (lang || 'auto') + '] tentativa ' + attempt + ' falhou: ' + e.message,
          ''
        );

        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          Utilities.sleep(CONFIG.RETRY_DELAY_MS * attempt);
        }
      }
    }
  }

  if (best && best.text && best.text.trim()) {
    writeLog_('INFO', fileId, 'OCR selecionado: ' + best.lang + ' (score=' + best.score + ')', '');
    return best.text;
  }

  throw new Error(
    'OCR falhou após múltiplas passagens (' +
    langs.map(function(v) { return v || 'auto'; }).join(', ') +
    '): ' + (lastError ? lastError.message : 'sem resposta válida')
  );
}


// ─────────────────────────────────────────────────────────────
// 5) SUBSTITUA parseOdmDocument_() POR ESTA VERSÃO
// ─────────────────────────────────────────────────────────────

function parseOdmDocument_(text, fileName) {
  const modelField = extractLabeledBlock_(
    text,
    'Model|Mode1|Modello|Modelo',
    ['OdM|ODM|OdM Type', 'Of|Date|Data', 'Codep Spec\\.?', 'Resp\\. Compl\\.?', 'Object|0bject']
  );

  const modelMatch = normalizeOcrDigits_(modelField).match(/^([0-9]{4})\s*(.*)$/)
                  || text.match(/(?:^|\n)\s*(?:Model|Mode1|Modello|Modelo)\s*:?\s*([0-9]{4})\s*([^\n]*)/im)
                  || text.match(/\bModello\s*[:\-]?\s*([0-9]{4})\b/i);

  const projectCode = modelMatch
    ? cleanFieldText_(normalizeOcrDigits_(modelMatch[1]))
    : inferProjectFromText_(text, fileName);

  const projectDesc = modelMatch ? cleanFieldText_(modelMatch[2] || '') : '';

  const odmField = extractLabeledBlock_(
    text,
    'OdM|ODM|OdM Type',
    ['Of|Date|Data', 'Codep Spec\\.?', 'Resp\\. Compl\\.?', 'Object|0bject', 'Reason']
  );

  const odmRaw = normalizeOcrDigits_(odmField).match(/(?:([0-9]{4})\s*[-\/]\s*)?([0-9]{4,6})/)
              || text.match(/(?:N[°\.]?\s*)?O[dD][Mm]\s*[n°:\-\/]?\s*(?:([0-9]{4})\s*[-\/]\s*)?([0-9]{4,6})/i)
              || text.match(/(?:N[°\.]?\s+)?MODIFICA\s+N[°\.]?\s*([0-9]{4,6})/i);

  const odmNumber    = odmRaw ? normalizeOcrDigits_(odmRaw[2] || odmRaw[1] || '').trim().padStart(5, '0') : '';
  const odmPrefix    = odmRaw && odmRaw[1] ? normalizeOcrDigits_(odmRaw[1]) : projectCode;
  const odmFormatted = odmNumber
    ? 'ODM ' + odmPrefix + ' - ' + odmNumber
    : 'nenhum dado cadastrado';

  const dateField = extractLabeledBlock_(
    text,
    'Of|Date|Data(?:\\s+di?\\s+emiss(?:ione|[aã]o))?',
    ['Codep Spec\\.?', 'Resp\\. Compl\\.?', 'Object|0bject', 'Reason', 'Implementation']
  );

  const dateMatch = dateField.match(/([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/)
                 || text.match(/(?:Of|Date|Data(?:\s+di?\s+emiss(?:ione|[aã]o))?)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i)
                 || text.match(/\b([0-9]{2}[\/\-][0-9]{2}[\/\-][0-9]{4})\b/);

  const ofDate = dateMatch ? normalizeDate_(dateMatch[1]) : '-';

  const objectText = extractLabeledBlock_(
    text,
    'Object|0bject',
    ['Reason|Reas0n', 'Note', 'Where|Application|Applicazione', 'Implementation', 'MM Codep Spec\\.?', 'Grid Issued\\/Changed']
  ) || blockBetween_(text, 'Object', ['Reason', 'Note', 'PN', 'Where', 'Application']);

  const reasonText = extractLabeledBlock_(
    text,
    'Reason|Reas0n',
    ['Note', 'Where|Application|Applicazione', 'Implementation', 'MM Codep Spec\\.?', 'Grid Issued\\/Changed']
  ) || blockBetween_(text, 'Reason', ['Note', 'PN', 'Where', 'Application', 'Implementation']);

  const whereText = extractLabeledBlock_(
    text,
    'Where|Application|Applicazione',
    ['Reason|Reas0n', 'Note', 'Implementation', 'MM Codep Spec\\.?', 'Grid Issued\\/Changed']
  );

  const pnSection = [
    extractSection_(text, 'Part Number|PN|P\\.N\\.', ['Register', 'Reason', 'Object', 'Application']),
    objectText,
    reasonText,
    whereText,
    text
  ].join('\n');

  const extracted = extractPartNumbersScored_(normalizeOcrDigits_(pnSection));
  const partNumbers = extracted.partNumbers;
  const confidence  = extracted.confidence;

  const mold = extractMold_(text) || '-';
  const produto = inferProduct_(objectText, text);
  const aplicacao = inferApplication_(whereText || objectText, text);

  const implField = extractLabeledBlock_(
    text,
    'Implementation|Implementa[çcz][aãi][oõ]?|Data\\s+di?\\s+implementazione',
    ['Actuation note', 'Object|0bject', 'Reason|Reas0n', 'Where', 'Meeting Request']
  );

  const implementation = implField
    ? cleanFieldText_(implField)
    : CONFIG.DEFAULTS.dataImplementacao;

  const descricaoOdm = buildDescricao_(objectText, reasonText);

  let qualityScore = 0;
  if (odmNumber)             qualityScore++;
  if (projectCode !== '-')   qualityScore++;
  if (ofDate !== '-')        qualityScore++;
  if (objectText)            qualityScore++;
  if (partNumbers.length)    qualityScore++;
  if (mold !== '-')          qualityScore++;

  const base = {
    projeto        : projectCode  || '-',
    projetoDesc    : projectDesc,
    odm            : odmFormatted,
    molde          : mold,
    produto        : produto,
    aplicacao      : aplicacao || 'PEÇA',
    descricaoOdm   : descricaoOdm || '-',
    dataRecebimento: ofDate,
    implementation : implementation,
    qualityScore   : qualityScore,
    confidence     : confidence
  };

  const pnList = partNumbers.length ? partNumbers : ['-'];
  const rows = pnList.map(function(pn) {
    return [
      base.projeto,
      base.odm,
      pn,
      CONFIG.DEFAULTS.pnNovo,
      base.molde,
      base.produto,
      base.aplicacao,
      base.descricaoOdm,
      base.dataRecebimento,
      CONFIG.DEFAULTS.previsaoOferta,
      CONFIG.DEFAULTS.caf,
      CONFIG.DEFAULTS.preventivo,
      CONFIG.DEFAULTS.cotacaoComercial,
      CONFIG.DEFAULTS.dataOfertaCancelada,
      CONFIG.DEFAULTS.cartaAutorizacao,
      CONFIG.DEFAULTS.ofertaSemImpostos,
      CONFIG.DEFAULTS.numeroPO,
      base.implementation,
      new Date()
    ];
  });

  return { base: base, rows: rows, confidence: qualityScore };
}


// ─────────────────────────────────────────────────────────────
// 6) SUBSTITUA inferApplication_() POR ESTA VERSÃO
// ─────────────────────────────────────────────────────────────

function inferApplication_(objectText, fullText) {
  const whereField = extractLabeledBlock_(
    fullText,
    'Where|Application|Applicazione',
    ['Reason|Reas0n', 'Note', 'Implementation', 'MM Codep Spec\\.?', 'Grid Issued\\/Changed']
  );

  if (whereField) {
    return cleanFieldText_(whereField);
  }

  const m1 = fullText.match(/WHERE\s*[:\-]\s*([0-9\/]{4,})/i);
  if (m1) return m1[1];

  const m2 = fullText.match(/(?:Application|Applicazione)\s*[:\-]\s*([^\n]+)/i);
  if (m2) return cleanFieldText_(m2[1]);

  const m3 = fullText.match(/Models?\s*[:\-]\s*([0-9\s\/]+)/i);
  if (m3) return cleanFieldText_(m3[1]);

  const models = [];
  const re = /\b(5[0-9]{3}|2[0-9]{3}|3[0-9]{3})\b/g;
  let m;
  const seen = {};
  while ((m = re.exec(objectText)) !== null) {
    if (!seen[m[1]]) { seen[m[1]] = true; models.push(m[1]); }
  }
  if (models.length) return models.join('/');

  return 'PEÇA';
}


// ─────────────────────────────────────────────────────────────
// 7) SUBSTITUA inferProduct_() POR ESTA VERSÃO
// ─────────────────────────────────────────────────────────────

function inferProduct_(objectText, fullText) {
  const haystack = (objectText + ' ' + fullText).toUpperCase();

  const terms = [
    ['CENTER GRILLE|GRADE CENTRAL|GRIGLIA CENTRALE',                               'GRADE CENTRAL'],
    ['FRONT GRILLE|GRADE DIANT|GRIGLIA FRONT|GRIGLIA ANT',                         'GRADE DIANTEIRA'],
    ['ENERGY ABSORBER|ABSORVEDOR DE ENERGIA|ASSORBITORE(?:\\s+(?:DI\\s+)?ENERGIA)?','ABSORVEDOR DE ENERGIA'],
    ['BUMPER FINISHER|BUMPER FINISHERS|FINISHER BUMPER|FINISHERS BUMPERS|ACABAMENTO.*PARA-CHOQUE|PARAURTI.*FINITURA', 'ACABAMENTO DO PARA-CHOQUE'],
    ['FRONT BUMPER|PARA-CHOQUE DIANT|PARAURTI ANT',                                'PARA-CHOQUE DIANTEIRO'],
    ['REAR BUMPER|PARA-CHOQUE TRAS|PARAURTI POST',                                 'PARA-CHOQUE TRASEIRO'],
    ['\\bBUMPER\\b|\\bPARAURTI\\b',                                                'PARA-CHOQUE'],
    ['DOOR TRIM|DOOR PANEL|RIVESTIMENTO PORTA|REVESTIMENTO.*PORTA',                'REVESTIMENTO DE PORTA'],
    ['UNDERBODY SHIELD|RIPARO SOTTOMOTORE|PROTETOR.*MOTOR|ENGINE SHIELD',          'PROTETOR DO MOTOR'],
    ['WHEEL ARCH LINER|PASSARUOTA|PROTETOR.*RODA|COPRIPASSARUOTA',                 'PROTETOR DE PASSAGEM DE RODA'],
    ['WHEEL ARCH|PASSAGE.*RODA',                                                   'PASSAGEM DE RODA'],
    ['INSTRUMENT PANEL|DASHBOARD|QUADRO STRUMENTI|PAINEL.*INSTRUMENTO',            'PAINEL DE INSTRUMENTOS'],
    ['PILLAR.*TRIM|RIVESTIMENTO.*MONTANTE|REVESTIMENTO.*PILAR',                    'REVESTIMENTO DE PILAR'],
    ['ROOF LINER|TETO.*FORRO|RIVESTIMENTO.*TETTO',                                 'FORRO DE TETO'],
    ['SPLASH GUARD|PARA-BARRO|PARASPRUZZI',                                        'PARA-BARRO'],
    ['\\bSPOILER\\b|\\bDEFLECTOR\\b',                                              'SPOILER'],
    ['SIDE SILL|SOLEIRA|MINIGONNA',                                                'SOLEIRA'],
    ['BATTICALCAGNO',                                                               'SOLEIRA DE ENTRADA'],
    ['RIVESTIMENTO|REVESTIMENTO',                                                  'REVESTIMENTO'],
    ['FINISHER|FINISHERS|ACABAMENTO',                                              'ACABAMENTO'],
    ['GRILLE|GRELHA|GRADE',                                                         'GRADE'],
    ['\\bFOAM\\b|ESPUMA|\\bSCHIUMA\\b',                                             'ESPUMA / ABSORVEDOR'],
    ['COPRIRUOTA|CALOTA',                                                           'CALOTA / COBERTURA DE RODA'],
    ['COFANO|\\bHOOD\\b|\\bCAP[Ô]\\b',                                              'CAPÔ'],
    ['PIANALE|ASSOALHO|FLOOR',                                                      'ASSOALHO'],
  ];

  for (let i = 0; i < terms.length; i++) {
    if (new RegExp(terms[i][0]).test(haystack)) return terms[i][1];
  }
  return 'PEÇA NÃO IDENTIFICADA';
}
