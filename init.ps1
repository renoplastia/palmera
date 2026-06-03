# init.ps1 - Verificacion e inicializacion del entorno en Windows PowerShell
#
# Este script lo ejecuta el agente al COMENZAR una sesion y antes de
# declarar cualquier tarea como `done` en Windows.

$ErrorActionPreference = "Stop"

function Write-Ok ($msg) {
    Write-Host "[OK]    $msg" -ForegroundColor Green
}

function Write-Warn ($msg) {
    Write-Host "[WARN]  $msg" -ForegroundColor Yellow
}

function Write-Fail ($msg) {
    Write-Host "[FAIL]  $msg" -ForegroundColor Red
}

$harnessExitCode = 0

Write-Host "== 1. Verificando entorno de Node.js ==================="
try {
    $nodeVer = & node -v
    Write-Ok "node -> $nodeVer"
} catch {
    Write-Fail "node no esta instalado en el PATH de PowerShell"
    Exit 1
}

try {
    $npmVer = & npm -v
    Write-Ok "npm  -> v$npmVer"
} catch {
    Write-Fail "npm no esta instalado en el PATH de PowerShell"
    Exit 1
}

Write-Host ""
Write-Host "== 2. Verificando archivos base del arnes =============="
$harnessFiles = @(
    "AGENTS.md",
    "feature_list.json",
    "progress/current.md",
    "docs/architecture.md",
    "docs/conventions.md",
    "docs/verification.md",
    "CHECKPOINTS.md"
)

foreach ($file in $harnessFiles) {
    if (Test-Path $file) {
        Write-Ok "Existe $file"
    } else {
        Write-Fail "Falta archivo base: $file"
        $harnessExitCode = 1
    }
}

Write-Host ""
Write-Host "== 3. Validando feature_list.json (Node.js) ============"
$jsValidator = @'
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
  const inProgress = data.features.filter(f => f.status === 'in_progress');
  if (inProgress.length > 1) {
    console.log('[FAIL]  Hay ' + inProgress.length + ' features en in_progress (maximo 1)');
    process.exit(1);
  }
  const valid = new Set(['pending', 'in_progress', 'done', 'blocked']);
  for (const f of data.features) {
    if (!valid.has(f.status)) {
      console.log('[FAIL]  Estado invalido en feature ' + f.id + ': ' + f.status);
      process.exit(1);
    }
  }
  console.log('[OK]    feature_list.json es valido (' + data.features.length + ' features)');
} catch (e) {
  console.log('[FAIL]  feature_list.json es invalido: ' + e.message);
  process.exit(1);
}
'@

try {
    # Ejecuta el script inline de Node
    $validationResult = $jsValidator | node
    Write-Host $validationResult
    if ($validationResult -match '\[FAIL\]') {
        $harnessExitCode = 1
    }
} catch {
    Write-Fail "Error ejecutando el validador en Node.js: $_"
    $harnessExitCode = 1
}

Write-Host ""
Write-Host "== 4. Ejecutando verificacion de tipos (npx tsc) ======"
if (Test-Path "tsconfig.json") {
    try {
        & npx tsc --noEmit --skipLibCheck
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Todos los tipos de TypeScript compilan correctamente"
        } else {
            Write-Fail "Errores de compilacion en TypeScript"
            $harnessExitCode = 1
        }
    } catch {
        Write-Fail "Fallo al ejecutar npx tsc: $_"
        $harnessExitCode = 1
    }
} else {
    Write-Warn "tsconfig.json no encontrado"
}

Write-Host ""
Write-Host "== 5. Resumen =========================================="
if ($harnessExitCode -eq 0) {
    Write-Ok "Entorno listo. Puedes empezar a trabajar."
} else {
    Write-Fail "Entorno NO esta listo. Resuelve los errores antes de avanzar."
}

exit $harnessExitCode
