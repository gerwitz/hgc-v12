const escapeAttribute = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

// Shared by the HTML transform and client-side search-result enhancement.
export const geminiLinkMarkup = (anchor, href, id) =>
{
  let destination;

  try
  {
    destination = new URL(href);
  }
  catch
  {
    return anchor;
  }

  if (destination.protocol !== "gemini:" || !destination.hostname)
  {
    return anchor;
  }

  const url = escapeAttribute(href);
  const proxy = escapeAttribute(`https://portal.mozz.us/gemini/${destination.host}${destination.pathname}${destination.search}${destination.hash}`);
  const popoverId = escapeAttribute(id);

  return `<span class="gemini-link-wrapper"><span class="gemini-link-control"><button type="button" class="gemini-link-trigger" popovertarget="${popoverId}" aria-label="Geminispace link options"><span aria-hidden="true">♊︎</span></button><span id="${popoverId}" class="gemini-link-popover" popover><span>Geminispace link <a href="/2026/10/07/gemposts.html">more info</a></span><span><a href="${url}">view with Gemini browser</a> <a href="${proxy}" rel="noreferrer" title="View through the third-party Smolnet Portal">view in proxy</a></span></span></span>${anchor}</span>`;
};

const enhanceGeminiLinks = () =>
{
  let active = null;
  let nextId = 0;

  const close = () =>
  {
    if (!active)
    {
      return;
    }

    const { panel, trigger } = active;
    active = null;
    trigger.setAttribute("aria-expanded", "false");
    delete panel.dataset.open;

    if (panel.hasAttribute("popover") && panel.matches(":popover-open"))
    {
      panel.hidePopover();
    }
  };

  const open = (control, pinned = false) =>
  {
    if (active?.control !== control)
    {
      close();
      const panel = control.querySelector(".gemini-link-popover");
      const trigger = control.querySelector(".gemini-link-trigger");
      active = { control, panel, trigger, pinned };
      trigger.setAttribute("aria-expanded", "true");

      if (panel.hasAttribute("data-preview"))
      {
        panel.dataset.open = "";
      }
      else
      {
        panel.dataset.positioned = "";
        panel.showPopover();
        const origin = trigger.getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        const left = Math.max(8, Math.min(origin.left, window.innerWidth - bounds.width - 8));
        const top = origin.bottom + bounds.height <= window.innerHeight - 8
          ? origin.bottom
          : Math.max(8, origin.top - bounds.height);
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
      }
    }
    else if (pinned)
    {
      active.pinned = true;
    }
  };

  const initialize = (root) =>
  {
    const links = root.matches?.("a[href]") ? [root] : [];
    links.push(...root.querySelectorAll("a[href]"));

    for (const anchor of links)
    {
      if (anchor.closest(".gemini-link-wrapper") || !/^gemini:/i.test(anchor.getAttribute("href")))
      {
        continue;
      }

      let id;

      do
      {
        id = `gemini-link-options-${++nextId}`;
      }
      while (document.getElementById(id));

      const template = document.createElement("template");
      template.innerHTML = geminiLinkMarkup("", anchor.getAttribute("href"), id);
      const wrapper = template.content.firstElementChild;

      if (wrapper)
      {
        anchor.replaceWith(wrapper);
        wrapper.append(anchor);
      }
    }

    const controls = root.matches?.(".gemini-link-control") ? [root] : [];
    controls.push(...root.querySelectorAll(".gemini-link-control:not([data-enhanced])"));

    for (const control of controls)
    {
      const panel = control.querySelector(".gemini-link-popover");
      const trigger = control.querySelector(".gemini-link-trigger");

      const preview = control.closest(".preview-large");
      const isPreview = preview?.querySelector("h3 > .gemini-link-wrapper > .gemini-link-control") === control;

      if (isPreview)
      {
        // A card-local overlay keeps the preview glyph above the replacement contents.
        panel.removeAttribute("popover");
        panel.dataset.preview = "";
        trigger.setAttribute("aria-controls", panel.id);
      }
      else if (typeof panel.showPopover !== "function")
      {
        continue;
      }

      control.dataset.enhanced = "";
      trigger.setAttribute("aria-expanded", "false");
      control.addEventListener("pointerenter", (event) =>
      {
        if (event.pointerType === "mouse")
        {
          open(control);
        }
      });
      control.addEventListener("pointerleave", (event) =>
      {
        if (event.pointerType === "mouse" && active?.control === control)
        {
          close();
        }
      });
      trigger.addEventListener("click", (event) =>
      {
        event.preventDefault();

        if (active?.control === control && active.pinned)
        {
          close();
        }
        else
        {
          open(control, true);
        }
      });
      panel.addEventListener("toggle", (event) =>
      {
        if (event.newState === "closed" && active?.control === control)
        {
          close();
        }
      });
    }
  };

  initialize(document);
  new MutationObserver((changes) =>
  {
    for (const change of changes)
    {
      for (const node of change.addedNodes)
      {
        if (node.nodeType === 1)
        {
          initialize(node);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener("pointerdown", (event) =>
  {
    if (active && !active.control.contains(event.target))
    {
      close();
    }
  });
  document.addEventListener("click", (event) =>
  {
    if (active?.panel.contains(event.target))
    {
      close();
    }
  });
  document.addEventListener("focusin", (event) =>
  {
    if (active && !active.control.contains(event.target))
    {
      close();
    }
  });
  document.addEventListener("keydown", (event) =>
  {
    if (event.key === "Escape" || (active && !active.control.contains(event.target)))
    {
      close();
    }
  });
  document.addEventListener("scroll", close, { capture: true, passive: true });
  window.addEventListener("wheel", close, { passive: true });
  window.addEventListener("resize", close);
};

if (typeof document !== "undefined")
{
  enhanceGeminiLinks();
}
