# Opens docs/SkillKart_FYP_Final_Report.docx in Microsoft Word, refreshes every field (table of contents,
# list of figures, list of tables, page numbers) and saves the file. A PDF is exported only when -Pdf is given.
#
#   powershell -ExecutionPolicy Bypass -File finalize-docx.ps1 [-Pdf "C:\path\out.pdf"]
param(
  [string]$Docx = (Join-Path $PSScriptRoot "..\SkillKart_FYP_Final_Report.docx"),
  [string]$Pdf = ""
)
$ErrorActionPreference = "Stop"
$Docx = (Resolve-Path $Docx).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx, $false, $false)
  try { $doc.SetCompatibilityMode(15) } catch { }   # open as a modern (Word 2013+) document, not in compatibility mode
  $doc.Repaginate()
  # Two passes: the first fills the lists, the second corrects page numbers that shifted because the lists got longer.
  for ($pass = 1; $pass -le 2; $pass++) {
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $null = $doc.Fields.Update()
    $doc.Repaginate()
  }
  $pages = $doc.ComputeStatistics(2)   # wdStatisticPages
  $words = $doc.ComputeStatistics(0)   # wdStatisticWords
  $doc.Save()
  if ($Pdf -ne "") {
    $doc.ExportAsFixedFormat($Pdf, 17)  # wdExportFormatPDF
  }
  Write-Output "OK  pages=$pages words=$words tocs=$($doc.TablesOfContents.Count) sections=$($doc.Sections.Count)"
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
