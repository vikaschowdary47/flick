// When false, no paywall, upgrade or purchase UI is shown anywhere.
// No payment SDK is installed yet. Flipping this to true makes the limit
// screen show an upgrade button (see LimitScreen) instead of the waitlist.
export const PAYMENTS_ENABLED = false;

// Developer flag for clips (text and links). When false, nothing about clips
// is shown, fetched or subscribed to. When true, each device still needs
// Settings → Clipboard sharing turned on.
export const CLIPBOARD_ENABLED = false;
