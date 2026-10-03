/* ============================================================
   Setor XI — formulário de contato -> Google Planilhas

   Este arquivo NÃO roda no site: é código pra colar no Apps Script
   da planilha. O site (app.js, CONTACT_SHEET_ENDPOINT) manda cada
   envio do formulário "Entre em contato" pra cá e o script grava uma
   linha na aba "Contatos".

   PASSO A PASSO
   1. Crie uma planilha em sheets.google.com (ex.: "Setor XI - Contatos").
   2. Menu Extensões > Apps Script. Apague o que estiver lá e cole TUDO
      deste arquivo. Salve (ícone de disquete).
   3. Implantar > Nova implantação > tipo "App da Web":
        - Executar como: Eu
        - Quem tem acesso: Qualquer pessoa
      Clique em Implantar e autorize (Google avisa "app não verificado":
      Avançado > Acessar projeto). Copie a URL que termina em /exec.
   4. Cole essa URL em app.js, na constante CONTACT_SHEET_ENDPOINT, e
      publique o site.
   Se mudar este código depois, é preciso Implantar > Gerenciar
   implantações > editar > Nova versão (a URL continua a mesma).
   ============================================================ */

var SHEET_NAME = "Contatos";
var TIMEZONE = "America/Sao_Paulo";
var MAX_LEN = 500;

function doPost(e) {
  var p = (e && e.parameter) || {};

  // campo-armadilha anti-spam: gente não preenche, robô preenche
  if (p._gotcha) return reply({ result: "ignored" });

  var nome = clean(p.nome);
  var contato = clean(p.contato);
  if (!nome || !contato) return reply({ result: "error", error: "campos obrigatorios" });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Data/hora", "Nome", "Contato", "Interesse"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
      nome,
      contato,
      clean(p.interesse),
    ]);
  } finally {
    lock.releaseLock();
  }

  return reply({ result: "success" });
}

// limita o tamanho e impede que o texto vire fórmula na planilha
// (valor começando com = + ou - seria executado como fórmula; o
// apóstrofo faz a planilha guardar como texto, sem aparecer na célula)
function clean(value) {
  var text = String(value || "").trim().slice(0, MAX_LEN);
  return /^[=+\-]/.test(text) ? "'" + text : text;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
