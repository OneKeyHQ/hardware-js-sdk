"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getImageSrc(source) {
  if (typeof source === "string") return source;
  if (source && typeof source === "object") {
    if ("default" in source && source.default?.src) return source.default.src;
    if ("src" in source && typeof source.src === "string") return source.src;
  }
  return "";
}

function isBadgeImage(src, width, height) {
  if (!src) return false;

  // Prefer hostname-based checks over substring checks to avoid matching
  // attacker-controlled URLs that merely contain these domains in the path/query.
  try {
    const url = new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "shields.io" ||
      hostname.endsWith(".shields.io") ||
      hostname === "badge.fury.io" ||
      hostname.endsWith(".badge.fury.io")
    ) {
      return true;
    }
  } catch {
    // If src is not a valid URL, fall through to size-based heuristics.
  }

  if (typeof width === "number" && width <= 40) return true;
  if (typeof height === "number" && height <= 40) return true;
  return false;
}

export default function MdxImage({ src, alt, title, ...rest }) {
  const [open, setOpen] = useState(false);
  const [isInsideAnchor, setIsInsideAnchor] = useState(false);
  const imgRef = useRef(null);
  const resolvedSrc = useMemo(() => getImageSrc(src), [src]);
  const isBadge = useMemo(
    () => isBadgeImage(resolvedSrc, rest.width, rest.height),
    [resolvedSrc, rest.width, rest.height]
  );
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!imgRef.current) return;
    setIsInsideAnchor(imgRef.current.closest("a") !== null);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
    };
  }, [open, closeModal]);

  if (!resolvedSrc) {
    return null;
  }

  const imageElement = (
    <img ref={imgRef} src={resolvedSrc} alt={alt} title={title} {...rest} />
  );

  if (isBadge) {
    return imageElement;
  }

  if (isInsideAnchor) {
    return <span className="ok-image-frame">{imageElement}</span>;
  }

  return (
    <>
      <button
        type="button"
        className="ok-image-frame"
        onClick={openModal}
        aria-label={alt || title || "Open image"}
      >
        {imageElement}
      </button>
      {open ? (
        <div className="ok-image-modal" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="ok-image-modal__inner" onClick={(event) => event.stopPropagation()}>
            <img src={resolvedSrc} alt={alt} title={title} />
          </div>
        </div>
      ) : null}
    </>
  );
}
