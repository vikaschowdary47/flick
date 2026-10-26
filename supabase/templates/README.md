# eqlShare auth email templates

Paste each file into Supabase → Authentication → Emails → Templates.

| Template in Supabase | File                  | Subject                         |
| -------------------- | --------------------- | ------------------------------- |
| Confirm sign up      | confirm-sign-up.html  | Confirm your eqlShare email     |
| Invite user          | invite-user.html      | You're invited to eqlShare      |
| Magic link or OTP    | magic-link.html       | Your eqlShare sign-in link      |
| Change email address | change-email.html     | Confirm your new eqlShare email |
| Reset password       | reset-password.html   | Reset your eqlShare password    |
| Reauthentication     | reauthentication.html | Your eqlShare verification code |

The logo loads from https://www.eqlshare.com/email/eqlshare-lockup.png
(site/public/email/eqlshare-lockup.png). Deploy the site before sending,
or the logo shows as a broken image. Email apps don't render SVG, so it is a PNG.

Colors: background #FFF8EE, card #FFFFFF, ink #2B2210, button #F5B83D, muted #6B6F8A.
