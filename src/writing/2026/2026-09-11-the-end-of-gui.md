---
title: "The End of GUI"
categories:
- work
topics:
- ai
- design
- ux
---

Just a few years ago, UX[^ux] designers were still enjoying the credibility our field has enjoyed ever since Apple added “design is how it works” to accepted business wisdom. Recently, though, _AI_ changed from a magical technology that makes recommendations useful and pedometers accurate into a technological magic that makes software feel like talking to humans. That has made many people question why we should bother with GUI. Isn’t flawless search better than browsing menus? Why bother learning a tool when you can just speak about it to an expert who wields it for you? What purpose is there to defining workflows and making controls visible if we can just infer what users are trying to do?

[^ux]: the meaning of _UI_ and _UX_ have shifted too often. Today, I use _UX designers_ to refer to people creating or specifying interactive software, spanning from style and layout through flows and wayfinding.

This feels like a new problem, but it echos _[NUI](https://learn.microsoft.com/en-us/shows/k4wdev/introduction-to-natural-user-interfaces-nui-kinect)_ and the ancient antipathy towards GUI from centuries past. There is nothing “natural” about computer software, but we have built a contradictory collection of intuitions over how best to enable humans to control machines, the value of different frictions, and what sorts of competences a “real” user should bring. Like every revolution in HCI, the advent of AI is sparking fantasies that mediation is finally over.

## Musophobia

For the first decade after the Macintosh’s first “hello”, a lot of us who were already comfortable with computer interfaces that descended from teletypes derided the new graphical approach. We weren’t simply being curmudgeons; it seemed absurd to spend **most**  of the limited resources of a 1980s desktop computer on rendering images just for ease of use.[^electron] Even the greatest leap forward in mainstream HCI asked users to read [34 pages of instruction](https://archive.org/details/1984macintoshmanual/).

[^electron]: Though at least there wasn’t any [Javascipt](https://drewdevault.com/blog/Electron-considered-harmful/) yet.

In exchange for that practice, you got to use a system, bogged down by drawing, which hid from you the true nature of the system. As a novice, your learning was hampered by imperfect representations. As a practiced user, you’d be missing the ability to use exactly the right tool because some _designer_ traded your freedom for the novice’s need for discovery. And as an expert, if you even could become one with one of these graphical toys, you’d be slowed down by visual systems that prioritized convenience.

Apple may have been right to quip that “most computer screens look like the departing flight schedule at a busy airport,” but if you were going to make the effort to learn how to use a computer, why not learn how to use one _properly_? In doing so, you would gain a fluency that you could build upon to get more and more value from your machine. Even if you had no need or interest in becoming a programmer, you would be more effective with precise, explicit, and repeatable commands.

The mediation of a GUI concealed the system from its user. This might have served to bring more people into computer use, but it wasn’t worth the tradeoff that prevented real proficiency.

We weren’t wrong about the risks! But we also engaged in some tribalism, and there was more than a little machismo in the mix.[^womens-work] To become an expert with a CLI requires building mental models and much memorizing. That can be a source of pride and lead to resentment of “dumbing down” the art to enable newcomers.

[^womens-work]: The machismo was, and continues to be, quite ironic considering the [origins of digital computing](https://news.sparkfun.com/6411).

CLIs continue to have unique value and we were right to question the hiding of their power. But many adherents, then and now, can be motivated by prideful gatekeeping.

## Saved by Natural Language

Of course, today we finally have a third, long-awaited entrant competing to interface humans to computers: natural language chat. LLMs have made it nearly trivial to “just ask” the machine to do something, and for it to respond. Why would we even bother drawing toolbars and icons when the new CLI is so accessible?

It’s no surprise, then, that I increasingly encounter an attitude that HCI is now a solved problem and there is no need for UI design. The voices sound similar to the old disdain for visual interfaces.

Yet I don’t hear an echo of the old CLI arguments. When we resisted GUIs, we were defending the idea that users should learn the system. They would benefit, as we had, from an expertise in syntax and understanding that would allow them to compose and repeat workflows efficiently.

The new anti-visual argument seems to be that users need not learn anything. Just bring your intentions and use speech to delegate to the machine. You can be competent without understanding.

Yet as frictionless as natural language chat _feels_, it is still an interface that mediates our interaction with the machine. CLI gave us precision, formality, and reproducibility. GUI brought strong affordances, powerful spatial metaphors, and visible state with clear and recoverable actions.

So far, our chat interfaces are replacing these with obscurity. Context and state are implicit or fuzzy, capabilities are opaque with ambiguous boundaries, and trying to reliably reproduce work is so hard there are new professions being imagined to “engineer” some certainty out of it all. Complexity is not being reduced, it is only being hidden well enough to give product builders false hope.

## The New Graybeards

There is one consistency between the old CLI advocacy and the chat enthusiasts: tribalism.

We[^graybeard] had a reverence for the _serious work_ of using technology, barely recognizing the newly emerging distinction between “user” and “programmer.” This was often expressed as a contempt for visual polish and accessibility. Worse, it could be a dismissive attitude towards mainstream users and the designers who enabled them.

[^graybeard]: I’m not using “we” to be generous! I spent many years using the family Apple II and more dialing into Unix mainframes before awakening to HCI.

The new chat acolytes also treat design and user research as bureaucratic obstacles or pointless decorators. They wear an impatience with usability as a badge of pragmatic realism, since HCI is now a solved problem. Some of the people I’ve encountered with this attitude are capable engineers that seem eager to be unshackled by the need to worry about UX, but many, many others are drunk with the powerful feeling of telling the machine to build things and have mistaken this for technical fluency.

All that shade aside, they are responding to real problems! Most software is poorly designed. GUIs are cluttered and unresponsive, navigation methods are laborious and barely more discoverable than shell commands. Over-complicated team structures produce similarly-complicated systems that no UI can reconcile, and designers give up and focus on onboarding in hopes the user can be taught to understand it all.

Natural language interfaces offer a tidy workaround, allowing users to “just ask” without having to learn the specifics of a product for an occasional task. Anyone designing software UI, in any form, has to make assumptions about the user’s intent. What better way could there be to discern what the user wants than letting them just tell the machine?

Their critique of GUI is not unfounded; doing it well is hard. That’s why the entire UX industry exists! Too many of the software tools we rely on today have been poorly designed (or, worse, well designed to subtly, negatively influence our behavior). The error is in believing the causes are surface-level and now easily solved with AI.

## False Comforts

Simplicity is not easily layered atop complexity. Effective use of a system often requires learning many concepts and how they relate to each other, as well as understanding what actions you can take as a user.

Ideally, the system is well-architected and maps to user expectations, with actions that represent their needs. If that’s true and the GUI is nonetheless difficult to use, the interface has failed and ought to be renovated.

But the system might not be as fit-for-purpose as the builders hoped. Maybe there are more concepts than really necessary or the relationships don’t map well to the objectives. The available actions might be insufficient, too extensive, or ambiguous. It’s possible a frontend might be devised that nonetheless can map to a usable abstraction; this is hard work yet not uncommon in “well designed” (from the outside) software.

That work cannot be avoided by adding a natural language abstraction with an LLM. A remapping of the system to a user-oriented concept model may become a part of the work deploying an AI-enabled chat interface, but if it is avoided the resulting bot will frustrate users like a poorly-trained frontline employee might.

Even if the system is elegant and matches user needs well, a GUI may be poorly designed and confuse users with insufficient feedback or visibility of state, fail to manage the user’s attention through necessary workflows, or hamper discoverability of its capabilities. Naively implementing AI tooling to address these UX problems may look like a friction-reducing success, but will fall apart in real-world conditions when users need to handle edge cases or failure conditions, look for deterministic reassurance, or overlook system capabilities.

## Pretending

I think what bothered me enough to start this rant was not merely the design-dismissive attitude of some immature product builders.[^dismissive] The really disturbing phenomenon is a new posture that borrows the aesthetic of technical seriousness, with dark-mode TUIs and 8-bit dithering, without respect for the crafts of _either_ systems engineering or HCI. New tools that enable them to build something that seems to work and looks polished have amplified the Dunning-Kruger effect.

[^dismissive]: As an engineer that migrated to design, I’m quite accustomed to defending the work of UX and ergonomics.

But it’s not only these prompt-jockeys that I’m worried about. Many highly-competent engineers and even product managers have taken to assuming that UX is now a solved problem because we can easily put a chat UI on anything.

The original CLI graybeards may have fetishized technical knowledge and confused difficulty with maturity, but they valued explicit precision and transparency. In waving away concerns about usability with exhortations to RTFM, they at least were challenging users to join them.

The new chatheads seem keen to avoid thinking about users altogether. Give them a synthetic representative to talk to and there’s no need to worry about all those things designers go on about. The friction is not actually eliminated, but is transformed into communication and much more easily ignored.

## Users Still Exist

Our beautiful software has always been complicated by messy human users. In resisting the rise of GUI, the skeptics hoped to avoid addressing the challenge. By slapping a chatbot on every interface, the new text-advocates believe the magic of AI can address it for them.

The unfortunate truth is that systems which engage with humans will always need to be concerned with the user’s mental models. There are many situations where a chat UI is legitimately helpful and much GUI can be replaced with it. But it is not a panacea, and applying it well still requires thought and empathy. Designers need not fear for their craft.
