---
title: "NRS: a proto-RIA"
abstract: Client servers communicating with server servers through clients
categories:
- work
content-tags:
- web
- architecture
---

Adam Bosworth has been discussing his vision of a disconnected browser, a client of web services that enables offline operations and synchronizes with server applications when connected.  His latest [discussion][1] brought to mind an application I wrote shortly after joining my [present company][2] in 1999.

   [1]: http://adambosworth.net/2003/11/15/modifying-information-offline/
   [2]: http://www.envision.com/

This particular application was an SFA tool used by sales personnel to track details of their customer interactions, for aggregate management reporting and peer review.  The client's goal included an identical user interface regardless of whether using the web application from any random corporate workstation, or on a laptop disconnected from any network.

The deployment constraints of their IT department, though, made this an interesting endeavor.  No new DLLs could be deployed, the only concession we received was an agreement to install PWS (a minimal install of IIS that included the ASP libraries) on the laptops.  No COM components.  No ActiveX controls.
We could count on MS Access on the laptops, but had no way to even send an HTTP request to the server (remember, this is 1999: no SOAP, no XML-RPC, why on earth would a server want to **generate** an HTTP request?)

This was also my first large-scale ASP project, so I learned all sorts of things about handling errors, enforcing contracts, and simply designing a large application when constrained to a platform that seemed built to prevent these things in the name of "ease of development."  That's a story for another time.

What Bosworth's Rich Client (and Macromedia's Rich Internet Applications) reminded me of, though, was the offline data handling.

Each customer interaction was considered a unit of data.  Whenever a laptop connected to the network, if needed to synchronize each of these interactions the assigned user might be interested in (including ones she entered, ones involving her customers, those her reports might be interested in, those that she has been assigned an action item in don't get me started about the heuristics behind "interesting interactions.")

To deal with the synchronization, I devised a data format that looked a lot like a cross between INI files and SyncML.  The atomic units of data were smaller than an entire customer transaction, so editing from multiple sources could be resolved into the server's master data, CVS-style.

Whenever a user brought up the application, DHTML attempted to redirect them to the server, and if that failed silently rolled over to using the local install.  If the redirection to the server succeeded, it popped up a small window and redirected back to the local application, which rendered the window with a form full of hidden fields that listed the transactions it knew about and their latest edit date.  This form automatically submitted back to the server app, which would respond with "we're going to need to sync these IDs, then" by rendering another invisible form and submitting it back to the local app.

After this first "handshake," the INI-like format made it simple to translate lines like "customer[_id_].transaction[_id_].metadata[_type_]=_value_" into HTTP POSTs, and the submit-to-you-submit-to-me cycle continued.  A lot of reference data would also have to be published from the server, so there might be dozens of submissions (many with hundreds of form elements) in one operation. The total count of all this known, so a little progress bar was rendered in that window to give the user something to look at, and appropriate locking meant they could mostly go on using the server application during the procedure.

It was unwieldy by today's standards, perhaps, but watching the "sync window" pop up and smoothly fill in a progress bar, and knowing a small bit of simple code was synchronizing huge amounts of fairly complex data was inspiring.  The user's list of locally-accessible transactions had little indicators to flag which ones had been modified locally, only to prevent them calling a peer and expecting them to see data that hadn't yet synched.  Unless they inspected the address bar, the only user interface distinction between environments was that the server never had any "unpublished" flags, but might have a few "unavailable during processing" flags.

Really, it was precisely what Bosworth has described, but in this case our "Rich Client" included a Redmond witch's brew with a web and application server (PWS), local database (Access), and presentation manager (IE).

What I was really proud of, though, was the generic, DHTML outline editor that allowed adding, removing, and structuring (move, promote/demote) items of different data types without any server trips.  Another large set of code libraries and knowledge that I hope to let decay.
