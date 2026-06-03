pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const input = document.getElementById("pdfInput");
const dropZone = document.getElementById("dropZone");
const fileList = document.getElementById("fileList");
const mergeBtn = document.getElementById("mergeBtn");
const outputName = document.getElementById("outputName");

const fileCount = document.getElementById("fileCount");
const totalSize = document.getElementById("totalSize");
const estimatedSize = document.getElementById("estimatedSize");

const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");

const themeToggle = document.getElementById("themeToggle");

const previewModal = document.getElementById("previewModal");
const closePreview = document.getElementById("closePreview");
const previewTitle = document.getElementById("previewTitle");
const allPagesPreview = document.getElementById("allPagesPreview");

let pdfFiles = [];

new Sortable(fileList, {
  animation: 180,
  handle: ".drag-handle",
  onEnd: function (event) {
    const movedItem = pdfFiles.splice(event.oldIndex, 1)[0];
    pdfFiles.splice(event.newIndex, 0, movedItem);
    renderFiles();
  },
});

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

closePreview.addEventListener("click", closePreviewModal);

previewModal.addEventListener("click", (event) => {
  if (event.target === previewModal) {
    closePreviewModal();
  }
});

async function addFiles(files) {
  const validFiles = Array.from(files).filter((file) => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  });

  for (const file of validFiles) {
    const duplicate = pdfFiles.some((item) => {
      return (
        item.file.name === file.name &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified
      );
    });

    if (!duplicate) {
      const pageCount = await getPageCount(file);

      pdfFiles.push({
        id: crypto.randomUUID(),
        file: file,
        pageCount: pageCount,
        includePages: "",
        removePages: "",
      });
    }
  }

  renderFiles();
}

async function getPageCount(file) {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    return pdf.numPages;
  } catch (error) {
    return 0;
  }
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

function updateEstimatedSize() {
  const total = pdfFiles.reduce((sum, item) => sum + item.file.size, 0);
  estimatedSize.textContent = formatSize(total);
}

function renderFiles() {
  fileList.innerHTML = "";

  const total = pdfFiles.reduce((sum, item) => sum + item.file.size, 0);

  fileCount.textContent = `${pdfFiles.length} file`;
  totalSize.textContent = `Total: ${formatSize(total)}`;

  if (pdfFiles.length === 0) {
    setProgress(0, "Menunggu file PDF...");
  } else {
    setProgress(0, "Siap digabung. Geser kartu file untuk ubah urutan.");
  }

  pdfFiles.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "file-card";
    card.dataset.id = item.id;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "☰";

    const preview = document.createElement("div");
    preview.className = "preview";
    preview.textContent = "Preview";

    const info = document.createElement("div");
    info.className = "file-info";

    info.innerHTML = `
      <h3>${index + 1}. ${escapeHtml(item.file.name)}</h3>
      <p>Ukuran: ${formatSize(item.file.size)} • ${item.pageCount || "-"} halaman</p>

      <div class="page-control">
        <label>Ambil halaman tertentu</label>
        <input class="page-input include-input" data-id="${item.id}" type="text"
          placeholder="Contoh: 1-3,5,8 | kosongkan untuk semua"
          value="${escapeHtml(item.includePages)}">

        <label>Hapus halaman tertentu</label>
        <input class="page-input remove-input" data-id="${item.id}" type="text"
          placeholder="Contoh: 2,4,7-9"
          value="${escapeHtml(item.removePages)}">

        <span class="page-hint">Format halaman: 1-3,5,8. Nomor halaman dimulai dari 1.</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "actions";

    const previewBtn = document.createElement("button");
    previewBtn.textContent = "Preview Semua";
    previewBtn.onclick = () => previewAllPages(item.file);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Hapus File";
    deleteBtn.className = "delete";
    deleteBtn.onclick = () => {
      pdfFiles.splice(index, 1);
      renderFiles();
    };

    actions.append(previewBtn, deleteBtn);
    card.append(handle, preview, info, actions);
    fileList.appendChild(card);

    renderPreview(item.file, preview);
  });

  document.querySelectorAll(".include-input").forEach((inputEl) => {
    inputEl.addEventListener("input", (event) => {
      const item = pdfFiles.find((file) => file.id === event.target.dataset.id);
      if (item) item.includePages = event.target.value;
    });
  });

  document.querySelectorAll(".remove-input").forEach((inputEl) => {
    inputEl.addEventListener("input", (event) => {
      const item = pdfFiles.find((file) => file.id === event.target.dataset.id);
      if (item) item.removePages = event.target.value;
    });
  });

  updateEstimatedSize();
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
      viewport: viewport,
    }).promise;

    container.textContent = "";
    container.appendChild(canvas);
  } catch (error) {
    container.textContent = "Gagal preview";
  }
}

async function previewAllPages(file) {
  previewModal.classList.add("show");
  previewTitle.textContent = file.name;
  allPagesPreview.innerHTML = "Memuat semua halaman...";

  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    allPagesPreview.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.1 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const wrapper = document.createElement("div");
      wrapper.className = "page-preview";
      wrapper.innerHTML = `<b>Halaman ${pageNumber}</b>`;
      wrapper.appendChild(canvas);

      allPagesPreview.appendChild(wrapper);
    }
  } catch (error) {
    allPagesPreview.innerHTML = "Gagal memuat preview.";
  }
}

function closePreviewModal() {
  previewModal.classList.remove("show");
  allPagesPreview.innerHTML = "";
}

function parsePageRange(text, maxPages) {
  if (!text || !text.trim()) {
    return Array.from({ length: maxPages }, (_, index) => index);
  }

  const result = new Set();
  const parts = text.split(",");

  for (const part of parts) {
    const clean = part.trim();

    if (!clean) continue;

    if (clean.includes("-")) {
      const [startRaw, endRaw] = clean.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);

      if (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 1 &&
        end >= start &&
        end <= maxPages
      ) {
        for (let page = start; page <= end; page++) {
          result.add(page - 1);
        }
      }
    } else {
      const page = Number(clean);

      if (Number.isInteger(page) && page >= 1 && page <= maxPages) {
        result.add(page - 1);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

function getFinalPageIndexes(item) {
  let selectedPages = parsePageRange(item.includePages, item.pageCount);

  if (!item.removePages.trim()) {
    return selectedPages;
  }

  const removedPages = new Set(
    parsePageRange(item.removePages, item.pageCount)
  );

  selectedPages = selectedPages.filter((pageIndex) => !removedPages.has(pageIndex));

  return selectedPages;
}

mergeBtn.addEventListener("click", async () => {
  if (pdfFiles.length < 2) {
    alert("Pilih minimal 2 file PDF.");
    return;
  }

  mergeBtn.disabled = true;
  setProgress(5, "Mulai menggabungkan PDF...");

  try {
    const finalBytes = await mergeNormal();

    const blob = new Blob([finalBytes], {
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
    alert("Terjadi kesalahan saat menggabungkan PDF. Cek format halaman yang kamu masukkan.");
    setProgress(0, "Gagal menggabungkan PDF.");
  } finally {
    mergeBtn.disabled = false;
  }
});

async function mergeNormal() {
  const mergedPdf = await PDFLib.PDFDocument.create();

  for (let i = 0; i < pdfFiles.length; i++) {
    const item = pdfFiles[i];
    const percent = Math.round(((i + 1) / pdfFiles.length) * 85);

    setProgress(percent, `Menggabungkan: ${item.file.name}`);

    const bytes = await item.file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);

    const pageIndexes = getFinalPageIndexes(item);

    if (pageIndexes.length === 0) {
      continue;
    }

    const pages = await mergedPdf.copyPages(pdf, pageIndexes);
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  if (mergedPdf.getPageCount() === 0) {
    throw new Error("Tidak ada halaman yang dipilih.");
  }

  setProgress(92, "Mengoptimalkan file hasil...");

  return await mergedPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
    }
