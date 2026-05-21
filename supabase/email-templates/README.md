# Branded auth email templates

The defaults Supabase ships are functional but generic ("Confirm your signup", grey buttons, etc.). These HTML files replace them with templates that match the in-app + report-email visual language — Alert Network · Exhale Studios wordmark, brand-yellow CTA, the same surface/line tokens.

## Install (one-time, ~2 minutes)

1. **Supabase Studio → Authentication → Email Templates** (left sidebar under "Auth").
2. Pick a template name from the dropdown at the top of the form. Map each file in this folder:
   - `invite.html` → **"Invite user"** template. Fires when you invite via the Manage Team sheet.
   - `magic-link.html` → **"Magic Link"** template. Fires every time an existing user signs in via `/login`.
3. **Replace the entire message body** with the contents of the file. Don't try to merge with the default — easier to paste in clean.
4. Set the **Subject heading** for each:
   - Invite user → `You've been invited to Alert Network`
   - Magic Link → `Sign in to Alert Network`
5. Save.

## Sender address

For the from-line itself, you control that in **Project Settings → Authentication → SMTP Settings**. Resend's default sender is `onboarding@resend.dev` — fine for testing but you'll want a verified `@exhale.studio` (or similar) sender for production deliverability. Resend docs: <https://resend.com/docs/dashboard/domains/introduction>.

## Variables available

Supabase populates these Go-template variables in the body:

| Variable | What it is |
|---|---|
| `{{ .ConfirmationURL }}` | The magic-link sign-in URL. **Required** in both templates. |
| `{{ .Email }}` | Recipient's email address. |
| `{{ .Token }}` | 6-digit OTP (if you use OTP flow — we don't, just magic-link). |
| `{{ .TokenHash }}` | Hashed token, mostly for advanced use. |
| `{{ .SiteURL }}` | The Site URL configured in Authentication settings. |
| `{{ .Data }}` | Custom data passed via `inviteUserByEmail({ data: { … } })`. |

Both templates only use `{{ .ConfirmationURL }}`. If you want to personalise further (e.g. include the inviter's name), pass `data: { invitedBy: "..." }` from the server in `/api/projects/[id]/members/route.ts` and reference `{{ .Data.invitedBy }}` here.

## Other templates Supabase ships

You'll also see slots for **Confirm Signup**, **Reset Password**, and **Change Email** in the dashboard. We don't currently trigger any of those — sign-up is invite-only (no self-serve confirmation), passwords aren't used (magic-link only), and there's no in-app email-change flow. The defaults are fine until we wire any of that up.
