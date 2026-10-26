import Image from "next/image";

// Redesign v2: the hero shows the real v2 apps. A photo sent from the phone
// has just landed in the Mac menu-bar popover, ready to drag.
export function DeviceDemo() {
  return (
    <div className="v2-demo" role="img" aria-label="A photo sent from a phone appears in the eqlShare menu on a Mac, ready to drag">
      <div className="v2-desk">
        <div className="v2-menubar">
          <span className="v2-menubar-mark" />
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
            <figure className="v2-arrive">
              <Image src="/landing/lake-sunset.jpg" alt="" width={104} height={72} />
              <figcaption><b>lake-sunset.jpg</b><small>Just now</small></figcaption>
            </figure>
            <figure>
              <Image src="/landing/floor-plan.jpg" alt="" width={104} height={72} />
              <figcaption><b>floor-plan.png</b><small>16 h left</small></figcaption>
            </figure>
          </div>
          <div className="v2-label">Files</div>
          <div className="v2-row"><span className="v2-ext">PDF</span><span><b>Invoice-2026-1043.pdf</b><small>1.4 MB, from iPhone</small></span></div>
          <div className="v2-pop-foot">Drop files here to send</div>
        </div>
      </div>
      <div className="v2-phone">
        <div className="v2-island" />
        <div className="v2-phone-bar"><span className="v2-mark" /><b>eqlShare</b></div>
        <div className="v2-landed">
          <Image src="/landing/lake-sunset.jpg" alt="" width={180} height={120} />
          <div className="v2-landed-info"><b>lake-sunset.jpg</b><small>Sent to 2 devices</small></div>
          <div className="v2-fuse"><i /></div>
        </div>
        <div className="v2-dock"><span className="v2-side" /><span className="v2-send" /><span className="v2-side" /></div>
      </div>
    </div>
  );
}
