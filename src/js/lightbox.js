(() => {
  if (!window.HTMLDialogElement) {
    return;
  }

  const dialog = document.createElement("dialog");
  const content = document.createElement("div");
  const image = document.createElement("img");
  const caption = document.createElement("div");

  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Image preview");
  content.className = "lightbox-content";
  image.className = "lightbox-image";
  caption.className = "lightbox-caption";

  content.append(image, caption);
  dialog.append(content);
  document.body.append(dialog);

  const close = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const open = (sourceImage, figure) => {
    const sourceCaption = figure.querySelector("figcaption");

    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt;
    caption.replaceChildren();
    caption.hidden = !sourceCaption;

    if (sourceCaption) {
      const captionClone = sourceCaption.cloneNode(true);
      caption.append(...captionClone.childNodes);
    }

    dialog.showModal();
    dialog.focus();
  };

  for (const figure of document.querySelectorAll("figure")) {
    const sourceImage = figure.querySelector("img");

    if (!sourceImage) {
      continue;
    }

    sourceImage.classList.add("lightbox-trigger");
    sourceImage.tabIndex = 0;
    sourceImage.setAttribute("role", "button");
    sourceImage.setAttribute("aria-haspopup", "dialog");
    sourceImage.setAttribute("aria-label", sourceImage.alt || "Open image preview");

    sourceImage.addEventListener("click", () => {
      open(sourceImage, figure);
    });

    sourceImage.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(sourceImage, figure);
      }
    });
  }

  dialog.addEventListener("click", close);
  dialog.addEventListener("cancel", close);
  window.addEventListener("keydown", close);
})();
