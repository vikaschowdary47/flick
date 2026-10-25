import Link from "next/link";
export default function NotFound() { return <main className="not-found"><div className="big-mark">↗</div><span className="kicker">404 / not found</span><h1>That page<br/><em>flicked away.</em></h1><p>Maybe it was only meant to live for 24 hours.</p><Link className="primary-button" href="/">Back to home <span>↗</span></Link></main>; }
