$ErrorActionPreference = "Stop"
$proj = "C:\Users\seoli\Setor xi catalogo"
$scratch = if ($env:SXI_SCRATCH) { $env:SXI_SCRATCH } else { "$proj\tools\out" }
New-Item -ItemType Directory -Force $scratch | Out-Null

# All source files are UTF-8; ReadAllText auto-detects. Do NOT author non-ASCII
# literals in this script (Windows PowerShell 5.1 parses it as ANSI).
# Normalize to LF: git (core.autocrlf) sometimes checks files out with CRLF,
# which breaks the exact-string .Replace() patches below since the heredocs
# here are LF-only.
$html   = [System.IO.File]::ReadAllText("$proj\index.html") -replace "`r`n", "`n"
$css    = [System.IO.File]::ReadAllText("$proj\styles.css") -replace "`r`n", "`n"
$appjs  = [System.IO.File]::ReadAllText("$proj\app.js") -replace "`r`n", "`n"
$prodjs = [System.IO.File]::ReadAllText("$proj\products.js") -replace "`r`n", "`n"

# cache-busting: bump ?v= dos assets do index.html a cada build (GitHub Pages)
$ver = Get-Date -Format "yyyyMMddHHmm"
$htmlNew = [regex]::Replace($html, '(styles\.css|products\.js|app\.js|supabase\.js)\?v=[0-9]+', ('$1?v=' + $ver))
if ($htmlNew -ne $html) {
  $html = $htmlNew
  [System.IO.File]::WriteAllText("$proj\index.html", $html, (New-Object System.Text.UTF8Encoding $false))
}

function DataUri($path) {
  $b64 = [System.Convert]::ToBase64String([System.IO.File]::ReadAllBytes($path))
  $ext = [System.IO.Path]::GetExtension($path).ToLower()
  $mime = "image/jpeg"
  if ($ext -eq ".png") { $mime = "image/png" }
  elseif ($ext -eq ".svg") { $mime = "image/svg+xml" }
  return "data:$mime;base64,$b64"
}

$logoUri = DataUri "$proj\img\logo-reverse-sm.png"

# --- image map: keys are the "fotos/NAME.jpg" paths used in products.js,
#     values are the SMALL (460px) versions so the single file stays leve ---
$lines = @()
Get-ChildItem "$proj\fotos\sm\*.jpg" | Sort-Object Name | ForEach-Object {
  $lines += ('  "fotos/' + $_.Name + '": "' + (DataUri $_.FullName) + '"')
}
$imgMap = "var SETOR_XI_IMAGES = {`n" + ($lines -join ",`n") + "`n};"

# --- patch app.js: no arquivo unico, as imagens vem do mapa embutido ---
$iuOld = @"
  function imageUrl(product) {
    return product.image || placeholderImage(product);
  }
"@
$iuNew = @"
  function imageUrl(product) {
    return SETOR_XI_IMAGES[product.image] || placeholderImage(product);
  }
"@
$scisOld = @"
  function setCardImage(img, product) {
    img.src = imageUrl(product);
    if (product.image) {
      img.srcset =
        product.image.replace("fotos/", "fotos/sm/") +
        " 460w, " +
        product.image +
        " 900w";
      img.sizes = "(max-width: 560px) 46vw, (max-width: 960px) 31vw, 260px";
    }
  }
"@
$scisNew = @"
  function setCardImage(img, product) {
    img.src = imageUrl(product);
  }
"@
$isOld = @"
  function imageSrc(path) {
    return path || "";
  }
"@
$isNew = @"
  function imageSrc(path) {
    return SETOR_XI_IMAGES[path] || "";
  }
"@
$appPatched = $appjs.Replace($iuOld, $iuNew).Replace($scisOld, $scisNew).Replace($isOld, $isNew)
if (-not $appPatched.Contains($iuNew.Trim())) { throw "app.js imageUrl patch failed" }
if (-not $appPatched.Contains($scisNew.Trim())) { throw "app.js setCardImage patch failed" }
if (-not $appPatched.Contains($isNew.Trim())) { throw "app.js imageSrc patch failed" }
if ($appPatched.Contains('img.srcset =')) { throw "app.js srcset still present in bundle" }

# arquivo unico/artifact: sem o questionario obrigatorio da primeira visita
$appPatched = $appPatched.Replace("var SURVEY_ENABLED = true;", "var SURVEY_ENABLED = false;")
if (-not $appPatched.Contains("var SURVEY_ENABLED = false;")) { throw "app.js survey flag patch failed" }

$script = $imgMap + "`n`n" + $prodjs + "`n`n" + $appPatched

# --- embed category background images referenced in app.js (img/bg-*.jpg) ---
Get-ChildItem "$proj\img\bg-*.jpg" -ErrorAction SilentlyContinue | ForEach-Object {
  $script = $script.Replace("img/" + $_.Name, (DataUri $_.FullName))
}

# --- body markup: lifted verbatim from index.html (correct UTF-8) ---
$m = [regex]::Match($html, "(?s)<body>(.*?)</body>")
if (-not $m.Success) { throw "body not found in index.html" }
$body = $m.Groups[1].Value
$cut = $body.IndexOf("<!-- Dados")
if ($cut -lt 0) { throw "script marker not found" }
$body = $body.Substring(0, $cut).TrimEnd()
$body = $body.Replace('src="img/logo-reverse-sm.png"', 'src="' + $logoUri + '"')

$title = "Cat" + [char]0x00E1 + "logo Setor XI"

# --- 1) standalone document ---
$standalone = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>$title</title>
  <meta name="description" content="Vitrine de camisas de futebol da marca Setor XI." />
  <link rel="icon" href="$logoUri" />
  <style>
$css
  </style>
</head>
<body>
$body
  <script>
$script
  </script>
</body>
</html>
"@

# --- 2) artifact body (no doctype/html/head/body wrappers) ---
$artifact = @"
<title>$title</title>
<style>
$css
</style>
$body
<script>
$script
</script>
"@

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$proj\catalogo-setor-xi.html", $standalone, $utf8)
[System.IO.File]::WriteAllText("$scratch\artifact-catalogo.html", $artifact, $utf8)

"standalone bytes: {0}" -f (Get-Item "$proj\catalogo-setor-xi.html").Length
"artifact bytes:   {0}" -f (Get-Item "$scratch\artifact-catalogo.html").Length
"images embedded:  {0}" -f $lines.Count
