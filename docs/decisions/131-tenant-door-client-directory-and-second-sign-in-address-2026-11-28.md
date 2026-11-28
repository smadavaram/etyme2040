## A tenant's own door, a client's directory, and a second sign-in address — 2026-11-28

**Who said it.** Pax, Architect, in answer to five questions on Microsoft
and LinkedIn sign-in.

**What was already built.** Microsoft and LinkedIn each have a button, an
icon and a provider; both appear only where the hosting settings hold their
keys. No deployment holds them yet. Creating the Microsoft app and the
LinkedIn app, and putting the keys in the hosting settings, is the owner's
alone, by his own hand, never through chat or a session.

**The rules, as given.**
1. LinkedIn is a person's own door (candidate, consultant, a recruiter acting
   as an individual). Inside a client's company it never stands in for the
   company's directory. It resolves to the person's one record.
2. Every client is directory-only in the end. It switches on the moment the
   client's directory is connected and turned on. Before that, the client's
   Owner alone may use the seat, to finish the directory setup. It closes
   when the directory is on. No permanent back door.
3. A tenant names its door (Microsoft or Google) as a setting on the company
   record. It is enforced: that door leads and the other sign-in doors are
   refused for that company's seats. Identity is per person; enforcement is
   per company.
4. A person may link a second sign-in address to their one record: asked
   from their own signed-in session, confirmed from the new address,
   ledgered (`SIGN_IN_ADDRESS_LINKED`). Never merged by how two addresses
   look. An address that already has its own account is never folded in.

**What was built.** `Company.signInStack`; `LinkedSignInAddress`;
`stackRefusal` and `clientSetupRefusal` in `lib/identity/policy`, read at
sign-in and on every request; `lib/identity/linked-address` with its routes
and confirmation page; a card on the password page to ask for an address.
`__tests__/invariants/tenant-stack-and-linked-sign-in.test.ts`.

**One guard of mine, to be confirmed by Pax.** The client rule is off until
`CLIENT_SSO_ENFORCED=1` is set, so a deploy never locks out a client that has
not connected its directory. The release window turns it on.

**Not built.** A screen or tool that sets a tenant's door (it is set on the
record for now). The real Microsoft and LinkedIn sign-ins, which wait for
the keys.
