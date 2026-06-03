
document.getElementById('mergeBtn').addEventListener('click', async () => {
  const files = document.getElementById('pdfFiles').files;
  const outputName = document.getElementById('outputName').value.trim() || 'hasil-gabungan';

  if(files.length < 2){
    alert('Pilih minimal 2 file PDF');
    return;
  }

  const mergedPdf = await PDFLib.PDFDocument.create();

  for(const file of files){
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const blob = new Blob([mergedBytes], {type:'application/pdf'});

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = outputName.endsWith('.pdf') ? outputName : outputName + '.pdf';
  link.click();
});
