"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Redesign v2 hero: a live demo of the product's one job. The phone sends a
// photo, it flies into the Mac menu-bar popover and lands there, ready to drag.
// Plays once on load; the amber button sends another. Reduced motion: no flight.

type DemoFile = { name: string; src: string; size: string };

const QUEUE: DemoFile[] = [
  { name: "lake-sunset.jpg", src: "/landing/lake-sunset.jpg", size: "2.1 MB" },
  { name: "harbor-dusk.jpg", src: "/landing/harbor-dusk.jpg", size: "1.8 MB" },
  { name: "brand-palette.png", src: "/landing/brand-palette.jpg", size: "96 KB" },
  { name: "floor-plan-v2.png", src: "/landing/floor-plan.jpg", size: "380 KB" },
];

type ShelfItem = DemoFile & { id: number; status: string; arriving: boolean };

export function DeviceDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const phoneImage = useRef<HTMLDivElement>(null);
  const firstSlot = useRef<HTMLDivElement>(null);
  const [phoneFile, setPhoneFile] = useState<DemoFile>(QUEUE[0]);
  const [phoneStatus, setPhoneStatus] = useState("Ready to send");
  const [fuse, setFuse] = useState(1);
  const [shelf, setShelf] = useState<ShelfItem[]>([
    { name: "floor-plan.png", src: "/landing/floor-plan.jpg", size: "380 KB", id: 0, status: "16 h left", arriving: false },
  ]);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  const next = useRef(0);
  const ids = useRef(1);

  const send = useCallback(() => {
    if (busy) return;
    setBusy(true);
    const file = QUEUE[next.current % QUEUE.length];
    next.current += 1;
    const id = ids.current++;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setPhoneFile(file);
    setPhoneStatus("Sending to 2 devices…");
    setFuse(0);
    setShelf((items) => [{ ...file, id, status: "Arriving…", arriving: true }, ...items].slice(0, 3));

    const land = () => {
      setShelf((items) => items.map((item) => (item.id === id ? { ...item, arriving: false, status: "Downloading…" } : item)));
      setPhoneStatus("Sent to 2 devices");
      setFuse(1);
      setPulse((value) => value + 1);
      window.setTimeout(() => {
        setShelf((items) => items.map((item) => (item.id === id ? { ...item, status: "Just now" } : item)));
        setBusy(false);
      }, reduce ? 0 : 650);
    };

    if (reduce) {
      land();
      return;
    }

    // Measure after React has placed the new (still invisible) shelf slot.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const root = stage.current?.getBoundingClientRect();
        const from = phoneImage.current?.getBoundingClientRect();
        const to = firstSlot.current?.getBoundingClientRect();
        if (!root || !from || !to || !stage.current) {
          land();
          return;
        }
        const flyer = document.createElement("div");
        flyer.className = "v2-flyer";
        flyer.style.backgroundImage = `url(${file.src})`;
        flyer.style.left = `${to.left - root.left}px`;
        flyer.style.top = `${to.top - root.top}px`;
        flyer.style.width = `${to.width}px`;
        flyer.style.height = `${to.height}px`;
        stage.current.appendChild(flyer);
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const sx = from.width / to.width;
        const animation = flyer.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx})`, opacity: 1 },
            { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(${(sx + 1) / 2}) rotate(-4deg)`, offset: 0.5 },
            { transform: "translate(0, 0) scale(1) rotate(0)", opacity: 1 },
          ],
          { duration: 950, easing: "cubic-bezier(.45,0,.2,1)" },
        );
        animation.onfinish = () => {
          flyer.remove();
          land();
        };
      }),
    );
  }, [busy]);

  // Play once, shortly after the page appears.
  useEffect(() => {
    const timer = window.setTimeout(send, 1100);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="v2-demo" ref={stage}>
      <div className="v2-desk" aria-hidden="true">
        <div className="v2-menubar">
          <span key={pulse} className={`v2-menubar-mark${pulse ? " v2-wiggle" : ""}`} />
          <span>Sun 9:41 PM</span>
        </div>
        <div className="v2-pop">
          <div className="v2-pop-head">
            <span className="v2-mark" />
            <b>eqlShare</b>
            <span className="v2-live">iPhone, Redmi</span>
          </div>
          <div className="v2-seg"><span className="on">Files</span><span>Clips</span></div>
          <div className="v2-label">Images</div>
          <div className="v2-shelf">
            {shelf.map((item, index) => (
              <div className={`v2-slot${item.arriving ? " v2-hidden" : ""}${index === 0 && !item.arriving && item.status !== "16 h left" ? " v2-new" : ""}`} key={item.id}>
                <div className="v2-thumb" ref={index === 0 ? firstSlot : undefined}>
                  <Image src={item.src} alt="" width={86} height={60} />
                </div>
                <b>{item.name}</b>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
          <div className="v2-label">Files</div>
          <div className="v2-row"><span className="v2-ext">PDF</span><span><b>Invoice-2026-1043.pdf</b><small>1.4 MB, from iPhone</small></span></div>
          <div className="v2-pop-foot">Drop files here to send</div>
        </div>
      </div>

      <div className="v2-phone">
        <div className="v2-island" aria-hidden="true" />
        <div className="v2-phone-bar" aria-hidden="true"><span className="v2-mark" /><b>eqlShare</b></div>
        <div className="v2-landed" aria-live="polite">
          <div className="v2-landed-img" ref={phoneImage}>
            <Image src={phoneFile.src} alt="" width={180} height={120} />
          </div>
          <div className="v2-landed-info"><b>{phoneFile.name}</b><small>{phoneFile.size}, {phoneStatus.toLowerCase()}</small></div>
          <div className="v2-fuse" aria-hidden="true"><i style={{ transform: `scaleX(${fuse})` }} /></div>
        </div>
        <div className="v2-dock">
          <span className="v2-side" aria-hidden="true" />
          <button type="button" className="v2-send" onClick={send} disabled={busy} aria-label="Send a photo to the Mac">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
          </button>
          <span className="v2-side" aria-hidden="true" />
        </div>
      </div>
      <p className="v2-demo-hint">Tap the amber button to send another.</p>
    </div>
  );
}
