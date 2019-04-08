---
title: Secure Email
categories:
- uncategorized
writing-tags:
- tagless
---

Blacklisting spammers would be quite effective, if it wasn't so easy for them to [forge the sender][1].  I've been encouraging friends to [sign][2] their messages with S/MIME, in a sort of grassroots effort to work around the primary weakness of the net's email infrastructure (SMTP's blind trust of the From: header) that enables spam.

   [1]: http://www.spamfaq.net/spamfighting.shtml#N10101
   [2]: http://www.rsasecurity.com/rsalabs/node.asp?id=2292

It's getting easier to obtain a [free certificate][3], and recent versions of [Outlook][4] and [Mail][5] provide seamless support.  Mail even started encrypting mail between [Bryce][6] and I as soon as it saw his public key.  I don't wear an [aluminum hat][7], but I don't mind knowing it'll take some effort for others to snoop around my messages.

   [3]: http://www.thawte.com/email/
   [4]: http://www.marknoble.com/tutorial/smime/smime.aspx
   [5]: http://www.joar.com/certificates/
   [6]: http://twitter.com/brycep
   [7]: http://zapatopi.net/afdb.html

It's gotten on my nerves, though, that my certificate only verifies my personal email address, and does not relate my public or work addresses, or certify my identity.  Thawte's [Web of Trust][8] will let me do all that, but only after I've been validated by a number of folks.  St. Louis isn't exactly on the cutting edge of technology, so this has been a bit of a hassle.  If I'm going to preach S/MIME, I should grease the machine by becoming a WOT notary myself, so that's the goal.  Let me know if you'd like to attend an "assertion party" and get a jump start.

   [8]: https://www.thawte.com/wot/

I think it's inevitable that the WOT shall grow.  Critical mass has already been reached, the underlying technology is widely adopted, and the [reputation society][9] may depend on it.

   [9]: http://www.firstmonday.dk/issues/issue9_7/masum/

For the record, my public key's SHA1 fingerprint is EA D8 F9 3A 2B 50 F8 08 11 B0 37 59 41 E1 57 DF 63 9C 0F 4F
