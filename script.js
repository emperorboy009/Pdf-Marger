pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const input = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const fileList = document.getElementById("fileList");
const mergeBtn = document.getElementById("mergeBtn");
const outputName = document.getElementById("outputName");
const fileCount = document.getElementById("fileCount");
const totalSize = document.getElementById("totalSize");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const themeToggle = document.getElementById("themeToggle");

let pdfFiles = [];

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark")
    ? "☀️ Mode Terang"
    : "🌙 Mode Gelap";
});

input.addEventListener("change", (event) => {
  addFiles(event.target.files);
  input.value = "";
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});

dropZone.addEventListener("drop", (event) => {
  addFiles(event.dataTransfer.files);
});

function addFiles(files) {
  const validFiles = Array.from(files).filter((file) =>
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );

  validFiles.forEach((file) => {
    const duplicate = pdfFiles.some(
      (item) =>
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
    );

    if (!duplicate) {
      pdfFiles.push({
        id: crypto.randomUUID(),
        file,
      });
    }
  });

  renderFiles();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setProgress(percent, text) {
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressText.textContent = text;
}

function renderFiles() {
  fileList.innerHTML = "";

  const total = pdfFiles.reduce((sum, item) => sum + item.file.size, 0);
  fileCount.textContent = `${pdfFiles.length} file`;
  totalSize.textContent = `Total: ${formatSize(total)}`;

  if (pdfFiles.length === 0) {
    setProgress(0, "Menunggu file PDF...");
  } else {
    setProgress(0, "Siap digabung.");
  }

  pdfFiles.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "file-card";

    const preview = document.createElement("div");
    preview.className = "preview";
    preview.textContent = "Preview";

    const info = document.createElement("div");
    info.className = "file-info";
    info.innerHTML = `
      <h3>${index + 1}. ${escapeHtml(item.file.name)}</h3>
      <p>Ukuran: ${formatSize(item.file.size)}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const upBtn = document.createElement("button");
    upBtn.textContent = "Naik";
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveFile(index, index - 1);

    const downBtn = document.createElement("button");
    downBtn.textContent = "Turun";
    downBtn.disabled = index === pdfFiles.length - 1;
    downBtn.onclick = () => moveFile(index, index + 1);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Hapus";
    deleteBtn.className = "delete";
    deleteBtn.onclick = () => {
      pdfFiles.splice(index, 1);
      renderFiles();
    };

    actions.append(upBtn, downBtn, deleteBtn);
    card.append(preview, info, actions);
    fileList.appendChild(card);

    renderPreview(item.file, preview);
  });
}

function moveFile(from, to) {
  const [file] = pdfFiles.splice(from, 1);
  pdfFiles.splice(to, 0, file);
  renderFiles();
}

async function renderPreview(file, container) {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    container.textContent = "";
    container.appendChild(canvas);
  } catch (error) {
    container.textContent = "Gagal preview";
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

mergeBtn.addEventListener("click", async () => {
  if (pdfFiles.length < 2) {
    alert("Pilih minimal 2 file PDF.");
    return;
  }

  mergeBtn.disabled = true;
  setProgress(5, "Mulai menggabungkan PDF...");

  try {
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let i = 0; i < pdfFiles.length; i++) {
      const item = pdfFiles[i];
      const percent = Math.round(((i + 1) / pdfFiles.length) * 85);

      setProgress(percent, `Memproses: ${item.file.name}`);

      const bytes = await item.file.arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

      pages.forEach((page) => mergedPdf.addPage(page));
    }

    setProgress(92, "Membuat file hasil...");

    const mergedBytes = await mergedPdf.save();
    const blob = new Blob([mergedBytes], {
      type: "application/pdf",
    });

    const link = document.createElement("a");
    const name = outputName.value.trim() || "hasil-gabungan";

    link.href = URL.createObjectURL(blob);
    link.download = name.toLowerCase().endsWith(".pdf")
      ? name
      : `${name}.pdf`;

    link.click();
    URL.revokeObjectURL(link.href);

    setProgress(100, "Selesai! File berhasil di-download.");
  } catch (error) {
    alert("Terjadi kesalahan saat menggabungkan PDF.");
    setProgress(0, "Gagal menggabungkan PDF.");
  } finally {
    mergeBtn.disabled = false;
  }
});
